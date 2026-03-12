import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/unavailability?user_id=UUID
 * Retourne les plages d'indisponibilité fixes d'un utilisateur.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = createAdminClient();
    const targetUserId = userId || user.id;

    const { data, error } = await admin
      .from("unavailability_blocks")
      .select("*")
      .eq("user_id", targetUserId)
      .order("day_of_week")
      .order("start_time");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (err) {
    console.error("[GET /api/unavailability]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * POST /api/unavailability
 * Crée une nouvelle plage d'indisponibilité.
 * Body: { label?, day_of_week?, start_time, end_time, is_recurring?, specific_date? }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const { label, day_of_week, start_time, end_time, is_recurring, specific_date } = body;

    if (!start_time || !end_time) {
      return NextResponse.json({ error: "start_time et end_time requis" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("unavailability_blocks")
      .insert({
        user_id: user.id,
        label: label || "Indisponible",
        day_of_week: day_of_week ?? null,
        start_time,
        end_time,
        is_recurring: is_recurring ?? true,
        specific_date: specific_date || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[POST /api/unavailability]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * PATCH /api/unavailability
 * Met à jour une plage d'indisponibilité.
 * Body: { id, ...updates }
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("unavailability_blocks")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[PATCH /api/unavailability]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * DELETE /api/unavailability?id=UUID
 * Supprime une plage d'indisponibilité.
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = createAdminClient();
    const { error } = await admin
      .from("unavailability_blocks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/unavailability]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
