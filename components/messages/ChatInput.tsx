import { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Send, Smile, Paperclip, X, Loader2, Plus } from "lucide-react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

type MediaPanelMode = "emoji" | "gif" | null;

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSendGif?: (url: string) => void;
  onFileSelect?: (file: File) => void;
  disabled?: boolean;
}

export function ChatInput({ value, onChange, onSend, onSendGif, onFileSelect, disabled }: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaPanelMode, setMediaPanelMode] = useState<MediaPanelMode>(null);
  const [gifQuery, setGifQuery] = useState("");
  const [gifs, setGifs] = useState<{ id: string; url: string; preview: string }[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);
  const gifDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaPanelRef = useRef<HTMLDivElement>(null);

  const resizeTextarea = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;

    input.style.height = "42px";
    if (value.trim().length === 0) return;
    input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleEmojiSelect = useCallback((emoji: { native: string }) => {
    onChange(value + emoji.native);
    setMediaPanelMode(null);
    setIsMobileActionsOpen(false);
    inputRef.current?.focus();
  }, [value, onChange]);

  // Recherche GIF via GIPHY
  const searchGifs = useCallback(async (q: string) => {
    const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
    if (!apiKey || q.length < 2) { setGifs([]); return; }
    setGifLoading(true);
    try {
      const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=20&rating=g`);
      if (res.ok) {
        const data = await res.json();
        setGifs((data.data || []).map((g: { id: string; images: { fixed_height: { url: string }; fixed_width_small: { url: string } } }) => ({
          id: g.id,
          url: g.images.fixed_height.url,
          preview: g.images.fixed_width_small.url,
        })));
      }
    } catch { /* ignore */ }
    finally { setGifLoading(false); }
  }, []);

  // Trending GIFs quand le panel s'ouvre
  const loadTrending = useCallback(async () => {
    const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
    if (!apiKey) return;
    setGifLoading(true);
    try {
      const res = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20&rating=g`);
      if (res.ok) {
        const data = await res.json();
        setGifs((data.data || []).map((g: { id: string; images: { fixed_height: { url: string }; fixed_width_small: { url: string } } }) => ({
          id: g.id,
          url: g.images.fixed_height.url,
          preview: g.images.fixed_width_small.url,
        })));
      }
    } catch { /* ignore */ }
    finally { setGifLoading(false); }
  }, []);

  useEffect(() => {
    if (mediaPanelMode === "gif") loadTrending();
  }, [mediaPanelMode, loadTrending]);

  useEffect(() => {
    if (gifDebounce.current) clearTimeout(gifDebounce.current);
    if (gifQuery.length < 2) return;
    gifDebounce.current = setTimeout(() => searchGifs(gifQuery), 300);
  }, [gifQuery, searchGifs]);

  // Fermer les popups au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (mediaPanelRef.current && !mediaPanelRef.current.contains(e.target as Node)) {
        setMediaPanelMode(null);
        setIsMobileActionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mediaPanelMode]);

  useEffect(() => {
    resizeTextarea();
  }, [resizeTextarea]);

  const toggleMobileActions = useCallback(() => {
    setMediaPanelMode(null);
    setIsMobileActionsOpen((current) => !current);
  }, []);

  const openEmojiPanel = useCallback(() => {
    setIsMobileActionsOpen(false);
    setMediaPanelMode("emoji");
  }, []);

  const openGifPanel = useCallback(() => {
    setIsMobileActionsOpen(false);
    setMediaPanelMode("gif");
  }, []);

  const handleFileButtonClick = useCallback(() => {
    setIsMobileActionsOpen(false);
    fileInputRef.current?.click();
  }, []);

  const hasGiphyKey = typeof window !== "undefined" && !!process.env.NEXT_PUBLIC_GIPHY_API_KEY;

  return (
    <div
      className="relative z-20 shrink-0 border-t border-foreground/[0.08] bg-white/52 px-2.5 py-2.5 pb-[calc(0.7rem+env(safe-area-inset-bottom,0px))] backdrop-blur-2xl dark:bg-black/12 lg:px-4 lg:py-4 lg:pb-4"
    >
      <div ref={mediaPanelRef}>
      {mediaPanelMode === "emoji" && (
        <div className="absolute bottom-[calc(100%-0.5rem)] left-2.5 z-30 flex max-w-[min(22rem,calc(100vw-1.25rem))] flex-col gap-2 lg:left-4">
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/45 bg-white/82 px-3 py-2 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/85">
            <span className="rounded-full bg-primary px-3 py-1 text-[12px] font-medium text-primary-foreground">Emojis</span>
            <button
              onClick={() => setMediaPanelMode(null)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="self-start overflow-hidden rounded-[1.5rem] border border-white/45 shadow-2xl dark:border-white/10">
            <Picker
              data={data}
              onEmojiSelect={handleEmojiSelect}
              theme="dark"
              locale="fr"
              previewPosition="none"
              skinTonePosition="none"
            />
          </div>
        </div>
      )}

      {mediaPanelMode === "gif" && (
        <div
          className="absolute bottom-[calc(100%-0.5rem)] left-2.5 right-2.5 z-30 overflow-hidden rounded-[1.6rem] border border-white/45 bg-white/92 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/92 lg:left-4 lg:right-4"
        >
          <div className="flex items-center gap-2 border-b border-foreground/[0.06] p-2.5">
            <span className="rounded-xl bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground">GIF</span>
            <button
              onClick={() => setMediaPanelMode("emoji")}
              className="rounded-xl bg-foreground/[0.04] px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Emojis
            </button>
            <button
              onClick={() => {
                setMediaPanelMode(null);
                setGifQuery("");
                setGifs([]);
              }}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {hasGiphyKey ? (
            <div className="flex max-h-80 flex-col">
              <div className="flex items-center gap-2 border-b border-foreground/[0.06] p-3">
                <input
                  value={gifQuery}
                  onChange={(e) => setGifQuery(e.target.value)}
                  placeholder="Rechercher un GIF…"
                  className="flex-1 bg-transparent text-[13px] outline-none"
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {gifLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : gifs.length === 0 ? (
                  <p className="py-4 text-center text-[12px] text-muted-foreground">
                    {gifQuery.length >= 2 ? "Aucun GIF trouvé" : "Tapez pour rechercher"}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {gifs.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => {
                          onSendGif?.(g.url);
                          setMediaPanelMode(null);
                          setGifQuery("");
                          setGifs([]);
                        }}
                        className="overflow-hidden rounded-lg transition-all hover:ring-2 hover:ring-primary"
                      >
                        <img src={g.preview} alt="GIF" className="h-20 w-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-[13px] font-medium text-foreground">Recherche GIF indisponible</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                  Ajoute la variable NEXT_PUBLIC_GIPHY_API_KEY dans Vercel pour activer les GIFs.
              </p>
            </div>
          )}
        </div>
      )}

      {isMobileActionsOpen && (
        <div className="absolute bottom-[calc(100%-0.45rem)] left-2.5 z-30 flex items-center gap-2 rounded-full border border-white/45 bg-white/90 px-2 py-2 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/90 sm:hidden">
          <button
            onClick={openEmojiPanel}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/45 bg-white/70 text-muted-foreground transition-colors hover:bg-white hover:text-foreground dark:border-white/10 dark:bg-white/[0.05]"
            aria-label="Ouvrir les emojis"
          >
            <Smile className="h-4 w-4" />
          </button>
          <button
            onClick={openGifPanel}
            className="flex h-9 items-center justify-center rounded-full border border-white/45 bg-white/70 px-3 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-white hover:text-foreground dark:border-white/10 dark:bg-white/[0.05]"
            aria-label="Ouvrir les GIF"
          >
            GIF
          </button>
          {onFileSelect && (
            <button
              onClick={handleFileButtonClick}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/45 bg-white/70 text-muted-foreground transition-colors hover:bg-white hover:text-foreground dark:border-white/10 dark:bg-white/[0.05]"
              aria-label="Choisir un fichier"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      </div>

        <div className="flex min-w-0 items-end gap-2">
          <div className="mb-1 flex shrink-0 items-center gap-1">
          <button
            onClick={toggleMobileActions}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border transition-colors sm:hidden",
              isMobileActionsOpen
                ? "border-primary/15 bg-primary/12 text-primary"
                : "border-white/45 bg-white/56 text-muted-foreground hover:text-foreground hover:bg-white/78 dark:border-white/10 dark:bg-white/[0.05]"
            )}
            aria-label="Ouvrir les actions du message"
          >
            <Plus className={cn("h-4 w-4 transition-transform", isMobileActionsOpen && "rotate-45")} />
          </button>
          <button
            onClick={() => {
              setIsMobileActionsOpen(false);
              setMediaPanelMode((current) => current === "emoji" ? null : "emoji");
            }}
            className={cn(
                "hidden h-9 w-9 items-center justify-center rounded-full border transition-colors sm:flex",
                mediaPanelMode === "emoji"
                  ? "border-primary/15 bg-primary/12 text-primary"
                  : "border-white/45 bg-white/56 text-muted-foreground hover:text-foreground hover:bg-white/78 dark:border-white/10 dark:bg-white/[0.05]"
            )}
          >
            <Smile className="h-4 w-4" />
          </button>
          {hasGiphyKey && (
            <button
              onClick={() => {
                setIsMobileActionsOpen(false);
                setMediaPanelMode((current) => current === "gif" ? null : "gif");
              }}
              className={cn(
                "hidden h-9 w-9 items-center justify-center rounded-full border text-[11px] font-bold transition-colors sm:flex",
                mediaPanelMode === "gif"
                  ? "border-primary/15 bg-primary/12 text-primary"
                  : "border-white/45 bg-white/56 text-muted-foreground hover:text-foreground hover:bg-white/78 dark:border-white/10 dark:bg-white/[0.05]"
              )}
            >
              GIF
            </button>
          )}
          {!hasGiphyKey && (
            <button
              onClick={() => {
                setIsMobileActionsOpen(false);
                setMediaPanelMode((current) => current === "gif" ? null : "gif");
              }}
              className={cn(
                "hidden h-9 items-center justify-center rounded-full border px-2.5 text-[11px] font-bold transition-colors sm:flex",
                mediaPanelMode === "gif"
                  ? "border-primary/15 bg-primary/12 text-primary"
                  : "border-white/45 bg-white/56 text-muted-foreground hover:text-foreground hover:bg-white/78 dark:border-white/10 dark:bg-white/[0.05]"
              )}
            >
              GIF
            </button>
          )}
          {onFileSelect && (
            <button
              onClick={handleFileButtonClick}
              className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/45 bg-white/56 text-muted-foreground transition-colors hover:bg-white/78 hover:text-foreground dark:border-white/10 dark:bg-white/[0.05] sm:flex"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onFileSelect) onFileSelect(file);
              e.target.value = "";
            }}
          />
        </div>

        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrire un message…"
          rows={1}
          className={cn(
            "min-w-0 flex-1 resize-none rounded-[1.65rem] border border-white/55 bg-white/82 px-3.5 py-2.5 text-[14px] leading-5 outline-none shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-colors focus:border-primary/35 dark:border-white/10 dark:bg-white/[0.06] sm:rounded-[1.8rem] sm:px-4 sm:py-3 sm:text-[15px] sm:leading-6",
            "max-h-32 overflow-y-auto"
          )}
          style={{ minHeight: 44 }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 128) + "px";
          }}
        />
        <button
          onClick={onSend}
          disabled={!value.trim() || disabled}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all shadow-[0_10px_24px_rgba(15,23,42,0.12)] sm:h-12 sm:w-12",
            value.trim()
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-white/62 text-muted-foreground dark:bg-white/[0.06]"
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
