"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
    dataUrl?: string;
};

const STORAGE_KEY = "life-fichiers";

const CATEGORIES = [
    "Tous",
    "Administratif",
    "Identité",
    "Finance",
    "Santé",
    "Logement",
    "Autre",
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
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("Tous");
    const [view, setView] = useState<"grid" | "list">("grid");
    const [uploading, setUploading] = useState(false);
    const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [importCategory, setImportCategory] = useState("Autre");
    const [pendingFileNames, setPendingFileNames] = useState<{ name: string; size: number }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pendingFilesRef = useRef<globalThis.File[]>([]);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) setFiles(JSON.parse(stored));
        } catch { /* ignore */ }
    }, []);

    const persist = useCallback((items: FileItem[]) => {
        setFiles(items);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch {
            const light = items.map(({ dataUrl, ...rest }) => rest);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(light));
        }
    }, []);

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
                dataUrl,
            });
        }
        const updated = [...newFiles, ...files];
        persist(updated);
        pendingFilesRef.current = [];
        setPendingFileNames([]);
        setImportDialogOpen(false);
        setUploading(false);
        toast.success(`${newFiles.length} fichier${newFiles.length > 1 ? "s" : ""} importé${newFiles.length > 1 ? "s" : ""}`);
    };

    const handleDelete = (file: FileItem) => {
        persist(files.filter((f) => f.id !== file.id));
        setDeleteTarget(null);
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

    const filtered = files.filter((f) => {
        const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase());
        const matchCategory = category === "Tous" || f.category === category;
        return matchSearch && matchCategory;
    });

    const allCategories = [...new Set([...CATEGORIES, ...files.map((f) => f.category)])];

    return (
        <div className="mx-auto max-w-6xl space-y-5 lg:space-y-8">
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} accept="*/*" />

            {/* Header */}
            <div className="animate-slide-up">
                <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Fichiers</h2>
                <p className="mt-1.5 text-[15px] text-muted-foreground">
                    Vos documents importants, organisés et sécurisés.
                    {files.length > 0 && <span className="ml-1 font-medium text-foreground">({files.length})</span>}
                </p>
            </div>

            {/* Search + Actions */}
            <div className="glass-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between animate-slide-up" style={{ animationDelay: "100ms" }}>
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un fichier..." className="glass-input w-full py-2.5 pl-10 pr-4 text-[14px]" />
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex rounded-xl bg-foreground/[0.04] p-0.5">
                        <button onClick={() => setView("grid")} className={cn("rounded-lg p-2 transition-all", view === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}><Grid3X3 className="h-4 w-4" /></button>
                        <button onClick={() => setView("list")} className={cn("rounded-lg p-2 transition-all", view === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}><List className="h-4 w-4" /></button>
                    </div>
                    <button onClick={handleImportClick} className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:-translate-y-0.5">
                        <Upload className="h-4 w-4" /><span className="hidden sm:inline">Importer</span>
                    </button>
                </div>
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin animate-slide-up" style={{ animationDelay: "150ms" }}>
                {allCategories.map((cat) => (
                    <button key={cat} onClick={() => setCategory(cat)} className={cn("shrink-0 rounded-2xl px-4 py-2 text-[13px] font-medium transition-all duration-200", category === cat ? "bg-primary/15 text-primary shadow-sm" : "bg-foreground/[0.04] text-muted-foreground hover:text-foreground hover:bg-foreground/[0.08]")}>{cat}</button>
                ))}
            </div>

            {/* Files */}
            {filtered.length === 0 ? (
                <div className="glass-card flex flex-col items-center gap-3 py-16 animate-slide-up">
                    <FolderOpen className="h-12 w-12 text-muted-foreground/40" />
                    <p className="text-[14px] text-muted-foreground">{files.length === 0 ? "Aucun fichier. Importez votre premier document." : "Aucun fichier trouvé."}</p>
                    {files.length === 0 && (
                        <button onClick={handleImportClick} className="mt-2 flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/25">
                            <Plus className="h-4 w-4" />Importer un fichier
                        </button>
                    )}
                </div>
            ) : view === "grid" ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((file, index) => {
                        const Icon = fileIcons[file.type] || File;
                        const colorClass = fileColors[file.type] || fileColors.other;
                        return (
                            <div key={file.id} className="glass-card group relative overflow-hidden p-5 animate-slide-up" style={{ animationDelay: `${(index + 3) * 80}ms` }}>
                                <div className="flex items-start justify-between">
                                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br", colorClass)}><Icon className="h-5 w-5" /></div>
                                    <button onClick={() => setDeleteTarget(file)} className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                                </div>
                                <div className="mt-4">
                                    <p className="text-[14px] font-semibold truncate">{file.name}</p>
                                    <div className="mt-1.5 flex items-center gap-2 text-[12px] text-muted-foreground"><span>{file.size}</span><span>·</span><span>{file.date}</span></div>
                                    <div className="mt-2"><span className="inline-block rounded-lg bg-foreground/[0.04] px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{file.category}</span></div>
                                </div>
                                <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => handleView(file)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground/[0.04] py-2 text-[12px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.08] hover:text-foreground"><Eye className="h-3.5 w-3.5" /> Voir</button>
                                    <button onClick={() => handleDownload(file)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground/[0.04] py-2 text-[12px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.08] hover:text-foreground"><Download className="h-3.5 w-3.5" /> Télécharger</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="glass-card divide-y divide-foreground/[0.06] overflow-hidden animate-slide-up" style={{ animationDelay: "200ms" }}>
                    {filtered.map((file) => {
                        const Icon = fileIcons[file.type] || File;
                        const colorClass = fileColors[file.type] || fileColors.other;
                        return (
                            <div key={file.id} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-foreground/[0.02]">
                                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br", colorClass)}><Icon className="h-4 w-4" /></div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[14px] font-semibold truncate">{file.name}</p>
                                    <p className="text-[12px] text-muted-foreground">{file.category} · {file.size} · {file.date}</p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => handleView(file)} className="rounded-xl p-2 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground transition-all"><Eye className="h-4 w-4" /></button>
                                    <button onClick={() => handleDownload(file)} className="rounded-xl p-2 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground transition-all"><Download className="h-4 w-4" /></button>
                                    <button onClick={() => setDeleteTarget(file)} className="rounded-xl p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Dialog Import */}
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogContent className="rounded-3xl sm:max-w-md">
                    <DialogHeader><DialogTitle>Importer {pendingFileNames.length > 1 ? `${pendingFileNames.length} fichiers` : pendingFileNames[0]?.name ?? "un fichier"}</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-medium">Catégorie</label>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIES.filter((c) => c !== "Tous").map((cat) => (
                                    <button key={cat} onClick={() => setImportCategory(cat)} className={cn("rounded-2xl px-4 py-2 text-[13px] font-medium transition-all duration-200", importCategory === cat ? "bg-primary/15 text-primary shadow-sm" : "bg-foreground/[0.04] text-muted-foreground hover:text-foreground hover:bg-foreground/[0.08]")}>{cat}</button>
                                ))}
                            </div>
                        </div>
                        {pendingFileNames.length > 0 && (
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-medium">Fichiers sélectionnés</label>
                                <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-foreground/[0.03] p-2">
                                    {pendingFileNames.map((f, i) => (
                                        <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px]">
                                            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            <span className="truncate">{f.name}</span>
                                            <span className="ml-auto text-muted-foreground shrink-0">{formatSize(f.size)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex gap-3 pt-1">
                            <button onClick={() => setImportDialogOpen(false)} className="flex-1 rounded-2xl bg-foreground/[0.06] py-3 text-[13px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground">Annuler</button>
                            <button onClick={handleConfirmImport} disabled={uploading} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl disabled:opacity-50">
                                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4" />Importer</>}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog suppression */}
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
