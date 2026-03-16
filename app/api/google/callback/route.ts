import { NextResponse } from "next/server";
import { exchangeCodeForTokens, watchCalendar, listGoogleCalendars, getGoogleUserEmail } from "@/lib/google-calendar";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

/**
 * GET /api/google/callback?code=...&state=...
 * Callback OAuth2 Google Calendar.
 * Stocke les tokens, importe les calendriers Google comme types de RDV, et démarre le webhook.
 * Supporte multi-comptes via google_email + google_token_id.
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

    let state: { userId: string; returnTo?: string };
    try {
      state = JSON.parse(Buffer.from(stateB64, "base64url").toString());
    } catch {
      return NextResponse.redirect(`${origin}/dashboard/parametres?gcal_error=invalid_state`);
    }
    const returnTo = state.returnTo || "/dashboard/parametres";

    // Échanger le code contre des tokens
    const redirectUri = `${origin}/api/google/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

    // Récupérer l'email du compte Google
    const googleEmail = await getGoogleUserEmail(tokens.access_token);

    const supabase = createAdminClient();

    // Vérifier si c'est le premier compte Google de l'utilisateur
    const { data: existingTokens } = await supabase
      .from("google_calendar_tokens")
      .select("id")
      .eq("user_id", state.userId);
    const isFirstAccount = !existingTokens || existingTokens.length === 0;

    // Upsert les tokens (basé sur user_id + google_email)
    const { data: tokenRow, error: tokenError } = await supabase.from("google_calendar_tokens").upsert(
      {
        user_id: state.userId,
        google_email: googleEmail,
        is_default: isFirstAccount,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokenExpiry.toISOString(),
        calendar_id: "primary",
        sync_enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,google_email" }
    ).select("id").single();

    if (tokenError || !tokenRow?.id) {
      console.error("[Google Callback] Token upsert failed:", tokenError);
      return NextResponse.redirect(`${origin}/dashboard/parametres?gcal_error=token_save_failed`);
    }

    const tokenId = tokenRow.id;

    // Importer les calendriers Google comme types de RDV
    try {
      const calendars = await listGoogleCalendars(tokens.access_token);
      for (const cal of calendars) {
        // Dédoublonnage : chercher par google_calendar_id seul (couvre reconnexion après déco)
        const { data: existing } = await supabase
          .from("appointment_types")
          .select("id")
          .eq("user_id", state.userId)
          .eq("google_calendar_id", cal.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("appointment_types")
            .update({
              name: cal.summary,
              color: cal.backgroundColor,
              is_active: true,
              google_token_id: tokenId,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("appointment_types").insert({
            user_id: state.userId,
            name: cal.summary,
            duration_min: 60,
            color: cal.backgroundColor,
            google_calendar_id: cal.id,
            google_token_id: tokenId,
            is_active: true,
            sort_order: 99,
          });
        }
      }
    } catch (err) {
      console.error("[Google Callback] Calendar import failed:", err);
    }

    // Démarrer un webhook par calendrier (pour catcher les changements dans tous les calendriers)
    const webhookUrl = process.env.GOOGLE_WEBHOOK_URL || `${origin}/api/google/webhook`;

    // Webhook token-level (fallback sur "primary")
    try {
      const channelId = randomUUID();
      const watchResult = await watchCalendar(tokens.access_token, "primary", webhookUrl, channelId);
      await supabase.from("google_calendar_tokens").update({
        webhook_channel_id: channelId,
        webhook_resource_id: watchResult.resourceId,
        webhook_expiry: new Date(Number(watchResult.expiration)).toISOString(),
      }).eq("id", tokenId);
    } catch (err) {
      console.error("[Google Callback] Token webhook setup failed:", err);
    }

    // Webhook par calendrier importé (pour catcher les changements dans chaque calendrier)
    try {
      const { data: calTypes } = await supabase
        .from("appointment_types")
        .select("id, google_calendar_id")
        .eq("user_id", state.userId)
        .eq("google_token_id", tokenId)
        .not("google_calendar_id", "is", null)
        .neq("google_calendar_id", "primary");

      for (const ct of calTypes || []) {
        try {
          const calChannelId = randomUUID();
          const watchResult = await watchCalendar(tokens.access_token, ct.google_calendar_id, webhookUrl, calChannelId);
          await supabase.from("appointment_types").update({
            webhook_channel_id: calChannelId,
            webhook_resource_id: watchResult.resourceId,
            webhook_expiry: new Date(Number(watchResult.expiration)).toISOString(),
          }).eq("id", ct.id);
        } catch { /* calendar might not support watch */ }
      }
    } catch (err) {
      console.error("[Google Callback] Calendar webhooks setup failed:", err);
    }

    return NextResponse.redirect(`${origin}${returnTo}?gcal_success=true`);
  } catch (err) {
    console.error("[GET /api/google/callback]", err);
    const { origin } = new URL(request.url);
    return NextResponse.redirect(`${origin}/dashboard/parametres?gcal_error=exchange_failed`);
  }
}
