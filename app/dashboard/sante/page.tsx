"use client";

import { useState, useEffect, useCallback } from "react";
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
  Plus,
  Trash2,
  Pencil,
  Settings2,
  X,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Save,
  Lock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useHealthData,
  useVisibleMetriques,
  useVisibleSections,
  type MetriqueId,
  type SanteSectionId,
  type MetriqueData,
} from "@/lib/stores/health-data";

/* ═══════════════════════════════════════════════════════
   Icon map
   ═══════════════════════════════════════════════════════ */
const ICON_MAP: Record<string, React.ElementType> = {
  Moon,
  Footprints,
  Droplets,
  Heart,
  Weight,
  Flame,
  TrendingUp,
  Target,
};

function getIcon(key: string) {
  return ICON_MAP[key] ?? Target;
}

/* ═══════════════════════════════════════════════════════
   Données mock graphique
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

/* ═══════════════════════════════════════════════════════
   Objectifs (localStorage simple)
   ═══════════════════════════════════════════════════════ */
const OBJECTIFS_KEY = "life-sante-objectifs";
const OBJECTIFS_COCHES_KEY = "life-sante-objectifs-coches";
const HUMEUR_KEY = "life-sante-humeur";

const ICONE_OPTIONS = [
  { key: "Droplets", icon: Droplets, label: "Eau", couleur: "text-cyan-500" },
  { key: "TrendingUp", icon: TrendingUp, label: "Sport", couleur: "text-green-500" },
  { key: "Moon", icon: Moon, label: "Sommeil", couleur: "text-violet-500" },
  { key: "Target", icon: Target, label: "Méditation", couleur: "text-primary" },
  { key: "Footprints", icon: Footprints, label: "Marche", couleur: "text-blue-500" },
  { key: "Heart", icon: Heart, label: "Bien-être", couleur: "text-rose-500" },
  { key: "Flame", icon: Flame, label: "Calories", couleur: "text-orange-500" },
];

type ObjectifItem = {
  id: number;
  label: string;
  iconeKey: string;
  couleur: string;
};

const DEFAULT_OBJECTIFS: ObjectifItem[] = [
  { id: 1, label: "Boire 2 litres d'eau", iconeKey: "Droplets", couleur: "text-cyan-500" },
  { id: 2, label: "30 min de sport", iconeKey: "TrendingUp", couleur: "text-green-500" },
  { id: 3, label: "8h de sommeil", iconeKey: "Moon", couleur: "text-violet-500" },
  { id: 4, label: "Méditation 10 min", iconeKey: "Target", couleur: "text-primary" },
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
   Sub-components
   ═══════════════════════════════════════════════════════ */

function AnneauScore({ score }: { score: number }) {
  const rayon = 54;
  const circ = 2 * Math.PI * rayon;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r={rayon} fill="none" stroke="currentColor" strokeWidth="10" className="text-foreground/[0.07]" />
        <circle
          cx="70" cy="70" r={rayon} fill="none" stroke="#007AFF" strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.25,0.46,0.45,0.94)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold tracking-tight">{score}%</span>
        <span className="text-[12px] text-muted-foreground mt-0.5">bien-être</span>
      </div>
    </div>
  );
}

interface TooltipPayloadItem { value: number; name: string }
function TooltipPerso({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
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
   Main Page
   ═══════════════════════════════════════════════════════ */
export default function SantePage() {
  /* ─── Health data store ─── */
  const visibleMetriques = useVisibleMetriques();
  const visibleSections = useVisibleSections();
  const {
    metriques: allMetriques,
    sections: allSections,
    updateMetrique,
    toggleMetrique,
    moveMetrique,
    resetMetriques,
    toggleSection,
    moveSection,
    resetSections,
  } = useHealthData();

  /* ─── Local state ─── */
  const [mounted, setMounted] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingMetrique, setEditingMetrique] = useState<MetriqueId | null>(null);
  const [editLabel, setEditLabel] = useState("");

  /* ─── Objectifs (localStorage) ─── */
  const [objectifs, setObjectifs] = useState<ObjectifItem[]>(DEFAULT_OBJECTIFS);
  const [objectifsCoches, setObjectifsCoches] = useState<number[]>([]);
  const [humeurSelectionnee, setHumeurSelectionnee] = useState<number | null>(null);
  const [graphiqueActif, setGraphiqueActif] = useState<GraphiqueMetrique>("sommeil");
  const [addObjectifOpen, setAddObjectifOpen] = useState(false);
  const [newObjectifLabel, setNewObjectifLabel] = useState("");
  const [newObjectifIcone, setNewObjectifIcone] = useState("Target");

  /* ─── Settings panel ─── */
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    try {
      const storedObj = localStorage.getItem(OBJECTIFS_KEY);
      if (storedObj) setObjectifs(JSON.parse(storedObj));
      const storedCoches = localStorage.getItem(OBJECTIFS_COCHES_KEY);
      if (storedCoches) setObjectifsCoches(JSON.parse(storedCoches));
      const storedHumeur = localStorage.getItem(HUMEUR_KEY);
      if (storedHumeur) setHumeurSelectionnee(JSON.parse(storedHumeur));
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

  const persistObjectifs = useCallback((items: ObjectifItem[]) => {
    setObjectifs(items);
    localStorage.setItem(OBJECTIFS_KEY, JSON.stringify(items));
  }, []);

  const toggleObjectif = (id: number) => {
    const next = objectifsCoches.includes(id)
      ? objectifsCoches.filter((x) => x !== id)
      : [...objectifsCoches, id];
    setObjectifsCoches(next);
    localStorage.setItem(OBJECTIFS_COCHES_KEY, JSON.stringify(next));
  };

  const selectHumeur = (val: number) => {
    setHumeurSelectionnee(val);
    localStorage.setItem(HUMEUR_KEY, JSON.stringify(val));
    toast.success("Humeur enregistrée !");
  };

  const addObjectif = () => {
    if (!newObjectifLabel.trim()) return;
    const selected = ICONE_OPTIONS.find((o) => o.key === newObjectifIcone);
    const newObj: ObjectifItem = {
      id: Date.now(),
      label: newObjectifLabel.trim(),
      iconeKey: newObjectifIcone,
      couleur: selected?.couleur ?? "text-primary",
    };
    persistObjectifs([...objectifs, newObj]);
    setNewObjectifLabel("");
    setNewObjectifIcone("Target");
    setAddObjectifOpen(false);
    toast.success("Objectif ajouté !");
  };

  const deleteObjectif = (id: number) => {
    persistObjectifs(objectifs.filter((o) => o.id !== id));
    setObjectifsCoches((prev) => {
      const next = prev.filter((x) => x !== id);
      localStorage.setItem(OBJECTIFS_COCHES_KEY, JSON.stringify(next));
      return next;
    });
    toast.success("Objectif supprimé");
  };

  /* ─── Edit métrique ─── */
  const startEditMetrique = (m: MetriqueData) => {
    setEditingMetrique(m.id);
    setEditLabel(m.label);
  };

  const saveEditMetrique = () => {
    if (!editingMetrique) return;
    updateMetrique(editingMetrique, {
      label: editLabel,
    });
    setEditingMetrique(null);
    toast.success("Métrique renommée");
  };

  const scoreGlobal =
    objectifs.length > 0
      ? Math.round(
        (objectifsCoches.filter((id) => objectifs.some((o) => o.id === id)).length /
          objectifs.length) *
        100
      )
      : 0;

  if (!mounted) return null;

  /* ═══════════════════════════════════════════
     Section renderers (ordre dynamique)
     ═══════════════════════════════════════════ */

  const renderSection = (sectionId: SanteSectionId) => {
    switch (sectionId) {
      case "score":
        return <ScoreSection key="score" score={scoreGlobal} editMode={editMode} />;
      case "metriques":
        return (
          <MetriquesSection
            key="metriques"
            metriques={visibleMetriques}
            editMode={editMode}
            onEdit={startEditMetrique}
            onToggle={toggleMetrique}
          />
        );
      case "graphique":
        return (
          <GraphiqueSection
            key="graphique"
            graphiqueActif={graphiqueActif}
            onToggle={setGraphiqueActif}
          />
        );
      case "objectifs":
        return (
          <ObjectifsSection
            key="objectifs"
            objectifs={objectifs}
            objectifsCoches={objectifsCoches}
            toggleObjectif={toggleObjectif}
            deleteObjectif={deleteObjectif}
            openAddDialog={() => setAddObjectifOpen(true)}
          />
        );
      case "humeur":
        return (
          <HumeurSection
            key="humeur"
            humeurSelectionnee={humeurSelectionnee}
            onSelect={selectHumeur}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ─── Header ─── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Santé</h2>
            <p className="mt-1 text-[14px] lg:text-[15px] text-muted-foreground">
              Votre tableau de bord bien-être
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
              title="Gérer les sections"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Dynamic sections ─── */}
      <div className="space-y-6">
        {visibleSections.map((section) => renderSection(section.id))}
      </div>

      {/* ═══ Edit Métrique Dialog ═══ */}
      <Dialog open={editingMetrique !== null} onOpenChange={(open) => !open && setEditingMetrique(null)}>
        <DialogContent className="glass-card border-white/10 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              Renommer la métrique
            </DialogTitle>
            <DialogDescription>
              Modifiez le libellé de cette métrique. Les valeurs capteur sont en lecture seule.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Libellé</label>
              <input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="glass-input w-full rounded-xl px-3 py-2.5 text-sm"
                onKeyDown={(e) => e.key === "Enter" && saveEditMetrique()}
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> Valeur (capteur)
              </label>
              <div className="w-full rounded-xl bg-foreground/[0.04] px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed">
                {allMetriques.find(m => m.id === editingMetrique)?.valeur || "—"}
              </div>
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> Détail (capteur)
              </label>
              <div className="w-full rounded-xl bg-foreground/[0.04] px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed">
                {allMetriques.find(m => m.id === editingMetrique)?.detail || "—"}
              </div>
            </div>
            <button
              onClick={saveEditMetrique}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl"
            >
              <Save className="inline h-4 w-4 mr-2" />
              Renommer
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Add Objectif Dialog ═══ */}
      <Dialog open={addObjectifOpen} onOpenChange={setAddObjectifOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvel objectif</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium">Description</label>
              <input
                value={newObjectifLabel}
                onChange={(e) => setNewObjectifLabel(e.target.value)}
                placeholder="Ex: Lire 20 pages"
                className="glass-input w-full py-3 px-4 text-[14px]"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && addObjectif()}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium">Icône</label>
              <div className="flex flex-wrap gap-2">
                {ICONE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setNewObjectifIcone(opt.key)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl p-2.5 transition-all duration-200",
                      newObjectifIcone === opt.key
                        ? "bg-primary/10 ring-2 ring-primary/30 shadow-sm"
                        : "bg-foreground/[0.03] hover:bg-foreground/[0.06]"
                    )}
                  >
                    <opt.icon className={cn("h-5 w-5", opt.couleur)} />
                    <span className="text-[10px] font-medium text-muted-foreground">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={addObjectif}
              disabled={!newObjectifLabel.trim()}
              className="w-full rounded-2xl bg-primary py-3 text-[14px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl disabled:opacity-50"
            >
              Ajouter l&apos;objectif
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
              Gérer les modules
            </DialogTitle>
            <DialogDescription>
              Affichez, masquez et réorganisez les sections et métriques.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2 max-h-[60vh] overflow-y-auto">
            {/* Sections */}
            <div>
              <h4 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Sections
              </h4>
              <div className="space-y-1.5">
                {[...allSections].sort((a, b) => a.order - b.order).map((sec) => (
                  <div
                    key={sec.id}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2 transition-all",
                      sec.visible ? "bg-foreground/[0.04]" : "opacity-50"
                    )}
                  >
                    <span className="flex-1 text-[13px] font-medium">{sec.label}</span>
                    <button
                      onClick={() => moveSection(sec.id, "up")}
                      className="p-1 rounded text-muted-foreground hover:text-foreground"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => moveSection(sec.id, "down")}
                      className="p-1 rounded text-muted-foreground hover:text-foreground"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => toggleSection(sec.id)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground"
                    >
                      {sec.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Métriques */}
            <div>
              <h4 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Métriques
              </h4>
              <div className="space-y-1.5">
                {[...allMetriques].sort((a, b) => a.order - b.order).map((m) => {
                  const MIcon = getIcon(m.iconeKey);
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-3 py-2 transition-all",
                        m.visible ? "bg-foreground/[0.04]" : "opacity-50"
                      )}
                    >
                      <MIcon className={cn("h-4 w-4 shrink-0", m.couleur)} />
                      <span className="flex-1 text-[13px] font-medium">{m.label}</span>
                      <span className="text-[11px] text-muted-foreground">{m.valeur}</span>
                      <button
                        onClick={() => moveMetrique(m.id, "up")}
                        className="p-1 rounded text-muted-foreground hover:text-foreground"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => moveMetrique(m.id, "down")}
                        className="p-1 rounded text-muted-foreground hover:text-foreground"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => toggleMetrique(m.id)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground"
                      >
                        {m.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={() => {
                resetMetriques();
                resetSections();
                toast.success("Réinitialisé par défaut");
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

/* ═══════════════════════════════════════════════════════
   Section Components
   ═══════════════════════════════════════════════════════ */

function ScoreSection({ score, editMode }: { score: number; editMode: boolean }) {
  return (
    <div className="glass-card p-6 flex flex-col items-center justify-center gap-4">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Score bien-être global
        </p>
      </div>
      <AnneauScore score={score} />
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
  );
}

function MetriquesSection({
  metriques,
  editMode,
  onEdit,
  onToggle,
}: {
  metriques: MetriqueData[];
  editMode: boolean;
  onEdit: (m: MetriqueData) => void;
  onToggle: (id: MetriqueId) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {metriques.map((m, i) => {
        const MIcon = getIcon(m.iconeKey);
        return (
          <div
            key={m.id}
            className="glass-card p-4 group relative"
          >
            {/* Edit overlay */}
            {editMode && (
              <button
                onClick={() => onEdit(m)}
                className="absolute inset-0 z-10 flex items-center justify-center rounded-[1.25rem] bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <div className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground shadow-lg">
                  <Pencil className="h-3 w-3" /> Modifier
                </div>
              </button>
            )}

            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${m.gradient} mb-3`}
            >
              <MIcon className={`h-5 w-5 ${m.couleur}`} />
            </div>
            <p className="text-xl font-bold tracking-tight">{m.valeur}</p>
            <p className="text-[12px] font-medium text-foreground/80 mt-0.5">{m.label}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{m.detail}</p>
            <div className="mt-3 h-1 w-full rounded-full bg-foreground/[0.07]">
              <div
                className="h-full rounded-full bg-primary/70 transition-all duration-700"
                style={{ width: `${m.progression}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GraphiqueSection({
  graphiqueActif,
  onToggle,
}: {
  graphiqueActif: GraphiqueMetrique;
  onToggle: (v: GraphiqueMetrique) => void;
}) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-semibold">Tendance hebdomadaire</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Cette semaine — données journalières
          </p>
        </div>
        <div className="flex gap-1 rounded-2xl bg-foreground/[0.04] p-1">
          {(
            [
              { key: "sommeil" as GraphiqueMetrique, label: "Sommeil" },
              { key: "pas" as GraphiqueMetrique, label: "Pas" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => onToggle(tab.key)}
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
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<TooltipPerso />} />
            {graphiqueActif === "sommeil" ? (
              <Area
                type="monotone" dataKey="sommeil" stroke="#007AFF" strokeWidth={2.5}
                fill="url(#gradSommeil)" dot={{ fill: "#007AFF", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: "#007AFF" }}
              />
            ) : (
              <Area
                type="monotone" dataKey="pas" stroke="#34C759" strokeWidth={2.5}
                fill="url(#gradPas)" dot={{ fill: "#34C759", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: "#34C759" }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ObjectifsSection({
  objectifs,
  objectifsCoches,
  toggleObjectif,
  deleteObjectif,
  openAddDialog,
}: {
  objectifs: ObjectifItem[];
  objectifsCoches: number[];
  toggleObjectif: (id: number) => void;
  deleteObjectif: (id: number) => void;
  openAddDialog: () => void;
}) {
  const done = objectifsCoches.filter((id) => objectifs.some((o) => o.id === id)).length;
  const pct = objectifs.length > 0 ? Math.round((done / objectifs.length) * 100) : 0;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-semibold">Objectifs du jour</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">{done}/{objectifs.length} accomplis</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <span className="text-[13px] font-bold text-primary">{pct}%</span>
          </div>
          <button
            onClick={openAddDialog}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-all hover:bg-primary/20 hover:scale-105"
            title="Ajouter un objectif"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-5 h-2 w-full rounded-full bg-foreground/[0.07]">
        <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>

      <div className="space-y-3">
        {objectifs.map((obj) => {
          const coche = objectifsCoches.includes(obj.id);
          const IconComp = ICON_MAP[obj.iconeKey] ?? Target;
          return (
            <div key={obj.id} className="group flex items-center gap-1">
              <button
                onClick={() => toggleObjectif(obj.id)}
                className={cn(
                  "flex-1 flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300",
                  coche ? "bg-primary/[0.08]" : "hover:bg-foreground/[0.04]"
                )}
              >
                <div className={cn("transition-transform duration-300", coche && "scale-110")}>
                  {coche ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground/40" />}
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <IconComp className={cn("h-4 w-4 shrink-0", obj.couleur)} />
                  <span className={cn("text-[13px] font-medium text-left transition-all", coche ? "line-through text-muted-foreground" : "text-foreground")}>
                    {obj.label}
                  </span>
                </div>
              </button>
              <button
                onClick={() => deleteObjectif(obj.id)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground/0 group-hover:text-muted-foreground hover:!bg-red-500/10 hover:!text-red-500 transition-all"
                title="Supprimer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        {objectifs.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Target className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-[13px] text-muted-foreground">Aucun objectif défini.</p>
            <button
              onClick={openAddDialog}
              className="flex items-center gap-2 rounded-2xl bg-primary/10 px-4 py-2 text-[12px] font-medium text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter un objectif
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function HumeurSection({
  humeurSelectionnee,
  onSelect,
}: {
  humeurSelectionnee: number | null;
  onSelect: (v: number) => void;
}) {
  return (
    <div className="glass-card p-6">
      <div className="mb-5">
        <h3 className="text-[15px] font-semibold">Humeur du jour</h3>
        <p className="text-[12px] text-muted-foreground mt-0.5">Comment vous sentez-vous ?</p>
      </div>

      <div className="flex justify-between gap-2 mb-6">
        {emojisHumeur.map((item) => {
          const sel = humeurSelectionnee === item.valeur;
          return (
            <button
              key={item.valeur}
              onClick={() => onSelect(item.valeur)}
              className={cn(
                "flex flex-1 flex-col items-center gap-2 rounded-2xl py-4 px-2 transition-all duration-300",
                sel ? "bg-primary/10 scale-105 shadow-sm" : "hover:bg-foreground/[0.04] hover:scale-105"
              )}
            >
              <span className="text-3xl leading-none select-none">{item.emoji}</span>
              <span className={cn("text-[11px] font-medium transition-colors", sel ? "text-primary" : "text-muted-foreground")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {humeurSelectionnee !== null && (
        <div className="animate-fade-in rounded-2xl bg-foreground/[0.03] p-4">
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {humeurSelectionnee >= 4
              ? "Super, vous êtes en pleine forme ! Continuez sur cette lancée."
              : humeurSelectionnee === 3
                ? "Bonne journée en perspective. Restez actif et hydraté."
                : "Pensez à vous reposer et à prendre soin de vous aujourd'hui."}
          </p>
        </div>
      )}

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
                    className={cn("absolute bottom-0 w-full rounded-full transition-all duration-700", estAujourdhui ? "bg-primary" : "bg-primary/30")}
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
  );
}
