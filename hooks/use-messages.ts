"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { clientCache } from "@/lib/client-cache";
import type { Message } from "@/components/messages/types";

function msgCacheKey(convId: string) { return `messages:${convId}`; }

export function useMessages(activeConvId: string | null, myUserId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const shouldScrollToBottom = useRef(false);
  const scrollBehaviorRef = useRef<ScrollBehavior>("auto");
  const deliveryTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const normalizeMessage = useCallback((message: Message): Message => {
    if (message.sender_id && message.sender_id === myUserId && !message.delivery_status) {
      return { ...message, delivery_status: "delivered" };
    }
    return message;
  }, [myUserId]);

  const updateMessagesForConversation = useCallback((convId: string, updater: (prev: Message[]) => Message[]) => {
    setMessages((prev) => {
      const updated = updater(prev);
      clientCache.set(msgCacheKey(convId), updated);
      return updated;
    });
  }, []);

  const scheduleDelivered = useCallback((convId: string, messageId: string) => {
    const existingTimer = deliveryTimersRef.current.get(messageId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      updateMessagesForConversation(convId, (prev) =>
        prev.map((message) =>
          message.id === messageId && message.delivery_status === "sent"
            ? { ...message, delivery_status: "delivered" }
            : message
        )
      );
      deliveryTimersRef.current.delete(messageId);
    }, 260);

    deliveryTimersRef.current.set(messageId, timer);
  }, [updateMessagesForConversation]);

  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true);
    shouldScrollToBottom.current = true;
    scrollBehaviorRef.current = "auto";

    // Afficher cache immédiatement
    const cached = clientCache.get<Message[]>(msgCacheKey(convId));
    if (cached && cached.length > 0) {
      setMessages(cached);
    }

    try {
      const res = await fetch(`/api/messages?conversation_id=${convId}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        const msgs: Message[] = (data.messages || []).map((message: Message) => normalizeMessage(message));
        setMessages(msgs);
        setHasMore(data.has_more ?? false);
        clientCache.set(msgCacheKey(convId), msgs);
      }
    } catch { /* ignore */ }
    finally { setLoadingMessages(false); }
  }, [normalizeMessage]);

  const loadMoreMessages = useCallback(async () => {
    if (!activeConvId || loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const before = messages[0].created_at;
    try {
      const res = await fetch(`/api/messages?conversation_id=${activeConvId}&limit=10&before=${encodeURIComponent(before)}`);
      if (res.ok) {
        const data = await res.json();
        const nextMessages = ((data.messages as Message[]) || []).map((message) => normalizeMessage(message));
        if (nextMessages.length > 0) {
          updateMessagesForConversation(activeConvId, (prev) => [...nextMessages, ...prev]);
          setHasMore(data.has_more ?? false);
        } else {
          setHasMore(false);
        }
      }
    } catch { /* ignore */ }
    finally { setLoadingMore(false); }
  }, [activeConvId, loadingMore, hasMore, messages, normalizeMessage, updateMessagesForConversation]);

  const sendQueuedMessage = useCallback(async (
    optId: string,
    conversationId: string,
    content: string,
    fileInfo?: { file_url: string; file_name: string; file_type: string; file_size: number }
  ) => {
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          content,
          ...(fileInfo && { file_url: fileInfo.file_url, file_name: fileInfo.file_name, file_type: fileInfo.file_type, file_size: fileInfo.file_size }),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          const nextMessage = { ...data.message, delivery_status: "sent" as const };
          updateMessagesForConversation(conversationId, (prev) =>
            prev.map((message) => (message.id === optId ? nextMessage : message))
          );
          scheduleDelivered(conversationId, nextMessage.id);
          return;
        }
      }

      updateMessagesForConversation(conversationId, (prev) =>
        prev.map((message) =>
          message.id === optId ? { ...message, delivery_status: "failed" as const } : message
        )
      );
    } catch {
      updateMessagesForConversation(conversationId, (prev) =>
        prev.map((message) =>
          message.id === optId ? { ...message, delivery_status: "failed" as const } : message
        )
      );
    }
  }, [scheduleDelivered, updateMessagesForConversation]);

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
      delivery_status: "sending",
      ...(fileInfo && { file_url: fileInfo.file_url, file_name: fileInfo.file_name, file_type: fileInfo.file_type, file_size: fileInfo.file_size }),
    };

    shouldScrollToBottom.current = true;
    scrollBehaviorRef.current = "smooth";
    updateMessagesForConversation(activeConvId, (prev) => [...prev, optimistic]);
    void sendQueuedMessage(optId, activeConvId, content.trim(), fileInfo);

    return { optId, now };
  }, [activeConvId, myUserId, sendQueuedMessage, updateMessagesForConversation]);

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
          scrollBehaviorRef.current = "smooth";
          updateMessagesForConversation(activeConvId, (prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, { ...newMsg, sender: null }];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [activeConvId, myUserId, updateMessagesForConversation]);

  useEffect(() => {
    return () => {
      deliveryTimersRef.current.forEach((timer) => clearTimeout(timer));
      deliveryTimersRef.current.clear();
    };
  }, []);

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
    scrollBehaviorRef,
  };
}
