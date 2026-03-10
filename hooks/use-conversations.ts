"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { clientCache } from "@/lib/client-cache";
import type { Conversation } from "@/components/messages/types";

const CACHE_KEY = "conversations";

export function useConversations(myUserId: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    return clientCache.get<Conversation[]>(CACHE_KEY) ?? [];
  });
  const [loading, setLoading] = useState(!clientCache.get(CACHE_KEY));
  const activeConvIdRef = useRef<string | null>(null);

  const setActiveConvIdRef = useCallback((id: string | null) => {
    activeConvIdRef.current = id;
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        const convs: Conversation[] = data.conversations || [];
        setConversations(convs);
        clientCache.set(CACHE_KEY, convs);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Realtime: nouvelle conversation créée avec moi
  useEffect(() => {
    if (!myUserId) return;
    const supabase = createClient();
    const sub = supabase
      .channel("conv-new-rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversation_participants", filter: `user_id=eq.${myUserId}` },
        () => { fetchConversations(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [myUserId, fetchConversations]);

  // Realtime: mise à jour liste conversations (nouveau message)
  useEffect(() => {
    if (!myUserId) return;
    const supabase = createClient();
    const sub = supabase
      .channel("conv-list-rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as { id: string; conversation_id: string; sender_id: string | null; content: string; created_at: string };
          if (msg.sender_id === myUserId) return;
          setConversations((prev) => {
            const updated = prev.map((c) =>
              c.id === msg.conversation_id
                ? {
                    ...c,
                    last_message: { content: msg.content, created_at: msg.created_at, sender_id: msg.sender_id },
                    unread_count: c.id === activeConvIdRef.current ? c.unread_count : c.unread_count + 1,
                  }
                : c
            );
            const sorted = updated.sort((a, b) => {
              const ta = a.last_message?.created_at ?? "";
              const tb = b.last_message?.created_at ?? "";
              return tb.localeCompare(ta);
            });
            clientCache.set(CACHE_KEY, sorted);
            return sorted;
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [myUserId]);

  const updateConversation = useCallback((convId: string, updates: Partial<Conversation>) => {
    setConversations((prev) => {
      const updated = prev.map((c) => c.id === convId ? { ...c, ...updates } : c);
      clientCache.set(CACHE_KEY, updated);
      return updated;
    });
  }, []);

  const removeConversation = useCallback((convId: string) => {
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== convId);
      clientCache.set(CACHE_KEY, updated);
      return updated;
    });
  }, []);

  return {
    conversations,
    setConversations,
    loading,
    fetchConversations,
    updateConversation,
    removeConversation,
    setActiveConvIdRef,
  };
}
