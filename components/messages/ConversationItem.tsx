import { cn } from "@/lib/utils";
import { MoreVertical, Trash2, Star } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "./Avatar";
import { timeAgo } from "./helpers";
import type { Conversation } from "./types";
import { useIsUserOnline } from "@/lib/stores/presence";

interface ConversationItemProps {
  conv: Conversation;
  isActive: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onToggleFavorite?: () => void;
}

export function ConversationItem({ conv, isActive, onOpen, onDelete, onToggleFavorite }: ConversationItemProps) {
  const unread = conv.unread_count > 0;
  const preview = conv.last_message?.content ?? "Démarrer la conversation";
  const isOnline = useIsUserOnline(conv.other_user.id);

  return (
    <div
      className={cn(
        "group relative mb-1 w-full rounded-[1.2rem] border px-3 py-1.5 text-left transition-all duration-200",
        isActive
          ? "border-primary/12 bg-white/72 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-primary/10 dark:bg-white/[0.07]"
          : unread
            ? "border-primary/10 bg-primary/[0.06] hover:bg-primary/[0.08]"
            : "border-white/45 bg-white/45 hover:bg-white/72 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
      )}
    >
      {unread && (
        <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-primary" />
      )}

      {onToggleFavorite && (
        <button
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleFavorite();
          }}
          className={cn(
            "absolute bottom-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition-all",
            conv.is_favorite
              ? "border-white/80 bg-yellow-400 text-yellow-950 dark:border-zinc-900"
              : "border-white/55 bg-white/75 text-muted-foreground hover:text-yellow-500 dark:border-white/10 dark:bg-white/[0.06]"
          )}
          aria-label={conv.is_favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <Star className={cn("h-3 w-3", conv.is_favorite && "fill-current")} />
        </button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="absolute right-2 top-1.5 z-10 flex h-6.5 w-6.5 items-center justify-center rounded-full text-muted-foreground/55 transition-all hover:bg-foreground/[0.06] hover:text-foreground"
            aria-label="Ouvrir les actions de la conversation"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {onToggleFavorite && (
            <DropdownMenuItem onClick={onToggleFavorite}>
              <Star className={cn("mr-2 h-3.5 w-3.5", conv.is_favorite && "fill-yellow-400 text-yellow-400")} />
              {conv.is_favorite ? "Retirer favori" : "Favori"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="grid min-w-0 grid-cols-[auto,minmax(0,1fr)] items-center gap-2.5 pr-8">
        <button onClick={onOpen} className="contents text-left">
          <div>
            <Avatar
              url={conv.other_user.avatar_url}
              name={conv.other_user.full_name}
              size={38}
              isOnline={isOnline}
              showPresence
            />
          </div>

          <div className="min-w-0 overflow-hidden">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-[14px] leading-[1.2] text-left", unread ? "font-semibold" : "font-medium")}>
                  {conv.other_user.full_name}
                </p>
                <p className={cn(
                  "mt-0.5 line-clamp-1 max-w-full break-words pr-2 text-[11px] leading-[1.2] text-left text-ellipsis",
                  unread ? "text-foreground/85" : "text-muted-foreground"
                )}>
                  {preview}
                </p>
              </div>
              {conv.last_message && (
                <span className="ml-2 shrink-0 whitespace-nowrap pt-0.5 text-[9px] text-muted-foreground/70">
                  {timeAgo(conv.last_message.created_at)}
                </span>
              )}
            </div>
            <div className="mt-0.5 flex min-w-0 items-center justify-end gap-2 overflow-hidden">
              {unread && (
                <span className="ml-2 flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[9px] font-bold text-primary-foreground shadow-sm">
                  {conv.unread_count > 9 ? "9+" : conv.unread_count}
                </span>
              )}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
