"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  MessageCircle,
  Search,
  X,
  ArrowLeft,
  Send,
  Loader2,
  Trash2,
  MoreVertical,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */

type Conversation = {
  id: string;
  other_user: { id: string; full_name: string; avatar_url: string | null };
  last_message: { content: string; created_at: string; sender_id: string | null } | null;
  unread_count: number;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  created_at: string;
  sender: { full_name: string; avatar_url: string | null } | null;
};

type UserResult = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string | null;
  has_account: boolean;
};

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Hier";
  return `${d}j`;
}

function Avatar({
  url,
  name,
  size = 40,
}: {
  url: string | null;
  name: string;
  size?: number;
}) {
  const initial = name.charAt(0).toUpperCase();
  const style = { width: size, height: size };
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={style}
        className="rounded-full object-cover shrink-0"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div
      style={style}
      className="rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-semibold shrink-0"
    >
      <span style={{ fontSize: size * 0.38 }}>{initial}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Page
   ═══════════════════════════════════════════ */

export default function MessagesPage() {
  const [myUserId, setMyUserId] = useState<string | null>(null);

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);

  // Chat actif
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Envoi
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Recherche nouvel utilisateur
  const [searchUser, setSearchUser] = useState("");
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [startingConv, setStartingConv] = useState<string | null>(null);

  // Mobile view
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // Suppression conversation
  const [deleteConvTarget, setDeleteConvTarget] = useState<Conversation | null>(null);
  const [deletingConv, setDeletingConv] = useState(false);

  // Pagination
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollToBottom = useRef(false);
  const userScrolledUp = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ─── Récupérer l'userId courant ─── */
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setMyUserId(data.user?.id ?? null));
  }, []);

  /* ─── Fetch conversations ─── */
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch { /* ignore */ }
    finally { setLoadingConvs(false); }
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  /* ─── Realtime: mise à jour liste conversations ─── */
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
          // Ignorer nos propres messages (déjà mis à jour en optimistic)
          if (msg.sender_id === myUserId) return;
          setConversations((prev) => {
            const updated = prev.map((c) =>
              c.id === msg.conversation_id
                ? {
                    ...c,
                    last_message: { content: msg.content, created_at: msg.created_at, sender_id: msg.sender_id },
                    unread_count: c.id === activeConvId ? c.unread_count : c.unread_count + 1,
                  }
                : c
            );
            // Trier : conversation avec le dernier message en premier
            return updated.sort((a, b) => {
              const ta = a.last_message?.created_at ?? "";
              const tb = b.last_message?.created_at ?? "";
              return tb.localeCompare(ta);
            });
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [myUserId, activeConvId]);

  /* ─── Fetch messages (derniers 10) ─── */
  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true);
    shouldScrollToBottom.current = true;
    try {
      const res = await fetch(`/api/messages?conversation_id=${convId}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setHasMore(data.has_more ?? false);
        setConversations((prev) =>
          prev.map((c) => c.id === convId ? { ...c, unread_count: 0 } : c)
        );
      }
    } catch { /* ignore */ }
    finally { setLoadingMessages(false); }
  }, []);

  /* ─── Charger plus (scroll vers le haut) ─── */
  const loadMoreMessages = useCallback(async () => {
    if (!activeConvId || loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const before = messages[0].created_at;
    const container = scrollContainerRef.current;
    const oldScrollHeight = container?.scrollHeight ?? 0;
    try {
      const res = await fetch(`/api/messages?conversation_id=${activeConvId}&limit=10&before=${encodeURIComponent(before)}`);
      if (res.ok) {
        const data = await res.json();
        if ((data.messages as Message[])?.length > 0) {
          setMessages((prev) => [...data.messages, ...prev]);
          setHasMore(data.has_more ?? false);
          requestAnimationFrame(() => {
            if (container) container.scrollTop = container.scrollHeight - oldScrollHeight;
          });
        } else {
          setHasMore(false);
        }
      }
    } catch { /* ignore */ }
    finally { setLoadingMore(false); }
  }, [activeConvId, loadingMore, hasMore, messages]);

  /* ─── Ouvrir une conversation ─── */
  const openConversation = useCallback((conv: Conversation) => {
    userScrolledUp.current = false;
    setActiveConvId(conv.id);
    setActiveConv(conv);
    setMessages([]);
    setHasMore(false);
    setLoadingMore(false);
    fetchMessages(conv.id);
    setMobileView("chat");
  }, [fetchMessages]);

  /* ─── Realtime messages ─── */
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
          // Ignorer si c'est notre propre message (déjà ajouté en optimistic)
          if (newMsg.sender_id === myUserId) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, { ...newMsg, sender: null }];
          });
          // Mettre à jour le dernier message dans la liste
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConvId
                ? { ...c, last_message: { content: newMsg.content, created_at: newMsg.created_at, sender_id: newMsg.sender_id } }
                : c
            )
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [activeConvId, myUserId]);

  /* ─── Scroll instantané vers le bas après chargement initial ou envoi ─── */
  useEffect(() => {
    if (shouldScrollToBottom.current) {
      // Toujours remettre le flag à false pour éviter qu'il reste bloqué
      shouldScrollToBottom.current = false;
      if (!loadingMessages && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        userScrolledUp.current = false;
      }
    } else if (!loadingMessages && scrollContainerRef.current) {
      // Nouveau message realtime : scroller vers le bas uniquement si l'utilisateur
      // n'a pas scrollé vers le haut manuellement
      if (!userScrolledUp.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }
  }, [messages, loadingMessages]);

  /* ─── Handler scroll : charger plus en haut ─── */
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    // Détecter si l'utilisateur a scrollé vers le haut (plus de 100px du bas)
    userScrolledUp.current = el.scrollHeight - el.scrollTop - el.clientHeight > 100;
    if (el.scrollTop < 80 && hasMore && !loadingMore) {
      loadMoreMessages();
    }
  }, [hasMore, loadingMore, loadMoreMessages]);

  /* ─── Envoyer un message ─── */
  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConvId || sending) return;
    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);

    // Optimistic update — ajout immédiat sans attendre le serveur
    const optId = "opt-" + Date.now();
    const now = new Date().toISOString();
    const optimistic: Message = {
      id: optId,
      conversation_id: activeConvId,
      sender_id: myUserId,
      content,
      created_at: now,
      sender: null,
    };
    shouldScrollToBottom.current = true;
    setMessages((prev) => [...prev, optimistic]);

    // Mettre à jour la conversation localement
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId
          ? { ...c, last_message: { content, created_at: now, sender_id: myUserId } }
          : c
      )
    );

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: activeConvId, content }),
      });
      if (res.ok) {
        const data = await res.json();
        // Remplacer le message optimiste par le vrai message retourné
        if (data.message) {
          setMessages((prev) =>
            prev.map((m) => m.id === optId ? data.message : m)
          );
        }
      } else {
        // Rollback en cas d'erreur
        setMessages((prev) => prev.filter((m) => m.id !== optId));
        setNewMessage(content);
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optId));
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  /* ─── Recherche utilisateurs ─── */
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (searchUser.length < 2) { setUserResults([]); return; }

    searchDebounce.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/appointments/users?q=${encodeURIComponent(searchUser)}&mode=all`);
        if (res.ok) {
          const data = await res.json();
          setUserResults((data.users || []).filter((u: UserResult) => u.has_account));
        }
      } catch { /* ignore */ }
      finally { setSearchLoading(false); }
    }, 300);
  }, [searchUser]);

  /* ─── Démarrer une conversation ─── */
  const startConversation = async (userId: string) => {
    setStartingConv(userId);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ other_user_id: userId }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchConversations();
        setSearchUser("");
        setUserResults([]);
        // Trouver la conv dans la liste et l'ouvrir
        const convRes = await fetch("/api/conversations");
        if (convRes.ok) {
          const convData = await convRes.json();
          const convs: Conversation[] = convData.conversations || [];
          setConversations(convs);
          const found = convs.find((c) => c.id === data.conversation_id);
          if (found) openConversation(found);
        }
      }
    } catch { /* ignore */ }
    finally { setStartingConv(null); }
  };

  /* ─── Supprimer une conversation ─── */
  const deleteConversation = async (conv: Conversation) => {
    setDeletingConv(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conv.id }),
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== conv.id));
        if (activeConvId === conv.id) {
          setActiveConvId(null);
          setActiveConv(null);
          setMessages([]);
          setMobileView("list");
        }
      }
    } catch { /* ignore */ }
    finally {
      setDeletingConv(false);
      setDeleteConvTarget(null);
    }
  };

  /* ─── Keyboard handler ─── */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ─── Désactiver le scroll du main (desktop + mobile chat) ─── */
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    main.style.overflow = "hidden";
    return () => { main.style.overflow = ""; };
  }, []);

  /* ─── Render ─── */
  return (
    <div
      className="-mx-4 -mt-4 -mb-[120px] lg:-mx-8 lg:-mt-6 lg:-mb-6 flex overflow-hidden h-[calc(100dvh-3.5rem)] lg:h-dvh"
    >
      {/* ══════════════════════════════════
          Colonne gauche — liste des convs
          ══════════════════════════════════ */}
      <div
        className={cn(
          "flex flex-col w-full lg:w-[300px] xl:w-[340px] shrink-0",
          "border-r border-foreground/[0.06]",
          // Mobile: masquer si on est en vue chat
          mobileView === "chat" && "hidden lg:flex"
        )}
      >
        {/* Recherche utilisateur — toujours visible */}
        <div className="px-4 py-3 border-b border-foreground/[0.06]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              placeholder="Rechercher un utilisateur…"
              className="w-full rounded-xl border border-foreground/[0.08] bg-foreground/[0.03] pl-9 pr-8 py-2 text-[13px] outline-none focus:border-primary/50 transition-colors"
            />
            {searchUser && (
              <button
                onClick={() => { setSearchUser(""); setUserResults([]); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Résultats recherche */}
          {searchLoading && (
            <div className="flex justify-center pt-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!searchLoading && userResults.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {userResults.map((u) => {
                const existingConv = conversations.find((c) => c.other_user.id === u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      if (existingConv) {
                        openConversation(existingConv);
                        setSearchUser("");
                        setUserResults([]);
                      } else {
                        startConversation(u.id);
                      }
                    }}
                    disabled={startingConv === u.id}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-foreground/[0.06] transition-colors disabled:opacity-50"
                  >
                    <Avatar url={u.avatar_url} name={u.full_name} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{u.full_name}</p>
                      {u.email && <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>}
                    </div>
                    {startingConv === u.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    ) : !existingConv ? (
                      <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Nouveau</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
          {!searchLoading && searchUser.length >= 2 && userResults.length === 0 && (
            <p className="pt-3 text-center text-[12px] text-muted-foreground">Aucun utilisateur trouvé</p>
          )}
        </div>

        {/* Liste des conversations */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex justify-center pt-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
              <MessageCircle className="h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="text-[13px] font-medium text-muted-foreground">Aucune conversation</p>
              <p className="text-[12px] text-muted-foreground/60 mt-1">
                Recherchez un utilisateur pour démarrer
              </p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors border-b border-foreground/[0.04] last:border-0",
                  activeConvId === conv.id
                    ? "bg-primary/[0.06]"
                    : "hover:bg-foreground/[0.04]"
                )}
              >
                <button onClick={() => openConversation(conv)} className="flex flex-1 items-center gap-3 min-w-0 overflow-hidden">
                  <Avatar url={conv.other_user.avatar_url} name={conv.other_user.full_name} size={40} />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <p className={cn("text-[13px] truncate", conv.unread_count > 0 ? "font-semibold" : "font-medium")}>
                        {conv.other_user.full_name}
                      </p>
                      {conv.last_message && (
                        <span className="text-[10px] text-muted-foreground/60 shrink-0 ml-2">
                          {timeAgo(conv.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5 gap-2 min-w-0 overflow-hidden">
                      <p className={cn(
                        "text-[12px] truncate flex-1 min-w-0",
                        conv.unread_count > 0 ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {conv.last_message?.content ?? "Démarrer la conversation"}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="ml-2 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shrink-0">
                          {conv.unread_count > 9 ? "9+" : conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteConvTarget(conv); }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground/50 transition-all hover:bg-foreground/[0.06] hover:text-foreground opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ══════════════════════════════════
          Colonne droite — chat actif
          ══════════════════════════════════ */}
      <div
        className={cn(
          "flex flex-col flex-1 overflow-hidden",
          mobileView === "list" && "hidden lg:flex"
        )}
      >
        {!activeConv ? (
          /* État vide */
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="h-16 w-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-4">
              <MessageCircle className="h-8 w-8 text-teal-500" />
            </div>
            <p className="text-[15px] font-semibold">Vos messages</p>
            <p className="text-[13px] text-muted-foreground mt-1">
              Sélectionnez une conversation ou démarrez-en une nouvelle
            </p>
          </div>
        ) : (
          <div className="relative flex-1 overflow-hidden">
            {/* Header chat — flottant au-dessus des messages */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
              <button
                onClick={() => setMobileView("list")}
                className="flex lg:hidden h-9 w-9 items-center justify-center rounded-full bg-background/70 backdrop-blur-xl text-muted-foreground hover:bg-background/90 hover:text-foreground transition-all shadow-md"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2 rounded-full bg-background/70 backdrop-blur-xl pl-1 pr-3 py-1 shadow-md">
                <Avatar url={activeConv.other_user.avatar_url} name={activeConv.other_user.full_name} size={28} />
                <p className="text-[13px] font-semibold">{activeConv.other_user.full_name}</p>
              </div>
            </div>

            {/* Zone messages — scrollable, avec padding pour les éléments flottants */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="absolute inset-0 overflow-y-auto overscroll-contain no-scrollbar px-4 pt-14 pb-[72px] space-y-3"
            >
              {/* Indicateur chargement messages plus anciens */}
              {loadingMore && (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!hasMore && messages.length > 0 && (
                <p className="text-center text-[11px] text-muted-foreground/40 py-2">Début de la conversation</p>
              )}
              {loadingMessages ? (
                <div className="flex justify-center pt-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-[12px] text-muted-foreground">Aucun message. Dites bonjour !</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === myUserId;
                  return (
                    <div key={msg.id} className={cn("flex gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
                      {!isMe && (
                        <Avatar
                          url={msg.sender?.avatar_url ?? activeConv.other_user.avatar_url}
                          name={msg.sender?.full_name ?? activeConv.other_user.full_name}
                          size={28}
                        />
                      )}
                      <div className={cn("flex flex-col min-w-0", isMe ? "items-end max-w-[75%]" : "items-start max-w-[75%]")}>
                        <div
                          className={cn(
                            "px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-wrap break-all overflow-hidden",
                            isMe
                              ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                              : "bg-foreground/[0.06] rounded-2xl rounded-bl-sm"
                          )}
                        >
                          {msg.content}
                        </div>
                        <span className="mt-1 text-[10px] text-muted-foreground">
                          {timeAgo(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Zone saisie — flottante en bas */}
            <div className="absolute bottom-0 left-0 right-0 z-20 flex items-end gap-2 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] lg:pb-3">
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrire un message…"
                rows={1}
                className={cn(
                  "flex-1 resize-none rounded-2xl border border-foreground/[0.08] bg-background/80 backdrop-blur-xl",
                  "px-4 py-2.5 text-[13px] outline-none focus:border-primary/40",
                  "max-h-32 overflow-y-auto shadow-sm"
                )}
                style={{ minHeight: 42 }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 128) + "px";
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className={cn(
                  "flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full transition-all shadow-sm",
                  newMessage.trim()
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-foreground/[0.06] backdrop-blur-xl text-muted-foreground"
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog suppression conversation */}
      <Dialog open={!!deleteConvTarget} onOpenChange={(o) => !o && setDeleteConvTarget(null)}>
        <DialogContent className="rounded-3xl sm:max-w-sm">
          <DialogHeader><DialogTitle>Supprimer la conversation</DialogTitle></DialogHeader>
          <div className="space-y-5 pt-1">
            <p className="text-[14px] text-white/60 leading-relaxed">
              Supprimer la conversation avec <span className="font-semibold text-white">{deleteConvTarget?.other_user.full_name}</span> ? Les messages resteront visibles pour l&apos;autre personne.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConvTarget(null)} className="flex-1 rounded-2xl bg-white/[0.06] py-3 text-[13px] font-medium text-white/60 transition-all hover:bg-white/[0.1] hover:text-white">Annuler</button>
              <button onClick={() => deleteConvTarget && deleteConversation(deleteConvTarget)} disabled={deletingConv} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500 py-3 text-[13px] font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:shadow-xl disabled:opacity-50">
                {deletingConv ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Supprimer
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
