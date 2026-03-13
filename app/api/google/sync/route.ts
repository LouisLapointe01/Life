import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getValidAccessToken,
  listGoogleEvents,
  listGoogleCalendars,
  syncAppointmentToGoogle,
  watchCalendar,
} from "@/lib/google-calendar";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

/**
 * POST /api/google/sync
 * Lance une synchronisation manuelle complète (bidirectionnelle, multi-comptes).
 * Pour chaque token : re-sync calendriers, push, pull, renouvelle webhook.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = createAdminClient();

    // Récupérer tous les tokens
    const { data: allTokens } = await admin
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("sync_enabled", true);

    if (!allTokens || allTokens.length === 0) {
      return NextResponse.json({ error: "Google Calendar non connecté" }, { status: 400 });
    }

    const stats = { pushed: 0, pulled: 0, errors: 0 };

    for (const tokenRow of allTokens) {
      const accessToken = await getValidAccessToken(user.id, tokenRow.id);
      if (!accessToken) { stats.errors++; continue; }

      // 1. Re-sync des calendriers Google → appointment_types
      try {
        const calendars = await listGoogleCalendars(accessToken);
        for (const cal of calendars) {
          const { data: existing } = await admin
            .from("appointment_types")
            .select("id")
            .eq("user_id", user.id)
            .eq("google_calendar_id", cal.id)
            .maybeSingle();

          if (existing) {
            await admin
              .from("appointment_types")
              .update({ name: cal.summary, color: cal.backgroundColor, is_active: true, google_token_id: tokenRow.id })
              .eq("id", existing.id);
          } else {
            await admin.from("appointment_types").insert({
              user_id: user.id,
              name: cal.summary,
              duration_min: 60,
              color: cal.backgroundColor,
              google_calendar_id: cal.id,
              google_token_id: tokenRow.id,
              is_active: true,
              sort_order: 99,
            });
          }
        }
      } catch (err) {
        console.error("[Manual Sync] Calendar re-sync error for token", tokenRow.id, err);
      }

      // 2. Pull : événements Google → Life (multi-calendriers pour ce token)
      try {
        const { data: googleTypes } = await admin
          .from("appointment_types")
          .select("id, google_calendar_id")
          .eq("user_id", user.id)
          .eq("google_token_id", tokenRow.id)
          .not("google_calendar_id", "is", null);

        const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

        for (const gType of googleTypes || []) {
          try {
            const result = await listGoogleEvents(accessToken, gType.google_calendar_id, {
              timeMin,
              timeMax,
            });

            for (const event of result.items || []) {
              await processGoogleEventForSync(admin, user.id, gType.google_calendar_id, gType.id, event);
              stats.pulled++;
            }
          } catch (err) {
            console.error(`[Manual Sync] Pull error for calendar ${gType.google_calendar_id}:`, err);
            stats.errors++;
          }
        }
      } catch (err) {
        console.error("[Manual Sync] Pull error for token", tokenRow.id, err);
        stats.errors++;
      }

      // 3. Mettre à jour la date de dernière sync
      await admin
        .from("google_calendar_tokens")
        .update({
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", tokenRow.id);

      // 4. Renouveler le webhook si expiré ou absent
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
            .eq("id", tokenRow.id);
        } catch (err) {
          console.error("[Manual Sync] Webhook renewal failed for token", tokenRow.id, err);
        }
      }
    }

    // Push : RDV Life sans google_event_id → créer sur Google
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
 * Retourne le statut de synchronisation Google Calendar (multi-comptes).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = createAdminClient();
    const { data: tokens } = await admin
      .from("google_calendar_tokens")
      .select("id, google_email, is_default, sync_enabled, last_synced_at, webhook_expiry, calendar_id, created_at")
      .eq("user_id", user.id);

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ connected: false, accounts: [] });
    }

    const accounts = tokens.map((t) => ({
      id: t.id,
      google_email: t.google_email,
      is_default: t.is_default,
      sync_enabled: t.sync_enabled,
      last_synced_at: t.last_synced_at,
      webhook_active: t.webhook_expiry ? new Date(t.webhook_expiry) > new Date() : false,
      calendar_id: t.calendar_id,
      connected_since: t.created_at,
    }));

    return NextResponse.json({
      connected: true,
      accounts,
    });
  } catch (err) {
    console.error("[GET /api/google/sync]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** Traite un événement Google et l'upsert dans Life — avec fix dédoublonnage */
async function processGoogleEventForSync(
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
  const { data: existingApt } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("google_event_id", event.id)
    .eq("user_id", userId)
    .maybeSingle();

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

export { processGoogleEventForSync };
