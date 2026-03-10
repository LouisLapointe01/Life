"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { clientCache } from "@/lib/client-cache";
import type { Message } from "@/components/messages/types";

type QueueItem = {
  optId: string;
  conversation_id: string;
  content: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
};

function msgCacheKey(convId: string) { return `messages:${convId}`; }

export function useMessages(activeConvId: string | null, myUserId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // File d'attente de messages
  const messageQueue = useRef<QueueItem[]>([]);
  const processingQueue = useRef(false);

  const shouldScrollToBottom = useRef(false);

  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true);
    shouldScrollToBottom.current = true;

    // Afficher cache immédiatement
    const cached = clientCache.get<Message[]>(msgCacheKey(convId));
    if (cached && cached.length > 0) {
      setMessages(cached);
    }

    try {
      const res = await fetch(`/api/messages?conversation_id=${convId}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        const msgs: Message[] = data.messages || [];
        setMessages(msgs);
        setHasMore(data.has_more ?? false);
        clientCache.set(msgCacheKey(convId), msgs);
      }
    } catch { /* ignore */ }
    finally { setLoadingMessages(false); }
  }, []);

  const loadMoreMessages = useCallback(async () => {
    if (!activeConvId || loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const before = messages[0].created_at;
    try {
      const res = await fetch(`/api/messages?conversation_id=${activeConvId}&limit=10&before=${encodeURIComponent(before)}`);
      if (res.ok) {
        const data = await res.json();
        if ((data.messages as Message[])?.length > 0) {
          setMessages((prev) => {
            const updated = [...data.messages, ...prev];
            clientCache.set(msgCacheKey(activeConvId), updated);
            return updated;
          });
          setHasMore(data.has_more ?? false);
        } else {
          setHasMore(false);
        }
      }
    } catch { /* ignore */ }
    finally { setLoadingMore(false); }
  }, [activeConvId, loadingMore, hasMore, messages]);

  // Processeur séquentiel de la file d'attente
  const processQueue = useCallback(async () => {
    if (processingQueue.current) return;
    processingQueue.current = true;

    while (messageQueue.current.length > 0) {
      const item = messageQueue.current[0];
      try {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: item.conversation_id,
            content: item.content,
            ...(item.file_url && { file_url: item.file_url, file_name: item.file_name, file_type: item.file_type, file_size: item.file_size }),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.message) {
            setMessages((prev) => {
              const updated = prev.map((m) => m.id === item.optId ? data.message : m);
              clientCache.set(msgCacheKey(item.conversation_id), updated);
              return updated;
            });
          }
        } else {
          // Rollback en cas d'erreur
          setMessages((prev) => prev.filter((m) => m.id !== item.optId));
        }
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== item.optId));
      }
      messageQueue.current.shift();
    }

    processingQueue.current = false;
  }, []);

  const sendMessage = useCallback((content: string, fileInfo?: { file_url: string; file_name: string; file_type: string; file_size: number }): { optId: string; now: string } | null => {
    if (!content.trim() || !activeConvId) return null;

    const optId = "opt-" + Date.now();
    const now = new Date().toISOString();
    const optimistic: Message = {
      id: optId,
      conversation_id: activeConvId,
      sender_id: myUserId,
      content: content.trim(),
      created_at: now,
      sender: null,
      ...(fileInfo && { file_url: fileInfo.file_url, file_name: fileInfo.file_name, file_type: fileInfo.file_type, file_size: fileInfo.file_size }),
    };

    shouldScrollToBottom.current = true;
    setMessages((prev) => [...prev, optimistic]);

    // Ajouter à la file d'attente
    messageQueue.current.push({
      optId,
      conversation_id: activeConvId,
      content: content.trim(),
      ...(fileInfo && { file_url: fileInfo.file_url, file_name: fileInfo.file_name, file_type: fileInfo.file_type, file_size: fileInfo.file_size }),
    });
    processQueue();

    return { optId, now };
  }, [activeConvId, myUserId, processQueue]);

  // Realtime messages
  useEffect(() => {
    if (!activeConvId) return;
    const supabase = createClient();
    const sub = supabase
      .channel("msg-rt-" + activeConvId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConvId}`,
        },
        (payload) => {
          const newMsg = payload.new as { id: string; conversation_id: string; sender_id: string | null; content: string; created_at: string };
          if (newMsg.sender_id === myUserId) return;
          shouldScrollToBottom.current = true;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            const updated = [...prev, { ...newMsg, sender: null }];
            clientCache.set(msgCacheKey(activeConvId), updated);
            return updated;
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [activeConvId, myUserId]);

  const resetMessages = useCallback(() => {
    setMessages([]);
    setHasMore(false);
    setLoadingMore(false);
  }, []);

  return {
    messages,
    setMessages,
    loadingMessages,
    initializing,
    setInitializing,
    hasMore,
    loadingMore,
    fetchMessages,
    loadMoreMessages,
    sendMessage,
    resetMessages,
    shouldScrollToBottom,
  };
}
