"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  FolderOpen,
  Upload,
  FileText,
  Image,
  File,
  Search,
  Grid3X3,
  List,
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
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════
   Types & constantes
   ═══════════════════════════════════════════════════════ */

type FileItem = {
  id: string;
  name: string;
  type: "pdf" | "image" | "document" | "other";
  size: string;
  sizeBytes: number;
  date: string;
  category: string;
  folderId: string | null;
  dataUrl?: string;
};

type FolderItem = {
  id: string;
  name: string;
  parentId: string | null;
  color: string;
  createdAt: string;
};

const STORAGE_KEY = "life-fichiers";
const FOLDERS_KEY = "life-fichiers-folders";

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

function detectFileType(name: string): FileItem["type"] {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "image";
  if (["doc", "docx", "odt", "txt", "rtf", "md"].includes(ext)) return "document";
  return "other";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/* ═══════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════ */

export default function FichiersPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tous");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<FolderItem | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importCategory, setImportCategory] = useState("Autre");
  const [pendingFileNames, setPendingFileNames] = useState<{ name: string; size: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFilesRef = useRef<globalThis.File[]>([]);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);
  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [contextFile, setContextFile] = useState<FileItem | null>(null);
  const [contextFolder, setContextFolder] = useState<FolderItem | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as FileItem[];
        setFiles(parsed.map((f) => ({ ...f, folderId: f.folderId ?? null })));
      }
      const storedFolders = localStorage.getItem(FOLDERS_KEY);
      if (storedFolders) setFolders(JSON.parse(storedFolders));
    } catch { /* ignore */ }
  }, []);

  const persistFiles = useCallback((items: FileItem[]) => {
    setFiles(items);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
    catch { const light = items.map(({ dataUrl, ...rest }) => rest); localStorage.setItem(STORAGE_KEY, JSON.stringify(light)); }
  }, []);

  const persistFolders = useCallback((items: FolderItem[]) => {
    setFolders(items);
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(items));
  }, []);

  const breadcrumb = useMemo(() => {
    const path: FolderItem[] = [];
    let id = currentFolderId;
    while (id) {
      const folder = folders.find((f) => f.id === id);
      if (!folder) break;
      path.unshift(folder);
      id = folder.parentId;
    }
    return path;
  }, [currentFolderId, folders]);

  const subFolders = useMemo(
    () => folders.filter((f) => f.parentId === currentFolderId),
    [folders, currentFolderId]
  );

  const filtered = useMemo(() => {
    return files
      .filter((f) => f.folderId === currentFolderId)
      .filter((f) => {
        const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase());
        const matchCategory = category === "Tous" || f.category === category;
        return matchSearch && matchCategory;
      });
  }, [files, currentFolderId, search, category]);

  const filteredFolders = useMemo(() => {
    if (!search) return subFolders;
    return subFolders.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));
  }, [subFolders, search]);

  const allCategories = [...new Set([...CATEGORIES, ...files.map((f) => f.category)])];

  const folderFileCount = useCallback(
    (folderId: string): number => {
      const directFiles = files.filter((f) => f.folderId === folderId).length;
      const subFolderIds = folders.filter((f) => f.parentId === folderId).map((f) => f.id);
      const subFiles = subFolderIds.reduce((sum, id) => sum + folderFileCount(id), 0);
      return directFiles + subFiles;
    },
    [files, folders]
  );

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
    const newFiles: FileItem[] = [];
    for (const file of pendingFilesRef.current) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newFiles.push({
        id: generateId(),
        name: file.name,
        type: detectFileType(file.name),
        size: formatSize(file.size),
        sizeBytes: file.size,
        date: new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
        category: importCategory,
        folderId: currentFolderId,
        dataUrl,
      });
    }
    const updated = [...newFiles, ...files];
    persistFiles(updated);
    pendingFilesRef.current = [];
    setPendingFileNames([]);
    setImportDialogOpen(false);
    setUploading(false);
    toast.success(`${newFiles.length} fichier${newFiles.length > 1 ? "s" : ""} importé${newFiles.length > 1 ? "s" : ""}`);
  };

  const handleDelete = (file: FileItem) => {
    persistFiles(files.filter((f) => f.id !== file.id));
    setDeleteTarget(null);
    setContextFile(null);
    toast.success(`"${file.name}" supprimé`);
  };

  const handleDownload = (file: FileItem) => {
    if (!file.dataUrl) { toast.error("Fichier non disponible"); return; }
    const link = document.createElement("a");
    link.href = file.dataUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleView = (file: FileItem) => {
    if (file.dataUrl) setPreviewFile(file);
    else toast.info("Aperçu non disponible");
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const folder: FolderItem = { id: generateId(), name: newFolderName.trim(), parentId: currentFolderId, color: newFolderColor, createdAt: new Date().toISOString() };
    persistFolders([...folders, folder]);
    setNewFolderName("");
    setNewFolderColor(FOLDER_COLORS[0]);
    setFolderDialogOpen(false);
    toast.success(`Dossier "${folder.name}" créé`);
  };

  const handleDeleteFolder = (folder: FolderItem) => {
    const idsToDelete = new Set<string>();
    const collectIds = (parentId: string) => { idsToDelete.add(parentId); folders.filter((f) => f.parentId === parentId).forEach((f) => collectIds(f.id)); };
    collectIds(folder.id);
    persistFolders(folders.filter((f) => !idsToDelete.has(f.id)));
    persistFiles(files.filter((f) => !f.folderId || !idsToDelete.has(f.folderId)));
    setDeleteFolderTarget(null);
    setContextFolder(null);
    if (currentFolderId === folder.id) setCurrentFolderId(folder.parentId);
    toast.success(`Dossier "${folder.name}" supprimé`);
  };

  const handleRenameFolder = () => {
    if (!editingFolder || !renameFolderName.trim()) return;
    persistFolders(folders.map((f) => f.id === editingFolder.id ? { ...f, name: renameFolderName.trim() } : f));
    setEditingFolder(null);
    setRenameFolderOpen(false);
    setRenameFolderName("");
    setContextFolder(null);
    toast.success("Dossier renommé");
  };

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSearch("");
    setCategory("Tous");
  };

  const totalItemsInCurrent = filteredFolders.length + filtered.length;

  return (
    <div className="mx-auto max-w-6xl space-y-4 lg:space-y-6">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} accept="*/*" />

      {/* Search + Actions */}
      <div className="glass-card flex flex-col gap-3 p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="glass-input w-full py-2.5 pl-10 pr-4 text-[14px]" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-foreground/[0.04] p-0.5">
            <button onClick={() => setView("grid")} className={cn("rounded-lg p-2 transition-all", view === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}><Grid3X3 className="h-4 w-4" /></button>
            <button onClick={() => setView("list")} className={cn("rounded-lg p-2 transition-all", view === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}><List className="h-4 w-4" /></button>
          </div>
          <button onClick={() => setFolderDialogOpen(true)} className="flex items-center gap-2 rounded-2xl bg-foreground/[0.06] px-3 sm:px-4 py-2.5 text-[13px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground">
            <FolderPlus className="h-4 w-4" /><span className="hidden sm:inline">Dossier</span>
          </button>
          <button onClick={handleImportClick} className="flex items-center gap-2 rounded-2xl bg-primary px-3 sm:px-4 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:-translate-y-0.5">
            <Upload className="h-4 w-4" /><span className="hidden sm:inline">Importer</span>
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {allCategories.map((cat) => (
          <button key={cat} onClick={() => setCategory(cat)} className={cn("shrink-0 rounded-2xl px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] font-medium transition-all duration-200", category === cat ? "bg-primary/15 text-primary shadow-sm" : "bg-foreground/[0.04] text-muted-foreground hover:text-foreground hover:bg-foreground/[0.08]")}>{cat}</button>
        ))}
      </div>

      {/* Breadcrumb — sous les catégories */}
      {(currentFolderId !== null || breadcrumb.length > 0) && (
        <div className="flex items-center gap-1 text-[13px] overflow-x-auto no-scrollbar pb-1">
          <button onClick={() => navigateToFolder(null)} className={cn("flex items-center gap-1 shrink-0 rounded-lg px-2 py-1 transition-colors", currentFolderId === null ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]")}>
            <Home className="h-3.5 w-3.5" />
            <span>Racine</span>
          </button>
          {breadcrumb.map((folder) => (
            <div key={folder.id} className="flex items-center gap-1 shrink-0">
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <button onClick={() => navigateToFolder(folder.id)} className={cn("rounded-lg px-2 py-1 transition-colors truncate max-w-[120px]", currentFolderId === folder.id ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]")}>{folder.name}</button>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {totalItemsInCurrent === 0 && !search ? (
        <div className="glass-card flex flex-col items-center gap-3 px-4 py-12 sm:py-16 text-center">
          <FolderOpen className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/40" />
          <p className="text-[13px] sm:text-[14px] text-muted-foreground">{files.length === 0 && folders.length === 0 ? "Aucun fichier. Importez votre premier document." : "Ce dossier est vide."}</p>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button onClick={() => setFolderDialogOpen(true)} className="flex items-center justify-center gap-2 rounded-2xl bg-foreground/[0.06] px-4 py-2.5 text-[13px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground"><FolderPlus className="h-4 w-4" />Créer un dossier</button>
            <button onClick={handleImportClick} className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/25"><Plus className="h-4 w-4" />Importer</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Dossiers */}
          {filteredFolders.length > 0 && (
            <div>
              <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">Dossiers ({filteredFolders.length})</p>
              {view === "grid" ? (
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  {filteredFolders.map((folder) => (
                    <button key={folder.id} onClick={() => navigateToFolder(folder.id)} onContextMenu={(e) => { e.preventDefault(); setContextFolder(folder); }} className="glass-card group relative flex flex-col items-start gap-3 p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5">
                      <div className="flex w-full items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `linear-gradient(135deg, ${folder.color}30, ${folder.color}10)` }}>
                          <FolderIcon className="h-5 w-5" style={{ color: folder.color }} />
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setContextFolder(folder); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/50 transition-all hover:bg-foreground/[0.06] hover:text-foreground opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="min-w-0 w-full">
                        <p className="text-[13px] sm:text-[14px] font-semibold truncate">{folder.name}</p>
                        <p className="text-[11px] text-muted-foreground">{folderFileCount(folder.id)} élément{folderFileCount(folder.id) > 1 ? "s" : ""}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="glass-card divide-y divide-foreground/[0.06] overflow-hidden">
                  {filteredFolders.map((folder) => (
                    <button key={folder.id} onClick={() => navigateToFolder(folder.id)} className="group flex w-full items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 transition-colors hover:bg-foreground/[0.02] text-left">
                      <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `linear-gradient(135deg, ${folder.color}30, ${folder.color}10)` }}>
                        <FolderIcon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: folder.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] sm:text-[14px] font-semibold truncate">{folder.name}</p>
                        <p className="text-[11px] sm:text-[12px] text-muted-foreground">{folderFileCount(folder.id)} élément{folderFileCount(folder.id) > 1 ? "s" : ""}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); setRenameFolderName(folder.name); setRenameFolderOpen(true); }} className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-foreground/[0.06] hover:text-foreground opacity-0 group-hover:opacity-100"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteFolderTarget(folder); }} className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fichiers */}
          {filtered.length > 0 && (
            <div>
              {filteredFolders.length > 0 && <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">Fichiers ({filtered.length})</p>}
              {view === "grid" ? (
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((file) => {
                    const Icon = fileIcons[file.type] || File;
                    const colorClass = fileColors[file.type] || fileColors.other;
                    return (
                      <div key={file.id} className="glass-card group relative overflow-hidden p-4 sm:p-5">
                        <div className="flex items-start justify-between">
                          <div className={cn("flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-br", colorClass)}><Icon className="h-4 w-4 sm:h-5 sm:w-5" /></div>
                          <button onClick={() => setDeleteTarget(file)} className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-500 opacity-0 group-hover:opacity-100 hidden sm:flex"><Trash2 className="h-4 w-4" /></button>
                        </div>
                        <div className="mt-3 sm:mt-4">
                          <p className="text-[13px] sm:text-[14px] font-semibold truncate">{file.name}</p>
                          <div className="mt-1 flex items-center gap-2 text-[11px] sm:text-[12px] text-muted-foreground"><span>{file.size}</span><span>·</span><span>{file.date}</span></div>
                          <div className="mt-2"><span className="inline-block rounded-lg bg-foreground/[0.04] px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-muted-foreground">{file.category}</span></div>
                        </div>
                        {/* Desktop hover actions */}
                        <div className="mt-3 sm:mt-4 hidden sm:flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleView(file)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground/[0.04] py-2 text-[12px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.08] hover:text-foreground"><Eye className="h-3.5 w-3.5" /> Voir</button>
                          <button onClick={() => handleDownload(file)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground/[0.04] py-2 text-[12px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.08] hover:text-foreground"><Download className="h-3.5 w-3.5" /> Télécharger</button>
                        </div>
                        {/* Mobile always-visible actions */}
                        <div className="mt-2 flex gap-1.5 sm:hidden">
                          <button onClick={() => handleView(file)} className="flex flex-1 items-center justify-center rounded-lg bg-foreground/[0.04] py-1.5 text-muted-foreground"><Eye className="h-3.5 w-3.5" /></button>
                          <button onClick={() => handleDownload(file)} className="flex flex-1 items-center justify-center rounded-lg bg-foreground/[0.04] py-1.5 text-muted-foreground"><Download className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setDeleteTarget(file)} className="flex items-center justify-center rounded-lg bg-red-500/10 px-2.5 py-1.5 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="glass-card divide-y divide-foreground/[0.06] overflow-hidden">
                  {filtered.map((file) => {
                    const Icon = fileIcons[file.type] || File;
                    const colorClass = fileColors[file.type] || fileColors.other;
                    return (
                      <div key={file.id} className="group flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 transition-colors hover:bg-foreground/[0.02]">
                        <div className={cn("flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br", colorClass)}><Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] sm:text-[14px] font-semibold truncate">{file.name}</p>
                          <p className="text-[11px] sm:text-[12px] text-muted-foreground">{file.category} · {file.size} · {file.date}</p>
                        </div>
                        <div className="hidden sm:flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleView(file)} className="rounded-xl p-2 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground transition-all"><Eye className="h-4 w-4" /></button>
                          <button onClick={() => handleDownload(file)} className="rounded-xl p-2 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground transition-all"><Download className="h-4 w-4" /></button>
                          <button onClick={() => setDeleteTarget(file)} className="rounded-xl p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all"><Trash2 className="h-4 w-4" /></button>
                        </div>
                        <div className="flex sm:hidden gap-1">
                          <button onClick={() => handleView(file)} className="rounded-lg p-1.5 text-muted-foreground"><Eye className="h-4 w-4" /></button>
                          <button onClick={() => setContextFile(contextFile?.id === file.id ? null : file)} className="rounded-lg p-1.5 text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {totalItemsInCurrent === 0 && search && (
            <div className="glass-card flex flex-col items-center gap-3 py-16">
              <FolderOpen className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-[14px] text-muted-foreground">Aucun résultat pour &laquo;{search}&raquo;</p>
            </div>
          )}
        </div>
      )}

      {/* Context menu mobile fichier */}
      <Dialog open={!!contextFile} onOpenChange={(o) => !o && setContextFile(null)}>
        <DialogContent className="rounded-3xl sm:max-w-xs">
          <DialogHeader><DialogTitle className="truncate text-[15px]">{contextFile?.name}</DialogTitle></DialogHeader>
          <div className="space-y-1 pt-1">
            <button onClick={() => { contextFile && handleDownload(contextFile); setContextFile(null); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-foreground/[0.04]"><Download className="h-4 w-4 text-muted-foreground" /> Télécharger</button>
            <button onClick={() => { setDeleteTarget(contextFile); setContextFile(null); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-500/10"><Trash2 className="h-4 w-4" /> Supprimer</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Context menu mobile dossier */}
      <Dialog open={!!contextFolder} onOpenChange={(o) => !o && setContextFolder(null)}>
        <DialogContent className="rounded-3xl sm:max-w-xs">
          <DialogHeader><DialogTitle className="truncate text-[15px]">{contextFolder?.name}</DialogTitle></DialogHeader>
          <div className="space-y-1 pt-1">
            <button onClick={() => { if (contextFolder) { setEditingFolder(contextFolder); setRenameFolderName(contextFolder.name); setRenameFolderOpen(true); setContextFolder(null); } }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-foreground/[0.04]"><Pencil className="h-4 w-4 text-muted-foreground" /> Renommer</button>
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
            {currentFolderId && (
              <div className="rounded-xl bg-foreground/[0.03] px-3 py-2 text-[12px] text-muted-foreground">
                <span className="font-medium text-foreground">Destination :</span>{" "}{breadcrumb.map((f) => f.name).join(" / ") || "Racine"}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setImportDialogOpen(false)} className="flex-1 rounded-2xl bg-foreground/[0.06] py-3 text-[13px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground">Annuler</button>
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

      {/* Dialog prévisualisation */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="rounded-3xl sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="truncate pr-8">{previewFile?.name}</DialogTitle></DialogHeader>
          <div className="pt-2">
            {previewFile?.type === "image" && previewFile.dataUrl ? (
              <img src={previewFile.dataUrl} alt={previewFile.name} className="w-full rounded-xl" />
            ) : previewFile?.type === "pdf" && previewFile.dataUrl ? (
              <iframe src={previewFile.dataUrl} className="w-full h-[60vh] rounded-xl" title={previewFile.name} />
            ) : (
              <div className="flex flex-col items-center gap-4 py-12">
                <File className="h-16 w-16 text-muted-foreground/40" />
                <p className="text-[14px] text-muted-foreground">Aperçu non disponible pour ce type de fichier.</p>
                <button onClick={() => previewFile && handleDownload(previewFile)} className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/25"><Download className="h-4 w-4" />Télécharger</button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
