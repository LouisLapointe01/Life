import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getValidAccessToken,
  listGoogleEvents,
} from "@/lib/google-calendar";

/**
 * POST /api/google/webhook
 * Reçoit les push notifications de Google Calendar.
 * Quand Google envoie une notification, on fait un incremental sync multi-calendriers.
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

    // Chercher d'abord dans les tokens (webhook token-level)
    let userId: string | null = null;
    let tokenId: string | null = null;

    const { data: tokenRow } = await supabase
      .from("google_calendar_tokens")
      .select("id, user_id")
      .eq("webhook_channel_id", channelId)
      .maybeSingle();

    if (tokenRow) {
      userId = tokenRow.user_id;
      tokenId = tokenRow.id;
    } else {
      // Fallback : chercher dans les webhooks par calendrier (appointment_types)
      const { data: calType } = await supabase
        .from("appointment_types")
        .select("user_id, google_token_id")
        .eq("webhook_channel_id", channelId)
        .maybeSingle();

      if (calType) {
        userId = calType.user_id;
        tokenId = calType.google_token_id;
      }
    }

    if (!userId || !tokenId) {
      return NextResponse.json({ error: "Unknown channel" }, { status: 404 });
    }

    // Lancer la synchronisation pour ce token spécifique
    await performIncrementalSync(userId, tokenId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/google/webhook]", err);
    return NextResponse.json({ ok: true }); // Toujours 200 pour Google
  }
}

/**
 * Sync incrémentale pour un token spécifique : pour chaque calendrier Google lié à ce token,
 * récupère les événements récents et met à jour les RDV dans Life.
 */
async function performIncrementalSync(userId: string, tokenId: string) {
  const accessToken = await getValidAccessToken(userId, tokenId);
  if (!accessToken) return;

  const supabase = createAdminClient();

  try {
    // Récupérer les types liés à ce token
    const { data: googleTypes } = await supabase
      .from("appointment_types")
      .select("id, google_calendar_id")
      .eq("user_id", userId)
      .eq("google_token_id", tokenId)
      .not("google_calendar_id", "is", null);

    if (!googleTypes || googleTypes.length === 0) return;

    const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    for (const gType of googleTypes) {
      try {
        const result = await listGoogleEvents(accessToken, gType.google_calendar_id, {
          timeMin,
          timeMax,
        });

        for (const event of result.items || []) {
          await processGoogleEvent(supabase, userId, gType.google_calendar_id, gType.id, event);
        }
      } catch (err) {
        console.error(`[Webhook Sync] Error for calendar ${gType.google_calendar_id}:`, err);
      }
    }

    // Mettre à jour la date de dernière sync pour ce token
    await supabase
      .from("google_calendar_tokens")
      .update({
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", tokenId);
  } catch (err) {
    console.error("[Incremental Sync] Error for user", userId, err);
  }
}

/**
 * Traite un événement Google individuel :
 * - Si l'événement est lié à un RDV Life (google_event_id match) → mise à jour
 * - Si l'événement est supprimé (status=cancelled) → annuler le RDV Life
 * - Si l'événement est nouveau (pas de match) → créer un RDV Life
 * Fix dédoublonnage : .maybeSingle() + scope user_id
 */
async function processGoogleEvent(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  calendarId: string,
  typeId: string,
  event: {
    id: string;
    status: string;
    summary?: string;
    description?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
  }
) {
  if (event.status === "cancelled") {
    await supabase
      .from("appointments")
      .update({ status: "cancelled", google_sync_status: "synced", updated_at: new Date().toISOString() })
      .eq("google_event_id", event.id)
      .eq("user_id", userId)
      .neq("status", "cancelled");
    return;
  }

  const startAt = event.start?.dateTime || event.start?.date;
  const endAt = event.end?.dateTime || event.end?.date;
  if (!startAt || !endAt) return;

  await supabase.from("appointments").upsert(
    {
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
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,google_event_id", ignoreDuplicates: false }
  );
}

export { performIncrementalSync };
