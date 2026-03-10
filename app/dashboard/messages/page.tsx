"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useUnreadMessages } from "@/lib/stores/unread-messages";
import { Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { ConversationList } from "@/components/messages/ConversationList";
import { ChatView } from "@/components/messages/ChatView";
import { useConversations } from "@/hooks/use-conversations";
import { useMessages } from "@/hooks/use-messages";
import { toast } from "sonner";
import type { Conversation, Message } from "@/components/messages/types";

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesPageInner />
    </Suspense>
  );
}

function MessagesPageInner() {
  const searchParams = useSearchParams();
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [deleteConvTarget, setDeleteConvTarget] = useState<Conversation | null>(null);
  const [deletingConv, setDeletingConv] = useState(false);
  const [startingConv, setStartingConv] = useState<string | null>(null);
  const convOpenedAtRef = useRef<number>(0);

  // Hooks
  const {
    conversations, loading: loadingConvs, fetchConversations,
    updateConversation, removeConversation, setActiveConvIdRef,
  } = useConversations(myUserId);

  const {
    messages, loadingMessages, initializing, setInitializing,
    hasMore, loadingMore, fetchMessages, loadMoreMessages,
    sendMessage: sendMsg, resetMessages,
    shouldScrollToBottom,
    scrollBehaviorRef,
  } = useMessages(activeConvId, myUserId);

  // Récupérer l'userId courant
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setMyUserId(data.user?.id ?? null));
  }, []);

  // Ouvrir une conversation
  const openConversation = useCallback((conv: Conversation) => {
    convOpenedAtRef.current = Date.now();
    setInitializing(true);
    setActiveConvId(conv.id);
    setActiveConv(conv);
    setActiveConvIdRef(conv.id);
    resetMessages();
    fetchMessages(conv.id);
    setMobileView("chat");

    if (conv.unread_count > 0) {
      updateConversation(conv.id, { unread_count: 0 });
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_messages_read_from: conv.other_user.id }),
      }).catch(() => {});
      useUnreadMessages.getState().markConversationRead(conv.unread_count);
    }
  }, [fetchMessages, resetMessages, setInitializing, setActiveConvIdRef, updateConversation]);

  // Auto-ouverture via ?conv=
  const convParam = searchParams.get("conv");
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (convParam && !loadingConvs && conversations.length > 0 && !autoOpenedRef.current) {
      const found = conversations.find((c) => c.id === convParam);
      if (found) {
        autoOpenedRef.current = true;
        openConversation(found);
      }
    }
  }, [convParam, loadingConvs, conversations, openConversation]);

  // Envoyer un message
  const handleSend = useCallback(() => {
    if (!newMessage.trim() || !activeConvId) return;
    const content = newMessage.trim();
    setNewMessage("");
    const result = sendMsg(content);
    if (result) {
      updateConversation(activeConvId, {
        last_message: { content, created_at: result.now, sender_id: myUserId },
      });
    }
  }, [newMessage, activeConvId, sendMsg, updateConversation, myUserId]);

  // Démarrer une conversation avec un nouvel utilisateur
  const startConversation = useCallback(async (userId: string) => {
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
        const convRes = await fetch("/api/conversations");
        if (convRes.ok) {
          const convData = await convRes.json();
          const found = (convData.conversations || []).find((c: Conversation) => c.id === data.conversation_id);
          if (found) openConversation(found);
        }
      }
    } catch { /* ignore */ }
    finally { setStartingConv(null); }
  }, [fetchConversations, openConversation]);

  // Supprimer une conversation
  const deleteConversation = useCallback(async (conv: Conversation) => {
    setDeletingConv(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conv.id }),
      });
      if (res.ok) {
        removeConversation(conv.id);
        if (activeConvId === conv.id) {
          setActiveConvId(null);
          setActiveConv(null);
          setActiveConvIdRef(null);
          resetMessages();
          setMobileView("list");
        }
      }
    } catch { /* ignore */ }
    finally { setDeletingConv(false); setDeleteConvTarget(null); }
  }, [activeConvId, removeConversation, resetMessages, setActiveConvIdRef]);

  // Envoyer un GIF (URL comme contenu du message)
  const handleSendGif = useCallback((url: string) => {
    if (!activeConvId) return;
    const result = sendMsg(url);
    if (result) {
      updateConversation(activeConvId, {
        last_message: { content: "GIF", created_at: result.now, sender_id: myUserId },
      });
    }
  }, [activeConvId, sendMsg, updateConversation, myUserId]);

  // Upload et envoyer un fichier
  const handleFileSelect = useCallback(async (file: File) => {
    if (!activeConvId || !myUserId) return;
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "bin";
    const path = `${myUserId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("message-files")
      .upload(path, file);

    if (error) {
      toast.error("Erreur lors de l'upload du fichier");
      return;
    }

    const { data: urlData } = supabase.storage.from("message-files").getPublicUrl(path);
    const fileUrl = urlData.publicUrl;

    const result = sendMsg(file.name, {
      file_url: fileUrl,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    });
    if (result) {
      updateConversation(activeConvId, {
        last_message: { content: `Fichier : ${file.name}`, created_at: result.now, sender_id: myUserId },
      });
    }
  }, [activeConvId, myUserId, sendMsg, updateConversation]);

  // Sauvegarder un fichier reçu dans Documents
  const handleSaveFile = useCallback(async (msg: Message) => {
    if (!msg.file_url || !msg.file_name) return;
    try {
      const response = await fetch(msg.file_url);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append("file", blob, msg.file_name);

      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        toast.success("Fichier sauvegardé dans Documents");
      } else {
        toast.error("Erreur lors de la sauvegarde");
      }
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
  }, []);

  // Toggle favori
  const toggleFavorite = useCallback(async (conv: Conversation) => {
    const newFav = !conv.is_favorite;
    updateConversation(conv.id, { is_favorite: newFav });
    try {
      await fetch("/api/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conv.id, is_favorite: newFav }),
      });
      fetchConversations(); // Re-fetch pour le tri correct
    } catch {
      updateConversation(conv.id, { is_favorite: !newFav }); // Rollback
    }
  }, [updateConversation, fetchConversations]);

  // Désactiver le scroll du main
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    main.style.overflow = "hidden";
    return () => { main.style.overflow = ""; };
  }, []);

  return (
    <div className="-mx-4 -mt-4 -mb-[120px] flex h-[calc(100dvh-3.5rem)] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(0,122,255,0.10),_transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.24),transparent_18%),linear-gradient(135deg,#edf6ff_0%,#e8f2fb_38%,#eef0ff_100%)] lg:-mx-8 lg:-mt-6 lg:-mb-6 lg:h-dvh dark:bg-[radial-gradient(circle_at_top,_rgba(10,132,255,0.18),_transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_18%),linear-gradient(135deg,#06111b_0%,#091521_38%,#101425_100%)]">
      <ConversationList
        conversations={conversations}
        activeConvId={activeConvId}
        loadingConvs={loadingConvs}
        onOpenConversation={openConversation}
        onDeleteConversation={setDeleteConvTarget}
        onStartConversation={startConversation}
        onToggleFavorite={toggleFavorite}
        startingConv={startingConv}
        mobileView={mobileView}
      />

      <div className={cn("flex min-w-0 flex-1 flex-col overflow-hidden", mobileView === "list" && "hidden lg:flex")}>
        <ChatView
          activeConv={activeConv}
          messages={messages}
          myUserId={myUserId}
          loadingMessages={loadingMessages}
          initializing={initializing}
          hasMore={hasMore}
          loadingMore={loadingMore}
          newMessage={newMessage}
          onNewMessageChange={setNewMessage}
          onSend={handleSend}
          onSendGif={handleSendGif}
          onFileSelect={handleFileSelect}
          onSaveFile={handleSaveFile}
          onInitialized={() => setInitializing(false)}
          onLoadMore={loadMoreMessages}
          onBack={() => setMobileView("list")}
          convOpenedAt={convOpenedAtRef.current}
          shouldScrollToBottomRef={shouldScrollToBottom}
          scrollBehaviorRef={scrollBehaviorRef}
        />
      </div>

      {/* Dialog suppression */}
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
