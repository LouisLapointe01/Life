import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { GOOGLE_EVENT_COLORS } from "@/lib/google-calendar";
import { NextResponse } from "next/server";

/**
 * GET /api/google/labels
 * Retourne les libellés Google Calendar de l'utilisateur avec leurs mappings.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("google_calendar_labels")
      .select("*, appointment_type:appointment_types(id, name, color, duration_min)")
      .eq("user_id", user.id)
      .order("google_color_id");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("[GET /api/google/labels]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * PATCH /api/google/labels
 * Met à jour le mapping d'un libellé Google → type de RDV Life.
 * Body: { id: uuid, life_type_id: uuid | null, google_label_name?: string }
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const { id, life_type_id, google_label_name } = body;
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

    const admin = createAdminClient();

    const updates: Record<string, unknown> = {};
    if (life_type_id !== undefined) updates.life_type_id = life_type_id;
    if (google_label_name) updates.google_label_name = google_label_name;

    const { data, error } = await admin
      .from("google_calendar_labels")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Si on a mappé un type Life, mettre à jour la couleur du type pour correspondre à Google
    if (life_type_id && data) {
      const googleColor = GOOGLE_EVENT_COLORS[data.google_color_id];
      if (googleColor) {
        await admin
          .from("appointment_types")
          .update({ color: googleColor.hex })
          .eq("id", life_type_id)
          .eq("user_id", user.id);
      }
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[PATCH /api/google/labels]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * GET /api/google/labels/colors
 * Retourne la palette complète des couleurs Google Calendar.
 */
export function OPTIONS() {
  return NextResponse.json(GOOGLE_EVENT_COLORS);
}
