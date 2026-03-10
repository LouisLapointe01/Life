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

  return (
    <div
      className={cn(
        "relative flex flex-col w-full lg:w-[300px] xl:w-[340px] shrink-0",
        "border-r border-foreground/[0.06]",
        mobileView === "chat" && "hidden lg:flex"
      )}
    >
      {/* Barre de recherche */}
      <div className="px-3 sm:px-4 pt-5 sm:pt-3 pb-2.5 sm:pb-3 border-b border-foreground/[0.06]">
        <div className="relative w-3/4 sm:w-full">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher…"
            className="w-full rounded-xl border border-foreground/[0.08] bg-foreground/[0.03] pl-8 sm:pl-9 pr-8 py-2 text-[13px] outline-none focus:border-primary/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setUserResults([]); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Liste */}
      <div className="relative flex-1 overflow-y-auto">
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
            {/* Section : Conversations filtrées */}
            {filteredConversations.length > 0 ? (
              <>
                {searchQuery.length >= 2 && (
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
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
              <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
                <MessageCircle className="h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-[13px] font-medium text-muted-foreground">Aucune conversation</p>
                <p className="text-[12px] text-muted-foreground/60 mt-1">
                  Recherchez un utilisateur pour démarrer
                </p>
              </div>
            ) : null}

            {/* Section : Démarrer une conversation (nouveaux users) */}
            {searchQuery.length >= 2 && (
              <>
                {searchLoading && (
                  <div className="flex justify-center pt-3 pb-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!searchLoading && newUsers.length > 0 && (
                  <>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                      Démarrer une conversation
                    </p>
                    <div className="px-2 pb-2 space-y-0.5">
                      {newUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => onStartConversation(u.id)}
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
                          ) : (
                            <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Nouveau</span>
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
