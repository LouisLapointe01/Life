import { createAdminClient } from "@/lib/supabase/admin";
import { getValidAccessToken, watchCalendar } from "@/lib/google-calendar";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

/**
 * GET /api/cron/webhook-renewal
 * Renouvelle tous les webhooks Google Calendar qui expirent dans les 48h.
 * Couvre : webhooks token-level (primary) + webhooks par calendrier (appointment_types).
 * Appelé quotidiennement par Vercel Cron.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const webhookUrl = process.env.GOOGLE_WEBHOOK_URL ||
    `${process.env.NEXT_PUBLIC_APP_URL}/api/google/webhook`;

  const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const stats = { tokens: 0, calendars: 0, errors: 0 };

  // 1. Renouveler les webhooks token-level (primary)
  const { data: tokens } = await supabase
    .from("google_calendar_tokens")
    .select("id, user_id, calendar_id, webhook_expiry, sync_enabled")
    .eq("sync_enabled", true)
    .or(`webhook_expiry.is.null,webhook_expiry.lt.${deadline}`);

  for (const token of tokens || []) {
    try {
      const accessToken = await getValidAccessToken(token.user_id, token.id);
      if (!accessToken) { stats.errors++; continue; }

      const channelId = randomUUID();
      const watchResult = await watchCalendar(accessToken, token.calendar_id || "primary", webhookUrl, channelId);
      await supabase.from("google_calendar_tokens").update({
        webhook_channel_id: channelId,
        webhook_resource_id: watchResult.resourceId,
        webhook_expiry: new Date(Number(watchResult.expiration)).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", token.id);
      stats.tokens++;
    } catch (err) {
      console.error("[Webhook Renewal] Token", token.id, err);
      stats.errors++;
    }
  }

  // 2. Renouveler les webhooks par calendrier (appointment_types)
  const { data: calTypes } = await supabase
    .from("appointment_types")
    .select("id, user_id, google_calendar_id, google_token_id, webhook_expiry")
    .not("google_calendar_id", "is", null)
    .neq("google_calendar_id", "primary")
    .not("google_token_id", "is", null)
    .or(`webhook_expiry.is.null,webhook_expiry.lt.${deadline}`);

  for (const ct of calTypes || []) {
    try {
      const accessToken = await getValidAccessToken(ct.user_id, ct.google_token_id);
      if (!accessToken) { stats.errors++; continue; }

      const calChannelId = randomUUID();
      const watchResult = await watchCalendar(accessToken, ct.google_calendar_id, webhookUrl, calChannelId);
      await supabase.from("appointment_types").update({
        webhook_channel_id: calChannelId,
        webhook_resource_id: watchResult.resourceId,
        webhook_expiry: new Date(Number(watchResult.expiration)).toISOString(),
      }).eq("id", ct.id);
      stats.calendars++;
    } catch { stats.errors++; }
  }

  return NextResponse.json({ ok: true, stats });
}
