import { cn } from "@/lib/utils";
import { Download, FileIcon } from "lucide-react";
import { Avatar } from "./Avatar";
import { timeAgo } from "./helpers";
import type { Message } from "./types";

interface MessageBubbleProps {
  msg: Message;
  isMe: boolean;
  isNew: boolean;
  otherUser: { full_name: string; avatar_url: string | null };
  onSaveFile?: (msg: Message) => void;
}

function isGiphyUrl(text: string): boolean {
  return /^https?:\/\/media\d*\.giphy\.com\/.+\.(gif|webp)$/i.test(text.trim());
}

function isImageUrl(text: string): boolean {
  return /^https?:\/\/.+\.(gif|png|jpe?g|webp)(\?.*)?$/i.test(text.trim());
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function MessageBubble({ msg, isMe, isNew, otherUser, onSaveFile }: MessageBubbleProps) {
  const isGif = isGiphyUrl(msg.content) || isImageUrl(msg.content);
  const hasFile = msg.file_url && msg.file_name;

  return (
    <div
      className={cn(
        "flex gap-2",
        isMe ? "flex-row-reverse" : "flex-row",
        isNew && "animate-in slide-in-from-bottom-2 duration-200 ease-out"
      )}
    >
      {!isMe && (
        <Avatar
          url={msg.sender?.avatar_url ?? otherUser.avatar_url}
          name={msg.sender?.full_name ?? otherUser.full_name}
          size={28}
        />
      )}
      <div className={cn("flex flex-col min-w-0", isMe ? "items-end max-w-[75%]" : "items-start max-w-[75%]")}>
        {/* GIF / Image message */}
        {isGif ? (
          <div className="rounded-2xl overflow-hidden max-w-[280px]">
            <img
              src={msg.content.trim()}
              alt="GIF"
              className="w-full rounded-2xl"
              loading="lazy"
            />
          </div>
        ) : hasFile ? (
          /* File attachment */
          <div
            className={cn(
              "px-3.5 py-2.5 rounded-2xl flex items-center gap-3 min-w-[200px]",
              isMe
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-foreground/[0.06] rounded-bl-sm"
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/20">
              <FileIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{msg.file_name}</p>
              {msg.file_size && (
                <p className={cn("text-[11px]", isMe ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {formatFileSize(msg.file_size)}
                </p>
              )}
            </div>
            <a
              href={msg.file_url!}
              target="_blank"
              rel="noopener noreferrer"
              download={msg.file_name || undefined}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                isMe ? "hover:bg-primary-foreground/20" : "hover:bg-foreground/[0.08]"
              )}
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        ) : (
          /* Text message */
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
        )}
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] text-muted-foreground">
            {timeAgo(msg.created_at)}
          </span>
          {hasFile && !isMe && onSaveFile && (
            <button
              onClick={() => onSaveFile(msg)}
              className="text-[10px] text-primary hover:underline"
            >
              Sauvegarder
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
