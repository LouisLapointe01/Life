"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FolderIcon, Home, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserFolder } from "@/lib/types/files";

type MoveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  allFolders: UserFolder[];
  excludeIds?: Set<string>;
  currentFolderId: string | null;
  onMove: (targetFolderId: string | null) => Promise<void>;
};

type FolderNode = UserFolder & { children: FolderNode[]; depth: number };

export function MoveDialog({
  open,
  onOpenChange,
  title,
  allFolders,
  excludeIds,
  currentFolderId,
  onMove,
}: MoveDialogProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  // Construire l'arbre aplati avec indentation
  const flatTree = useMemo(() => {
    const excluded = excludeIds ?? new Set();
    const available = allFolders.filter((f) => !excluded.has(f.id));

    const result: (UserFolder & { depth: number })[] = [];
    const buildTree = (parentId: string | null, depth: number) => {
      available
        .filter((f) => f.parent_id === parentId)
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((folder) => {
          result.push({ ...folder, depth });
          buildTree(folder.id, depth + 1);
        });
    };
    buildTree(null, 0);
    return result;
  }, [allFolders, excludeIds]);

  const handleMove = async () => {
    if (selected === currentFolderId) return;
    setMoving(true);
    try {
      await onMove(selected);
      onOpenChange(false);
    } catch {
      // Error is handled by the caller (toast)
    } finally {
      setMoving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!moving) onOpenChange(o);
      }}
    >
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="max-h-64 overflow-y-auto rounded-xl bg-foreground/[0.03] p-2 space-y-0.5">
            {/* Racine */}
            <button
              onClick={() => setSelected(null)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                selected === null
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-foreground/[0.04]"
              )}
            >
              <Home className="h-4 w-4 shrink-0" />
              <span>Racine</span>
              {currentFolderId === null && (
                <span className="ml-auto text-[11px] text-muted-foreground">
                  (actuel)
                </span>
              )}
            </button>

            {flatTree.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setSelected(folder.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                  selected === folder.id
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-foreground/[0.04]"
                )}
                style={{ paddingLeft: `${12 + folder.depth * 20}px` }}
              >
                {folder.depth > 0 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                )}
                <FolderIcon
                  className="h-4 w-4 shrink-0"
                  style={{ color: folder.color }}
                />
                <span className="truncate">{folder.name}</span>
                {folder.id === currentFolderId && (
                  <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
                    (actuel)
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => onOpenChange(false)}
              disabled={moving}
              className="flex-1 rounded-2xl bg-foreground/[0.06] py-3 text-[13px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleMove}
              disabled={moving || selected === currentFolderId}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl disabled:opacity-50"
            >
              {moving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <FolderIcon className="h-4 w-4" />
                  Déplacer ici
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
