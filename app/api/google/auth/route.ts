import { createClient } from "@/lib/supabase/server";
import { getGoogleAuthUrl } from "@/lib/google-calendar";
import { NextResponse } from "next/server";

/**
 * GET /api/google/auth
 * Redirige l'utilisateur vers Google OAuth2 pour autoriser l'accès au Calendar.
 * Le state contient l'user_id pour le callback.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Dériver le redirect URI de l'URL de la requête (fonctionne en local et en prod)
    const { origin } = new URL(request.url);
    const redirectUri = `${origin}/api/google/callback`;

    const state = Buffer.from(JSON.stringify({ userId: user.id })).toString("base64url");
    const authUrl = getGoogleAuthUrl(state, redirectUri);

    return NextResponse.json({ url: authUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/google/auth]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/google/auth
 * Déconnecte Google Calendar (supprime les tokens).
 */
export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    // Arrêter le webhook si actif
    const { data: tokenRow } = await admin
      .from("google_calendar_tokens")
      .select("access_token, webhook_channel_id, webhook_resource_id")
      .eq("user_id", user.id)
      .single();

    if (tokenRow?.webhook_channel_id && tokenRow?.webhook_resource_id) {
      const { stopWatchChannel } = await import("@/lib/google-calendar");
      await stopWatchChannel(
        tokenRow.access_token,
        tokenRow.webhook_channel_id,
        tokenRow.webhook_resource_id
      ).catch(() => {});
    }

    // Supprimer les tokens
    await admin.from("google_calendar_tokens").delete().eq("user_id", user.id);
    // Supprimer les labels
    await admin.from("google_calendar_labels").delete().eq("user_id", user.id);
    // Reset les appointments sync
    await admin
      .from("appointments")
      .update({ google_event_id: null, google_calendar_id: null, google_sync_status: "none" })
      .eq("requester_id", user.id)
      .not("google_event_id", "is", null);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[DELETE /api/google/auth]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
