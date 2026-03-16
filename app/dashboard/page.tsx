"use client";

import { useState, useSyncExternalStore, useEffect, useRef } from "react";
import {
    Calendar, Heart, Home, FolderOpen, DollarSign, Cloud, Users, MessageCircle,
    Settings2, ArrowUpRight, ChevronRight, Plus, X, Eye, EyeOff, GripVertical,
    RotateCcw, MoreHorizontal, Thermometer, Droplets, Zap, Footprints, Moon,
    Clock, Wallet, Bell, Wind, Sun,
    type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useUnreadMessages } from "@/lib/stores/unread-messages";

/* ═══════════════════════════════════════════
   Category definitions
   ═══════════════════════════════════════════ */
type NavModule = { id: string; label: string; href: string; icon: LucideIcon };
type Category = {
    id: string; label: string; icon: LucideIcon; gradient: string;
    primaryHref: string; modules: NavModule[]; stat: string; statSub?: string;
};

const ALL_CATEGORIES: Category[] = [
    {
        id: "planning", label: "Planning", icon: Calendar, gradient: "from-orange-500 to-amber-500",
        primaryHref: "/dashboard/agenda", stat: "Agenda & contacts", statSub: "Vos rendez-vous et votre réseau",
        modules: [
            { id: "agenda", label: "Agenda", href: "/dashboard/agenda", icon: Calendar },
            { id: "annuaire", label: "Annuaire", href: "/dashboard/annuaire", icon: Users },
            { id: "messages", label: "Messages", href: "/dashboard/messages", icon: MessageCircle },
        ],
    },
    {
        id: "sante", label: "Santé", icon: Heart, gradient: "from-pink-500 to-rose-500",
        primaryHref: "/dashboard/sante", stat: "Bien-être & activité", statSub: "Suivi de votre santé quotidienne",
        modules: [{ id: "sante", label: "Santé", href: "/dashboard/sante", icon: Heart }],
    },
    {
        id: "maison", label: "Maison", icon: Home, gradient: "from-amber-500 to-yellow-500",
        primaryHref: "/dashboard/logement", stat: "Logement & IoT", statSub: "Gestion de votre domicile",
        modules: [{ id: "logement", label: "Logement", href: "/dashboard/logement", icon: Home }],
    },
    {
        id: "documents", label: "Documents", icon: FolderOpen, gradient: "from-green-500 to-emerald-500",
        primaryHref: "/dashboard/fichiers", stat: "Fichiers & stockage", statSub: "Vos documents et dossiers",
        modules: [{ id: "fichiers", label: "Fichiers", href: "/dashboard/fichiers", icon: FolderOpen }],
    },
    {
        id: "finances", label: "Finances", icon: DollarSign, gradient: "from-emerald-500 to-teal-500",
        primaryHref: "/dashboard/finance", stat: "Budget & dépenses", statSub: "Suivi financier personnel",
        modules: [{ id: "finance", label: "Finances", href: "/dashboard/finance", icon: DollarSign }],
    },
    {
        id: "meteo", label: "Météo", icon: Cloud, gradient: "from-sky-500 to-blue-500",
        primaryHref: "/dashboard/meteo", stat: "Prévisions & villes", statSub: "Météo sur 7 jours",
        modules: [{ id: "meteo", label: "Météo", href: "/dashboard/meteo", icon: Cloud }],
    },
];

/* ═══════════════════════════════════════════
   Category store
   ═══════════════════════════════════════════ */
interface CatState {
    order: string[]; hidden: string[];
    toggle: (id: string) => void;
    moveUp: (id: string) => void;
    moveDown: (id: string) => void;
    reset: () => void;
}
const DEFAULT_CAT_ORDER = ALL_CATEGORIES.map(c => c.id);
const useCategoryStore = create<CatState>()(persist(
    (set) => ({
        order: DEFAULT_CAT_ORDER, hidden: [],
        toggle: (id) => set(s => ({ hidden: s.hidden.includes(id) ? s.hidden.filter(h => h !== id) : [...s.hidden, id] })),
        moveUp: (id) => set(s => { const a = [...s.order]; const i = a.indexOf(id); if (i <= 0) return s; [a[i-1], a[i]] = [a[i], a[i-1]]; return { order: a }; }),
        moveDown: (id) => set(s => { const a = [...s.order]; const i = a.indexOf(id); if (i < 0 || i >= a.length - 1) return s; [a[i], a[i+1]] = [a[i+1], a[i]]; return { order: a }; }),
        reset: () => set({ order: DEFAULT_CAT_ORDER, hidden: [] }),
    }),
    { name: "life-dashboard-categories-v1" }
));

/* ═══════════════════════════════════════════
   Quick widget definitions & store
   ═══════════════════════════════════════════ */
type WidgetId =
    | "messages" | "prochain-rdv" | "meteo-temp" | "horloge"
    | "temperature" | "humidite" | "energie" | "solde"
    | "pas" | "sommeil" | "notifications" | "vent";

type WidgetDef = {
    id: WidgetId;
    label: string;
    description: string;
    icon: LucideIcon;
    color: string;
    href?: string;
};

const ALL_WIDGETS: WidgetDef[] = [
    { id: "messages",      label: "Messages",        description: "Messages non lus",           icon: MessageCircle, color: "text-teal-500",    href: "/dashboard/messages" },
    { id: "prochain-rdv",  label: "Prochain RDV",    description: "Prochain rendez-vous",        icon: Calendar,      color: "text-orange-500",  href: "/dashboard/agenda" },
    { id: "meteo-temp",    label: "Météo",            description: "Température extérieure",      icon: Sun,           color: "text-sky-500",     href: "/dashboard/meteo" },
    { id: "horloge",       label: "Horloge",          description: "Heure et date en direct",     icon: Clock,         color: "text-purple-500" },
    { id: "temperature",   label: "Température",      description: "Température intérieure IoT",  icon: Thermometer,   color: "text-red-400",     href: "/dashboard/logement" },
    { id: "humidite",      label: "Humidité",         description: "Humidité intérieure IoT",     icon: Droplets,      color: "text-blue-400",    href: "/dashboard/logement" },
    { id: "energie",       label: "Énergie",          description: "Consommation du jour",         icon: Zap,           color: "text-yellow-500",  href: "/dashboard/logement" },
    { id: "solde",         label: "Solde",            description: "Compte courant",               icon: Wallet,        color: "text-emerald-500", href: "/dashboard/finance" },
    { id: "pas",           label: "Pas",              description: "Pas effectués aujourd'hui",   icon: Footprints,    color: "text-indigo-500",  href: "/dashboard/sante" },
    { id: "sommeil",       label: "Sommeil",          description: "Durée de sommeil dernière nuit", icon: Moon,        color: "text-violet-500",  href: "/dashboard/sante" },
    { id: "notifications", label: "Alertes",          description: "Notifications actives",        icon: Bell,          color: "text-amber-500" },
    { id: "vent",          label: "Vent",             description: "Vitesse du vent",              icon: Wind,          color: "text-cyan-500",    href: "/dashboard/meteo" },
];

interface WidgetState {
    active: WidgetId[];
    add: (id: WidgetId) => void;
    remove: (id: WidgetId) => void;
    moveUp: (id: WidgetId) => void;
    moveDown: (id: WidgetId) => void;
    reset: () => void;
}
const DEFAULT_WIDGETS: WidgetId[] = ["messages", "prochain-rdv", "meteo-temp", "horloge"];
const useWidgetStore = create<WidgetState>()(persist(
    (set) => ({
        active: DEFAULT_WIDGETS,
        add: (id) => set(s => s.active.includes(id) ? s : { active: [...s.active, id] }),
        remove: (id) => set(s => ({ active: s.active.filter(w => w !== id) })),
        moveUp: (id) => set(s => { const a = [...s.active]; const i = a.indexOf(id); if (i <= 0) return s; [a[i-1], a[i]] = [a[i], a[i-1]]; return { active: a }; }),
        moveDown: (id) => set(s => { const a = [...s.active]; const i = a.indexOf(id); if (i < 0 || i >= a.length - 1) return s; [a[i], a[i+1]] = [a[i+1], a[i]]; return { active: a }; }),
        reset: () => set({ active: DEFAULT_WIDGETS }),
    }),
    { name: "life-dashboard-widgets-v1" }
));

/* ═══════════════════════════════════════════
   Live widget components
   ═══════════════════════════════════════════ */

function useNextAppointment() {
    const [value, setValue] = useState<string>("...");
    const [sub, setSub] = useState<string>("");
    useEffect(() => {
        fetch("/api/appointments").then(r => r.ok ? r.json() : null).then(data => {
            if (!data) { setValue("—"); return; }
            const now = new Date();
            const upcoming = (data as Array<{ start_at: string; guest_name: string; status: string }>)
                .filter(a => a.status !== "cancelled" && new Date(a.start_at) > now)
                .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
            if (!upcoming.length) { setValue("Aucun"); setSub(""); return; }
            const next = upcoming[0];
            const d = new Date(next.start_at);
            const isToday = d.toDateString() === now.toDateString();
            const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
            const dayLabel = isToday ? "Aujourd'hui" : isTomorrow ? "Demain" : d.toLocaleDateString("fr", { weekday: "short", day: "numeric" });
            setValue(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
            setSub(`${dayLabel} · ${next.guest_name.split(" ")[0]}`);
        }).catch(() => setValue("—"));
    }, []);
    return { value, sub };
}

function useMeteoTemp() {
    const [value, setValue] = useState<string>("...");
    const [sub, setSub] = useState<string>("");
    useEffect(() => {
        try {
            const cities = JSON.parse(localStorage.getItem("life-weather-cities") ?? "[]");
            const city = cities[0];
            if (!city) { setValue("—"); setSub("Aucune ville"); return; }
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current_weather=true&timezone=auto`)
                .then(r => r.json())
                .then(d => {
                    setValue(`${Math.round(d.current_weather.temperature)}°C`);
                    setSub(city.name);
                }).catch(() => { setValue("—"); });
        } catch { setValue("—"); }
    }, []);
    return { value, sub };
}

function useClock() {
    const [value, setValue] = useState("");
    const [sub, setSub] = useState("");
    useEffect(() => {
        const update = () => {
            const now = new Date();
            setValue(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
            setSub(now.toLocaleDateString("fr", { weekday: "long", day: "numeric", month: "long" }));
        };
        update();
        const id = setInterval(update, 10000);
        return () => clearInterval(id);
    }, []);
    return { value, sub };
}

/* ═══════════════════════════════════════════
   Widget tile
   ═══════════════════════════════════════════ */
function WidgetTile({ id, editMode, onRemove }: { id: WidgetId; editMode: boolean; onRemove: () => void }) {
    const def = ALL_WIDGETS.find(w => w.id === id)!;
    const Icon = def.icon;

    // Live data hooks (called unconditionally, values used conditionally)
    const unread = useUnreadMessages(s => s.totalUnread);
    const nextRdv = useNextAppointment();
    const meteoTemp = useMeteoTemp();
    const clock = useClock();

    let value = "—";
    let sub = def.description;

    if (id === "messages") { value = unread > 0 ? String(unread) : "0"; sub = unread === 1 ? "message non lu" : "messages non lus"; }
    else if (id === "prochain-rdv") { value = nextRdv.value; sub = nextRdv.sub || "Aucun rendez-vous"; }
    else if (id === "meteo-temp") { value = meteoTemp.value; sub = meteoTemp.sub || "Météo"; }
    else if (id === "horloge") { value = clock.value; sub = clock.sub; }
    else if (id === "temperature") { value = "22°C"; sub = "Température intérieure"; }
    else if (id === "humidite") { value = "45%"; sub = "Humidité intérieure"; }
    else if (id === "energie") { value = "3.2 kWh"; sub = "Consommation du jour"; }
    else if (id === "solde") { value = "—"; sub = "Connectez votre compte"; }
    else if (id === "pas") { value = "—"; sub = "Non connecté"; }
    else if (id === "sommeil") { value = "—"; sub = "Non connecté"; }
    else if (id === "notifications") { value = "0"; sub = "Aucune alerte active"; }
    else if (id === "vent") { value = "—"; sub = "Ajoutez une ville"; }

    const tile = (
        <div className={cn(
            "relative premium-panel-soft rounded-[1.5rem] p-4 flex flex-col gap-2 transition-all",
            editMode && "ring-2 ring-dashed ring-foreground/20",
            def.href && !editMode && "hover:bg-white/70 dark:hover:bg-white/[0.07] cursor-pointer"
        )}>
            {editMode && (
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
                    className="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 transition-colors"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}
            <Icon className={cn("h-5 w-5", def.color)} />
            <div className="mt-1">
                <p className="text-[11px] text-muted-foreground">{def.label}</p>
                <p className="text-xl font-bold tracking-tight mt-0.5 leading-none">{value}</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1 leading-tight line-clamp-1">{sub}</p>
            </div>
        </div>
    );

    if (def.href && !editMode) return <Link href={def.href}>{tile}</Link>;
    return tile;
}

/* ═══════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════ */
export default function DashboardPage() {
    const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
    const [catSettingsOpen, setCatSettingsOpen] = useState(false);
    const [widgetCatalogOpen, setWidgetCatalogOpen] = useState(false);
    const [editWidgets, setEditWidgets] = useState(false);
    const [fabOpen, setFabOpen] = useState(false);

    const { order: catOrder, hidden: catHidden, toggle: toggleCat, moveUp: moveCatUp, moveDown: moveCatDown, reset: resetCats } = useCategoryStore();
    const { active: activeWidgets, add: addWidget, remove: removeWidget, moveUp: moveWidgetUp, moveDown: moveWidgetDown, reset: resetWidgets } = useWidgetStore();

    const categories = catOrder.map(id => ALL_CATEGORIES.find(c => c.id === id)).filter(Boolean) as Category[];
    const visibleCats = categories.filter(c => !catHidden.includes(c.id));
    const hiddenCats = categories.filter(c => catHidden.includes(c.id));

    const now = new Date();
    const greeting = now.getHours() < 12 ? "Bonjour" : now.getHours() < 18 ? "Bon après-midi" : "Bonsoir";

    const availableToAdd = ALL_WIDGETS.filter(w => !activeWidgets.includes(w.id));

    if (!mounted) return null;

    return (
        <div className="mx-auto max-w-5xl space-y-6 lg:space-y-8">

            {/* ── Hero ── */}
            <div className="premium-panel relative overflow-hidden rounded-[2rem] px-5 py-5 lg:px-7 lg:py-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,122,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(52,199,89,0.10),transparent_24%)]" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">Tableau de bord</p>
                        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.04em] lg:text-[36px]">{greeting}, Louis.</h1>
                        <p className="mt-1.5 text-[13px] text-muted-foreground">
                            {visibleCats.length} catégorie{visibleCats.length > 1 ? "s" : ""} · {activeWidgets.length} module{activeWidgets.length > 1 ? "s" : ""} actifs
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:shrink-0">
                        {[
                            { label: "Catégories", value: String(visibleCats.length) },
                            { label: "Modules", value: String(activeWidgets.length) },
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
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3 px-0.5">Catégories</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleCats.map((cat) => {
                        const CatIcon = cat.icon;
                        return (
                            <div key={cat.id} className="premium-panel group relative overflow-hidden rounded-[1.8rem] flex flex-col">
                                <div className={cn("absolute -right-6 -top-6 h-28 w-28 rounded-full bg-gradient-to-br opacity-15 blur-2xl transition-all duration-500 group-hover:opacity-25 group-hover:scale-125", cat.gradient)} />
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
                                <div className="relative mx-5 h-px bg-foreground/[0.06]" />
                                <div className="relative flex flex-wrap gap-2 p-5 pt-3 flex-1">
                                    {cat.modules.map((mod) => {
                                        const ModIcon = mod.icon;
                                        return (
                                            <Link key={mod.id} href={mod.href} className="flex items-center gap-1.5 rounded-xl bg-foreground/[0.04] px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.08] hover:text-foreground">
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
                    {hiddenCats.length > 0 && (
                        <button onClick={() => setCatSettingsOpen(true)} className="premium-panel-soft flex min-h-[150px] flex-col items-center justify-center gap-2.5 rounded-[1.8rem] border-2 border-dashed border-foreground/[0.08] p-5 transition-all hover:border-primary/30 hover:bg-primary/[0.02]">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                                <Plus className="h-5 w-5 text-primary" />
                            </div>
                            <div className="text-center">
                                <p className="text-[13px] font-semibold text-foreground/70">Ajouter une catégorie</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{hiddenCats.length} masquée{hiddenCats.length > 1 ? "s" : ""}</p>
                            </div>
                        </button>
                    )}
                </div>
            </div>

            {/* ── Quick Widgets ── */}
            <div>
                <div className="flex items-center justify-between mb-3 px-0.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Modules rapides</p>
                    <div className="flex items-center gap-2">
                        {activeWidgets.length > 0 && (
                            <button
                                onClick={() => setEditWidgets(!editWidgets)}
                                className={cn("text-[11px] font-medium px-3 py-1.5 rounded-xl transition-all", editWidgets ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                            >
                                {editWidgets ? "Terminer" : "Modifier"}
                            </button>
                        )}
                        {availableToAdd.length > 0 && (
                            <button
                                onClick={() => setWidgetCatalogOpen(true)}
                                className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-xl text-primary hover:bg-primary/10 transition-all"
                            >
                                <Plus className="h-3.5 w-3.5" />Ajouter
                            </button>
                        )}
                    </div>
                </div>

                {activeWidgets.length === 0 ? (
                    <button
                        onClick={() => setWidgetCatalogOpen(true)}
                        className="w-full premium-panel-soft flex items-center justify-center gap-3 rounded-[1.8rem] border-2 border-dashed border-foreground/[0.08] py-10 transition-all hover:border-primary/30 hover:bg-primary/[0.02]"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                            <Plus className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-left">
                            <p className="text-[13px] font-semibold text-foreground/70">Ajouter des modules</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Température, messages, solde, météo…</p>
                        </div>
                    </button>
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {activeWidgets.map((id) => (
                            <WidgetTile
                                key={id}
                                id={id}
                                editMode={editWidgets}
                                onRemove={() => { removeWidget(id); toast.success("Module retiré"); }}
                            />
                        ))}
                        {editWidgets && availableToAdd.length > 0 && (
                            <button
                                onClick={() => setWidgetCatalogOpen(true)}
                                className="premium-panel-soft flex flex-col items-center justify-center gap-2 rounded-[1.5rem] border-2 border-dashed border-foreground/[0.08] p-4 transition-all hover:border-primary/30 hover:bg-primary/[0.02]"
                            >
                                <Plus className="h-5 w-5 text-primary" />
                                <p className="text-[11px] font-medium text-muted-foreground">Ajouter</p>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ── Category Settings Dialog ── */}
            <Dialog open={catSettingsOpen} onOpenChange={setCatSettingsOpen}>
                <DialogContent className="premium-panel border-white/10 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-primary" />Organiser les catégories</DialogTitle>
                        <DialogDescription>Réordonnez, affichez ou masquez les catégories.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-1.5 pt-2 max-h-[55vh] overflow-y-auto">
                        {categories.map((cat, i) => {
                            const CatIcon = cat.icon;
                            const isHidden = catHidden.includes(cat.id);
                            return (
                                <div key={cat.id} className={cn("flex items-center gap-2 rounded-xl px-3 py-2", isHidden ? "opacity-45" : "bg-foreground/[0.04]")}>
                                    <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                                    <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br shrink-0", cat.gradient)}><CatIcon className="h-3.5 w-3.5 text-white" /></div>
                                    <span className="flex-1 text-[13px] font-medium">{cat.label}</span>
                                    {!isHidden && (<>
                                        <button onClick={() => moveCatUp(cat.id)} disabled={i === 0} className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronRight className="h-3.5 w-3.5 -rotate-90" /></button>
                                        <button onClick={() => moveCatDown(cat.id)} disabled={i === categories.length - 1} className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronRight className="h-3.5 w-3.5 rotate-90" /></button>
                                    </>)}
                                    <button onClick={() => toggleCat(cat.id)} className="p-1 rounded text-muted-foreground hover:text-foreground">{isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
                                </div>
                            );
                        })}
                    </div>
                    <button onClick={() => { resetCats(); toast.success("Catégories réinitialisées"); }} className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-foreground/[0.05] py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                        <RotateCcw className="h-3.5 w-3.5" />Réinitialiser
                    </button>
                </DialogContent>
            </Dialog>

            {/* ── Widget Catalog Dialog ── */}
            <Dialog open={widgetCatalogOpen} onOpenChange={setWidgetCatalogOpen}>
                <DialogContent className="premium-panel border-white/10 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4 text-primary" />Catalogue de modules</DialogTitle>
                        <DialogDescription>Ajoutez les modules que vous voulez voir en un clin d&apos;œil.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-1.5 pt-2 max-h-[55vh] overflow-y-auto">
                        {ALL_WIDGETS.map((w) => {
                            const WIcon = w.icon;
                            const isActive = activeWidgets.includes(w.id);
                            return (
                                <div key={w.id} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all", isActive ? "bg-foreground/[0.04]" : "opacity-60")}>
                                    <WIcon className={cn("h-5 w-5 shrink-0", w.color)} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium">{w.label}</p>
                                        <p className="text-[11px] text-muted-foreground">{w.description}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (isActive) { removeWidget(w.id); toast.success(`${w.label} retiré`); }
                                            else { addWidget(w.id); toast.success(`${w.label} ajouté`); }
                                        }}
                                        className={cn(
                                            "flex h-7 w-7 items-center justify-center rounded-xl transition-all shrink-0",
                                            isActive ? "bg-red-500/15 text-red-500 hover:bg-red-500/25" : "bg-primary/15 text-primary hover:bg-primary/25"
                                        )}
                                    >
                                        {isActive ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                    <button onClick={() => { resetWidgets(); toast.success("Modules réinitialisés"); }} className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-foreground/[0.05] py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                        <RotateCcw className="h-3.5 w-3.5" />Réinitialiser les modules
                    </button>
                </DialogContent>
            </Dialog>

            {/* ── FAB ── */}
            <div className="fixed bottom-20 right-5 z-[60] flex flex-col items-end gap-2 lg:bottom-10 lg:right-10">
                {fabOpen && (<>
                    <button onClick={() => { setWidgetCatalogOpen(true); setFabOpen(false); }} className="flex items-center gap-2 rounded-full bg-foreground/10 backdrop-blur-xl border border-white/20 text-muted-foreground shadow-md px-4 h-10 text-sm transition-all hover:shadow-lg active:scale-95 lg:bg-white/58 lg:border-white/45 lg:text-foreground dark:lg:bg-white/[0.08]">
                        <Plus className="h-4 w-4" />Modules
                    </button>
                    <button onClick={() => { setCatSettingsOpen(true); setFabOpen(false); }} className="flex items-center gap-2 rounded-full bg-foreground/10 backdrop-blur-xl border border-white/20 text-muted-foreground shadow-md px-4 h-10 text-sm transition-all hover:shadow-lg active:scale-95 lg:bg-white/58 lg:border-white/45 lg:text-foreground dark:lg:bg-white/[0.08]">
                        <Settings2 className="h-4 w-4" />Catégories
                    </button>
                </>)}
                <button
                    onClick={() => setFabOpen(!fabOpen)}
                    className={cn("flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-xl border shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95 lg:h-13 lg:w-13", fabOpen ? "bg-foreground/15 border-white/25 text-foreground" : "bg-foreground/10 border-white/20 text-muted-foreground lg:bg-white/58 lg:border-white/45 dark:lg:bg-white/[0.08]")}
                >
                    <MoreHorizontal className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}
