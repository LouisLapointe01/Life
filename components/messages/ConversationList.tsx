import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { MessageCircle, Search, X, Loader2 } from "lucide-react";
import { Avatar } from "./Avatar";
import { ConversationItem } from "./ConversationItem";
import type { Conversation, UserResult } from "./types";

interface ConversationListProps {
  conversations: Conversation[];
  activeConvId: string | null;
  loadingConvs: boolean;
  onOpenConversation: (conv: Conversation) => void;
  onDeleteConversation: (conv: Conversation) => void;
  onStartConversation: (userId: string) => void;
  onToggleFavorite?: (conv: Conversation) => void;
  startingConv: string | null;
  mobileView: "list" | "chat";
}

export function ConversationList({
  conversations,
  activeConvId,
  loadingConvs,
  onOpenConversation,
  onDeleteConversation,
  onStartConversation,
  onToggleFavorite,
  startingConv,
  mobileView,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showMobileMask, setShowMobileMask] = useState(loadingConvs);
  const [mobileMaskVisible, setMobileMaskVisible] = useState(loadingConvs);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loadingConvs) {
      setShowMobileMask(true);
      requestAnimationFrame(() => setMobileMaskVisible(true));
      return;
    }

    setMobileMaskVisible(false);
    const timeout = window.setTimeout(() => setShowMobileMask(false), 180);
    return () => window.clearTimeout(timeout);
  }, [loadingConvs]);

  // Recherche API pour les nouveaux utilisateurs
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (searchQuery.length < 2) { setUserResults([]); return; }

    searchDebounce.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/appointments/users?q=${encodeURIComponent(searchQuery)}&mode=all`);
        if (res.ok) {
          const data = await res.json();
          setUserResults((data.users || []).filter((u: UserResult) => u.has_account));
        }
      } catch { /* ignore */ }
      finally { setSearchLoading(false); }
    }, 300);
  }, [searchQuery]);

  // Filtrage local des conversations par nom
  const filteredConversations = useMemo(() => {
    if (searchQuery.length < 2) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) =>
      c.other_user.full_name.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  // Nouveaux utilisateurs qui n'ont PAS déjà une conversation
  const newUsers = useMemo(() => {
    const existingUserIds = new Set(conversations.map((c) => c.other_user.id));
    return userResults.filter((u) => !existingUserIds.has(u.id));
  }, [userResults, conversations]);

  const favoritesCount = useMemo(
    () => conversations.filter((conversation) => conversation.is_favorite).length,
    [conversations]
  );

  return (
    <div
      className={cn(
        "relative flex w-full shrink-0 flex-col border-r border-foreground/[0.08] bg-white/18 backdrop-blur-xl lg:w-[320px] xl:w-[360px] dark:bg-black/12",
        mobileView === "chat" && "hidden lg:flex"
      )}
    >
      <div className="border-b border-foreground/[0.08] px-4 pb-2.5 pt-4 lg:px-5 lg:pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[21px] font-semibold tracking-[-0.03em] text-foreground">Messages</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {conversations.length} conversation{conversations.length > 1 ? "s" : ""}
              {favoritesCount > 0 ? ` • ${favoritesCount} favori${favoritesCount > 1 ? "s" : ""}` : ""}
            </p>
          </div>
        </div>

        <div className="relative mt-3.5">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher…"
            className="w-full rounded-[1.15rem] border border-white/50 bg-white/60 py-2.5 pl-10 pr-9 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-primary/40 dark:border-white/10 dark:bg-white/[0.05]"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setUserResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto px-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-1.5 lg:px-3 lg:pb-3">
        {showMobileMask && (
          <div
            className={cn(
              "absolute inset-0 z-10 lg:hidden transition-opacity duration-180 ease-out pointer-events-none",
              mobileMaskVisible ? "opacity-100" : "opacity-0"
            )}
          >
            <div className="mobile-loading-veil absolute inset-0" />
            <div className="relative flex h-full items-start justify-center pt-24">
              <div className="mobile-loading-indicator rounded-full px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/70" />
                  <span className="text-[12px] font-medium text-muted-foreground/80">
                    Chargement des conversations
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        {loadingConvs ? (
          <div className="flex justify-center pt-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {filteredConversations.length > 0 ? (
              <>
                {searchQuery.length >= 2 && (
                  <p className="px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/55">
                    Conversations
                  </p>
                )}
                {filteredConversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isActive={activeConvId === conv.id}
                    onOpen={() => onOpenConversation(conv)}
                    onDelete={() => onDeleteConversation(conv)}
                    onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(conv) : undefined}
                  />
                ))}
              </>
            ) : searchQuery.length < 2 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-4 rounded-3xl border border-white/45 bg-white/55 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.05]">
                  <MessageCircle className="h-9 w-9 text-primary/70" />
                </div>
                <p className="text-[14px] font-semibold text-foreground">Aucune conversation</p>
                <p className="mt-1 text-[12px] text-muted-foreground/70">
                  Recherchez un utilisateur pour démarrer
                </p>
              </div>
            ) : null}

            {searchQuery.length >= 2 && (
              <>
                {searchLoading && (
                  <div className="flex justify-center pt-3 pb-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!searchLoading && newUsers.length > 0 && (
                  <>
                    <p className="px-3 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/55">
                      Démarrer une conversation
                    </p>
                    <div className="space-y-1 px-1 pb-2">
                      {newUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => onStartConversation(u.id)}
                          disabled={startingConv === u.id}
                          className="flex w-full items-center gap-3 rounded-2xl border border-white/45 bg-white/52 px-3 py-3 text-left transition-colors hover:bg-white/72 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                        >
                          <Avatar url={u.avatar_url} name={u.full_name} size={32} />
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-[13px] font-medium">{u.full_name}</p>
                            {u.email && <p className="truncate text-[11px] text-muted-foreground">{u.email}</p>}
                          </div>
                          {startingConv === u.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          ) : (
                            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">Nouveau</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {!searchLoading && filteredConversations.length === 0 && newUsers.length === 0 && (
                  <p className="pt-3 text-center text-[12px] text-muted-foreground">Aucun résultat</p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
