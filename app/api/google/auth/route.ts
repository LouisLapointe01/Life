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
 * DELETE /api/google/auth?token_id=UUID
 * Déconnecte un compte Google spécifique (ou tous si pas de token_id).
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("token_id");
    const cleanup = searchParams.get("cleanup") === "true";

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    if (tokenId) {
      // Déconnecter un seul compte
      const { data: tokenRow } = await admin
        .from("google_calendar_tokens")
        .select("id, access_token, webhook_channel_id, webhook_resource_id")
        .eq("id", tokenId)
        .eq("user_id", user.id)
        .single();

      if (!tokenRow) {
        return NextResponse.json({ error: "Token introuvable" }, { status: 404 });
      }

      // Arrêter le webhook
      if (tokenRow.webhook_channel_id && tokenRow.webhook_resource_id) {
        const { stopWatchChannel } = await import("@/lib/google-calendar");
        await stopWatchChannel(tokenRow.access_token, tokenRow.webhook_channel_id, tokenRow.webhook_resource_id).catch(() => {});
      }

      if (cleanup) {
        // Supprimer tous les appointments importés depuis ce compte Google
        const { data: linkedTypes } = await admin
          .from("appointment_types")
          .select("id")
          .eq("user_id", user.id)
          .eq("google_token_id", tokenId);
        const typeIds = (linkedTypes || []).map((t) => t.id);
        if (typeIds.length > 0) {
          await admin
            .from("appointments")
            .delete()
            .eq("user_id", user.id)
            .in("type_id", typeIds);
        }
      }

      // Désactiver les types liés à ce token
      await admin
        .from("appointment_types")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("google_token_id", tokenId);

      // Supprimer le token
      await admin.from("google_calendar_tokens").delete().eq("id", tokenId);
    } else {
      // Déconnecter tous les comptes
      const { data: tokens } = await admin
        .from("google_calendar_tokens")
        .select("id, access_token, webhook_channel_id, webhook_resource_id")
        .eq("user_id", user.id);

      for (const tokenRow of tokens || []) {
        if (tokenRow.webhook_channel_id && tokenRow.webhook_resource_id) {
          const { stopWatchChannel } = await import("@/lib/google-calendar");
          await stopWatchChannel(tokenRow.access_token, tokenRow.webhook_channel_id, tokenRow.webhook_resource_id).catch(() => {});
        }
      }

      await admin.from("google_calendar_tokens").delete().eq("user_id", user.id);

      // Désactiver tous les types Google
      await admin
        .from("appointment_types")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .not("google_calendar_id", "is", null);

      // Reset les appointments sync
      await admin
        .from("appointments")
        .update({ google_event_id: null, google_calendar_id: null, google_sync_status: "none" })
        .eq("requester_id", user.id)
        .not("google_event_id", "is", null);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[DELETE /api/google/auth]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/google/auth
 * Définir un compte Google comme défaut.
 * Body: { token_id: string }
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { token_id } = await request.json();
    if (!token_id) {
      return NextResponse.json({ error: "token_id requis" }, { status: 400 });
    }

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    // Retirer le défaut de tous les tokens de l'utilisateur
    await admin
      .from("google_calendar_tokens")
      .update({ is_default: false })
      .eq("user_id", user.id);

    // Définir le nouveau défaut
    await admin
      .from("google_calendar_tokens")
      .update({ is_default: true })
      .eq("id", token_id)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[PATCH /api/google/auth]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
