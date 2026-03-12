import { NextResponse } from "next/server";
import { exchangeCodeForTokens, watchCalendar, listGoogleCalendars } from "@/lib/google-calendar";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

/**
 * GET /api/google/callback?code=...&state=...
 * Callback OAuth2 Google Calendar.
 * Stocke les tokens, importe les calendriers Google comme types de RDV, et démarre le webhook.
 */
export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const stateB64 = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(`${origin}/dashboard/parametres?gcal_error=${error}`);
    }

    if (!code || !stateB64) {
      return NextResponse.redirect(`${origin}/dashboard/parametres?gcal_error=missing_params`);
    }

    let state: { userId: string };
    try {
      state = JSON.parse(Buffer.from(stateB64, "base64url").toString());
    } catch {
      return NextResponse.redirect(`${origin}/dashboard/parametres?gcal_error=invalid_state`);
    }

    // Échanger le code contre des tokens
    const redirectUri = `${origin}/api/google/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

    const supabase = createAdminClient();

    // Upsert les tokens
    await supabase.from("google_calendar_tokens").upsert(
      {
        user_id: state.userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokenExpiry.toISOString(),
        calendar_id: "primary",
        sync_enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    // Importer les calendriers Google comme types de RDV
    try {
      const calendars = await listGoogleCalendars(tokens.access_token);
      for (const cal of calendars) {
        // Upsert : si un type avec ce google_calendar_id existe déjà, on le met à jour
        const { data: existing } = await supabase
          .from("appointment_types")
          .select("id")
          .eq("user_id", state.userId)
          .eq("google_calendar_id", cal.id)
          .single();

        if (existing) {
          await supabase
            .from("appointment_types")
            .update({
              name: cal.summary,
              color: cal.backgroundColor,
              is_active: true,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("appointment_types").insert({
            user_id: state.userId,
            name: cal.summary,
            color: cal.backgroundColor,
            google_calendar_id: cal.id,
            is_active: true,
            sort_order: 99,
          });
        }
      }
    } catch (err) {
      console.error("[Google Callback] Calendar import failed:", err);
    }

    // Démarrer le webhook pour la sync Google → Life
    const webhookUrl = process.env.GOOGLE_WEBHOOK_URL || `${origin}/api/google/webhook`;
    const channelId = randomUUID();

    try {
      const watchResult = await watchCalendar(
        tokens.access_token,
        "primary",
        webhookUrl,
        channelId
      );

      await supabase
        .from("google_calendar_tokens")
        .update({
          webhook_channel_id: channelId,
          webhook_resource_id: watchResult.resourceId,
          webhook_expiry: new Date(Number(watchResult.expiration)).toISOString(),
        })
        .eq("user_id", state.userId);
    } catch (err) {
      console.error("[Google Callback] Webhook setup failed:", err);
    }

    return NextResponse.redirect(`${origin}/dashboard/parametres?gcal_success=true`);
  } catch (err) {
    console.error("[GET /api/google/callback]", err);
    const { origin } = new URL(request.url);
    return NextResponse.redirect(`${origin}/dashboard/parametres?gcal_error=exchange_failed`);
  }
}
