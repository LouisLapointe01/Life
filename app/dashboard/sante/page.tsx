"use client";

import { useState } from "react";
import {
  Moon,
  Footprints,
  Droplets,
  Heart,
  Weight,
  Flame,
  TrendingUp,
  CheckCircle2,
  Circle,
  Target,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════
   Données mock
   ═══════════════════════════════════════════════════════ */
const donneesHebdo = [
  { jour: "Lun", sommeil: 7.5, pas: 7200, humeur: 3 },
  { jour: "Mar", sommeil: 6.8, pas: 9100, humeur: 4 },
  { jour: "Mer", sommeil: 8.0, pas: 6500, humeur: 3 },
  { jour: "Jeu", sommeil: 7.2, pas: 11200, humeur: 5 },
  { jour: "Ven", sommeil: 6.5, pas: 8800, humeur: 4 },
  { jour: "Sam", sommeil: 9.0, pas: 5400, humeur: 4 },
  { jour: "Dim", sommeil: 7.5, pas: 8432, humeur: 4 },
];

type MetriqueId = "sommeil" | "pas" | "hydratation" | "frequence" | "poids" | "calories";

const metriques: {
  id: MetriqueId;
  label: string;
  valeur: string;
  detail: string;
  icone: React.ElementType;
  couleur: string;
  gradient: string;
  progression: number;
}[] = [
  {
    id: "sommeil",
    label: "Sommeil",
    valeur: "7h30",
    detail: "Objectif : 8h",
    icone: Moon,
    couleur: "text-violet-500",
    gradient: "from-violet-500/20 to-violet-600/20",
    progression: 94,
  },
  {
    id: "pas",
    label: "Pas",
    valeur: "8 432",
    detail: "Objectif : 10 000",
    icone: Footprints,
    couleur: "text-blue-500",
    gradient: "from-blue-500/20 to-blue-600/20",
    progression: 84,
  },
  {
    id: "hydratation",
    label: "Hydratation",
    valeur: "1,8 L",
    detail: "Objectif : 2 L",
    icone: Droplets,
    couleur: "text-cyan-500",
    gradient: "from-cyan-500/20 to-cyan-600/20",
    progression: 90,
  },
  {
    id: "frequence",
    label: "Fréq. cardiaque",
    valeur: "72 bpm",
    detail: "Repos · Normal",
    icone: Heart,
    couleur: "text-rose-500",
    gradient: "from-rose-500/20 to-rose-600/20",
    progression: 100,
  },
  {
    id: "poids",
    label: "Poids",
    valeur: "75 kg",
    detail: "IMC : 23,4 — Normal",
    icone: Weight,
    couleur: "text-amber-500",
    gradient: "from-amber-500/20 to-amber-600/20",
    progression: 100,
  },
  {
    id: "calories",
    label: "Calories",
    valeur: "1 850 kcal",
    detail: "Objectif : 2 200 kcal",
    icone: Flame,
    couleur: "text-orange-500",
    gradient: "from-orange-500/20 to-orange-600/20",
    progression: 84,
  },
];

const objectifsJour = [
  { id: 1, label: "Boire 2 litres d'eau", icone: Droplets, couleur: "text-cyan-500" },
  { id: 2, label: "30 min de sport", icone: TrendingUp, couleur: "text-green-500" },
  { id: 3, label: "8h de sommeil", icone: Moon, couleur: "text-violet-500" },
  { id: 4, label: "Méditation 10 min", icone: Target, couleur: "text-primary" },
];

const emojisHumeur = [
  { emoji: "😞", label: "Mal", valeur: 1 },
  { emoji: "😐", label: "Neutre", valeur: 2 },
  { emoji: "🙂", label: "Bien", valeur: 3 },
  { emoji: "😊", label: "Très bien", valeur: 4 },
  { emoji: "😄", label: "Excellent", valeur: 5 },
];

type GraphiqueMetrique = "sommeil" | "pas";

/* ═══════════════════════════════════════════════════════
   Composant anneau SVG
   ═══════════════════════════════════════════════════════ */
function AnneauScore({ score }: { score: number }) {
  const rayon = 54;
  const circonference = 2 * Math.PI * rayon;
  const offset = circonference - (score / 100) * circonference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        {/* Piste de fond */}
        <circle
          cx="70"
          cy="70"
          r={rayon}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-foreground/[0.07]"
        />
        {/* Arc de progression */}
        <circle
          cx="70"
          cy="70"
          r={rayon}
          fill="none"
          stroke="#007AFF"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circonference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold tracking-tight">{score}%</span>
        <span className="text-[12px] text-muted-foreground mt-0.5">bien-être</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Tooltip recharts personnalisé
   ═══════════════════════════════════════════════════════ */
interface TooltipPayloadItem {
  value: number;
  name: string;
}

function TooltipPerso({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="glass-card px-3 py-2 text-[12px]">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-muted-foreground">
          {p.name === "sommeil" ? `Sommeil : ${p.value}h` : `Pas : ${p.value.toLocaleString("fr-FR")}`}
        </p>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Page principale
   ═══════════════════════════════════════════════════════ */
export default function SantePage() {
  const [objectifsCoches, setObjectifsCoches] = useState<number[]>([1]);
  const [humeurSelectionnee, setHumeurSelectionnee] = useState<number | null>(4);
  const [graphiqueActif, setGraphiqueActif] = useState<GraphiqueMetrique>("sommeil");

  const toggleObjectif = (id: number) => {
    setObjectifsCoches((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const scoreGlobal = 87;

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* ─── Header ─── */}
      <div className="animate-slide-up">
        <h2 className="text-3xl font-bold tracking-tight">Santé</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Votre tableau de bord bien-être — lundi 2 mars 2026.
        </p>
      </div>

      {/* ─── Ligne 1 : Score + Métriques ─── */}
      <div
        className="grid gap-5 lg:grid-cols-3 animate-slide-up"
        style={{ animationDelay: "100ms" }}
      >
        {/* Score bien-être */}
        <div className="glass-card p-6 flex flex-col items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Score bien-être global
            </p>
          </div>
          <AnneauScore score={scoreGlobal} />
          <div className="w-full space-y-2">
            {[
              { label: "Forme physique", val: 90, couleur: "bg-green-500" },
              { label: "Récupération", val: 85, couleur: "bg-violet-500" },
              { label: "Énergie", val: 82, couleur: "bg-amber-500" },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-[12px]">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.val}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-foreground/[0.07]">
                  <div
                    className={`h-full rounded-full ${item.couleur}`}
                    style={{ width: `${item.val}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grille métriques */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {metriques.map((m, i) => (
            <div
              key={m.id}
              className="glass-card p-4 animate-slide-up"
              style={{ animationDelay: `${(i + 2) * 60}ms` }}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${m.gradient} mb-3`}
              >
                <m.icone className={`h-5 w-5 ${m.couleur}`} />
              </div>
              <p className="text-xl font-bold tracking-tight">{m.valeur}</p>
              <p className="text-[12px] font-medium text-foreground/80 mt-0.5">{m.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{m.detail}</p>
              {/* Barre de progression */}
              <div className="mt-3 h-1 w-full rounded-full bg-foreground/[0.07]">
                <div
                  className="h-full rounded-full bg-primary/70 transition-all duration-700"
                  style={{ width: `${m.progression}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Ligne 2 : Graphique tendance ─── */}
      <div
        className="glass-card p-6 animate-slide-up"
        style={{ animationDelay: "200ms" }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[15px] font-semibold">Tendance hebdomadaire</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Cette semaine — données journalières
            </p>
          </div>
          {/* Toggle métrique */}
          <div className="flex gap-1 rounded-2xl bg-foreground/[0.04] p-1">
            {(
              [
                { key: "sommeil" as GraphiqueMetrique, label: "Sommeil" },
                { key: "pas" as GraphiqueMetrique, label: "Pas" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setGraphiqueActif(tab.key)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-[12px] font-medium transition-all",
                  graphiqueActif === tab.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={donneesHebdo} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradSommeil" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#007AFF" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#007AFF" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradPas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34C759" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#34C759" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="jour"
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<TooltipPerso />} />
              {graphiqueActif === "sommeil" ? (
                <Area
                  type="monotone"
                  dataKey="sommeil"
                  stroke="#007AFF"
                  strokeWidth={2.5}
                  fill="url(#gradSommeil)"
                  dot={{ fill: "#007AFF", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: "#007AFF" }}
                />
              ) : (
                <Area
                  type="monotone"
                  dataKey="pas"
                  stroke="#34C759"
                  strokeWidth={2.5}
                  fill="url(#gradPas)"
                  dot={{ fill: "#34C759", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: "#34C759" }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Ligne 3 : Objectifs + Humeur ─── */}
      <div
        className="grid gap-5 lg:grid-cols-2 animate-slide-up"
        style={{ animationDelay: "300ms" }}
      >
        {/* Objectifs du jour */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[15px] font-semibold">Objectifs du jour</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {objectifsCoches.length}/{objectifsJour.length} accomplis
              </p>
            </div>
            {/* Indicateur de complétion */}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <span className="text-[13px] font-bold text-primary">
                {Math.round((objectifsCoches.length / objectifsJour.length) * 100)}%
              </span>
            </div>
          </div>

          {/* Barre de progression globale */}
          <div className="mb-5 h-2 w-full rounded-full bg-foreground/[0.07]">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{
                width: `${(objectifsCoches.length / objectifsJour.length) * 100}%`,
              }}
            />
          </div>

          <div className="space-y-3">
            {objectifsJour.map((obj) => {
              const coche = objectifsCoches.includes(obj.id);
              return (
                <button
                  key={obj.id}
                  onClick={() => toggleObjectif(obj.id)}
                  className={cn(
                    "group w-full flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300",
                    coche
                      ? "bg-primary/[0.08]"
                      : "hover:bg-foreground/[0.04]"
                  )}
                >
                  <div className={cn("transition-transform duration-300", coche && "scale-110")}>
                    {coche ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <obj.icone className={cn("h-4 w-4 shrink-0", obj.couleur)} />
                    <span
                      className={cn(
                        "text-[13px] font-medium text-left transition-all",
                        coche ? "line-through text-muted-foreground" : "text-foreground"
                      )}
                    >
                      {obj.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Humeur du jour */}
        <div className="glass-card p-6">
          <div className="mb-5">
            <h3 className="text-[15px] font-semibold">Humeur du jour</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Comment vous sentez-vous aujourd'hui ?
            </p>
          </div>

          <div className="flex justify-between gap-2 mb-6">
            {emojisHumeur.map((item) => {
              const selectionne = humeurSelectionnee === item.valeur;
              return (
                <button
                  key={item.valeur}
                  onClick={() => setHumeurSelectionnee(item.valeur)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-2 rounded-2xl py-4 px-2 transition-all duration-300",
                    selectionne
                      ? "bg-primary/10 scale-105 shadow-sm"
                      : "hover:bg-foreground/[0.04] hover:scale-105"
                  )}
                >
                  <span className="text-3xl leading-none select-none">{item.emoji}</span>
                  <span
                    className={cn(
                      "text-[11px] font-medium transition-colors",
                      selectionne ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Message contextuel */}
          {humeurSelectionnee !== null && (
            <div
              className="animate-fade-in rounded-2xl bg-foreground/[0.03] p-4"
            >
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {humeurSelectionnee >= 4
                  ? "Super, vous êtes en pleine forme ! Continuez sur cette lancée."
                  : humeurSelectionnee === 3
                    ? "Bonne journée en perspective. Restez actif et hydraté."
                    : "Pensez à vous reposer et à prendre soin de vous aujourd'hui."}
              </p>
            </div>
          )}

          {/* Historique humeur simplifié */}
          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Humeur cette semaine
            </p>
            <div className="flex items-end gap-1.5 h-12">
              {donneesHebdo.map((d) => {
                const hauteur = (d.humeur / 5) * 100;
                const estAujourdhui = d.jour === "Dim";
                return (
                  <div key={d.jour} className="flex flex-1 flex-col items-center gap-1">
                    <div className="relative w-full rounded-t-full" style={{ height: "40px" }}>
                      <div
                        className={cn(
                          "absolute bottom-0 w-full rounded-full transition-all duration-700",
                          estAujourdhui ? "bg-primary" : "bg-primary/30"
                        )}
                        style={{ height: `${hauteur}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{d.jour}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
