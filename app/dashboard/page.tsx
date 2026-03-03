"use client";

import { useState, useEffect } from "react";
import {
    Calendar,
    Heart,
    Home,
    FolderOpen,
    ArrowUpRight,
    Activity,
    Thermometer,
    Droplets,
    Sun,
    Moon,
    Footprints,
    Flame,
    Pencil,
    Plus,
    X,
    Settings2,
    Eye,
    EyeOff,
    ArrowUp,
    ArrowDown,
    RotateCcw,
    Save,
    Wallet,
    Dumbbell,
    Lock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    useDashboardModules,
    useVisibleWidgets,
    useHiddenWidgets,
    useVisibleStats,
    useHiddenStats,
    type DashboardWidget,
    type QuickStat,
} from "@/lib/stores/dashboard-modules";

/* ═══════════════════════════════════════════════════════
   Icon map
   ═══════════════════════════════════════════════════════ */
const ICON_MAP: Record<string, React.ElementType> = {
    Calendar,
    Heart,
    Home,
    FolderOpen,
    Activity,
    Thermometer,
    Droplets,
    Sun,
    Moon,
    Footprints,
    Flame,
    Pencil,
    Wallet,
    Dumbbell,
};

function getIcon(key: string): React.ElementType {
    return ICON_MAP[key] ?? Activity;
}

/* ═══════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════ */
export default function DashboardPage() {
    const [mounted, setMounted] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    /* ─── Edit widget dialog ─── */
    const [editingWidget, setEditingWidget] = useState<string | null>(null);
    const [ewTitle, setEwTitle] = useState("");

    /* ─── Edit stat dialog ─── */
    const [editingStat, setEditingStat] = useState<string | null>(null);
    const [esLabel, setEsLabel] = useState("");

    /* ─── Store ─── */
    const visibleWidgets = useVisibleWidgets();
    const hiddenWidgets = useHiddenWidgets();
    const visibleStats = useVisibleStats();
    const hiddenStats = useHiddenStats();
    const {
        widgets: allWidgets,
        stats: allStats,
        updateWidget,
        toggleWidget,
        moveWidget,
        addWidget,
        updateStat,
        toggleStat,
        moveStat,
        resetAll,
    } = useDashboardModules();

    useEffect(() => {
        setMounted(true);
    }, []);

    const now = new Date();
    const greeting =
        now.getHours() < 12
            ? "Bonjour"
            : now.getHours() < 18
                ? "Bon après-midi"
                : "Bonsoir";

    /* ─── Edit handlers ─── */
    const startEditWidget = (w: DashboardWidget) => {
        setEditingWidget(w.id);
        setEwTitle(w.title);
    };

    const saveEditWidget = () => {
        if (!editingWidget) return;
        updateWidget(editingWidget, {
            title: ewTitle,
        });
        setEditingWidget(null);
        toast.success("Widget renommé");
    };

    const startEditStat = (s: QuickStat) => {
        setEditingStat(s.id);
        setEsLabel(s.label);
    };

    const saveEditStat = () => {
        if (!editingStat) return;
        updateStat(editingStat, { label: esLabel });
        setEditingStat(null);
        toast.success("Statistique renommée");
    };

    if (!mounted) return null;

    return (
        <div className="mx-auto max-w-6xl space-y-5 lg:space-y-8">
            {/* ─── Header ─── */}
            <div className="animate-slide-up">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">{greeting} 👋</h2>
                        <p className="mt-1.5 text-[15px] text-muted-foreground">
                            Voici un aperçu de votre journée du{" "}
                            {now.toLocaleDateString("fr-FR", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                            })}
                            .
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setEditMode(!editMode)}
                            className={cn(
                                "flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-medium transition-all duration-300",
                                editMode
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                                    : "bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/[0.1] hover:text-foreground"
                            )}
                        >
                            {editMode ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                            <span className="hidden sm:inline">{editMode ? "Terminer" : "Modifier"}</span>
                        </button>
                        <button
                            onClick={() => setSettingsOpen(true)}
                            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground/[0.06] text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground"
                            title="Gérer les modules"
                        >
                            <Settings2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Quick Stats Bar ─── */}
            <div
                className="glass-card grid grid-cols-2 gap-3 px-4 py-4 lg:flex lg:items-center lg:justify-between lg:px-6 animate-slide-up"
                style={{ animationDelay: "100ms" }}
            >
                {visibleStats.map((stat) => {
                    const StatIcon = getIcon(stat.iconKey);
                    return (
                        <div key={stat.id} className="group relative flex items-center gap-3">
                            <div className={stat.color}>
                                <StatIcon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{stat.label}</p>
                                <p className="text-sm font-semibold">{stat.value}</p>
                            </div>
                            {/* Edit button */}
                            {editMode && (
                                <button
                                    onClick={() => startEditStat(stat)}
                                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Pencil className="h-2.5 w-2.5" />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ─── Widgets Grid ─── */}
            <div className="grid gap-5 sm:grid-cols-2">
                {visibleWidgets.map((widget, index) => {
                    const WidgetIcon = getIcon(widget.iconKey);
                    const content = (
                        <div className="glass-card relative overflow-hidden p-6 group">
                            {/* Background gradient blob */}
                            <div
                                className={`absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${widget.gradient} opacity-20 blur-2xl transition-all duration-500 group-hover:opacity-30 group-hover:scale-125`}
                            />

                            {/* Edit overlay */}
                            {editMode && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-[1.25rem] bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            startEditWidget(widget);
                                        }}
                                        className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground shadow-lg"
                                    >
                                        <Pencil className="h-3 w-3" /> Modifier
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            toggleWidget(widget.id);
                                            toast.success(`${widget.title} masqué`);
                                        }}
                                        className="flex items-center gap-1.5 rounded-xl bg-red-500 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg"
                                    >
                                        <EyeOff className="h-3 w-3" /> Masquer
                                    </button>
                                </div>
                            )}

                            {/* Header */}
                            <div className="relative flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${widget.gradient} shadow-lg ${widget.shadowColor}`}
                                    >
                                        <WidgetIcon className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-[15px] font-semibold">{widget.title}</h3>
                                        <p className="text-xs text-muted-foreground">{widget.description}</p>
                                    </div>
                                </div>
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/[0.04] text-muted-foreground transition-all duration-300 group-hover:bg-foreground/[0.08] group-hover:text-foreground">
                                    <ArrowUpRight className="h-4 w-4" />
                                </div>
                            </div>

                            {/* Stat */}
                            <div className="relative mt-8">
                                <span className="text-4xl font-bold tracking-tight">{widget.stat}</span>
                                <span className="ml-2 text-sm text-muted-foreground">{widget.statLabel}</span>
                            </div>

                            {/* Mini chart placeholder */}
                            <div className="relative mt-4 h-12 overflow-hidden rounded-xl bg-foreground/[0.03]">
                                <div
                                    className={`absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t ${widget.gradient} opacity-10 rounded-b-xl`}
                                />
                                <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 40">
                                    <path
                                        d="M0 35 Q 15 28, 25 30 T 50 20 T 75 25 T 100 15"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        className="text-muted-foreground/30"
                                    />
                                </svg>
                            </div>
                        </div>
                    );

                    if (editMode) {
                        return (
                            <div
                                key={widget.id}
                                className="animate-slide-up"
                                style={{ animationDelay: `${(index + 2) * 100}ms` }}
                            >
                                {content}
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={widget.id}
                            href={widget.href}
                            className="animate-slide-up"
                            style={{ animationDelay: `${(index + 2) * 100}ms` }}
                        >
                            {content}
                        </Link>
                    );
                })}

                {/* Add widget button */}
                {hiddenWidgets.length > 0 && (
                    <button
                        onClick={() => setSettingsOpen(true)}
                        className="glass-card flex flex-col items-center justify-center gap-3 p-6 min-h-[200px] border-2 border-dashed border-foreground/10 hover:border-primary/30 hover:bg-primary/[0.03] transition-all duration-300 animate-slide-up"
                        style={{ animationDelay: `${(visibleWidgets.length + 2) * 100}ms` }}
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                            <Plus className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-center">
                            <p className="text-[14px] font-semibold text-foreground/70">Ajouter un widget</p>
                            <p className="text-[12px] text-muted-foreground mt-0.5">
                                {hiddenWidgets.length} disponible{hiddenWidgets.length > 1 ? "s" : ""}
                            </p>
                        </div>
                    </button>
                )}
            </div>

            {/* ═══ Edit Widget Dialog ═══ */}
            <Dialog open={editingWidget !== null} onOpenChange={(open) => !open && setEditingWidget(null)}>
                <DialogContent className="glass-card border-white/10 sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-4 w-4 text-primary" />
                            Renommer le widget
                        </DialogTitle>
                        <DialogDescription>Modifiez le libellé de ce widget. Les données capteur sont en lecture seule.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                        <div>
                            <label className="text-[12px] font-medium text-muted-foreground mb-1 block">Libellé</label>
                            <input
                                value={ewTitle}
                                onChange={(e) => setEwTitle(e.target.value)}
                                className="glass-input w-full rounded-xl px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-[12px] font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                                <Lock className="h-3 w-3" /> Description
                            </label>
                            <div className="w-full rounded-xl bg-foreground/[0.04] px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
                                {allWidgets.find(w => w.id === editingWidget)?.description || "—"}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[12px] font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                                    <Lock className="h-3 w-3" /> Statistique
                                </label>
                                <div className="w-full rounded-xl bg-foreground/[0.04] px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
                                    {allWidgets.find(w => w.id === editingWidget)?.stat || "—"}
                                </div>
                            </div>
                            <div>
                                <label className="text-[12px] font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                                    <Lock className="h-3 w-3" /> Label
                                </label>
                                <div className="w-full rounded-xl bg-foreground/[0.04] px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
                                    {allWidgets.find(w => w.id === editingWidget)?.statLabel || "—"}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={saveEditWidget}
                            className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl"
                        >
                            <Save className="inline h-4 w-4 mr-2" />
                            Renommer
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ═══ Edit Stat Dialog ═══ */}
            <Dialog open={editingStat !== null} onOpenChange={(open) => !open && setEditingStat(null)}>
                <DialogContent className="glass-card border-white/10 sm:max-w-xs">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-4 w-4 text-primary" />
                            Renommer la statistique
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                        <div>
                            <label className="text-[12px] font-medium text-muted-foreground mb-1 block">Libellé</label>
                            <input value={esLabel} onChange={(e) => setEsLabel(e.target.value)} className="glass-input w-full rounded-xl px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="text-[12px] font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                                <Lock className="h-3 w-3" /> Valeur (capteur)
                            </label>
                            <div className="w-full rounded-xl bg-foreground/[0.04] px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
                                {allStats.find(s => s.id === editingStat)?.value || "—"}
                            </div>
                        </div>
                        <button
                            onClick={saveEditStat}
                            className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl"
                        >
                            <Save className="inline h-4 w-4 mr-2" />
                            Renommer
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ═══ Settings Dialog ═══ */}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogContent className="glass-card border-white/10 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4 text-primary" />
                            Gérer le dashboard
                        </DialogTitle>
                        <DialogDescription>
                            Affichez, masquez et réorganisez vos widgets et statistiques.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 pt-2 max-h-[60vh] overflow-y-auto">
                        {/* Widgets */}
                        <div>
                            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                Widgets
                            </h4>
                            <div className="space-y-1.5">
                                {[...allWidgets].sort((a, b) => a.order - b.order).map((w) => {
                                    const WIcon = getIcon(w.iconKey);
                                    return (
                                        <div
                                            key={w.id}
                                            className={cn(
                                                "flex items-center gap-2 rounded-xl px-3 py-2 transition-all",
                                                w.visible ? "bg-foreground/[0.04]" : "opacity-50"
                                            )}
                                        >
                                            <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${w.gradient}`}>
                                                <WIcon className="h-3.5 w-3.5 text-white" />
                                            </div>
                                            <span className="flex-1 text-[13px] font-medium">{w.title}</span>
                                            {w.visible && (
                                                <>
                                                    <button onClick={() => moveWidget(w.id, "up")} className="p-1 rounded text-muted-foreground hover:text-foreground">
                                                        <ArrowUp className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button onClick={() => moveWidget(w.id, "down")} className="p-1 rounded text-muted-foreground hover:text-foreground">
                                                        <ArrowDown className="h-3.5 w-3.5" />
                                                    </button>
                                                </>
                                            )}
                                            <button onClick={() => toggleWidget(w.id)} className="p-1 rounded text-muted-foreground hover:text-foreground">
                                                {w.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Stats */}
                        <div>
                            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                Statistiques rapides
                            </h4>
                            <div className="space-y-1.5">
                                {[...allStats].sort((a, b) => a.order - b.order).map((st) => {
                                    const SIcon = getIcon(st.iconKey);
                                    return (
                                        <div
                                            key={st.id}
                                            className={cn(
                                                "flex items-center gap-2 rounded-xl px-3 py-2 transition-all",
                                                st.visible ? "bg-foreground/[0.04]" : "opacity-50"
                                            )}
                                        >
                                            <SIcon className={cn("h-4 w-4 shrink-0", st.color)} />
                                            <span className="flex-1 text-[13px] font-medium">{st.label}</span>
                                            <span className="text-[11px] text-muted-foreground">{st.value}</span>
                                            {st.visible && (
                                                <>
                                                    <button onClick={() => moveStat(st.id, "up")} className="p-1 rounded text-muted-foreground hover:text-foreground">
                                                        <ArrowUp className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button onClick={() => moveStat(st.id, "down")} className="p-1 rounded text-muted-foreground hover:text-foreground">
                                                        <ArrowDown className="h-3.5 w-3.5" />
                                                    </button>
                                                </>
                                            )}
                                            <button onClick={() => toggleStat(st.id)} className="p-1 rounded text-muted-foreground hover:text-foreground">
                                                {st.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Reset */}
                        <button
                            onClick={() => {
                                resetAll();
                                toast.success("Dashboard réinitialisé");
                            }}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-foreground/[0.06] py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Réinitialiser par défaut
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
