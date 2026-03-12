import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { syncAppointmentToGoogle } from "@/lib/google-calendar";
import { NextResponse } from "next/server";

async function getAuthUser() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  return user;
}

async function getProfile(supabase: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await supabase.from("profiles").select("id, role, full_name").eq("id", userId).single();
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
   GET /api/appointments/participants?appointment_id=UUID
   Retourne les participants d'un RDV.
   ═══════════════════════════════════════════════════════ */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const aptId = searchParams.get("appointment_id");
    if (!aptId) return NextResponse.json({ error: "appointment_id requis" }, { status: 400 });

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("appointment_participants")
      .select("*, participant_type:appointment_types(id, name, color, duration_min)")
      .eq("appointment_id", aptId)
      .order("is_organizer", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (err) {
    console.error("[GET /api/appointments/participants]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════════════════
   PATCH /api/appointments/participants
   Un participant répond : accept/decline + optionnel type_id.
   Après réponse → notifications à tous les autres participants.
   Si tous acceptés → appointment passe en "confirmed".
   ═══════════════════════════════════════════════════════ */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, type_id } = body;

    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
    if (!status || !["accepted", "declined"].includes(status)) {
      return NextResponse.json({ error: "status doit être 'accepted' ou 'declined'" }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const supabase = createAdminClient();

    // Vérifier que le participant correspond à l'utilisateur
    const { data: participant } = await supabase
      .from("appointment_participants")
      .select("*, appointments!inner(id, requester_id, guest_name, start_at, end_at, status)")
      .eq("id", id)
      .single();

    if (!participant) return NextResponse.json({ error: "Participant introuvable" }, { status: 404 });
    if (participant.user_id !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const apt = participant.appointments as unknown as {
      id: string; requester_id: string; guest_name: string; start_at: string; end_at: string; status: string;
    };

    if (apt.status === "cancelled") {
      return NextResponse.json({ error: "Ce RDV est déjà annulé" }, { status: 400 });
    }

    // Mettre à jour le participant
    const updates: Record<string, unknown> = {
      status,
      responded_at: new Date().toISOString(),
    };
    if (type_id) updates.type_id = type_id;

    const { data: updated, error: updErr } = await supabase
      .from("appointment_participants")
      .update(updates)
      .eq("id", id)
      .select("*, participant_type:appointment_types(id, name, color, duration_min)")
      .single();

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    // Récupérer tous les participants du RDV
    const { data: allParts } = await supabase
      .from("appointment_participants")
      .select("id, user_id, name, status, is_organizer")
      .eq("appointment_id", apt.id);

    const others = (allParts || []).filter((p) => p.user_id && p.user_id !== user.id);
    const myProfile = await getProfile(supabase, user.id);
    const myName = myProfile?.full_name || user.email || "Quelqu'un";

    // Notifier tous les autres participants
    const statusLabel = status === "accepted" ? "accepté" : "décliné";
    for (const p of others) {
      if (!p.user_id) continue;
      await notify(supabase, {
        userId: p.user_id,
        type: "response",
        appointmentId: apt.id,
        fromUserId: user.id,
        fromName: myName,
        title: `${myName} a ${statusLabel} le RDV`,
        body: `Rendez-vous "${apt.guest_name}"`,
      });
    }

    // Vérifier si TOUS les non-organisateurs ont accepté → auto-confirm
    const nonOrganizers = (allParts || []).filter((p) => !p.is_organizer);
    // Actualiser le status du participant qu'on vient de modifier
    const currentStatuses = nonOrganizers.map((p) => p.id === id ? status : p.status);
    const allAccepted = currentStatuses.length > 0 && currentStatuses.every((s) => s === "accepted");
    const anyDeclined = currentStatuses.some((s) => s === "declined");

    if (allAccepted) {
      await supabase.from("appointments").update({ status: "confirmed", updated_at: new Date().toISOString() }).eq("id", apt.id);

      // Notifier le créateur
      if (apt.requester_id !== user.id) {
        await notify(supabase, {
          userId: apt.requester_id,
          type: "confirmed",
          appointmentId: apt.id,
          fromUserId: user.id,
          fromName: myName,
          title: "Tous les participants ont confirmé !",
          body: `Le RDV "${apt.guest_name}" est maintenant confirmé.`,
        });
      }
    }

    if (anyDeclined && apt.requester_id !== user.id) {
      // Notifier le créateur qu'un participant a décliné
      await notify(supabase, {
        userId: apt.requester_id,
        type: "declined",
        appointmentId: apt.id,
        fromUserId: user.id,
        fromName: myName,
        title: `${myName} ne peut pas participer`,
        body: `Le participant a décliné le RDV "${apt.guest_name}". Vous pouvez proposer un autre horaire.`,
      });
    }

    // Sync Google Calendar de l'organisateur quand un participant répond
    // Récupérer les infos complètes du RDV pour la sync
    const { data: fullApt } = await supabase
      .from("appointments")
      .select("id, type_id, guest_name, message, start_at, end_at, google_event_id, google_calendar_id")
      .eq("id", apt.id)
      .single();
    if (fullApt) {
      syncAppointmentToGoogle(apt.requester_id, apt.id, fullApt)
        .catch((e) => console.error("[PATCH participants] Google sync:", e));
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/appointments/participants]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
