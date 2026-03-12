import { NextResponse } from "next/server";
import { exchangeCodeForTokens, watchCalendar, GOOGLE_EVENT_COLORS } from "@/lib/google-calendar";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

/**
 * GET /api/google/callback?code=...&state=...
 * Callback OAuth2 Google Calendar.
 * Stocke les tokens, initialise les labels, et démarre le webhook.
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
    const tokens = await exchangeCodeForTokens(code);
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

    // Initialiser les labels Google (11 couleurs)
    const { data: existingLabels } = await supabase
      .from("google_calendar_labels")
      .select("id")
      .eq("user_id", state.userId);

    if (!existingLabels || existingLabels.length === 0) {
      const labels = Object.entries(GOOGLE_EVENT_COLORS).map(([colorId, { name, hex }]) => ({
        user_id: state.userId,
        google_color_id: colorId,
        google_color_hex: hex,
        google_label_name: name,
        life_type_id: null,
        is_default: colorId === "7", // Paon par défaut
      }));
      await supabase.from("google_calendar_labels").insert(labels);
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
      // Pas critique — on fera du polling en fallback
    }

    return NextResponse.redirect(`${origin}/dashboard/parametres?gcal_success=true`);
  } catch (err) {
    console.error("[GET /api/google/callback]", err);
    const { origin } = new URL(request.url);
    return NextResponse.redirect(`${origin}/dashboard/parametres?gcal_error=exchange_failed`);
  }
}
