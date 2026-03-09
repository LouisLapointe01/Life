"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  File,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  Loader2,
} from "lucide-react";

type FilePreviewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  fileType: string;
  getUrl: () => Promise<{ url: string; name: string; mime_type: string }>;
};

export function FilePreview({
  open,
  onOpenChange,
  fileName,
  fileType,
  getUrl,
}: FilePreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDist = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setUrl(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setLoading(true);
      getUrl()
        .then((data) => setUrl(data.url))
        .catch(() => setUrl(null))
        .finally(() => setLoading(false));
    }
  }, [open, getUrl]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (fileType !== "image") return;
      e.preventDefault();
      setZoom((z) => Math.min(5, Math.max(0.5, z - e.deltaY * 0.002)));
    },
    [fileType]
  );

  const handleDoubleClick = useCallback(() => {
    if (zoom === 1) {
      setZoom(2);
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [zoom]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      setIsPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    },
    [zoom, pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      });
    },
    [isPanning]
  );

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  // Pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / lastTouchDist.current;
      setZoom((z) => Math.min(5, Math.max(0.5, z * scale)));
      lastTouchDist.current = dist;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = null;
  }, []);

  const handleDownload = useCallback(() => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [url, fileName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{fileName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 pt-2">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !url ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <File className="h-16 w-16 text-muted-foreground/40" />
              <p className="text-[14px] text-muted-foreground">
                Impossible de charger l&apos;aperçu.
              </p>
            </div>
          ) : fileType === "image" ? (
            <>
              {/* Zoom controls */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/[0.1] hover:text-foreground transition-all"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-[12px] font-medium text-muted-foreground min-w-[50px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(5, z + 0.25))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/[0.1] hover:text-foreground transition-all"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/[0.1] hover:text-foreground transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
              <div
                ref={containerRef}
                className="overflow-hidden rounded-xl bg-foreground/[0.03] flex items-center justify-center"
                style={{
                  height: "min(60vh, 500px)",
                  cursor: zoom > 1 ? (isPanning ? "grabbing" : "grab") : "zoom-in",
                }}
                onWheel={handleWheel}
                onDoubleClick={handleDoubleClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={fileName}
                  draggable={false}
                  className="max-w-full max-h-full select-none transition-transform duration-100"
                  style={{
                    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  }}
                />
              </div>
            </>
          ) : fileType === "pdf" ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-foreground/[0.06] px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-foreground/[0.1] hover:text-foreground transition-all"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ouvrir dans un nouvel onglet
                </a>
              </div>
              <iframe
                src={url}
                className="w-full rounded-xl border-0"
                style={{ height: "min(65vh, 550px)" }}
                title={fileName}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-12">
              <File className="h-16 w-16 text-muted-foreground/40" />
              <p className="text-[14px] text-muted-foreground">
                Aperçu non disponible pour ce type de fichier.
              </p>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/25"
              >
                <Download className="h-4 w-4" />
                Télécharger
              </button>
            </div>
          )}
        </div>

        {/* Bottom actions */}
        {url && (fileType === "image" || fileType === "pdf") && (
          <div className="flex justify-center pt-3 border-t border-foreground/[0.06]">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-2xl bg-foreground/[0.06] px-4 py-2.5 text-[13px] font-medium text-muted-foreground hover:bg-foreground/[0.1] hover:text-foreground transition-all"
            >
              <Download className="h-4 w-4" />
              Télécharger
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
