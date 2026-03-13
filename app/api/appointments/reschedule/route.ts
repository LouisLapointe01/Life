import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { rescheduleSchema, rescheduleVoteSchema } from "@/lib/validations";
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
   GET /api/appointments/reschedule?appointment_id=UUID
   Retourne les demandes de report pour un RDV.
   ═══════════════════════════════════════════════════════ */
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const aptId = searchParams.get("appointment_id");
    if (!aptId) return NextResponse.json({ error: "appointment_id requis" }, { status: 400 });

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("reschedule_requests")
      .select(`
        *,
        requester:profiles!reschedule_requests_requested_by_fkey(full_name),
        reschedule_votes(id, user_id, vote, alternative_time, created_at)
      `)
      .eq("appointment_id", aptId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (err) {
    console.error("[GET /api/appointments/reschedule]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════════════════
   POST /api/appointments/reschedule
   Créer une demande de report.
   Tout participant (ou créateur) peut demander.
   Notifie tous les autres.
   ═══════════════════════════════════════════════════════ */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = rescheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { appointment_id, new_start_at, new_end_at, reason } = parsed.data;

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const supabase = createAdminClient();

    // Vérifier que le RDV existe et que l'user est participant/créateur
    const { data: apt } = await supabase
      .from("appointments")
      .select("id, requester_id, guest_name, status")
      .eq("id", appointment_id)
      .single();

    if (!apt) return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
    if (apt.status === "cancelled") return NextResponse.json({ error: "RDV annulé" }, { status: 400 });

    // Vérifier participation
    const { data: myPart } = await supabase
      .from("appointment_participants")
      .select("id")
      .eq("appointment_id", appointment_id)
      .eq("user_id", user.id)
      .single();

    if (!myPart && apt.requester_id !== user.id) {
      return NextResponse.json({ error: "Vous n'êtes pas participant de ce RDV" }, { status: 403 });
    }

    // Créer la demande
    const { data: req, error: reqErr } = await supabase
      .from("reschedule_requests")
      .insert({
        appointment_id,
        requested_by: user.id,
        new_start_at,
        new_end_at,
        reason: reason || null,
      })
      .select()
      .single();

    if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 });

    // Auto-voter "yes" pour le demandeur
    await supabase.from("reschedule_votes").insert({
      reschedule_id: req.id,
      user_id: user.id,
      vote: "yes",
    });

    // Passer le RDV en "rescheduling"
    await supabase.from("appointments").update({ status: "rescheduling", updated_at: new Date().toISOString() }).eq("id", appointment_id);

    // Notifier les autres
    const { data: parts } = await supabase
      .from("appointment_participants")
      .select("user_id")
      .eq("appointment_id", appointment_id)
      .not("user_id", "is", null);

    const profile = await getProfile(supabase, user.id);
    const myName = profile?.full_name || user.email || "Quelqu'un";
    const newDate = new Date(new_start_at);
    const dateFr = newDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const timeFr = newDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    for (const p of parts || []) {
      if (!p.user_id || p.user_id === user.id) continue;
      await notify(supabase, {
        userId: p.user_id,
        type: "reschedule_request",
        appointmentId: appointment_id,
        fromUserId: user.id,
        fromName: myName,
        title: `${myName} propose de reporter le RDV`,
        body: `Nouvel horaire proposé : ${dateFr} à ${timeFr}${reason ? ` — "${reason}"` : ""}`,
      });
    }

    // Notifier aussi le créateur s'il n'est pas le demandeur
    if (apt.requester_id !== user.id) {
      await notify(supabase, {
        userId: apt.requester_id,
        type: "reschedule_request",
        appointmentId: appointment_id,
        fromUserId: user.id,
        fromName: myName,
        title: `${myName} propose de reporter le RDV`,
        body: `Nouvel horaire : ${dateFr} à ${timeFr}`,
      });
    }

    return NextResponse.json(req, { status: 201 });
  } catch (err) {
    console.error("[POST /api/appointments/reschedule]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════════════════
   PATCH /api/appointments/reschedule
   Voter sur une demande de report.
   Si tous "yes" → déplacer le RDV + notifier.
   Si un "no" → notifier le demandeur avec alternatives.
   ═══════════════════════════════════════════════════════ */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const parsed = rescheduleVoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { reschedule_id, vote, alternative_time } = parsed.data;

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const supabase = createAdminClient();

    // Récupérer la demande
    const { data: req } = await supabase
      .from("reschedule_requests")
      .select("*, appointments!inner(id, requester_id, guest_name)")
      .eq("id", reschedule_id)
      .single();

    if (!req) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
    if (req.status !== "pending") return NextResponse.json({ error: "Cette demande n'est plus active" }, { status: 400 });

    const apt = req.appointments as unknown as { id: string; requester_id: string; guest_name: string };

    // Enregistrer le vote (upsert)
    const { error: voteErr } = await supabase
      .from("reschedule_votes")
      .upsert({
        reschedule_id,
        user_id: user.id,
        vote,
        alternative_time: alternative_time || null,
      }, { onConflict: "reschedule_id,user_id" });

    if (voteErr) return NextResponse.json({ error: voteErr.message }, { status: 500 });

    // Récupérer tous les participants (sauf le demandeur qui a auto-voté)
    const { data: parts } = await supabase
      .from("appointment_participants")
      .select("user_id, name")
      .eq("appointment_id", apt.id)
      .not("user_id", "is", null);

    const allParticipantIds = new Set((parts || []).map((p) => p.user_id!));
    // Ajouter le créateur
    allParticipantIds.add(apt.requester_id);

    // Récupérer tous les votes
    const { data: allVotes } = await supabase
      .from("reschedule_votes")
      .select("user_id, vote, alternative_time")
      .eq("reschedule_id", reschedule_id);

    const voterIds = new Set((allVotes || []).map((v) => v.user_id));
    const allVoted = [...allParticipantIds].every((id) => voterIds.has(id));

    const myProfile = await getProfile(supabase, user.id);
    const myName = myProfile?.full_name || user.email || "Quelqu'un";

    if (vote === "no") {
      // Notifier le demandeur immédiatement
      await notify(supabase, {
        userId: req.requested_by,
        type: "reschedule_rejected",
        appointmentId: apt.id,
        fromUserId: user.id,
        fromName: myName,
        title: `${myName} ne peut pas au nouvel horaire`,
        body: alternative_time
          ? `Alternative proposée : ${new Date(alternative_time).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${new Date(alternative_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
          : "Aucune alternative proposée.",
      });

      // Marquer la demande comme rejetée
      await supabase.from("reschedule_requests").update({ status: "rejected" }).eq("id", reschedule_id);

      // Remettre le RDV en status précédent (pending ou confirmed)
      const { data: otherParts } = await supabase
        .from("appointment_participants")
        .select("status")
        .eq("appointment_id", apt.id)
        .neq("status", "declined");

      const allAcc = (otherParts || []).every((p) => p.status === "accepted");
      await supabase.from("appointments").update({
        status: allAcc ? "confirmed" : "pending",
        updated_at: new Date().toISOString(),
      }).eq("id", apt.id);
    }

    if (allVoted && vote === "yes") {
      const allYes = (allVotes || []).every((v) => v.vote === "yes") && vote === "yes";
      if (allYes) {
        // Tout le monde accepte → déplacer le RDV
        const { data: updatedApt } = await supabase.from("appointments").update({
          start_at: req.new_start_at,
          end_at: req.new_end_at,
          status: "confirmed",
          updated_at: new Date().toISOString(),
        }).eq("id", apt.id).select("id, type_id, guest_name, message, start_at, end_at, google_event_id, google_calendar_id, requester_id").single();

        await supabase.from("reschedule_requests").update({ status: "approved" }).eq("id", reschedule_id);

        // Sync vers Google Calendar
        if (updatedApt) {
          syncAppointmentToGoogle(updatedApt.requester_id, updatedApt.id, {
            guest_name: updatedApt.guest_name,
            message: updatedApt.message,
            start_at: updatedApt.start_at,
            end_at: updatedApt.end_at,
            type_id: updatedApt.type_id,
            google_event_id: updatedApt.google_event_id,
            google_calendar_id: updatedApt.google_calendar_id,
          }).catch((e) => console.error("[Reschedule] Google sync:", e));
        }

        // Notifier tout le monde
        for (const pid of allParticipantIds) {
          await notify(supabase, {
            userId: pid,
            type: "reschedule_approved",
            appointmentId: apt.id,
            fromName: "Système",
            title: "RDV déplacé avec succès",
            body: `Le RDV "${apt.guest_name}" a été déplacé au nouvel horaire.`,
          });
        }
      }
    }

    return NextResponse.json({ success: true, all_voted: allVoted });
  } catch (err) {
    console.error("[PATCH /api/appointments/reschedule]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
