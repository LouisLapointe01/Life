import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function getAuthUser() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  return user;
}

/* ═══════════════════════════════════════════════════════
   GET /api/messages?conversation_id=xxx&limit=50
   ═══════════════════════════════════════════════════════ */
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const conversation_id = searchParams.get("conversation_id");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    if (!conversation_id) return NextResponse.json({ error: "conversation_id requis" }, { status: 400 });

    const supabase = createAdminClient();

    // Vérifier que l'user est participant
    const { data: participation } = await supabase
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", conversation_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!participation) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    // Récupérer les messages
    const { data: messages, error } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Enrichir avec les profils des expéditeurs
    const senderIds = [...new Set((messages || []).map((m) => m.sender_id).filter(Boolean))];
    const { data: profiles } = senderIds.length
      ? await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", senderIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    const enriched = (messages || []).map((m) => ({
      ...m,
      sender: m.sender_id ? (profileMap.get(m.sender_id) ?? null) : null,
    }));

    // Mettre à jour last_read_at et unread_count = 0
    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString(), unread_count: 0 })
      .eq("conversation_id", conversation_id)
      .eq("user_id", user.id);

    return NextResponse.json({ messages: enriched });
  } catch (err) {
    console.error("[GET /api/messages]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════════════════
   POST /api/messages
   Body: { conversation_id, content }
   ═══════════════════════════════════════════════════════ */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const { conversation_id, content } = body;

    if (!conversation_id || !content?.trim()) {
      return NextResponse.json({ error: "conversation_id et content requis" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Vérifier participation
    const { data: participation } = await supabase
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", conversation_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!participation) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    // Insérer le message
    const { data: message, error: msgErr } = await supabase
      .from("messages")
      .insert({ conversation_id, sender_id: user.id, content: content.trim() })
      .select("id, conversation_id, sender_id, content, created_at")
      .single();

    if (msgErr || !message) return NextResponse.json({ error: msgErr?.message ?? "Erreur" }, { status: 500 });

    // Incrémenter unread_count pour les autres participants
    const { data: others } = await supabase
      .from("conversation_participants")
      .select("id, user_id, unread_count")
      .eq("conversation_id", conversation_id)
      .neq("user_id", user.id);

    if (others && others.length > 0) {
      await Promise.all(
        others.map((o) =>
          supabase
            .from("conversation_participants")
            .update({ unread_count: o.unread_count + 1 })
            .eq("id", o.id)
        )
      );

      // Créer des notifications pour les autres participants
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      const senderName = senderProfile?.full_name ?? "Quelqu'un";

      await supabase.from("notifications").insert(
        others.map((o) => ({
          user_id: o.user_id,
          type: "message",
          title: `Nouveau message de ${senderName}`,
          body: content.trim().length > 60 ? content.trim().slice(0, 60) + "…" : content.trim(),
          from_user_id: user.id,
          from_name: senderName,
        }))
      );
    }

    // Récupérer le profil de l'expéditeur pour enrichir la réponse
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    return NextResponse.json({
      message: { ...message, sender: senderProfile ?? null },
    });
  } catch (err) {
    console.error("[POST /api/messages]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
