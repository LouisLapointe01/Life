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

  return (
    <div
      className={cn(
        "group relative mb-1 w-full rounded-[1.2rem] border px-3 py-1.5 text-left transition-all duration-200",
        isActive
          ? "border-primary/20 bg-white/84 shadow-[0_12px_28px_rgba(0,122,255,0.09)] dark:bg-white/[0.08]"
          : unread
            ? "border-primary/10 bg-primary/[0.06] hover:bg-primary/[0.08]"
            : "border-white/45 bg-white/45 hover:bg-white/72 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
      )}
    >
      {unread && (
        <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-primary" />
      )}

      <div className="grid min-w-0 grid-cols-[auto,minmax(0,1fr),auto] items-center gap-2.5">
        <button onClick={onOpen} className="contents text-left">
          <div className="relative">
            <Avatar url={conv.other_user.avatar_url} name={conv.other_user.full_name} size={38} />
            {conv.is_favorite && (
              <span className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-white/90 bg-yellow-400 shadow-sm dark:border-zinc-900">
                <Star className="h-2.5 w-2.5 fill-yellow-950 text-yellow-950" />
              </span>
            )}
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

            <div className="mt-0.5 flex min-w-0 items-center justify-between gap-2 overflow-hidden">
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground/70">
                {isActive && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary">Ouvert</span>}
              </div>
              {unread && (
                <span className="ml-2 flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[9px] font-bold text-primary-foreground shadow-sm">
                  {conv.unread_count > 9 ? "9+" : conv.unread_count}
                </span>
              )}
            </div>
          </div>
        </button>

        <div className="flex items-center justify-end self-stretch">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground/55 transition-all hover:bg-foreground/[0.06] hover:text-foreground"
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
        </div>
      </div>
    </div>
  );
}
