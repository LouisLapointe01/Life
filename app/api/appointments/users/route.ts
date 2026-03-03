import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/appointments/users?q=...
 * Recherche les utilisateurs (profils) par nom ou email.
 * - Les utilisateurs connectés peuvent chercher par nom/prénom
 * - Les visiteurs peuvent chercher par email uniquement
 */
export async function GET(request: NextRequest) {
    const q = request.nextUrl.searchParams.get("q")?.trim();
    const mode = request.nextUrl.searchParams.get("mode") || "name"; // "name" or "email"

    if (!q || q.length < 2) {
        return NextResponse.json({ users: [] });
    }

    const supabase = await createClient();

    if (mode === "email") {
        // Recherche exacte ou partielle par email
        const { data } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, role")
            .ilike("email", `%${q}%`)
            .limit(10);

        // Si pas trouvé dans profiles, chercher dans auth.users via l'email
        if (!data || data.length === 0) {
            // Fallback: chercher dans profiles avec un join sur l'email de l'utilisateur
            const { data: profilesByEmail } = await supabase
                .rpc("search_profiles_by_email", { search_email: q.toLowerCase() });

            return NextResponse.json({
                users: (profilesByEmail || []).map((p: { id: string; full_name: string | null; avatar_url: string | null }) => ({
                    id: p.id,
                    full_name: p.full_name || "Utilisateur",
                    avatar_url: p.avatar_url,
                })),
            });
        }

        return NextResponse.json({
            users: data.map((p) => ({
                id: p.id,
                full_name: p.full_name || "Utilisateur",
                avatar_url: p.avatar_url,
            })),
        });
    }

    // mode === "name" — Recherche par nom/prénom
    const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .ilike("full_name", `%${q}%`)
        .limit(10);

    return NextResponse.json({
        users: (data || []).map((p) => ({
            id: p.id,
            full_name: p.full_name || "Utilisateur",
            avatar_url: p.avatar_url,
        })),
    });
}
