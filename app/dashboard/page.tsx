"use client";

import { useState, useSyncExternalStore, useCallback } from "react";
import {
    Calendar, Heart, Home, FolderOpen, DollarSign, Cloud, Users, MessageCircle,
    Settings2, ArrowUpRight, ChevronRight, Plus, X, Eye, EyeOff, GripVertical,
    RotateCcw, MoreHorizontal, Pencil,
    type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

/* ═══════════════════════════════════════════
   Category definitions
   ═══════════════════════════════════════════ */
type Module = { id: string; label: string; href: string; icon: LucideIcon };

type Category = {
    id: string;
    label: string;
    icon: LucideIcon;
    gradient: string;
    textColor: string;
    primaryHref: string;
    modules: Module[];
    stat: string;
    statSub?: string;
};

const ALL_CATEGORIES: Category[] = [
    {
        id: "planning",
        label: "Planning",
        icon: Calendar,
        gradient: "from-orange-500 to-amber-500",
        textColor: "text-orange-500",
        primaryHref: "/dashboard/agenda",
        stat: "Agenda & contacts",
        statSub: "Vos rendez-vous et votre réseau",
        modules: [
            { id: "agenda", label: "Agenda", href: "/dashboard/agenda", icon: Calendar },
            { id: "annuaire", label: "Annuaire", href: "/dashboard/annuaire", icon: Users },
            { id: "messages", label: "Messages", href: "/dashboard/messages", icon: MessageCircle },
        ],
    },
    {
        id: "sante",
        label: "Santé",
        icon: Heart,
        gradient: "from-pink-500 to-rose-500",
        textColor: "text-pink-500",
        primaryHref: "/dashboard/sante",
        stat: "Bien-être & activité",
        statSub: "Suivi de votre santé quotidienne",
        modules: [
            { id: "sante", label: "Santé", href: "/dashboard/sante", icon: Heart },
        ],
    },
    {
        id: "maison",
        label: "Maison",
        icon: Home,
        gradient: "from-amber-500 to-yellow-500",
        textColor: "text-amber-500",
        primaryHref: "/dashboard/logement",
        stat: "Logement & IoT",
        statSub: "Gestion de votre domicile",
        modules: [
            { id: "logement", label: "Logement", href: "/dashboard/logement", icon: Home },
        ],
    },
    {
        id: "documents",
        label: "Documents",
        icon: FolderOpen,
        gradient: "from-green-500 to-emerald-500",
        textColor: "text-green-500",
        primaryHref: "/dashboard/fichiers",
        stat: "Fichiers & stockage",
        statSub: "Vos documents et dossiers",
        modules: [
            { id: "fichiers", label: "Fichiers", href: "/dashboard/fichiers", icon: FolderOpen },
        ],
    },
    {
        id: "finances",
        label: "Finances",
        icon: DollarSign,
        gradient: "from-emerald-500 to-teal-500",
        textColor: "text-emerald-500",
        primaryHref: "/dashboard/finance",
        stat: "Budget & dépenses",
        statSub: "Suivi financier personnel",
        modules: [
            { id: "finance", label: "Finances", href: "/dashboard/finance", icon: DollarSign },
        ],
    },
    {
        id: "meteo",
        label: "Météo",
        icon: Cloud,
        gradient: "from-sky-500 to-blue-500",
        textColor: "text-sky-500",
        primaryHref: "/dashboard/meteo",
        stat: "Prévisions & villes",
        statSub: "Météo sur 7 jours",
        modules: [
            { id: "meteo", label: "Météo", href: "/dashboard/meteo", icon: Cloud },
        ],
    },
];

/* ═══════════════════════════════════════════
   Store — category order & visibility
   ═══════════════════════════════════════════ */
interface CatState {
    order: string[];       // category ids in display order
    hidden: string[];      // hidden category ids
    setOrder: (order: string[]) => void;
    toggle: (id: string) => void;
    moveUp: (id: string) => void;
    moveDown: (id: string) => void;
    reset: () => void;
}

const DEFAULT_ORDER = ALL_CATEGORIES.map(c => c.id);

const useCategoryStore = create<CatState>()(
    persist(
        (set) => ({
            order: DEFAULT_ORDER,
            hidden: [],
            setOrder: (order) => set({ order }),
            toggle: (id) => set(s => ({
                hidden: s.hidden.includes(id)
                    ? s.hidden.filter(h => h !== id)
                    : [...s.hidden, id],
            })),
            moveUp: (id) => set(s => {
                const arr = [...s.order];
                const i = arr.indexOf(id);
                if (i <= 0) return s;
                [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                return { order: arr };
            }),
            moveDown: (id) => set(s => {
                const arr = [...s.order];
                const i = arr.indexOf(id);
                if (i < 0 || i >= arr.length - 1) return s;
                [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                return { order: arr };
            }),
            reset: () => set({ order: DEFAULT_ORDER, hidden: [] }),
        }),
        { name: "life-dashboard-categories-v1" }
    )
);

/* ═══════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════ */
export default function DashboardPage() {
    const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [fabOpen, setFabOpen] = useState(false);

    const { order, hidden, toggle, moveUp, moveDown, reset } = useCategoryStore();

    const categories = order
        .map(id => ALL_CATEGORIES.find(c => c.id === id))
        .filter(Boolean) as Category[];

    const visibleCategories = categories.filter(c => !hidden.includes(c.id));
    const hiddenCategories = categories.filter(c => hidden.includes(c.id));

    const now = new Date();
    const greeting = now.getHours() < 12 ? "Bonjour" : now.getHours() < 18 ? "Bon après-midi" : "Bonsoir";

    if (!mounted) return null;

    return (
        <div className="mx-auto max-w-5xl space-y-5 lg:space-y-7">

            {/* ── Hero ── */}
            <div className="premium-panel relative overflow-hidden rounded-[2rem] px-5 py-5 lg:px-7 lg:py-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,122,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(52,199,89,0.10),transparent_24%)]" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">Tableau de bord</p>
                        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.04em] lg:text-[36px]">
                            {greeting}, Louis.
                        </h1>
                        <p className="mt-1.5 text-[13px] text-muted-foreground max-w-lg">
                            {visibleCategories.length} catégorie{visibleCategories.length > 1 ? "s" : ""} · {visibleCategories.reduce((n, c) => n + c.modules.length, 0)} modules actifs
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:shrink-0">
                        {[
                            { label: "Catégories", value: String(visibleCategories.length) },
                            { label: "Modules", value: String(visibleCategories.reduce((n, c) => n + c.modules.length, 0)) },
                        ].map(s => (
                            <div key={s.label} className="premium-panel-soft rounded-[1.2rem] px-4 py-2.5 text-center min-w-[80px]">
                                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{s.label}</p>
                                <p className="mt-1 text-[22px] font-semibold tracking-[-0.04em]">{s.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Category Grid ── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleCategories.map((cat) => {
                    const CatIcon = cat.icon;
                    return (
                        <div key={cat.id} className="premium-panel group relative overflow-hidden rounded-[1.8rem] flex flex-col">
                            {/* Gradient blob */}
                            <div className={cn("absolute -right-6 -top-6 h-28 w-28 rounded-full bg-gradient-to-br opacity-15 blur-2xl transition-all duration-500 group-hover:opacity-25 group-hover:scale-125", cat.gradient)} />

                            {/* Category header — link to primary page */}
                            <Link href={cat.primaryHref} className="relative flex items-start justify-between p-5 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br shadow-md", cat.gradient)}>
                                        <CatIcon className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-[15px] font-semibold tracking-[-0.03em]">{cat.label}</h3>
                                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{cat.stat}</p>
                                    </div>
                                </div>
                                <div className="premium-panel-soft flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-all duration-300 group-hover:text-foreground mt-0.5 shrink-0">
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                </div>
                            </Link>

                            {/* Divider */}
                            <div className="relative mx-5 h-px bg-foreground/[0.06]" />

                            {/* Modules */}
                            <div className="relative flex flex-wrap gap-2 p-5 pt-3 flex-1">
                                {cat.modules.map((mod) => {
                                    const ModIcon = mod.icon;
                                    return (
                                        <Link
                                            key={mod.id}
                                            href={mod.href}
                                            className="flex items-center gap-1.5 rounded-xl bg-foreground/[0.04] px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.08] hover:text-foreground"
                                        >
                                            <ModIcon className="h-3.5 w-3.5 shrink-0" />
                                            {mod.label}
                                        </Link>
                                    );
                                })}
                                {cat.modules.length === 1 && cat.statSub && (
                                    <p className="w-full text-[11px] text-muted-foreground/60 mt-0.5">{cat.statSub}</p>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Add hidden category */}
                {hiddenCategories.length > 0 && (
                    <button
                        onClick={() => setSettingsOpen(true)}
                        className="premium-panel-soft flex min-h-[150px] flex-col items-center justify-center gap-2.5 rounded-[1.8rem] border-2 border-dashed border-foreground/[0.08] p-5 transition-all hover:border-primary/30 hover:bg-primary/[0.02]"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                            <Plus className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-center">
                            <p className="text-[13px] font-semibold text-foreground/70">Ajouter une catégorie</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                {hiddenCategories.length} masquée{hiddenCategories.length > 1 ? "s" : ""}
                            </p>
                        </div>
                    </button>
                )}
            </div>

            {/* ── Settings Dialog ── */}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogContent className="premium-panel border-white/10 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4 text-primary" />
                            Organiser les catégories
                        </DialogTitle>
                        <DialogDescription>
                            Réordonnez, affichez ou masquez les catégories du tableau de bord.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-1.5 pt-2 max-h-[60vh] overflow-y-auto">
                        {categories.map((cat, i) => {
                            const CatIcon = cat.icon;
                            const isHidden = hidden.includes(cat.id);
                            return (
                                <div
                                    key={cat.id}
                                    className={cn(
                                        "flex items-center gap-2 rounded-xl px-3 py-2 transition-all",
                                        isHidden ? "opacity-45" : "bg-foreground/[0.04]"
                                    )}
                                >
                                    <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                                    <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br shrink-0", cat.gradient)}>
                                        <CatIcon className="h-3.5 w-3.5 text-white" />
                                    </div>
                                    <span className="flex-1 text-[13px] font-medium">{cat.label}</span>
                                    <span className="text-[11px] text-muted-foreground mr-1">
                                        {cat.modules.length} module{cat.modules.length > 1 ? "s" : ""}
                                    </span>
                                    {!isHidden && (
                                        <>
                                            <button
                                                onClick={() => moveUp(cat.id)}
                                                disabled={i === 0}
                                                className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
                                            >
                                                <ChevronRight className="h-3.5 w-3.5 -rotate-90" />
                                            </button>
                                            <button
                                                onClick={() => moveDown(cat.id)}
                                                disabled={i === categories.length - 1}
                                                className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
                                            >
                                                <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={() => toggle(cat.id)}
                                        className="p-1 rounded text-muted-foreground hover:text-foreground"
                                    >
                                        {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => { reset(); toast.success("Dashboard réinitialisé"); }}
                        className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-foreground/[0.05] py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Réinitialiser
                    </button>
                </DialogContent>
            </Dialog>

            {/* ── FAB ── */}
            <div className="fixed bottom-20 right-5 z-[60] flex flex-col items-end gap-2 lg:bottom-10 lg:right-10">
                {fabOpen && (
                    <button
                        onClick={() => { setSettingsOpen(true); setFabOpen(false); }}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/10 backdrop-blur-xl border border-white/20 text-muted-foreground shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95 lg:h-11 lg:w-11 lg:bg-white/58 lg:border-white/45 lg:text-foreground dark:lg:bg-white/[0.08] dark:lg:border-white/[0.12]"
                    >
                        <Settings2 className="h-4 w-4" />
                    </button>
                )}
                <button
                    onClick={() => setFabOpen(!fabOpen)}
                    className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-xl border shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95 lg:h-13 lg:w-13",
                        fabOpen
                            ? "bg-foreground/15 border-white/25 text-foreground"
                            : "bg-foreground/10 border-white/20 text-muted-foreground lg:bg-white/58 lg:border-white/45 dark:lg:bg-white/[0.08]"
                    )}
                >
                    <MoreHorizontal className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}
