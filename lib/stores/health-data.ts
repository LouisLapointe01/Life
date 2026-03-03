import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */

export type MetriqueId =
    | "sommeil"
    | "pas"
    | "hydratation"
    | "frequence"
    | "poids"
    | "calories";

export interface MetriqueData {
    id: MetriqueId;
    label: string;
    valeur: string;
    detail: string;
    iconeKey: string;
    couleur: string;
    gradient: string;
    progression: number;
    objectif?: string;
    visible: boolean;
    order: number;
}

export type SanteSectionId =
    | "score"
    | "metriques"
    | "graphique"
    | "objectifs"
    | "humeur";

export interface SanteSection {
    id: SanteSectionId;
    label: string;
    visible: boolean;
    order: number;
}

/* ═══════════════════════════════════════════
   Defaults
   ═══════════════════════════════════════════ */

const DEFAULT_METRIQUES: MetriqueData[] = [
    {
        id: "sommeil",
        label: "Sommeil",
        valeur: "7h30",
        detail: "Objectif : 8h",
        iconeKey: "Moon",
        couleur: "text-violet-500",
        gradient: "from-violet-500/20 to-violet-600/20",
        progression: 94,
        objectif: "8h",
        visible: true,
        order: 0,
    },
    {
        id: "pas",
        label: "Pas",
        valeur: "8 432",
        detail: "Objectif : 10 000",
        iconeKey: "Footprints",
        couleur: "text-blue-500",
        gradient: "from-blue-500/20 to-blue-600/20",
        progression: 84,
        objectif: "10 000",
        visible: true,
        order: 1,
    },
    {
        id: "hydratation",
        label: "Hydratation",
        valeur: "1,8 L",
        detail: "Objectif : 2 L",
        iconeKey: "Droplets",
        couleur: "text-cyan-500",
        gradient: "from-cyan-500/20 to-cyan-600/20",
        progression: 90,
        objectif: "2 L",
        visible: true,
        order: 2,
    },
    {
        id: "frequence",
        label: "Fréq. cardiaque",
        valeur: "72 bpm",
        detail: "Repos · Normal",
        iconeKey: "Heart",
        couleur: "text-rose-500",
        gradient: "from-rose-500/20 to-rose-600/20",
        progression: 100,
        visible: true,
        order: 3,
    },
    {
        id: "poids",
        label: "Poids",
        valeur: "75 kg",
        detail: "IMC : 23,4 — Normal",
        iconeKey: "Weight",
        couleur: "text-amber-500",
        gradient: "from-amber-500/20 to-amber-600/20",
        progression: 100,
        visible: true,
        order: 4,
    },
    {
        id: "calories",
        label: "Calories",
        valeur: "1 850 kcal",
        detail: "Objectif : 2 200 kcal",
        iconeKey: "Flame",
        couleur: "text-orange-500",
        gradient: "from-orange-500/20 to-orange-600/20",
        progression: 84,
        objectif: "2 200 kcal",
        visible: true,
        order: 5,
    },
];

const DEFAULT_SECTIONS: SanteSection[] = [
    { id: "score", label: "Score bien-être", visible: true, order: 0 },
    { id: "metriques", label: "Métriques", visible: true, order: 1 },
    { id: "graphique", label: "Graphique tendance", visible: true, order: 2 },
    { id: "objectifs", label: "Objectifs du jour", visible: true, order: 3 },
    { id: "humeur", label: "Humeur du jour", visible: true, order: 4 },
];

/* ═══════════════════════════════════════════
   Store
   ═══════════════════════════════════════════ */

interface HealthDataState {
    metriques: MetriqueData[];
    sections: SanteSection[];

    // Métriques
    updateMetrique: (id: MetriqueId, data: Partial<MetriqueData>) => void;
    toggleMetrique: (id: MetriqueId) => void;
    moveMetrique: (id: MetriqueId, direction: "up" | "down") => void;
    resetMetriques: () => void;

    // Sections
    toggleSection: (id: SanteSectionId) => void;
    moveSection: (id: SanteSectionId, direction: "up" | "down") => void;
    resetSections: () => void;
}

export const useHealthData = create<HealthDataState>()(
    persist(
        (set) => ({
            metriques: DEFAULT_METRIQUES,
            sections: DEFAULT_SECTIONS,

            updateMetrique: (id, data) =>
                set((s) => ({
                    metriques: s.metriques.map((m) =>
                        m.id === id ? { ...m, ...data } : m
                    ),
                })),

            toggleMetrique: (id) =>
                set((s) => ({
                    metriques: s.metriques.map((m) =>
                        m.id === id ? { ...m, visible: !m.visible } : m
                    ),
                })),

            moveMetrique: (id, direction) =>
                set((s) => {
                    const sorted = [...s.metriques].sort((a, b) => a.order - b.order);
                    const idx = sorted.findIndex((m) => m.id === id);
                    if (idx < 0) return s;
                    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
                    if (targetIdx < 0 || targetIdx >= sorted.length) return s;
                    const result = [...sorted];
                    [result[idx], result[targetIdx]] = [result[targetIdx], result[idx]];
                    return {
                        metriques: result.map((m, i) => ({ ...m, order: i })),
                    };
                }),

            resetMetriques: () => set({ metriques: DEFAULT_METRIQUES }),

            toggleSection: (id) =>
                set((s) => ({
                    sections: s.sections.map((sec) =>
                        sec.id === id ? { ...sec, visible: !sec.visible } : sec
                    ),
                })),

            moveSection: (id, direction) =>
                set((s) => {
                    const sorted = [...s.sections].sort((a, b) => a.order - b.order);
                    const idx = sorted.findIndex((sec) => sec.id === id);
                    if (idx < 0) return s;
                    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
                    if (targetIdx < 0 || targetIdx >= sorted.length) return s;
                    const result = [...sorted];
                    [result[idx], result[targetIdx]] = [result[targetIdx], result[idx]];
                    return {
                        sections: result.map((sec, i) => ({ ...sec, order: i })),
                    };
                }),

            resetSections: () => set({ sections: DEFAULT_SECTIONS }),
        }),
        { name: "life-health-data" }
    )
);

/* ═══════════════════════════════════════════
   Hooks pratiques
   ═══════════════════════════════════════════ */

import { useMemo } from "react";

export function useVisibleMetriques() {
    const metriques = useHealthData((s) => s.metriques);
    return useMemo(
        () => [...metriques].filter((m) => m.visible).sort((a, b) => a.order - b.order),
        [metriques]
    );
}

export function useVisibleSections() {
    const sections = useHealthData((s) => s.sections);
    return useMemo(
        () => [...sections].filter((sec) => sec.visible).sort((a, b) => a.order - b.order),
        [sections]
    );
}
