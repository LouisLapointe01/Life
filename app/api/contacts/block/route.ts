import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/contacts/block
 * Body: { from_user_id: string, notification_id?: string }
 *
 * Supprime le contact que `from_user_id` a créé pour l'utilisateur courant
 * (identifié par son email), et supprime la notification associée.
 */
export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await request.json();
    const { from_user_id, notification_id } = body;
    if (!from_user_id) return NextResponse.json({ error: "from_user_id requis" }, { status: 400 });

    // Email de l'utilisateur courant (depuis l'objet auth)
    const myEmail = user.email;
    if (!myEmail) return NextResponse.json({ error: "Email introuvable" }, { status: 400 });

    const supabase = createAdminClient();

    // Supprimer le(s) contact(s) où from_user_id a enregistré l'email courant
    await supabase
      .from("contacts")
      .delete()
      .eq("user_id", from_user_id)
      .ilike("email", myEmail);

    // Supprimer la notification
    if (notification_id) {
      await supabase
        .from("notifications")
        .delete()
        .eq("id", notification_id)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/contacts/block]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
