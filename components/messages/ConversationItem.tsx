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

  return (
    <div
      className={cn(
        "relative flex w-full items-start gap-3 px-4 py-3 text-left transition-colors border-b border-foreground/[0.04] last:border-0",
        isActive
          ? "bg-primary/[0.06]"
          : unread
            ? "bg-primary/[0.03]"
            : "hover:bg-foreground/[0.04]"
      )}
    >
      {/* Barre verticale non-lu */}
      {unread && (
        <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />
      )}

      <button onClick={onOpen} className="flex flex-1 items-start gap-3 min-w-0 overflow-hidden">
        <Avatar url={conv.other_user.avatar_url} name={conv.other_user.full_name} size={40} />
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between">
            <p className={cn("text-[13px] truncate", unread ? "font-semibold" : "font-medium")}>
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
              unread ? "text-foreground" : "text-muted-foreground"
            )}>
              {conv.last_message?.content ?? "Démarrer la conversation"}
            </p>
            {unread && (
              <span className="ml-2 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shrink-0">
                {conv.unread_count > 9 ? "9+" : conv.unread_count}
              </span>
            )}
          </div>
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground/50 transition-all hover:bg-foreground/[0.06] hover:text-foreground mt-1"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {onToggleFavorite && (
            <DropdownMenuItem onClick={onToggleFavorite}>
              <Star className={cn("h-3.5 w-3.5 mr-2", conv.is_favorite && "fill-yellow-400 text-yellow-400")} />
              {conv.is_favorite ? "Retirer favori" : "Favori"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
