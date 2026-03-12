import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getValidAccessToken,
  listGoogleEvents,
  findClosestGoogleColor,
  GOOGLE_EVENT_COLORS,
} from "@/lib/google-calendar";

/**
 * POST /api/google/webhook
 * Reçoit les push notifications de Google Calendar.
 * Quand Google envoie une notification, on fait un incremental sync.
 */
export async function POST(request: Request) {
  try {
    const channelId = request.headers.get("x-goog-channel-id");
    const resourceState = request.headers.get("x-goog-resource-state");

    // Google envoie un "sync" au moment de la souscription — on ignore
    if (resourceState === "sync") {
      return NextResponse.json({ ok: true });
    }

    if (!channelId) {
      return NextResponse.json({ error: "Missing channel ID" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Trouver l'utilisateur associé à ce channel
    const { data: tokenRow } = await supabase
      .from("google_calendar_tokens")
      .select("user_id, calendar_id, last_sync_token")
      .eq("webhook_channel_id", channelId)
      .single();

    if (!tokenRow) {
      return NextResponse.json({ error: "Unknown channel" }, { status: 404 });
    }

    // Lancer la synchronisation incrémentale
    await performIncrementalSync(tokenRow.user_id, tokenRow.calendar_id, tokenRow.last_sync_token);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/google/webhook]", err);
    return NextResponse.json({ ok: true }); // Toujours 200 pour Google
  }
}

/**
 * Sync incrémentale : récupère les changements depuis le dernier syncToken
 * et met à jour les RDV dans Life.
 */
async function performIncrementalSync(
  userId: string,
  calendarId: string,
  lastSyncToken: string | null
) {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return;

  const supabase = createAdminClient();

  try {
    let result;
    if (lastSyncToken) {
      result = await listGoogleEvents(accessToken, calendarId, { syncToken: lastSyncToken });
    } else {
      // Première sync : récupérer les 30 derniers jours + 90 prochains jours
      const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      result = await listGoogleEvents(accessToken, calendarId, { timeMin, timeMax });
    }

    const events = result.items || [];

    for (const event of events) {
      await processGoogleEvent(supabase, userId, calendarId, event);
    }

    // Sauvegarder le nouveau sync token
    if (result.nextSyncToken) {
      await supabase
        .from("google_calendar_tokens")
        .update({
          last_sync_token: result.nextSyncToken,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }
  } catch (err) {
    console.error("[Incremental Sync] Error for user", userId, err);
  }
}

/**
 * Traite un événement Google individuel :
 * - Si l'événement est lié à un RDV Life (google_event_id match) → mise à jour
 * - Si l'événement est supprimé (status=cancelled) → annuler le RDV Life
 * - Si l'événement est nouveau (pas de match) → créer un RDV Life "externe"
 */
async function processGoogleEvent(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  calendarId: string,
  event: {
    id: string;
    status: string;
    summary?: string;
    description?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
    colorId?: string;
  }
) {
  // Chercher si ce Google Event est déjà lié à un RDV Life
  const { data: existingApt } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("google_event_id", event.id)
    .single();

  if (event.status === "cancelled") {
    // Événement supprimé sur Google → annuler dans Life
    if (existingApt && existingApt.status !== "cancelled") {
      await supabase
        .from("appointments")
        .update({
          status: "cancelled",
          google_sync_status: "synced",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingApt.id);
    }
    return;
  }

  const startAt = event.start?.dateTime || event.start?.date;
  const endAt = event.end?.dateTime || event.end?.date;
  if (!startAt || !endAt) return;

  if (existingApt) {
    // Mise à jour d'un RDV existant
    await supabase
      .from("appointments")
      .update({
        guest_name: event.summary || "Événement Google",
        message: event.description || null,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        google_sync_status: "synced",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingApt.id);
  } else {
    // Nouvel événement Google → créer un RDV Life

    // Trouver ou créer un type de RDV "Google Calendar"
    let typeId: string;
    const { data: gcalType } = await supabase
      .from("appointment_types")
      .select("id")
      .eq("user_id", userId)
      .eq("name", "Google Calendar")
      .single();

    if (gcalType) {
      typeId = gcalType.id;
    } else {
      // Déterminer la couleur du type basée sur l'événement Google
      const colorHex = event.colorId
        ? GOOGLE_EVENT_COLORS[event.colorId]?.hex || "#039be5"
        : "#039be5"; // Paon par défaut

      const { data: newType } = await supabase
        .from("appointment_types")
        .insert({
          user_id: userId,
          name: "Google Calendar",
          duration_min: 30,
          color: colorHex,
          is_active: true,
          sort_order: 99,
        })
        .select("id")
        .single();
      typeId = newType!.id;
    }

    const durationMin = Math.round(
      (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000
    );

    await supabase.from("appointments").insert({
      type_id: typeId,
      requester_id: userId,
      user_id: userId,
      guest_name: event.summary || "Événement Google",
      guest_email: "",
      start_at: new Date(startAt).toISOString(),
      end_at: new Date(endAt).toISOString(),
      message: event.description || null,
      status: "confirmed",
      google_event_id: event.id,
      google_calendar_id: calendarId,
      google_sync_status: "synced",
    });
  }
}

/**
 * Exporter la fonction de sync pour usage externe (polling fallback, sync manuelle)
 */
export { performIncrementalSync };
