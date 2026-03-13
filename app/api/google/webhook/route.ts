import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidAccessToken, listGoogleEvents } from "@/lib/google-calendar";

/**
 * POST /api/google/webhook
 * Reçoit les push notifications de Google Calendar.
 * Répond immédiatement 200 à Google, puis traite en arrière-plan.
 */
export async function POST(request: Request) {
  const channelId = request.headers.get("x-goog-channel-id");
  const resourceState = request.headers.get("x-goog-resource-state");

  // Google envoie un "sync" au moment de la souscription — on ignore
  if (resourceState === "sync") {
    return NextResponse.json({ ok: true });
  }

  if (!channelId) {
    return NextResponse.json({ error: "Missing channel ID" }, { status: 400 });
  }

  // Lancer la sync en arrière-plan SANS await — Google doit recevoir 200 rapidement
  performIncrementalSync(channelId).catch((err) =>
    console.error("[Webhook] Background sync error:", err)
  );

  return NextResponse.json({ ok: true });
}

/**
 * Sync ultra-rapide : utilise le syncToken par calendrier pour ne fetcher
 * que les événements modifiés depuis la dernière notification.
 * Gère l'expiration du syncToken (HTTP 410 → full re-sync).
 */
async function performIncrementalSync(channelId: string) {
  const supabase = createAdminClient();

  // Résoudre userId + tokenId via le channelId
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

  if (!userId || !tokenId) return;

  const accessToken = await getValidAccessToken(userId, tokenId);
  if (!accessToken) return;

  // Récupérer tous les calendriers liés à ce token
  const { data: googleTypes } = await supabase
    .from("appointment_types")
    .select("id, google_calendar_id, sync_token")
    .eq("user_id", userId)
    .eq("google_token_id", tokenId)
    .not("google_calendar_id", "is", null);

  if (!googleTypes || googleTypes.length === 0) return;

  for (const gType of googleTypes) {
    try {
      await syncCalendar(supabase, accessToken, userId, gType);
    } catch (err) {
      console.error(`[Webhook Sync] Error for calendar ${gType.google_calendar_id}:`, err);
    }
  }

  await supabase
    .from("google_calendar_tokens")
    .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", tokenId);
}

/**
 * Sync un calendrier avec syncToken (delta uniquement).
 * Si le syncToken est expiré (410 Gone), fait un full re-sync.
 */
async function syncCalendar(
  supabase: ReturnType<typeof createAdminClient>,
  accessToken: string,
  userId: string,
  gType: { id: string; google_calendar_id: string; sync_token: string | null }
) {
  let result: { items?: GoogleEvent[]; nextSyncToken?: string };

  try {
    if (gType.sync_token) {
      // Sync incrémentale : uniquement les événements modifiés depuis le dernier syncToken
      result = await listGoogleEvents(accessToken, gType.google_calendar_id, {
        syncToken: gType.sync_token,
      });
    } else {
      // Premier sync : fenêtre classique pour initialiser le syncToken
      const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      result = await listGoogleEvents(accessToken, gType.google_calendar_id, { timeMin, timeMax });
    }
  } catch (err: unknown) {
    // 410 Gone = syncToken expiré → full re-sync
    const status = (err as { status?: number })?.status;
    if (status === 410) {
      await supabase.from("appointment_types").update({ sync_token: null }).eq("id", gType.id);
      const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      result = await listGoogleEvents(accessToken, gType.google_calendar_id, { timeMin, timeMax });
    } else {
      throw err;
    }
  }

  // Traiter les événements (seulement ceux qui ont changé)
  for (const event of result.items || []) {
    await processGoogleEvent(supabase, userId, gType.google_calendar_id, gType.id, event);
  }

  // Stocker le nouveau syncToken pour la prochaine notification
  if (result.nextSyncToken) {
    await supabase
      .from("appointment_types")
      .update({ sync_token: result.nextSyncToken })
      .eq("id", gType.id);
  }
}

type GoogleEvent = {
  id: string;
  status: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

async function processGoogleEvent(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  calendarId: string,
  typeId: string,
  event: GoogleEvent
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
