import { cn } from "@/lib/utils";
import { AlertCircle, Check, CheckCheck, Download, FileIcon, Loader2 } from "lucide-react";
import { Avatar } from "./Avatar";
import { timeAgo } from "./helpers";
import type { Message } from "./types";

interface MessageBubbleProps {
  msg: Message;
  isMe: boolean;
  isNew: boolean;
  groupedWithPrevious?: boolean;
  groupedWithNext?: boolean;
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

function getDeliveryMeta(status?: "sending" | "sent" | "delivered" | "failed") {
  switch (status) {
    case "sending":
      return {
        label: "Envoi…",
        icon: Loader2,
        className: "text-muted-foreground/80",
        iconClassName: "animate-spin",
      };
    case "sent":
      return {
        label: "Envoye",
        icon: Check,
        className: "text-primary/80",
        iconClassName: "",
      };
    case "delivered":
      return {
        label: "Distribue",
        icon: CheckCheck,
        className: "text-primary/90",
        iconClassName: "",
      };
    case "failed":
      return {
        label: "Echec",
        icon: AlertCircle,
        className: "text-red-500",
        iconClassName: "",
      };
    default:
      return null;
  }
}

export function MessageBubble({
  msg,
  isMe,
  isNew,
  groupedWithPrevious = false,
  groupedWithNext = false,
  otherUser,
  onSaveFile,
}: MessageBubbleProps) {
  const isGif = isGiphyUrl(msg.content) || isImageUrl(msg.content);
  const hasFile = msg.file_url && msg.file_name;
  const deliveryMeta = isMe ? getDeliveryMeta(msg.delivery_status) : null;
  const showAvatar = !isMe && !groupedWithNext;
  const showMeta = !groupedWithNext || deliveryMeta?.label === "Echec";

  return (
    <div
      className={cn(
        "flex gap-2",
        isMe ? "flex-row-reverse" : "flex-row",
        groupedWithPrevious ? "mt-1" : "mt-3",
        isNew && "animate-in slide-in-from-bottom-2 duration-200 ease-out"
      )}
    >
      {!isMe && showAvatar ? (
        <Avatar
          url={msg.sender?.avatar_url ?? otherUser.avatar_url}
          name={msg.sender?.full_name ?? otherUser.full_name}
          size={28}
        />
      ) : !isMe ? (
        <div className="w-7 shrink-0" />
      ) : null}
      <div className={cn("flex min-w-0 flex-col", isMe ? "items-end max-w-[78%] sm:max-w-[70%] lg:max-w-[60%] xl:max-w-[50%]" : "items-start max-w-[82%] sm:max-w-[72%] lg:max-w-[60%] xl:max-w-[50%]")}>
        {isGif ? (
          <div className="max-w-[280px] overflow-hidden rounded-[1.4rem] border border-white/30 shadow-[0_10px_28px_rgba(15,23,42,0.08)] dark:border-white/10">
            <img
              src={msg.content.trim()}
              alt="GIF"
              className="w-full rounded-[1.4rem]"
              loading="lazy"
            />
          </div>
        ) : hasFile ? (
          <div
            className={cn(
              "flex min-w-[200px] items-center gap-3 rounded-[1.35rem] px-3.5 py-3 shadow-[0_10px_28px_rgba(15,23,42,0.06)]",
              isMe
                ? "rounded-br-md bg-primary text-primary-foreground"
                : "rounded-bl-md border border-white/40 bg-white/62 text-foreground dark:border-white/10 dark:bg-white/[0.05]"
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
          <div
            className={cn(
              "overflow-hidden whitespace-pre-wrap break-words px-3.5 py-2.5 text-[14px] leading-[1.45] shadow-[0_10px_28px_rgba(15,23,42,0.05)]",
              isMe
                ? "rounded-[1.35rem] rounded-br-md bg-primary text-primary-foreground"
                : "rounded-[1.35rem] rounded-bl-md border border-white/40 bg-white/62 text-foreground dark:border-white/10 dark:bg-white/[0.05]"
            )}
            style={{ overflowWrap: "anywhere" }}
          >
            {msg.content}
          </div>
        )}
        {showMeta && (
          <div className={cn("mt-1 flex items-center gap-1.5 px-1", isMe ? "justify-end" : "justify-start")}>
            <span className="text-[10px] text-muted-foreground">
              {timeAgo(msg.created_at)}
            </span>
            {deliveryMeta && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] transition-[opacity,transform,color] duration-300 ease-out",
                  deliveryMeta.className
                )}
              >
                <deliveryMeta.icon className={cn("h-3 w-3", deliveryMeta.iconClassName)} />
                {deliveryMeta.label}
              </span>
            )}
            {hasFile && !isMe && onSaveFile && (
              <button
                onClick={() => onSaveFile(msg)}
                className="text-[10px] text-primary hover:underline"
              >
                Sauvegarder
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
