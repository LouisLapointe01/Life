import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */

export type WidgetType =
    | "agenda"
    | "sante"
    | "logement"
    | "fichiers"
    | "meteo"
    | "notes"
    | "finance"
    | "sport";

export type StatType =
    | "temperature"
    | "humidite"
    | "energie"
    | "uv"
    | "pas"
    | "sommeil"
    | "calories"
    | "eau";

export interface DashboardWidget {
    id: string;
    type: WidgetType;
    title: string;
    description: string;
    href: string;
    gradient: string;
    shadowColor: string;
    stat: string;
    statLabel: string;
    iconKey: string;
    order: number;
    visible: boolean;
}

export interface QuickStat {
    id: string;
    type: StatType;
    label: string;
    value: string;
    iconKey: string;
    color: string;
    order: number;
    visible: boolean;
}

/* ═══════════════════════════════════════════
   Default data
   ═══════════════════════════════════════════ */

const DEFAULT_WIDGETS: DashboardWidget[] = [
    {
        id: "w-agenda",
        type: "agenda",
        title: "Agenda",
        description: "3 rendez-vous aujourd'hui",
        href: "/dashboard/agenda",
        gradient: "from-orange-500 to-amber-500",
        shadowColor: "shadow-orange-500/20",
        stat: "3",
        statLabel: "événements",
        iconKey: "Calendar",
        order: 0,
        visible: true,
    },
    {
        id: "w-sante",
        type: "sante",
        title: "Santé",
        description: "Score bien-être : 87%",
        href: "/dashboard/sante",
        gradient: "from-pink-500 to-rose-500",
        shadowColor: "shadow-pink-500/20",
        stat: "87%",
        statLabel: "bien-être",
        iconKey: "Heart",
        order: 1,
        visible: true,
    },
    {
        id: "w-logement",
        type: "logement",
        title: "Logement",
        description: "Tout fonctionne correctement",
        href: "/dashboard/logement",
        gradient: "from-amber-500 to-yellow-500",
        shadowColor: "shadow-amber-500/20",
        stat: "22°C",
        statLabel: "intérieur",
        iconKey: "Home",
        order: 2,
        visible: true,
    },
    {
        id: "w-fichiers",
        type: "fichiers",
        title: "Fichiers",
        description: "12 fichiers récents",
        href: "/dashboard/fichiers",
        gradient: "from-green-500 to-emerald-500",
        shadowColor: "shadow-green-500/20",
        stat: "12",
        statLabel: "récents",
        iconKey: "FolderOpen",
        order: 3,
        visible: true,
    },
];

/** Widgets supplémentaires pouvant être ajoutés */
const EXTRA_WIDGETS: DashboardWidget[] = [
    {
        id: "w-meteo",
        type: "meteo",
        title: "Météo",
        description: "Soleil et nuages",
        href: "#",
        gradient: "from-sky-500 to-blue-500",
        shadowColor: "shadow-sky-500/20",
        stat: "18°C",
        statLabel: "extérieur",
        iconKey: "Sun",
        order: 4,
        visible: false,
    },
    {
        id: "w-notes",
        type: "notes",
        title: "Notes",
        description: "Vos mémos rapides",
        href: "#",
        gradient: "from-yellow-500 to-orange-400",
        shadowColor: "shadow-yellow-500/20",
        stat: "5",
        statLabel: "notes",
        iconKey: "Pencil",
        order: 5,
        visible: false,
    },
    {
        id: "w-finance",
        type: "finance",
        title: "Finances",
        description: "Suivi de budget",
        href: "#",
        gradient: "from-emerald-500 to-teal-500",
        shadowColor: "shadow-emerald-500/20",
        stat: "2 340€",
        statLabel: "budget",
        iconKey: "Wallet",
        order: 6,
        visible: false,
    },
    {
        id: "w-sport",
        type: "sport",
        title: "Sport",
        description: "Activités de la semaine",
        href: "#",
        gradient: "from-red-500 to-orange-500",
        shadowColor: "shadow-red-500/20",
        stat: "4",
        statLabel: "séances",
        iconKey: "Dumbbell",
        order: 7,
        visible: false,
    },
];

const ALL_WIDGETS = [...DEFAULT_WIDGETS, ...EXTRA_WIDGETS];

const DEFAULT_STATS: QuickStat[] = [
    { id: "s-temp", type: "temperature", label: "Température", value: "22°C", iconKey: "Thermometer", color: "text-orange-500", order: 0, visible: true },
    { id: "s-hum", type: "humidite", label: "Humidité", value: "45%", iconKey: "Droplets", color: "text-blue-500", order: 1, visible: true },
    { id: "s-ene", type: "energie", label: "Énergie", value: "3.2 kWh", iconKey: "Activity", color: "text-green-500", order: 2, visible: true },
    { id: "s-uv", type: "uv", label: "UV Index", value: "Faible", iconKey: "Sun", color: "text-amber-500", order: 3, visible: true },
];

const EXTRA_STATS: QuickStat[] = [
    { id: "s-pas", type: "pas", label: "Pas", value: "8 432", iconKey: "Footprints", color: "text-blue-500", order: 4, visible: false },
    { id: "s-som", type: "sommeil", label: "Sommeil", value: "7h30", iconKey: "Moon", color: "text-violet-500", order: 5, visible: false },
    { id: "s-cal", type: "calories", label: "Calories", value: "1 850 kcal", iconKey: "Flame", color: "text-orange-500", order: 6, visible: false },
    { id: "s-eau", type: "eau", label: "Hydratation", value: "1,8 L", iconKey: "Droplets", color: "text-cyan-500", order: 7, visible: false },
];

const ALL_STATS = [...DEFAULT_STATS, ...EXTRA_STATS];

/* ═══════════════════════════════════════════
   Store
   ═══════════════════════════════════════════ */

interface DashboardModulesState {
    widgets: DashboardWidget[];
    stats: QuickStat[];

    // Widgets
    updateWidget: (id: string, data: Partial<DashboardWidget>) => void;
    toggleWidget: (id: string) => void;
    moveWidget: (id: string, direction: "up" | "down") => void;
    addWidget: (type: WidgetType) => void;

    // Stats
    updateStat: (id: string, data: Partial<QuickStat>) => void;
    toggleStat: (id: string) => void;
    moveStat: (id: string, direction: "up" | "down") => void;

    // Global
    resetAll: () => void;
}

export const useDashboardModules = create<DashboardModulesState>()(
    persist(
        (set) => ({
            widgets: ALL_WIDGETS,
            stats: ALL_STATS,

            updateWidget: (id, data) =>
                set((s) => ({
                    widgets: s.widgets.map((w) =>
                        w.id === id ? { ...w, ...data } : w
                    ),
                })),

            toggleWidget: (id) =>
                set((s) => ({
                    widgets: s.widgets.map((w) =>
                        w.id === id ? { ...w, visible: !w.visible } : w
                    ),
                })),

            moveWidget: (id, direction) =>
                set((s) => {
                    const visible = [...s.widgets].filter((w) => w.visible).sort((a, b) => a.order - b.order);
                    const idx = visible.findIndex((w) => w.id === id);
                    if (idx < 0) return s;
                    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
                    if (targetIdx < 0 || targetIdx >= visible.length) return s;

                    const newOrder = new Map<string, number>();
                    visible.forEach((w, i) => newOrder.set(w.id, i));
                    // swap
                    newOrder.set(visible[idx].id, targetIdx);
                    newOrder.set(visible[targetIdx].id, idx);

                    return {
                        widgets: s.widgets.map((w) => ({
                            ...w,
                            order: newOrder.has(w.id) ? newOrder.get(w.id)! : w.order,
                        })),
                    };
                }),

            addWidget: (type) =>
                set((s) => ({
                    widgets: s.widgets.map((w) =>
                        w.type === type ? { ...w, visible: true } : w
                    ),
                })),

            updateStat: (id, data) =>
                set((s) => ({
                    stats: s.stats.map((st) =>
                        st.id === id ? { ...st, ...data } : st
                    ),
                })),

            toggleStat: (id) =>
                set((s) => ({
                    stats: s.stats.map((st) =>
                        st.id === id ? { ...st, visible: !st.visible } : st
                    ),
                })),

            moveStat: (id, direction) =>
                set((s) => {
                    const visible = [...s.stats].filter((st) => st.visible).sort((a, b) => a.order - b.order);
                    const idx = visible.findIndex((st) => st.id === id);
                    if (idx < 0) return s;
                    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
                    if (targetIdx < 0 || targetIdx >= visible.length) return s;

                    const newOrder = new Map<string, number>();
                    visible.forEach((st, i) => newOrder.set(st.id, i));
                    newOrder.set(visible[idx].id, targetIdx);
                    newOrder.set(visible[targetIdx].id, idx);

                    return {
                        stats: s.stats.map((st) => ({
                            ...st,
                            order: newOrder.has(st.id) ? newOrder.get(st.id)! : st.order,
                        })),
                    };
                }),

            resetAll: () => set({ widgets: ALL_WIDGETS, stats: ALL_STATS }),
        }),
        { name: "life-dashboard-modules" }
    )
);

/* ═══════════════════════════════════════════
   Hooks
   ═══════════════════════════════════════════ */

import { useMemo } from "react";

export function useVisibleWidgets() {
    const widgets = useDashboardModules((s) => s.widgets);
    return useMemo(
        () => [...widgets].filter((w) => w.visible).sort((a, b) => a.order - b.order),
        [widgets]
    );
}

export function useHiddenWidgets() {
    const widgets = useDashboardModules((s) => s.widgets);
    return useMemo(
        () => widgets.filter((w) => !w.visible),
        [widgets]
    );
}

export function useVisibleStats() {
    const stats = useDashboardModules((s) => s.stats);
    return useMemo(
        () => [...stats].filter((st) => st.visible).sort((a, b) => a.order - b.order),
        [stats]
    );
}

export function useHiddenStats() {
    const stats = useDashboardModules((s) => s.stats);
    return useMemo(
        () => stats.filter((st) => !st.visible),
        [stats]
    );
}
