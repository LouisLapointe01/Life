import { useLayoutEffect, useRef, useEffect, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import { Avatar } from "./Avatar";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import type { Conversation, Message } from "./types";

interface ChatViewProps {
  activeConv: Conversation | null;
  messages: Message[];
  myUserId: string | null;
  loadingMessages: boolean;
  initializing: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  newMessage: string;
  onNewMessageChange: (v: string) => void;
  onSend: () => void;
  onSendGif?: (url: string) => void;
  onFileSelect?: (file: File) => void;
  onSaveFile?: (msg: Message) => void;
  onInitialized?: () => void;
  onLoadMore: () => void;
  onBack: () => void;
  convOpenedAt: number;
  shouldScrollToBottomRef: React.MutableRefObject<boolean>;
  scrollBehaviorRef: React.MutableRefObject<ScrollBehavior>;
}

export function ChatView({
  activeConv,
  messages,
  myUserId,
  loadingMessages,
  initializing,
  hasMore,
  loadingMore,
  newMessage,
  onNewMessageChange,
  onSend,
  onSendGif,
  onFileSelect,
  onSaveFile,
  onInitialized,
  onLoadMore,
  onBack,
  convOpenedAt,
  shouldScrollToBottomRef,
  scrollBehaviorRef,
}: ChatViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const loadMoreScrollRestoreRef = useRef<number>(0);
  const autoFillingRef = useRef(false);
  const [showMobileMask, setShowMobileMask] = useState(false);
  const [mobileMaskVisible, setMobileMaskVisible] = useState(false);

  // Scroll vers le bas quand on ouvre une conv ou qu'on envoie un message
  useEffect(() => {
    if (!loadingMessages) {
      shouldScrollToBottomRef.current = true;
    }
  }, [activeConv?.id, loadingMessages, shouldScrollToBottomRef]);

  // Scroll vers le bas — useLayoutEffect + forceReflow pour éviter le flash
  useLayoutEffect(() => {
    if (shouldScrollToBottomRef.current && !loadingMessages) {
      shouldScrollToBottomRef.current = false;
      const el = scrollContainerRef.current;
      if (el) {
        const behavior = scrollBehaviorRef.current;
        el.scrollTo({ top: el.scrollHeight, behavior });
        scrollBehaviorRef.current = "auto";
        // forceReflow : garantit que le navigateur a appliqué le scrollTop avant de rendre visible
        void el.offsetHeight;
        userScrolledUp.current = false;
      }
    }
  }, [messages, loadingMessages, scrollBehaviorRef, shouldScrollToBottomRef]);

  // Restauration position scroll après chargement de messages plus anciens
  useLayoutEffect(() => {
    if (loadMoreScrollRestoreRef.current > 0 && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight - loadMoreScrollRestoreRef.current;
      loadMoreScrollRestoreRef.current = 0;
    }
  }, [messages]);

  // Auto-remplissage : charger plus si le contenu ne remplit pas l'écran
  useEffect(() => {
    if (!loadingMessages && !loadingMore && scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      if (hasMore && el.scrollHeight <= el.clientHeight) {
        autoFillingRef.current = true;
        shouldScrollToBottomRef.current = true;
        onLoadMore();
      } else {
        onInitialized?.();
      }
    }
  }, [messages, loadingMessages, loadingMore, hasMore, onLoadMore, onInitialized, shouldScrollToBottomRef]);

  // Exposer shouldScrollToBottom pour les messages realtime
  const triggerScrollToBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
      shouldScrollToBottomRef.current = true;
    }
  }, [shouldScrollToBottomRef]);

  // Mettre à jour le ref pour le loadMore
  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    const container = scrollContainerRef.current;
    const oldScrollHeight = container?.scrollHeight ?? 0;
    if (!autoFillingRef.current) {
      loadMoreScrollRestoreRef.current = oldScrollHeight;
    } else {
      loadMoreScrollRestoreRef.current = 0;
      autoFillingRef.current = false;
    }
    onLoadMore();
  }, [loadingMore, hasMore, messages.length, onLoadMore]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    userScrolledUp.current = el.scrollHeight - el.scrollTop - el.clientHeight > 100;
    if (el.scrollTop < 80 && hasMore && !loadingMore) {
      handleLoadMore();
    }
  }, [hasMore, loadingMore, handleLoadMore]);

  // Exposer triggerScrollToBottom via ref-like pattern
  useEffect(() => {
    // @ts-expect-error: attaching method to DOM element for parent access
    if (scrollContainerRef.current) scrollContainerRef.current.__triggerScroll = triggerScrollToBottom;
  }, [triggerScrollToBottom]);

  useEffect(() => {
    const isLoading = loadingMessages || initializing;
    if (isLoading) {
      setShowMobileMask(true);
      requestAnimationFrame(() => setMobileMaskVisible(true));
      return;
    }

    setMobileMaskVisible(false);
    const timeout = window.setTimeout(() => setShowMobileMask(false), 180);
    return () => window.clearTimeout(timeout);
  }, [loadingMessages, initializing]);

  if (!activeConv) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="h-16 w-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-4">
          <MessageCircle className="h-8 w-8 text-teal-500" />
        </div>
        <p className="text-[15px] font-semibold">Vos messages</p>
        <p className="text-[13px] text-muted-foreground mt-1">
          Sélectionnez une conversation ou démarrez-en une nouvelle
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Header chat — flottant */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex lg:hidden h-9 w-9 items-center justify-center rounded-full bg-background/70 backdrop-blur-xl text-muted-foreground hover:bg-background/90 hover:text-foreground transition-all shadow-md"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 rounded-full bg-background/70 backdrop-blur-xl pl-1 pr-3 py-1 shadow-md">
          <Avatar url={activeConv.other_user.avatar_url} name={activeConv.other_user.full_name} size={28} />
          <p className="text-[13px] font-semibold">{activeConv.other_user.full_name}</p>
        </div>
      </div>

      {/* Spinner overlay pendant init */}
      {(loadingMessages || initializing) && (
        <div className="absolute inset-0 z-10 hidden items-center justify-center lg:flex">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {showMobileMask && (
        <div
          className={cn(
            "absolute inset-0 z-10 px-4 pt-16 pb-[84px] lg:hidden transition-opacity duration-180 ease-out pointer-events-none",
            mobileMaskVisible ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="mobile-loading-veil absolute inset-0" />
          <div className="relative flex h-full items-center justify-center">
            <div className="mobile-loading-indicator rounded-full px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="mobile-loading-dots flex items-center gap-1.5">
                  <span className="mobile-loading-dot" />
                  <span className="mobile-loading-dot" />
                  <span className="mobile-loading-dot" />
                </div>
                <span className="text-[12px] font-medium text-muted-foreground/80">
                  Ouverture de la conversation
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zone messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={cn(
          "absolute inset-0 overflow-y-auto overscroll-contain no-scrollbar px-4 pt-14 pb-[72px] space-y-3",
          (loadingMessages || initializing) && "invisible lg:visible",
          showMobileMask && "lg:opacity-100"
        )}
      >
        {/* Pull-to-refresh overlay sticky */}
        {loadingMore && !initializing && (
          <div className="sticky top-2 z-10 flex justify-center">
            <div className="rounded-full bg-background/80 backdrop-blur-xl p-2 shadow-md">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        {!hasMore && messages.length > 0 && !initializing && (
          <p className="text-center text-[11px] text-muted-foreground/40 py-2">Début de la conversation</p>
        )}
        {!loadingMessages && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-[12px] text-muted-foreground">Aucun message. Dites bonjour !</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === myUserId;
            const isNew = new Date(msg.created_at).getTime() > convOpenedAt;
            return (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isMe={isMe}
                isNew={isNew}
                otherUser={activeConv.other_user}
                onSaveFile={onSaveFile}
              />
            );
          })
        )}
      </div>

      {/* Zone saisie */}
      <ChatInput
        value={newMessage}
        onChange={onNewMessageChange}
        onSend={onSend}
        onSendGif={onSendGif}
        onFileSelect={onFileSelect}
      />
    </div>
  );
}
