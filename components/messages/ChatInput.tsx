import { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Send, Smile, Paperclip, X, Loader2 } from "lucide-react";
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
  const gifDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaPanelRef = useRef<HTMLDivElement>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

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
      if (mediaPanelMode && mediaPanelRef.current && !mediaPanelRef.current.contains(e.target as Node)) {
        setMediaPanelMode(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mediaPanelMode]);

  useEffect(() => {
    resizeTextarea();
  }, [resizeTextarea]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const updateKeyboardOffset = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardOffset(offset > 0 ? offset : 0);
    };

    updateKeyboardOffset();
    window.visualViewport.addEventListener("resize", updateKeyboardOffset);
    window.visualViewport.addEventListener("scroll", updateKeyboardOffset);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateKeyboardOffset);
      window.visualViewport?.removeEventListener("scroll", updateKeyboardOffset);
    };
  }, []);

  const hasGiphyKey = typeof window !== "undefined" && !!process.env.NEXT_PUBLIC_GIPHY_API_KEY;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] transition-[bottom,padding] duration-200 ease-out lg:pb-3"
      style={{ bottom: keyboardOffset }}
    >
      {mediaPanelMode === "emoji" && (
        <div ref={mediaPanelRef} className="absolute bottom-full left-3 mb-2 z-30 flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-foreground/[0.08] bg-background/90 px-3 py-2 shadow-lg backdrop-blur-xl">
            <span className="rounded-full bg-primary px-3 py-1 text-[12px] font-medium text-primary-foreground">Emojis</span>
            <button
              onClick={() => setMediaPanelMode(null)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="self-start overflow-hidden rounded-2xl shadow-2xl">
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
          ref={mediaPanelRef}
          className="absolute bottom-full left-3 right-3 mb-2 z-30 overflow-hidden rounded-2xl border border-foreground/[0.08] bg-background/95 shadow-xl backdrop-blur-xl"
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
                Ajoute la variable NEXT_PUBLIC_GIPHY_API_KEY dans .env.local pour activer les GIFs.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        {/* Boutons accessoires */}
        <div className="flex items-center gap-0.5 shrink-0 mb-[5px]">
          <button
            onClick={() => setMediaPanelMode((current) => current === "emoji" ? null : "emoji")}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
              mediaPanelMode === "emoji" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]"
            )}
          >
            <Smile className="h-4 w-4" />
          </button>
          {hasGiphyKey && (
            <button
              onClick={() => setMediaPanelMode((current) => current === "gif" ? null : "gif")}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-colors text-[11px] font-bold",
                mediaPanelMode === "gif" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]"
              )}
            >
              GIF
            </button>
          )}
          {!hasGiphyKey && (
            <button
              onClick={() => setMediaPanelMode((current) => current === "gif" ? null : "gif")}
              className={cn(
                "flex h-8 items-center justify-center rounded-full px-2.5 transition-colors text-[11px] font-bold",
                mediaPanelMode === "gif" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]"
              )}
            >
              GIF
            </button>
          )}
          {onFileSelect && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors"
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
            "flex-1 resize-none rounded-2xl border border-foreground/[0.08] bg-background/80 backdrop-blur-xl",
            "px-4 py-2.5 text-[13px] outline-none focus:border-primary/40",
            "max-h-32 overflow-y-auto shadow-sm"
          )}
          style={{ minHeight: 42 }}
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
            "flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full transition-all shadow-sm",
            value.trim()
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-foreground/[0.06] backdrop-blur-xl text-muted-foreground"
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
