import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * GET /api/appointments/types?user_id=<uuid>&all=true
 * - all=true : retourne TOUS les types (actifs + inactifs) pour la gestion dans paramètres
 * - Sinon : retourne uniquement les types actifs (pour le booking)
 * - user_id : filtre par utilisateur (avec fallback global)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const all = searchParams.get("all") === "true";

    const supabase = createAdminClient();

    if (userId) {
      // Types propres à cet utilisateur
      let userQuery = supabase
        .from("appointment_types")
        .select("id, name, duration_min, color, is_active, sort_order, user_id, google_calendar_id, google_token_id")
        .eq("user_id", userId)
        .order("sort_order");
      if (!all) userQuery = userQuery.eq("is_active", true);

      const { data: userTypes, error: e1 } = await userQuery;
      if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

      if (userTypes && userTypes.length > 0) {
        return NextResponse.json(userTypes);
      }

      // Fallback : types globaux (user_id IS NULL)
      let globalQuery = supabase
        .from("appointment_types")
        .select("id, name, duration_min, color, is_active, sort_order, user_id, google_calendar_id, google_token_id")
        .is("user_id", null)
        .order("sort_order");
      if (!all) globalQuery = globalQuery.eq("is_active", true);

      const { data: globalTypes, error: e2 } = await globalQuery;
      if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

      return NextResponse.json(globalTypes || []);
    }

    // Pas de user_id → tous les types
    let query = supabase
      .from("appointment_types")
      .select("id, name, duration_min, color, is_active, sort_order, user_id, google_calendar_id, google_token_id")
      .order("sort_order");
    if (!all) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * POST /api/appointments/types
 * Créer un nouveau type de RDV.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, duration_min, color, sort_order, user_id } = body;

    if (!name) {
      return NextResponse.json({ error: "name est requis" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("appointment_types")
      .insert({
        name,
        duration_min: duration_min ? Number(duration_min) : null,
        color: color || "#007AFF",
        sort_order: sort_order ?? 0,
        user_id: user_id || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * PATCH /api/appointments/types
 * Modifier un type existant (toggle is_active, renommer, etc.)
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id est requis" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("appointment_types")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * DELETE /api/appointments/types?id=<uuid>
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id est requis" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("appointment_types")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
