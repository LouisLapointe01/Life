import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * GET /api/appointments/availability?user_id=<uuid>
 * Retourne les règles de disponibilité (toutes, actives + inactives) pour la gestion.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    const supabase = createAdminClient();

    let query = supabase
      .from("availability_rules")
      .select("id, day_of_week, start_time, end_time, is_active, user_id")
      .order("day_of_week")
      .order("start_time");

    if (userId) {
      // Règles propres à l'utilisateur
      const { data: userRules } = await query.eq("user_id", userId);

      if (userRules && userRules.length > 0) {
        return NextResponse.json(userRules);
      }

      // Fallback : règles globales
      const { data: globalRules } = await supabase
        .from("availability_rules")
        .select("id, day_of_week, start_time, end_time, is_active, user_id")
        .is("user_id", null)
        .order("day_of_week")
        .order("start_time");

      return NextResponse.json(globalRules || []);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * POST /api/appointments/availability
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { day_of_week, start_time, end_time, user_id } = body;

    if (day_of_week === undefined || !start_time || !end_time) {
      return NextResponse.json({ error: "day_of_week, start_time et end_time sont requis" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("availability_rules")
      .insert({
        day_of_week: Number(day_of_week),
        start_time,
        end_time,
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
 * PATCH /api/appointments/availability
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
      .from("availability_rules")
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
 * DELETE /api/appointments/availability?id=<uuid>
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
      .from("availability_rules")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
