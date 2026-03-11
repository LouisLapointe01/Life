"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  FolderOpen,
  Upload,
  FileText,
  Image,
  File,
  Download,
  Trash2,
  Eye,
  Plus,
  Loader2,
  FolderPlus,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  FolderIcon,
  Home,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDrive } from "@/hooks/use-drive";
import { FilePreview } from "@/components/fichiers/FilePreview";
import { MoveDialog } from "@/components/fichiers/MoveDialog";
import type { UserFile, UserFolder } from "@/lib/types/files";

/* ═══════════════════════════════════════════════════════
   Constantes
   ═══════════════════════════════════════════════════════ */

const CATEGORIES = [
  "Tous",
  "Administratif",
  "Identité",
  "Finance",
  "Santé",
  "Logement",
  "Autre",
];

const FOLDER_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
];

const fileIcons: Record<string, typeof FileText> = {
  pdf: FileText,
  image: Image,
  document: File,
  other: File,
};

const fileColors: Record<string, string> = {
  pdf: "from-red-500/20 to-red-600/20 text-red-500",
  image: "from-blue-500/20 to-blue-600/20 text-blue-500",
  document: "from-green-500/20 to-green-600/20 text-green-500",
  other: "from-gray-500/20 to-gray-600/20 text-gray-500",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ═══════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════ */

export default function FichiersPage() {
  const drive = useDrive();

  const [view, setView] = useState<"grid" | "list">("grid");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  // Preview
  const [previewFile, setPreviewFile] = useState<UserFile | null>(null);

  // Delete dialogs
  const [deleteTarget, setDeleteTarget] = useState<UserFile | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<UserFolder | null>(null);

  // Import dialog
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importCategory, setImportCategory] = useState("Autre");
  const [pendingFileNames, setPendingFileNames] = useState<{ name: string; size: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFilesRef = useRef<globalThis.File[]>([]);

  // Folder create/rename
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [editingFolder, setEditingFolder] = useState<UserFolder | null>(null);
  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [renameFolderName, setRenameFolderName] = useState("");

  // File rename
  const [renameFileTarget, setRenameFileTarget] = useState<UserFile | null>(null);
  const [renameFileName, setRenameFileName] = useState("");

  // Context menus
  const [contextFile, setContextFile] = useState<UserFile | null>(null);
  const [contextFolder, setContextFolder] = useState<UserFolder | null>(null);

  // Move dialogs
  const [moveFileTarget, setMoveFileTarget] = useState<UserFile | null>(null);
  const [moveFolderTarget, setMoveFolderTarget] = useState<UserFolder | null>(null);

  // Migration dialog
  const [migrating, setMigrating] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const effectiveView = isMobile ? "list" : view;

  /* ═══════════════════════════════════════════════════════
     Migration localStorage → Supabase (one-shot)
     ═══════════════════════════════════════════════════════ */
  useEffect(() => {
    const STORAGE_KEY = "life-fichiers";
    const FOLDERS_KEY = "life-fichiers-folders";

    const hasFiles = localStorage.getItem(STORAGE_KEY);
    const hasFolders = localStorage.getItem(FOLDERS_KEY);

    if (!hasFiles && !hasFolders) return;
    if (migrationDone) return;

    // Démarrer la migration
    const migrate = async () => {
      setMigrating(true);
      try {
        type OldFile = {
          id: string;
          name: string;
          type: string;
          size: string;
          sizeBytes: number;
          date: string;
          category: string;
          folderId: string | null;
          dataUrl?: string;
        };
        type OldFolder = {
          id: string;
          name: string;
          parentId: string | null;
          color: string;
          createdAt: string;
        };

        const oldFolders: OldFolder[] = hasFolders ? JSON.parse(hasFolders) : [];
        const oldFiles: OldFile[] = hasFiles ? JSON.parse(hasFiles) : [];

        // Créer les dossiers (parents d'abord)
        const folderIdMap = new Map<string, string>(); // oldId → newId
        const created = new Set<string>();

        const createFolderRecursive = async (folder: OldFolder): Promise<void> => {
          if (created.has(folder.id)) return;

          // Créer le parent d'abord
          if (folder.parentId) {
            const parent = oldFolders.find((f) => f.id === folder.parentId);
            if (parent && !created.has(parent.id)) {
              await createFolderRecursive(parent);
            }
          }

          const newParentId = folder.parentId
            ? folderIdMap.get(folder.parentId) ?? null
            : null;
          const newFolder = await drive.createFolder(
            folder.name,
            newParentId,
            folder.color
          );
          folderIdMap.set(folder.id, newFolder.id);
          created.add(folder.id);
        };

        for (const folder of oldFolders) {
          await createFolderRecursive(folder);
        }

        // Upload les fichiers
        let uploadCount = 0;
        for (const file of oldFiles) {
          if (!file.dataUrl) continue;
          try {
            // Convertir dataUrl en Blob
            const response = await fetch(file.dataUrl);
            const blob = await response.blob();
            const realFile = new globalThis.File([blob], file.name, {
              type: blob.type,
            });

            const newFolderId = file.folderId
              ? folderIdMap.get(file.folderId) ?? null
              : null;
            await drive.uploadFile(realFile, newFolderId, file.category);
            uploadCount++;
          } catch {
            console.error(`Migration: échec upload de ${file.name}`);
          }
        }

        // Succès → supprimer localStorage
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(FOLDERS_KEY);
        setMigrationDone(true);
        drive.refresh();
        toast.success(
          `Migration terminée : ${oldFolders.length} dossier(s) et ${uploadCount} fichier(s) importés`
        );
      } catch (err) {
        console.error("Migration error:", err);
        toast.error(
          "Erreur lors de la migration. Vos données locales sont conservées."
        );
      } finally {
        setMigrating(false);
      }
    };

    // Lancer après un court délai pour que le hook soit prêt
    const timer = setTimeout(migrate, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [migrationDone]);

  /* ═══════════════════════════════════════════════════════
     Handlers
     ═══════════════════════════════════════════════════════ */

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;
    pendingFilesRef.current = selected;
    setPendingFileNames(selected.map((f) => ({ name: f.name, size: f.size })));
    setImportDialogOpen(true);
    e.target.value = "";
  };

  const handleConfirmImport = async () => {
    setUploading(true);
    const total = pendingFilesRef.current.length;
    setUploadProgress({ done: 0, total });

    let successCount = 0;
    for (const file of pendingFilesRef.current) {
      try {
        await drive.uploadFile(file, drive.currentFolderId, importCategory);
        successCount++;
        setUploadProgress({ done: successCount, total });
      } catch {
        toast.error(`Erreur upload : ${file.name}`);
      }
    }

    pendingFilesRef.current = [];
    setPendingFileNames([]);
    setImportDialogOpen(false);
    setUploading(false);
    setUploadProgress(null);
    drive.refresh();
    if (successCount > 0) {
      toast.success(
        `${successCount} fichier${successCount > 1 ? "s" : ""} importé${successCount > 1 ? "s" : ""}`
      );
    }
  };

  const handleDelete = async (file: UserFile) => {
    try {
      await drive.deleteFile(file.id);
      setDeleteTarget(null);
      setContextFile(null);
      toast.success(`"${file.name}" supprimé`);
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleDownload = async (file: UserFile) => {
    try {
      const { url, name } = await drive.getSignedUrl(file.id);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error("Fichier non disponible");
    }
  };

  const handleView = (file: UserFile) => setPreviewFile(file);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const folder = await drive.createFolder(
        newFolderName.trim(),
        drive.currentFolderId,
        newFolderColor
      );
      setNewFolderName("");
      setNewFolderColor(FOLDER_COLORS[0]);
      setFolderDialogOpen(false);
      toast.success(`Dossier "${folder.name}" créé`);
    } catch {
      toast.error("Erreur lors de la création du dossier");
    }
  };

  const handleDeleteFolder = async (folder: UserFolder) => {
    try {
      await drive.deleteFolder(folder.id);
      setDeleteFolderTarget(null);
      setContextFolder(null);
      if (drive.currentFolderId === folder.id) {
        drive.navigateToFolder(folder.parent_id);
      }
      toast.success(`Dossier "${folder.name}" supprimé`);
    } catch {
      toast.error("Erreur lors de la suppression du dossier");
    }
  };

  const handleRenameFolder = async () => {
    if (!editingFolder || !renameFolderName.trim()) return;
    try {
      await drive.renameFolder(editingFolder.id, renameFolderName.trim());
      setEditingFolder(null);
      setRenameFolderOpen(false);
      setRenameFolderName("");
      setContextFolder(null);
      toast.success("Dossier renommé");
    } catch {
      toast.error("Erreur lors du renommage");
    }
  };

  const handleRenameFile = async () => {
    if (!renameFileTarget || !renameFileName.trim()) return;
    try {
      await drive.renameFile(renameFileTarget.id, renameFileName.trim());
      setRenameFileTarget(null);
      setRenameFileName("");
      setContextFile(null);
      toast.success("Fichier renommé");
    } catch {
      toast.error("Erreur lors du renommage");
    }
  };

  const handleMoveFile = async (targetFolderId: string | null) => {
    if (!moveFileTarget) return;
    try {
      await drive.moveFile(moveFileTarget.id, targetFolderId);
      setMoveFileTarget(null);
      toast.success("Fichier déplacé");
    } catch {
      toast.error("Erreur lors du déplacement");
      throw new Error();
    }
  };

  const handleMoveFolder = async (targetFolderId: string | null) => {
    if (!moveFolderTarget) return;
    try {
      await drive.moveFolder(moveFolderTarget.id, targetFolderId);
      setMoveFolderTarget(null);
      toast.success("Dossier déplacé");
    } catch {
      toast.error("Erreur lors du déplacement");
      throw new Error();
    }
  };

  // Exclure le dossier cible et ses descendants pour le MoveDialog
  const moveFolderExcludeIds = useMemo(() => {
    if (!moveFolderTarget) return new Set<string>();
    const ids = new Set<string>();
    const collect = (id: string) => {
      ids.add(id);
      drive.allFolders
        .filter((f) => f.parent_id === id)
        .forEach((f) => collect(f.id));
    };
    collect(moveFolderTarget.id);
    return ids;
  }, [moveFolderTarget, drive.allFolders]);

  const getPreviewUrl = useCallback(() => {
    if (!previewFile) return Promise.reject();
    return drive.getSignedUrl(previewFile.id);
  }, [previewFile, drive]);

  const totalItemsInCurrent = drive.folders.length + drive.files.length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 overflow-x-hidden lg:space-y-6">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} accept="*/*" />

      <section className="premium-panel overflow-hidden p-4 sm:p-5 lg:p-6">
        <div className="premium-grid absolute inset-0 opacity-40" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Drive personnel
            </p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight sm:text-2xl">
              Vos fichiers
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button onClick={() => setFolderDialogOpen(true)} className="flex h-9 items-center gap-1.5 rounded-xl bg-foreground/[0.06] px-3 sm:px-4 text-[12px] sm:text-[13px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground">
              <FolderPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden sm:inline">Dossier</span>
            </button>
            <button onClick={handleImportClick} className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 sm:px-4 text-[12px] sm:text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:-translate-y-0.5">
              <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden sm:inline">Importer</span>
            </button>
          </div>
        </div>
      </section>

      {/* Migration dialog */}
      <Dialog open={migrating}>
        <DialogContent className="rounded-3xl sm:max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-[14px] font-medium text-center">Migration de vos fichiers en cours...</p>
            <p className="text-[12px] text-muted-foreground text-center">Vos fichiers locaux sont transférés vers le cloud. Ne fermez pas cette page.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Breadcrumb */}
      {(drive.currentFolderId !== null || drive.breadcrumb.length > 0) && (
        <div className="flex items-center gap-1 text-[13px] overflow-x-auto no-scrollbar pb-1">
          <button onClick={() => drive.navigateToFolder(null)} className={cn("flex items-center gap-1 shrink-0 rounded-lg px-2 py-1 transition-colors", drive.currentFolderId === null ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]")}>
            <Home className="h-3.5 w-3.5" />
            <span>Racine</span>
          </button>
          {drive.breadcrumb.map((folder) => (
            <div key={folder.id} className="flex items-center gap-1 shrink-0">
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <button onClick={() => drive.navigateToFolder(folder.id)} className={cn("rounded-lg px-2 py-1 transition-colors truncate max-w-[120px]", drive.currentFolderId === folder.id ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]")}>{folder.name}</button>
            </div>
          ))}
        </div>
      )}

      {/* Skeleton loader */}
      {drive.loading && drive.files.length === 0 && drive.folders.length === 0 ? (
        <div className="space-y-4">
          {/* Skeleton liste sur mobile, grille sur desktop */}
          <div className="hidden sm:grid gap-3 grid-cols-3 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="premium-panel p-4 animate-pulse">
                <div className="h-10 w-10 rounded-xl bg-foreground/[0.06]" />
                <div className="mt-3 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-foreground/[0.06]" />
                  <div className="h-3 w-1/2 rounded bg-foreground/[0.04]" />
                </div>
              </div>
            ))}
          </div>
          <div className="sm:hidden premium-panel divide-y divide-foreground/[0.06] overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
                <div className="h-8 w-8 shrink-0 rounded-lg bg-foreground/[0.06]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 rounded bg-foreground/[0.06]" />
                  <div className="h-2.5 w-1/2 rounded bg-foreground/[0.04]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : totalItemsInCurrent === 0 && !drive.search ? (
        /* Empty state */
        <div className="premium-panel flex flex-col items-center gap-3 px-4 py-12 sm:py-16 text-center">
          <FolderOpen className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/40" />
          <p className="text-[13px] sm:text-[14px] text-muted-foreground">{drive.allFolders.length === 0 && drive.files.length === 0 ? "Aucun fichier. Importez votre premier document." : "Ce dossier est vide."}</p>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button onClick={() => setFolderDialogOpen(true)} className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-foreground/[0.06] px-4 py-2.5 text-[13px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground"><FolderPlus className="h-4 w-4" />Créer un dossier</button>
            <button onClick={handleImportClick} className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/25"><Plus className="h-4 w-4" />Importer</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Dossiers */}
          {drive.folders.length > 0 && (
            <div>
              <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">Dossiers ({drive.folders.length})</p>
              {effectiveView === "grid" ? (
                <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  {drive.folders.map((folder) => (
                    <button key={folder.id} onClick={() => drive.navigateToFolder(folder.id)} onContextMenu={(e) => { e.preventDefault(); setContextFolder(folder); }} className="premium-panel-soft group relative flex min-w-0 flex-col items-start gap-2 sm:gap-3 p-3 sm:p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5">
                      <div className="flex w-full items-center justify-between">
                        <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl" style={{ background: `linear-gradient(135deg, ${folder.color}30, ${folder.color}10)` }}>
                          <FolderIcon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: folder.color }} />
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setContextFolder(folder); }} className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-muted-foreground/50 transition-all hover:bg-foreground/[0.06] hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100">
                          <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                      </div>
                      <div className="min-w-0 w-full">
                        <p className="text-[12px] sm:text-[14px] font-semibold truncate">{folder.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="premium-panel divide-y divide-foreground/[0.06] overflow-hidden">
                  {drive.folders.map((folder) => (
                    <button key={folder.id} onClick={() => drive.navigateToFolder(folder.id)} onContextMenu={(e) => { e.preventDefault(); setContextFolder(folder); }} className="group flex w-full items-center gap-2.5 sm:gap-4 px-3 sm:px-5 py-2.5 sm:py-4 transition-colors hover:bg-foreground/[0.02] text-left">
                      <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl" style={{ background: `linear-gradient(135deg, ${folder.color}30, ${folder.color}10)` }}>
                        <FolderIcon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: folder.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] sm:text-[14px] font-semibold truncate">{folder.name}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); setContextFolder(folder); }} className="flex h-7 w-7 sm:hidden items-center justify-center rounded-lg text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); setRenameFolderName(folder.name); setRenameFolderOpen(true); }} className="hidden sm:flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-foreground/[0.06] hover:text-foreground opacity-0 group-hover:opacity-100"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setMoveFolderTarget(folder); }} className="hidden sm:flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-foreground/[0.06] hover:text-foreground opacity-0 group-hover:opacity-100"><ArrowRight className="h-3.5 w-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteFolderTarget(folder); }} className="hidden sm:flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fichiers */}
          {drive.files.length > 0 && (
            <div>
              {drive.folders.length > 0 && <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">Fichiers ({drive.files.length})</p>}
              {effectiveView === "grid" ? (
                <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-3">
                  {drive.files.map((file) => {
                    const Icon = fileIcons[file.file_type] || File;
                    const colorClass = fileColors[file.file_type] || fileColors.other;
                    return (
                      <div key={file.id} className="premium-panel-soft group relative min-w-0 overflow-hidden p-3 sm:p-5">
                        <div className="flex items-start justify-between">
                          <div className={cn("flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br", colorClass)}><Icon className="h-3.5 w-3.5 sm:h-5 sm:w-5" /></div>
                          <button onClick={() => setContextFile(file)} className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl text-muted-foreground transition-all hover:bg-foreground/[0.06] hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"><MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></button>
                        </div>
                        <div className="mt-2 sm:mt-4 min-w-0">
                          <p className="text-[12px] sm:text-[14px] font-semibold truncate">{file.name}</p>
                          <div className="mt-0.5 sm:mt-1 flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] sm:text-[12px] text-muted-foreground"><span>{formatSize(file.size_bytes)}</span><span className="hidden sm:inline">·</span><span className="hidden sm:inline">{formatDate(file.created_at)}</span></div>
                          <div className="mt-1.5 sm:mt-2"><span className="inline-block rounded-lg bg-foreground/[0.04] px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[11px] font-medium text-muted-foreground">{file.category}</span></div>
                        </div>
                        <div className="mt-3 sm:mt-4 flex gap-1.5 sm:gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                          <button onClick={() => handleView(file)} className="flex flex-1 items-center justify-center gap-1 sm:gap-1.5 rounded-xl bg-foreground/[0.04] py-1.5 sm:py-2 text-[11px] sm:text-[12px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.08] hover:text-foreground"><Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" /><span className="hidden sm:inline">Voir</span></button>
                          <button onClick={() => handleDownload(file)} className="flex flex-1 items-center justify-center gap-1 sm:gap-1.5 rounded-xl bg-foreground/[0.04] py-1.5 sm:py-2 text-[11px] sm:text-[12px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.08] hover:text-foreground"><Download className="h-3 w-3 sm:h-3.5 sm:w-3.5" /><span className="hidden sm:inline">Télécharger</span></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="premium-panel divide-y divide-foreground/[0.06] overflow-hidden">
                  {drive.files.map((file) => {
                    const Icon = fileIcons[file.file_type] || File;
                    const colorClass = fileColors[file.file_type] || fileColors.other;
                    return (
                      <div key={file.id} onClick={() => isMobile ? setContextFile(file) : undefined} className="group flex items-center gap-2.5 sm:gap-4 px-3 sm:px-5 py-2.5 sm:py-4 transition-colors hover:bg-foreground/[0.02]">
                        <div className={cn("flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br", colorClass)}><Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] sm:text-[14px] font-semibold truncate">{file.name}</p>
                          <p className="text-[10px] sm:text-[12px] text-muted-foreground">{file.category} · {formatSize(file.size_bytes)}</p>
                        </div>
                        <div className="hidden sm:flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleView(file)} className="rounded-xl p-2 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground transition-all"><Eye className="h-4 w-4" /></button>
                          <button onClick={() => handleDownload(file)} className="rounded-xl p-2 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground transition-all"><Download className="h-4 w-4" /></button>
                          <button onClick={() => setMoveFileTarget(file)} className="rounded-xl p-2 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground transition-all"><ArrowRight className="h-4 w-4" /></button>
                          <button onClick={() => setDeleteTarget(file)} className="rounded-xl p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all"><Trash2 className="h-4 w-4" /></button>
                        </div>
                        <div className="flex sm:hidden shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); setContextFile(file); }} className="rounded-lg p-1 text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {totalItemsInCurrent === 0 && drive.search && (
            <div className="premium-panel flex flex-col items-center gap-3 py-16">
              <FolderOpen className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-[14px] text-muted-foreground">Aucun résultat pour &laquo;{drive.search}&raquo;</p>
            </div>
          )}
        </div>
      )}

      {/* Context menu fichier */}
      <Dialog open={!!contextFile} onOpenChange={(o) => !o && setContextFile(null)}>
        <DialogContent className="rounded-3xl sm:max-w-xs">
          <DialogHeader><DialogTitle className="truncate text-[15px]">{contextFile?.name}</DialogTitle></DialogHeader>
          <div className="space-y-1 pt-1">
            <button onClick={() => { contextFile && handleView(contextFile); setContextFile(null); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-foreground/[0.04]"><Eye className="h-4 w-4 text-muted-foreground" /> Aperçu</button>
            <button onClick={() => { contextFile && handleDownload(contextFile); setContextFile(null); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-foreground/[0.04]"><Download className="h-4 w-4 text-muted-foreground" /> Télécharger</button>
            <button onClick={() => { if (contextFile) { setRenameFileTarget(contextFile); setRenameFileName(contextFile.name); setContextFile(null); } }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-foreground/[0.04]"><Pencil className="h-4 w-4 text-muted-foreground" /> Renommer</button>
            <button onClick={() => { if (contextFile) { setMoveFileTarget(contextFile); setContextFile(null); } }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-foreground/[0.04]"><ArrowRight className="h-4 w-4 text-muted-foreground" /> Déplacer</button>
            <button onClick={() => { setDeleteTarget(contextFile); setContextFile(null); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-500/10"><Trash2 className="h-4 w-4" /> Supprimer</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Context menu dossier */}
      <Dialog open={!!contextFolder} onOpenChange={(o) => !o && setContextFolder(null)}>
        <DialogContent className="rounded-3xl sm:max-w-xs">
          <DialogHeader><DialogTitle className="truncate text-[15px]">{contextFolder?.name}</DialogTitle></DialogHeader>
          <div className="space-y-1 pt-1">
            <button onClick={() => { if (contextFolder) { setEditingFolder(contextFolder); setRenameFolderName(contextFolder.name); setRenameFolderOpen(true); setContextFolder(null); } }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-foreground/[0.04]"><Pencil className="h-4 w-4 text-muted-foreground" /> Renommer</button>
            <button onClick={() => { if (contextFolder) { setMoveFolderTarget(contextFolder); setContextFolder(null); } }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-foreground/[0.04]"><ArrowRight className="h-4 w-4 text-muted-foreground" /> Déplacer</button>
            <button onClick={() => { setDeleteFolderTarget(contextFolder); setContextFolder(null); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-500/10"><Trash2 className="h-4 w-4" /> Supprimer</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Créer Dossier */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader><DialogTitle>Nouveau dossier</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium">Nom du dossier</label>
              <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Ex: Documents administratifs" className="glass-input w-full py-2.5 px-4 text-[14px]" autoFocus onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium">Couleur</label>
              <div className="flex gap-2 flex-wrap">
                {FOLDER_COLORS.map((color) => (
                  <button key={color} onClick={() => setNewFolderColor(color)} className={cn("h-8 w-8 rounded-xl transition-all", newFolderColor === color ? "ring-2 ring-offset-2 ring-offset-background scale-110" : "hover:scale-105")} style={{ backgroundColor: color, "--tw-ring-color": color } as React.CSSProperties} />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setFolderDialogOpen(false)} className="flex-1 rounded-2xl bg-foreground/[0.06] py-3 text-[13px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground">Annuler</button>
              <button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl disabled:opacity-50"><FolderPlus className="h-4 w-4" />Créer</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Renommer Dossier */}
      <Dialog open={renameFolderOpen} onOpenChange={setRenameFolderOpen}>
        <DialogContent className="rounded-3xl sm:max-w-sm">
          <DialogHeader><DialogTitle>Renommer le dossier</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <input value={renameFolderName} onChange={(e) => setRenameFolderName(e.target.value)} className="glass-input w-full py-2.5 px-4 text-[14px]" autoFocus onKeyDown={(e) => e.key === "Enter" && handleRenameFolder()} />
            <div className="flex gap-3">
              <button onClick={() => setRenameFolderOpen(false)} className="flex-1 rounded-2xl bg-foreground/[0.06] py-3 text-[13px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground">Annuler</button>
              <button onClick={handleRenameFolder} disabled={!renameFolderName.trim()} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl disabled:opacity-50"><Pencil className="h-4 w-4" />Renommer</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Renommer Fichier */}
      <Dialog open={!!renameFileTarget} onOpenChange={(o) => !o && setRenameFileTarget(null)}>
        <DialogContent className="rounded-3xl sm:max-w-sm">
          <DialogHeader><DialogTitle>Renommer le fichier</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <input value={renameFileName} onChange={(e) => setRenameFileName(e.target.value)} className="glass-input w-full py-2.5 px-4 text-[14px]" autoFocus onKeyDown={(e) => e.key === "Enter" && handleRenameFile()} />
            <div className="flex gap-3">
              <button onClick={() => setRenameFileTarget(null)} className="flex-1 rounded-2xl bg-foreground/[0.06] py-3 text-[13px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground">Annuler</button>
              <button onClick={handleRenameFile} disabled={!renameFileName.trim()} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl disabled:opacity-50"><Pencil className="h-4 w-4" />Renommer</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Import */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md overflow-hidden">
          <DialogHeader><DialogTitle className="truncate pr-8">{pendingFileNames.length > 1 ? `Importer ${pendingFileNames.length} fichiers` : <span className="flex items-center gap-1 min-w-0">Importer <span className="truncate">{pendingFileNames[0]?.name ?? "un fichier"}</span></span>}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium">Catégorie</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.filter((c) => c !== "Tous").map((cat) => (
                  <button key={cat} onClick={() => setImportCategory(cat)} className={cn("rounded-2xl px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] font-medium transition-all duration-200", importCategory === cat ? "bg-primary/15 text-primary shadow-sm" : "bg-foreground/[0.04] text-muted-foreground hover:text-foreground hover:bg-foreground/[0.08]")}>{cat}</button>
                ))}
              </div>
            </div>
            {pendingFileNames.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium">Fichiers sélectionnés</label>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-foreground/[0.03] p-2">
                  {pendingFileNames.map((f, i) => (<div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] min-w-0"><FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="truncate min-w-0 flex-1">{f.name}</span><span className="ml-2 text-muted-foreground shrink-0">{formatSize(f.size)}</span></div>))}
                </div>
              </div>
            )}
            {drive.currentFolderId && (
              <div className="rounded-xl bg-foreground/[0.03] px-3 py-2 text-[12px] text-muted-foreground">
                <span className="font-medium text-foreground">Destination :</span>{" "}{drive.breadcrumb.map((f) => f.name).join(" / ") || "Racine"}
              </div>
            )}
            {uploadProgress && (
              <div className="space-y-1">
                <div className="h-2 rounded-full bg-foreground/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground text-center">{uploadProgress.done} / {uploadProgress.total} fichier(s)</p>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setImportDialogOpen(false)} disabled={uploading} className="flex-1 rounded-2xl bg-foreground/[0.06] py-3 text-[13px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground disabled:opacity-50">Annuler</button>
              <button onClick={handleConfirmImport} disabled={uploading} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl disabled:opacity-50">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4" />Importer</>}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog suppression fichier */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="rounded-3xl sm:max-w-sm">
          <DialogHeader><DialogTitle>Supprimer le fichier</DialogTitle></DialogHeader>
          <div className="space-y-5 pt-1">
            <p className="text-[14px] text-muted-foreground leading-relaxed">Voulez-vous vraiment supprimer <span className="font-semibold text-foreground">{deleteTarget?.name}</span> ?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-2xl bg-foreground/[0.06] py-3 text-[13px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground">Annuler</button>
              <button onClick={() => deleteTarget && handleDelete(deleteTarget)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500 py-3 text-[13px] font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:shadow-xl"><Trash2 className="h-4 w-4" />Supprimer</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog suppression dossier */}
      <Dialog open={!!deleteFolderTarget} onOpenChange={(open) => !open && setDeleteFolderTarget(null)}>
        <DialogContent className="rounded-3xl sm:max-w-sm">
          <DialogHeader><DialogTitle>Supprimer le dossier</DialogTitle></DialogHeader>
          <div className="space-y-5 pt-1">
            <p className="text-[14px] text-muted-foreground leading-relaxed">Voulez-vous vraiment supprimer le dossier <span className="font-semibold text-foreground">{deleteFolderTarget?.name}</span> et tout son contenu ?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteFolderTarget(null)} className="flex-1 rounded-2xl bg-foreground/[0.06] py-3 text-[13px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground">Annuler</button>
              <button onClick={() => deleteFolderTarget && handleDeleteFolder(deleteFolderTarget)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500 py-3 text-[13px] font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:shadow-xl"><Trash2 className="h-4 w-4" />Supprimer</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* FilePreview avec zoom */}
      <FilePreview
        open={!!previewFile}
        onOpenChange={(o) => !o && setPreviewFile(null)}
        fileName={previewFile?.name ?? ""}
        fileType={previewFile?.file_type ?? "other"}
        getUrl={getPreviewUrl}
      />

      {/* Move file dialog */}
      <MoveDialog
        open={!!moveFileTarget}
        onOpenChange={(o) => !o && setMoveFileTarget(null)}
        title={`Déplacer "${moveFileTarget?.name ?? ""}"`}
        allFolders={drive.allFolders}
        currentFolderId={moveFileTarget?.folder_id ?? null}
        onMove={handleMoveFile}
      />

      {/* Move folder dialog */}
      <MoveDialog
        open={!!moveFolderTarget}
        onOpenChange={(o) => !o && setMoveFolderTarget(null)}
        title={`Déplacer "${moveFolderTarget?.name ?? ""}"`}
        allFolders={drive.allFolders}
        excludeIds={moveFolderExcludeIds}
        currentFolderId={moveFolderTarget?.parent_id ?? null}
        onMove={handleMoveFolder}
      />
    </div>
  );
}
