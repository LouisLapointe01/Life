import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createAppointmentSchema } from "@/lib/validations";
import { sendBookingConfirmationToGuest } from "@/lib/mailjet";
import { sendSMS } from "@/lib/twilio";
import { syncAppointmentToGoogle, deleteAppointmentFromGoogle } from "@/lib/google-calendar";
import { NextResponse } from "next/server";

const APPOINTMENT_SELECT = `
  id,
  type_id,
  user_id,
  requester_id,
  guest_name,
  guest_email,
  guest_phone,
  start_at,
  end_at,
  message,
  status,
  is_close_contact,
  notify_on_event,
  recipient_type_id,
  google_event_id,
  google_calendar_id,
  google_sync_status,
  created_at,
  updated_at,
  creator:profiles!appointments_requester_id_fkey(id, full_name, avatar_url),
  appointment_types!type_id(id, name, color, duration_min),
  appointment_participants(
    id, user_id, name, email, phone, type_id, status, is_organizer, is_close_contact, responded_at,
    participant_type:appointment_types(id, name, color, duration_min)
  )
`;
const APPOINTMENT_INSERT_RETURNING = "id, type_id, user_id, requester_id, guest_name, guest_email, guest_phone, start_at, end_at, message, status, is_close_contact, notify_on_event, recipient_type_id, created_at, updated_at";

/* ═══════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════ */
async function getAuthUser() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  return user;
}

async function getProfile(supabase: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await supabase.from("profiles").select("id, role, full_name, email").eq("id", userId).single();
  return data;
}

async function notify(
  supabase: ReturnType<typeof createAdminClient>,
  p: { userId: string; type: string; appointmentId: string; fromUserId?: string; fromName?: string; title: string; body?: string }
) {
  await supabase.from("notifications").insert({
    user_id: p.userId, type: p.type, appointment_id: p.appointmentId,
    from_user_id: p.fromUserId || null, from_name: p.fromName || null,
    title: p.title, body: p.body || null,
  });
}

/* ═══════════════════════════════════════════════════════
   GET /api/appointments
   Retourne les RDV où je suis créateur OU participant.
   ═══════════════════════════════════════════════════════ */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const supabase = createAdminClient();
    const profile = await getProfile(supabase, user.id);
    const isAdmin = profile?.role === "admin";

    let data, error;

    if (isAdmin) {
      const res = await supabase.from("appointments").select(APPOINTMENT_SELECT).order("start_at", { ascending: true });
      data = res.data; error = res.error;
    } else {
      // Trouver les appointments où je suis participant
      const { data: parts } = await supabase.from("appointment_participants").select("appointment_id").eq("user_id", user.id);
      const ids = (parts || []).map((p) => p.appointment_id);

      const orFilter = ids.length > 0
        ? `requester_id.eq.${user.id},id.in.(${ids.join(",")})`
        : `requester_id.eq.${user.id}`;

      const res = await supabase.from("appointments").select(APPOINTMENT_SELECT).or(orFilter).order("start_at", { ascending: true });
      data = res.data; error = res.error;
    }

    if (error) {
      console.error("[GET /api/appointments]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("[GET /api/appointments]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════════════════
   POST /api/appointments
   Crée un RDV + participants + notifications.
   ═══════════════════════════════════════════════════════ */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { type_id, start_at, end_at: bodyEndAt, duration_min: bodyDuration, message, participants, notify_on_event } = parsed.data;
    const supabase = createAdminClient();

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const [creatorProfile, { data: aptType, error: typeErr }, { data: closeCts }] = await Promise.all([
      getProfile(supabase, user.id),
      supabase
        .from("appointment_types")
        .select("duration_min, name")
        .eq("id", type_id)
        .eq("is_active", true)
        .single(),
      supabase.from("contacts").select("email").eq("user_id", user.id).eq("is_close", true),
    ]);

    const creatorName = creatorProfile?.full_name || user.email || "Inconnu";

    if (typeErr || !aptType) {
      return NextResponse.json({ error: "Type de RDV invalide ou inactif" }, { status: 400 });
    }

    const startDate = new Date(start_at);
    // Priorité : end_at du body > duration_min du body > duration_min du type > défaut 30min
    const durationMin = bodyDuration || aptType.duration_min || 30;
    const endDate = bodyEndAt ? new Date(bodyEndAt) : new Date(startDate.getTime() + durationMin * 60 * 1000);

    const closeEmails = new Set((closeCts || []).map((c) => c.email?.toLowerCase()).filter(Boolean));

    const first = participants[0];

    // Créer le RDV
    const { data: apt, error: insErr } = await supabase
      .from("appointments")
      .insert({
        type_id,
        requester_id: user.id,
        user_id: first.user_id || null,
        guest_name: first.name,
        guest_email: first.email || "",
        guest_phone: first.phone || null,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        message: message || null,
        status: "pending",
        is_close_contact: first.email ? closeEmails.has(first.email.toLowerCase()) : false,
        notify_on_event: notify_on_event ?? true,
      })
      .select(APPOINTMENT_INSERT_RETURNING)
      .single();

    if (insErr) {
      console.error("[POST] Insert:", insErr);
      return NextResponse.json({ error: `Erreur: ${insErr.message}` }, { status: 500 });
    }

    // Participants
    const rows: Array<{
      appointment_id: string; user_id: string | null; name: string;
      email: string | null; phone: string | null; type_id: string | null;
      status: "accepted" | "pending"; is_organizer: boolean; is_close_contact: boolean;
      responded_at: string | null;
    }> = participants.map((p) => {
      const isClose = p.email ? closeEmails.has(p.email.toLowerCase()) : false;
      return {
        appointment_id: apt.id, user_id: p.user_id || null, name: p.name,
        email: p.email || null, phone: p.phone || null, type_id: null,
        status: isClose ? "accepted" as const : "pending" as const,
        is_organizer: false, is_close_contact: isClose,
        responded_at: isClose ? new Date().toISOString() : null,
      };
    });

    // Créateur = organisateur auto-accepté
    rows.push({
      appointment_id: apt.id, user_id: user.id, name: creatorName,
      email: user.email || null, phone: null, type_id: type_id,
      status: "accepted" as const, is_organizer: true, is_close_contact: false,
      responded_at: new Date().toISOString(),
    });

    await supabase.from("appointment_participants").insert(rows);

    // Auto-confirm si tous acceptés
    if (rows.every((r) => r.status === "accepted")) {
      await supabase.from("appointments").update({ status: "confirmed" }).eq("id", apt.id);
    }

    // Notifications
    const dateFr = startDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const timeFr = startDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const notificationRows = participants
      .filter((p) => p.user_id && p.user_id !== user.id)
      .map((p) => {
        const isClose = p.email ? closeEmails.has(p.email.toLowerCase()) : false;
        return {
          user_id: p.user_id as string,
          type: isClose ? "info" : "invitation",
          appointment_id: apt.id,
          from_user_id: user.id,
          from_name: creatorName,
          title: isClose ? `${creatorName} a créé un RDV` : `${creatorName} vous invite à un RDV`,
          body: `${aptType.name} — ${dateFr} à ${timeFr}`,
        };
      });

    const outboundTasks = participants
      .filter((p) => !p.user_id)
      .flatMap((p) => {
        const tasks: Promise<unknown>[] = [];
        if (p.email) {
          tasks.push(
            sendBookingConfirmationToGuest({
              guestName: p.name,
              guestEmail: p.email,
              typeName: aptType.name,
              startAt: startDate.toISOString(),
              endAt: endDate.toISOString(),
              durationMin: durationMin,
            }).catch((e) => console.error("[POST] Email participant:", e))
          );
        }
        if (p.phone) {
          const smsBody = `Bonjour ${p.name}, ${creatorName} vous invite à un RDV "${aptType.name}" le ${dateFr} à ${timeFr}. — Life`;
          tasks.push(sendSMS(p.phone, smsBody).catch((e) => console.error("[POST] SMS participant:", e)));
        }
        return tasks;
      });

    await Promise.all([
      notificationRows.length > 0 ? supabase.from("notifications").insert(notificationRows) : Promise.resolve(),
      outboundTasks.length > 0 ? Promise.allSettled(outboundTasks) : Promise.resolve(),
    ]);

    // Sync vers Google Calendar (fire & forget)
    syncAppointmentToGoogle(user.id, apt.id, {
      guest_name: first.name,
      message: message || null,
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
      type_id: type_id,
    }).catch((e) => console.error("[POST] Google sync:", e));

    return NextResponse.json(apt, { status: 201 });
  } catch (err) {
    console.error("[POST /api/appointments]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════════════════
   PATCH /api/appointments
   Annuler un RDV (créateur ou admin uniquement).
   Pour répondre en tant que participant → /api/appointments/participants
   ═══════════════════════════════════════════════════════ */
export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json();
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
    if (status !== "cancelled") {
      return NextResponse.json({ error: "Utilisez /api/appointments/participants pour répondre" }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const supabase = createAdminClient();
    const profile = await getProfile(supabase, user.id);

    const { data: apt } = await supabase.from("appointments").select("requester_id, guest_name, start_at, type_id").eq("id", id).single();
    if (!apt) return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });

    if (apt.requester_id !== user.id && profile?.role !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("appointments").update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", id).select("*, google_event_id, google_calendar_id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Supprimer l'événement Google Calendar associé
    if (data.google_event_id) {
      deleteAppointmentFromGoogle(user.id, data.google_event_id, data.google_calendar_id)
        .catch((e) => console.error("[PATCH] Google delete:", e));
    }

    // Notifier tous les participants
    const { data: parts } = await supabase
      .from("appointment_participants").select("user_id, name, email, phone").eq("appointment_id", id);
    const cName = profile?.full_name || user.email || "Quelqu'un";

    for (const p of parts || []) {
      if (p.user_id === user.id) continue;

      if (p.user_id) {
        // In-app
        await notify(supabase, {
          userId: p.user_id,
          type: "cancellation", appointmentId: id,
          fromUserId: user.id, fromName: cName,
          title: `RDV annulé par ${cName}`,
          body: `Le rendez-vous "${apt.guest_name}" a été annulé.`,
        });
      } else {
        // Sans compte → email / SMS
        if (p.email) {
          const { sendCancellationToGuest } = await import("@/lib/mailjet");
          await sendCancellationToGuest({
            guestName: p.name || "Participant",
            guestEmail: p.email,
            typeName: apt.guest_name || "Rendez-vous",
            startAt: apt.start_at,
          }).catch((e) => console.error("[PATCH] Email annulation:", e));
        }
        if (p.phone) {
          await sendSMS(p.phone, `Bonjour ${p.name || "Participant"}, le RDV "${apt.guest_name}" a été annulé par ${cName}. — Life`).catch((e) => console.error("[PATCH] SMS annulation:", e));
        }
      }
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[PATCH /api/appointments]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════════════════
   DELETE /api/appointments?id=UUID
   ═══════════════════════════════════════════════════════ */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const supabase = createAdminClient();
    const profile = await getProfile(supabase, user.id);
    const { data: aptDel } = await supabase.from("appointments").select("requester_id, google_event_id, google_calendar_id").eq("id", id).single();
    if (!aptDel) return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
    if (aptDel.requester_id !== user.id && profile?.role !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Supprimer de Google Calendar avant de supprimer de la DB
    if (aptDel.google_event_id) {
      await deleteAppointmentFromGoogle(user.id, aptDel.google_event_id, aptDel.google_calendar_id)
        .catch((e) => console.error("[DELETE] Google delete:", e));
    }

    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/appointments]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
