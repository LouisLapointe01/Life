import { useLayoutEffect, useRef, useEffect, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import { Avatar } from "./Avatar";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import type { Conversation, Message } from "./types";
import { useIsUserOnline } from "@/lib/stores/presence";

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

function shouldGroupMessages(previous: Message | null, current: Message) {
  if (!previous) return false;
  if (previous.sender_id !== current.sender_id) return false;

  const previousTime = new Date(previous.created_at).getTime();
  const currentTime = new Date(current.created_at).getTime();
  return Math.abs(currentTime - previousTime) < 5 * 60 * 1000;
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
  const isOtherUserOnline = useIsUserOnline(activeConv?.other_user.id ?? null);

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
      const frame = window.requestAnimationFrame(() => {
        setShowMobileMask(true);
        window.requestAnimationFrame(() => setMobileMaskVisible(true));
      });

      return () => window.cancelAnimationFrame(frame);
    }

    const frame = window.requestAnimationFrame(() => {
      setMobileMaskVisible(false);
    });
    const timeout = window.setTimeout(() => setShowMobileMask(false), 180);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [loadingMessages, initializing]);

  if (!activeConv) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-18 w-18 items-center justify-center rounded-[2rem] border border-white/50 bg-white/58 shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.05]">
          <MessageCircle className="h-8 w-8 text-primary/80" />
        </div>
        <p className="text-[18px] font-semibold tracking-[-0.03em]">Vos messages</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Sélectionnez une conversation ou démarrez-en une nouvelle
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white/20 backdrop-blur-[18px] dark:bg-black/10 lg:m-3 lg:pb-3 lg:rounded-[2rem] lg:border lg:border-white/20 lg:shadow-[0_20px_60px_rgba(15,23,42,0.10)] lg:dark:border-white/10">
      <div className="relative z-20 flex shrink-0 items-center gap-2 border-b border-foreground/[0.08] bg-white/48 px-2.5 py-2.5 backdrop-blur-xl dark:bg-black/12 lg:px-4 lg:py-4">
        <button
          onClick={onBack}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/45 bg-white/58 text-muted-foreground shadow-sm transition-all hover:bg-white/78 hover:text-foreground dark:border-white/10 dark:bg-white/[0.05] lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[1.1rem] border border-white/45 bg-white/58 px-2 py-2 shadow-sm dark:border-white/10 dark:bg-white/[0.05] lg:gap-3 lg:rounded-[1.25rem]">
          <Avatar
            url={activeConv.other_user.avatar_url}
            name={activeConv.other_user.full_name}
            size={32}
            isOnline={isOtherUserOnline}
            showPresence
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-foreground lg:text-[14px]">{activeConv.other_user.full_name}</p>
            <p className="truncate text-[10px] text-muted-foreground lg:text-[11px]">Conversation privée</p>
          </div>
        </div>
      </div>

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

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={cn(
          "relative flex-1 overflow-y-auto overflow-x-hidden overscroll-contain no-scrollbar px-3 pb-3 pt-3 sm:px-4 sm:pt-4",
          (loadingMessages || initializing) && "invisible lg:visible",
          showMobileMask && "lg:opacity-100"
        )}
      >
        {loadingMore && !initializing && (
          <div className="sticky top-2 z-10 flex justify-center">
            <div className="rounded-full border border-white/45 bg-white/72 p-2 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        {!hasMore && messages.length > 0 && !initializing && (
          <p className="py-2 text-center text-[11px] text-muted-foreground/45">Début de la conversation</p>
        )}
        {!loadingMessages && messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="rounded-[1.75rem] border border-white/45 bg-white/58 px-5 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.05]">
              <p className="text-[13px] font-medium text-foreground">Aucun message pour l’instant</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Commencez avec un message simple.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 pb-1">
          {messages.map((msg, index) => {
            const isMe = msg.sender_id === myUserId;
            const isNew = new Date(msg.created_at).getTime() > convOpenedAt;
            const previousMessage = index > 0 ? messages[index - 1] : null;
            const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
            const groupedWithPrevious = shouldGroupMessages(previousMessage, msg);
            const groupedWithNext = nextMessage ? shouldGroupMessages(msg, nextMessage) : false;
            return (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isMe={isMe}
                isNew={isNew}
                groupedWithPrevious={groupedWithPrevious}
                groupedWithNext={groupedWithNext}
                otherUser={activeConv.other_user}
                onSaveFile={onSaveFile}
              />
            );
          })}
          </div>
        )}
      </div>

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
