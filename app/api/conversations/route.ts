import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function getAuthUser() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  return user;
}

/* ═══════════════════════════════════════════════════════
   GET /api/conversations
   Retourne les conversations du user courant triées par
   dernière activité (dernier message).
   ═══════════════════════════════════════════════════════ */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const supabase = createAdminClient();

    // 1. Récupérer les participations du user courant (exclure les supprimées)
    const { data: participations, error: pErr } = await supabase
      .from("conversation_participants")
      .select("conversation_id, unread_count")
      .eq("user_id", user.id)
      .is("deleted_at", null);

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
    if (!participations || participations.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const convIds = participations.map((p) => p.conversation_id);

    // 2+4 en parallèle : autres participants ET derniers messages en une seule passe
    const [{ data: allParticipants, error: apErr }, { data: recentMessages }] = await Promise.all([
      supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", convIds)
        .neq("user_id", user.id),
      // Une seule requête pour tous les derniers messages (au lieu de N requêtes)
      supabase
        .from("messages")
        .select("id, conversation_id, content, created_at, sender_id")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false })
        .limit(Math.min(convIds.length * 5, 200)),
    ]);

    if (apErr) return NextResponse.json({ error: apErr.message }, { status: 500 });

    // Garder uniquement le message le plus récent par conversation (résultat déjà trié DESC)
    const lastMessageMap = new Map<string, { id: string; content: string; created_at: string; sender_id: string | null }>();
    for (const msg of recentMessages || []) {
      if (!lastMessageMap.has(msg.conversation_id)) {
        lastMessageMap.set(msg.conversation_id, msg);
      }
    }

    // 3. Récupérer les profils des autres participants
    const otherUserIds = [...new Set((allParticipants || []).map((p) => p.user_id))];
    const { data: profiles } = otherUserIds.length
      ? await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", otherUserIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    // 5. Construire la réponse
    const conversations = participations
      .map((p) => {
        const otherParticipant = (allParticipants || []).find(
          (ap) => ap.conversation_id === p.conversation_id
        );
        const otherProfile = otherParticipant
          ? profileMap.get(otherParticipant.user_id)
          : null;
        const lastMessage = lastMessageMap.get(p.conversation_id);

        return {
          id: p.conversation_id,
          other_user: {
            id: otherParticipant?.user_id ?? "",
            full_name: otherProfile?.full_name ?? "Utilisateur",
            avatar_url: otherProfile?.avatar_url ?? null,
          },
          last_message: lastMessage ?? null,
          unread_count: p.unread_count,
        };
      })
      .sort((a, b) => {
        const dateA = a.last_message?.created_at ?? "";
        const dateB = b.last_message?.created_at ?? "";
        return dateB.localeCompare(dateA);
      });

    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("[GET /api/conversations]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════════════════
   POST /api/conversations
   Body: { other_user_id }
   Crée ou récupère une conversation 1-on-1.
   ═══════════════════════════════════════════════════════ */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const { other_user_id } = body;
    if (!other_user_id) return NextResponse.json({ error: "other_user_id requis" }, { status: 400 });
    if (other_user_id === user.id) return NextResponse.json({ error: "Impossible de démarrer une conv avec soi-même" }, { status: 400 });

    const supabase = createAdminClient();

    // 1. Chercher si une conversation existe déjà entre ces 2 users (inclure les deleted)
    const { data: myConvs } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (myConvs && myConvs.length > 0) {
      const myConvIds = myConvs.map((c) => c.conversation_id);
      const { data: sharedConvs } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", other_user_id)
        .in("conversation_id", myConvIds);

      if (sharedConvs && sharedConvs.length > 0) {
        // Restaurer la participation si elle avait été soft-deleted
        await supabase
          .from("conversation_participants")
          .update({ deleted_at: null })
          .eq("conversation_id", sharedConvs[0].conversation_id)
          .eq("user_id", user.id);
        return NextResponse.json({ conversation_id: sharedConvs[0].conversation_id });
      }
    }

    // 2. Créer une nouvelle conversation
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .insert({})
      .select("id")
      .single();

    if (convErr || !conv) return NextResponse.json({ error: convErr?.message ?? "Erreur création" }, { status: 500 });

    // 3. Ajouter les 2 participants
    const { error: pErr } = await supabase
      .from("conversation_participants")
      .insert([
        { conversation_id: conv.id, user_id: user.id },
        { conversation_id: conv.id, user_id: other_user_id },
      ]);

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

    return NextResponse.json({ conversation_id: conv.id });
  } catch (err) {
    console.error("[POST /api/conversations]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════════════════
   DELETE /api/conversations
   Body: { conversation_id }
   Soft-delete : marque deleted_at sur la participation du user.
   ═══════════════════════════════════════════════════════ */
export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const { conversation_id } = body;
    if (!conversation_id) return NextResponse.json({ error: "conversation_id requis" }, { status: 400 });

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("conversation_participants")
      .update({ deleted_at: new Date().toISOString() })
      .eq("conversation_id", conversation_id)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/conversations]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
