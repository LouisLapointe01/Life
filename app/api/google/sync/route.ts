import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getValidAccessToken,
  listGoogleEvents,
  syncAppointmentToGoogle,
  watchCalendar,
} from "@/lib/google-calendar";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

/**
 * POST /api/google/sync
 * Lance une synchronisation manuelle complète (bidirectionnelle).
 * 1. Push tous les RDV Life non-syncés vers Google
 * 2. Pull tous les événements Google vers Life
 * 3. Renouvelle le webhook si expiré
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = createAdminClient();
    const accessToken = await getValidAccessToken(user.id);
    if (!accessToken) {
      return NextResponse.json({ error: "Google Calendar non connecté" }, { status: 400 });
    }

    const { data: tokenRow } = await admin
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (!tokenRow) {
      return NextResponse.json({ error: "Tokens introuvables" }, { status: 400 });
    }

    const stats = { pushed: 0, pulled: 0, errors: 0 };

    // 1. Push : RDV Life sans google_event_id → créer sur Google
    const { data: unsyncedApts } = await admin
      .from("appointments")
      .select("id, type_id, guest_name, message, start_at, end_at, google_event_id, google_calendar_id")
      .eq("requester_id", user.id)
      .is("google_event_id", null)
      .neq("status", "cancelled");

    for (const apt of unsyncedApts || []) {
      try {
        await syncAppointmentToGoogle(user.id, apt.id, apt);
        stats.pushed++;
      } catch {
        stats.errors++;
      }
    }

    // 2. Pull : événements Google → Life (incremental sync)
    try {
      const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

      const result = await listGoogleEvents(accessToken, tokenRow.calendar_id, {
        syncToken: tokenRow.last_sync_token || undefined,
        timeMin: tokenRow.last_sync_token ? undefined : timeMin,
        timeMax: tokenRow.last_sync_token ? undefined : timeMax,
      });

      // Import dynamique pour traiter les événements
      const { processGoogleEventForSync } = await getProcessFunction();
      for (const event of result.items || []) {
        await processGoogleEventForSync(admin, user.id, tokenRow.calendar_id, event);
        stats.pulled++;
      }

      // Sauvegarder le sync token
      if (result.nextSyncToken) {
        await admin
          .from("google_calendar_tokens")
          .update({
            last_sync_token: result.nextSyncToken,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      }
    } catch (err) {
      console.error("[Manual Sync] Pull error:", err);
      stats.errors++;
    }

    // 3. Renouveler le webhook si expiré ou absent
    const webhookExpiry = tokenRow.webhook_expiry ? new Date(tokenRow.webhook_expiry) : null;
    if (!webhookExpiry || webhookExpiry.getTime() < Date.now() + 24 * 60 * 60 * 1000) {
      try {
        const webhookUrl = process.env.GOOGLE_WEBHOOK_URL ||
          `${process.env.NEXT_PUBLIC_APP_URL || "https://life.vercel.app"}/api/google/webhook`;
        const channelId = randomUUID();
        const watchResult = await watchCalendar(accessToken, tokenRow.calendar_id, webhookUrl, channelId);

        await admin
          .from("google_calendar_tokens")
          .update({
            webhook_channel_id: channelId,
            webhook_resource_id: watchResult.resourceId,
            webhook_expiry: new Date(Number(watchResult.expiration)).toISOString(),
          })
          .eq("user_id", user.id);
      } catch (err) {
        console.error("[Manual Sync] Webhook renewal failed:", err);
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      last_synced_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[POST /api/google/sync]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * GET /api/google/sync
 * Retourne le statut de synchronisation Google Calendar.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = createAdminClient();
    const { data: tokenRow } = await admin
      .from("google_calendar_tokens")
      .select("sync_enabled, last_synced_at, webhook_expiry, calendar_id, created_at")
      .eq("user_id", user.id)
      .single();

    if (!tokenRow) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      sync_enabled: tokenRow.sync_enabled,
      last_synced_at: tokenRow.last_synced_at,
      webhook_active: tokenRow.webhook_expiry ? new Date(tokenRow.webhook_expiry) > new Date() : false,
      calendar_id: tokenRow.calendar_id,
      connected_since: tokenRow.created_at,
    });
  } catch (err) {
    console.error("[GET /api/google/sync]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Helper pour obtenir la fonction de traitement d'événement
async function getProcessFunction() {
  return {
    processGoogleEventForSync: async (
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
    ) => {
      const { data: existingApt } = await supabase
        .from("appointments")
        .select("id, status")
        .eq("google_event_id", event.id)
        .single();

      if (event.status === "cancelled") {
        if (existingApt && existingApt.status !== "cancelled") {
          await supabase
            .from("appointments")
            .update({ status: "cancelled", google_sync_status: "synced", updated_at: new Date().toISOString() })
            .eq("id", existingApt.id);
        }
        return;
      }

      const startAt = event.start?.dateTime || event.start?.date;
      const endAt = event.end?.dateTime || event.end?.date;
      if (!startAt || !endAt) return;

      if (existingApt) {
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
        // Trouver ou créer le type "Google Calendar"
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
          const { data: newType } = await supabase
            .from("appointment_types")
            .insert({
              user_id: userId,
              name: "Google Calendar",
              duration_min: 30,
              color: "#039be5",
              is_active: true,
              sort_order: 99,
            })
            .select("id")
            .single();
          typeId = newType!.id;
        }

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
    },
  };
}
