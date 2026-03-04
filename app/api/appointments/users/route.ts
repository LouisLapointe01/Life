import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/appointments/users?q=...&mode=name|email|all
 * Recherche unifiée : utilisateurs (profils) + contacts (annuaire).
 * Retourne une liste fusionnée avec { id, full_name, email, phone, has_account, source, avatar_url, is_close }.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const mode = request.nextUrl.searchParams.get("mode") || "all";

  if (!q || q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createAdminClient();
  type Result = {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    has_account: boolean;
    source: "profile" | "contact";
    avatar_url: string | null;
    is_close: boolean;
    user_id?: string; // for contacts that match a user
  };

  const results: Result[] = [];
  const seen = new Set<string>();

  // 1. Chercher dans les profils (utilisateurs inscrits)
  if (mode === "all" || mode === "name" || mode === "email") {
    const profileQuery = supabase
      .from("profiles")
      .select("id, full_name, avatar_url, email")
      .neq("id", user.id)
      .limit(10);

    if (mode === "email") {
      profileQuery.ilike("email", `%${q}%`);
    } else if (mode === "name") {
      profileQuery.ilike("full_name", `%${q}%`);
    } else {
      // mode "all" — chercher par nom OU email
      profileQuery.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
    }

    const { data: profiles } = await profileQuery;
    for (const p of profiles || []) {
      const key = `profile:${p.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          id: p.id,
          full_name: p.full_name || "Utilisateur",
          email: p.email || null,
          phone: null,
          has_account: true,
          source: "profile",
          avatar_url: p.avatar_url,
          is_close: false,
          user_id: p.id,
        });
      }
    }

    // Fallback RPC pour email si rien trouvé dans profiles
    if (results.length === 0 && (mode === "email" || mode === "all")) {
      const { data: rpcResults } = await supabase.rpc("search_profiles_by_email", { search_email: q.toLowerCase() });
      for (const r of rpcResults || []) {
        if (r.id === user.id) continue;
        const key = `profile:${r.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            id: r.id,
            full_name: r.full_name || "Utilisateur",
            email: r.email || null,
            phone: null,
            has_account: true,
            source: "profile",
            avatar_url: null,
            is_close: false,
            user_id: r.id,
          });
        }
      }
    }
  }

  // 2. Chercher dans les contacts (annuaire de l'utilisateur)
  {
    const contactQuery = supabase
      .from("contacts")
      .select("id, first_name, last_name, email, phone, is_close")
      .eq("user_id", user.id)
      .limit(10);

    if (mode === "email") {
      contactQuery.ilike("email", `%${q}%`);
    } else if (mode === "name") {
      contactQuery.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
    } else {
      contactQuery.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    const { data: contacts } = await contactQuery;

    for (const c of contacts || []) {
      const name = `${c.first_name} ${c.last_name || ""}`.trim();
      const email = c.email?.toLowerCase();

      // Vérifier si ce contact correspond à un utilisateur inscrit (par email)
      let matchedUserId: string | null = null;
      if (email) {
        // Chercher si on a déjà un profile match avec cet email
        const existing = results.find((r) => r.source === "profile" && r.email?.toLowerCase() === email);
        if (existing) {
          // Enrichir l'entrée profile avec les infos du contact
          existing.phone = existing.phone || c.phone;
          existing.is_close = c.is_close;
          continue; // Ne pas dupliquer
        }

        // Sinon chercher dans profiles par email
        const { data: matchProfile } = await supabase
          .from("profiles")
          .select("id")
          .ilike("email", email)
          .limit(1)
          .single();

        if (matchProfile) {
          matchedUserId = matchProfile.id;
          // Vérifier si déjà dans les résultats
          if (seen.has(`profile:${matchedUserId}`)) {
            const existing = results.find((r) => r.id === matchedUserId);
            if (existing) {
              existing.phone = existing.phone || c.phone;
              existing.is_close = c.is_close;
            }
            continue;
          }
        }
      }

      const key = `contact:${c.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          id: matchedUserId || c.id,
          full_name: name,
          email: c.email || null,
          phone: c.phone || null,
          has_account: !!matchedUserId,
          source: "contact",
          avatar_url: null,
          is_close: c.is_close,
          user_id: matchedUserId || undefined,
        });
      }
    }
  }

  return NextResponse.json({ users: results });
}
