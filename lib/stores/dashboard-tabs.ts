import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
    LayoutDashboard,
    Calendar,
    Heart,
    Home,
    FolderOpen,
    Users,
    Settings,
    MessageCircle,
    type LucideIcon,
} from "lucide-react";

/* ═══════════════════════════════════════════
   Définition de tous les onglets disponibles
   ═══════════════════════════════════════════ */

export type TabId =
    | "accueil"
    | "agenda"
    | "sante"
    | "logement"
    | "fichiers"
    | "annuaire"
    | "messages"
    | "parametres";

export interface TabDefinition {
    id: TabId;
    href: string;
    label: string;
    icon: LucideIcon;
    color: string;
    iconColor: string;
    /** Onglets non supprimables */
    locked?: boolean;
}

/** Catalogue complet de tous les onglets existants */
export const ALL_TABS: TabDefinition[] = [
    {
        id: "accueil",
        href: "/dashboard",
        label: "Accueil",
        icon: LayoutDashboard,
        color: "from-blue-500/20 to-blue-600/20",
        iconColor: "text-blue-500",
        locked: true,
    },
    {
        id: "agenda",
        href: "/dashboard/agenda",
        label: "Agenda",
        icon: Calendar,
        color: "from-orange-500/20 to-orange-600/20",
        iconColor: "text-orange-500",
    },
    {
        id: "sante",
        href: "/dashboard/sante",
        label: "Santé",
        icon: Heart,
        color: "from-pink-500/20 to-pink-600/20",
        iconColor: "text-pink-500",
    },
    {
        id: "logement",
        href: "/dashboard/logement",
        label: "Logement",
        icon: Home,
        color: "from-amber-500/20 to-amber-600/20",
        iconColor: "text-amber-500",
    },
    {
        id: "fichiers",
        href: "/dashboard/fichiers",
        label: "Fichiers",
        icon: FolderOpen,
        color: "from-green-500/20 to-green-600/20",
        iconColor: "text-green-500",
    },
    {
        id: "annuaire",
        href: "/dashboard/annuaire",
        label: "Annuaire",
        icon: Users,
        color: "from-purple-500/20 to-purple-600/20",
        iconColor: "text-purple-500",
    },
    {
        id: "messages",
        href: "/dashboard/messages",
        label: "Messages",
        icon: MessageCircle,
        color: "from-teal-500/20 to-teal-600/20",
        iconColor: "text-teal-500",
    },
    {
        id: "parametres",
        href: "/dashboard/parametres",
        label: "Paramètres",
        icon: Settings,
        color: "from-gray-500/20 to-gray-600/20",
        iconColor: "text-gray-500",
        locked: true,
    },
];

/** Ordre par défaut de tous les IDs */
const DEFAULT_ORDER: TabId[] = ALL_TABS.map((t) => t.id);

/** IDs visibles sur la barre mobile par défaut (max 4) */
const DEFAULT_MOBILE: TabId[] = ["accueil", "agenda", "annuaire", "parametres"];

/* ═══════════════════════════════════════════
   Store Zustand
   ═══════════════════════════════════════════ */

interface DashboardTabsState {
    /** IDs des onglets visibles dans l'ordre */
    visibleTabs: TabId[];
    /** IDs affichés sur mobile (max 4) */
    mobileTabs: TabId[];

    // ─── Actions ───
    /** Ajouter un onglet à la sidebar */
    addTab: (id: TabId) => void;
    /** Retirer un onglet de la sidebar */
    removeTab: (id: TabId) => void;
    /** Déplacer un onglet (réorganiser) */
    moveTab: (fromIndex: number, toIndex: number) => void;
    /** Définir les onglets mobiles */
    setMobileTabs: (ids: TabId[]) => void;
    /** Ajouter un onglet mobile */
    addMobileTab: (id: TabId) => void;
    /** Retirer un onglet mobile */
    removeMobileTab: (id: TabId) => void;
    /** Réinitialiser à la config par défaut */
    resetToDefault: () => void;
}

export const useDashboardTabs = create<DashboardTabsState>()(
    persist(
        (set) => ({
            visibleTabs: DEFAULT_ORDER,
            mobileTabs: DEFAULT_MOBILE,

            addTab: (id) =>
                set((state) => {
                    if (state.visibleTabs.includes(id)) return state;
                    // Insérer avant "parametres" (qui est toujours dernier)
                    const tabs = [...state.visibleTabs];
                    const paramIdx = tabs.indexOf("parametres");
                    if (paramIdx !== -1) {
                        tabs.splice(paramIdx, 0, id);
                    } else {
                        tabs.push(id);
                    }
                    return { visibleTabs: tabs };
                }),

            removeTab: (id) =>
                set((state) => {
                    const def = ALL_TABS.find((t) => t.id === id);
                    if (def?.locked) return state;
                    return {
                        visibleTabs: state.visibleTabs.filter((t) => t !== id),
                        mobileTabs: state.mobileTabs.filter((t) => t !== id),
                    };
                }),

            moveTab: (fromIndex, toIndex) =>
                set((state) => {
                    const tabs = [...state.visibleTabs];
                    const [moved] = tabs.splice(fromIndex, 1);
                    tabs.splice(toIndex, 0, moved);
                    return { visibleTabs: tabs };
                }),

            setMobileTabs: (ids) => set({ mobileTabs: ids.slice(0, 4) }),

            addMobileTab: (id) =>
                set((state) => {
                    if (state.mobileTabs.includes(id) || state.mobileTabs.length >= 4)
                        return state;
                    return { mobileTabs: [...state.mobileTabs, id] };
                }),

            removeMobileTab: (id) =>
                set((state) => {
                    const def = ALL_TABS.find((t) => t.id === id);
                    if (def?.locked) return state;
                    return { mobileTabs: state.mobileTabs.filter((t) => t !== id) };
                }),

            resetToDefault: () =>
                set({ visibleTabs: DEFAULT_ORDER, mobileTabs: DEFAULT_MOBILE }),
        }),
        {
            name: "life-dashboard-tabs",
        }
    )
);

/* ═══════════════════════════════════════════
   Hooks utilitaires
   ═══════════════════════════════════════════ */

import { useMemo } from "react";

/** Retourne les onglets visibles sous forme de TabDefinition[] */
export function useVisibleTabs(): TabDefinition[] {
    const visibleTabs = useDashboardTabs((s) => s.visibleTabs);
    return useMemo(
        () => visibleTabs
            .map((id) => ALL_TABS.find((t) => t.id === id))
            .filter(Boolean) as TabDefinition[],
        [visibleTabs]
    );
}

/** Retourne les onglets masqués (retirés de la sidebar) */
export function useHiddenTabs(): TabDefinition[] {
    const visibleTabs = useDashboardTabs((s) => s.visibleTabs);
    return useMemo(
        () => ALL_TABS.filter((t) => !visibleTabs.includes(t.id)),
        [visibleTabs]
    );
}

/** Retourne les onglets mobiles sous forme de TabDefinition[] */
export function useMobileVisibleTabs(): TabDefinition[] {
    const mobileTabs = useDashboardTabs((s) => s.mobileTabs);
    return useMemo(
        () => mobileTabs
            .map((id) => ALL_TABS.find((t) => t.id === id))
            .filter(Boolean) as TabDefinition[],
        [mobileTabs]
    );
}

/** Retourne le titre de page basé sur le pathname */
export function usePageTitle(pathname: string): string {
    const tab = ALL_TABS.find(
        (t) => pathname === t.href || (t.href !== "/dashboard" && pathname.startsWith(t.href))
    );
    return tab?.label ?? "Dashboard";
}
