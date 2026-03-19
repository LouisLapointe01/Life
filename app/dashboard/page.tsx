"use client";

import {
  useState, useSyncExternalStore, useEffect, useRef, useCallback,
} from "react";
import {
  Calendar, Heart, Home, FolderOpen, DollarSign, Cloud, Users, MessageCircle,
  Settings2, ArrowUpRight, ChevronRight, Plus, X, Eye, EyeOff, GripVertical,
  RotateCcw, MoreHorizontal, Thermometer, Droplets, Zap, Footprints, Moon,
  Clock, Wallet, Bell, Wind, Sun, Cpu, ShieldCheck, Flame, Activity,
  Gauge, Lightbulb, Lock, BatteryCharging, TrendingDown, TrendingUp,
  Bitcoin, Sunrise, Umbrella, Waves, HeartPulse, Scale, Pencil, Check,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { create } from "zustand";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useUnreadMessages } from "@/lib/stores/unread-messages";

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */
type NavModule = { id: string; label: string; href: string; icon: LucideIcon };
type Category = {
  id: string; label: string; icon: LucideIcon; gradient: string;
  primaryHref: string; modules: NavModule[]; stat: string; statSub?: string;
};

export type WidgetId =
  | "horloge" | "notifications" | "batterie" | "wifi"
  | "messages" | "prochain-rdv" | "taches"
  | "meteo-temp" | "meteo-vent" | "meteo-pluie" | "meteo-humidite-ext" | "meteo-uv" | "meteo-lever"
  | "iot-temp" | "iot-humidite" | "iot-co2" | "iot-lumiere" | "iot-energie" | "iot-eau"
  | "iot-thermostat" | "iot-securite" | "iot-prise" | "iot-qualite-air"
  | "sante-pas" | "sante-sommeil" | "sante-calories" | "sante-hydratation" | "sante-fc" | "sante-poids" | "sante-score"
  | "finance-solde" | "finance-depenses" | "finance-budget" | "finance-crypto";

export type WidgetSubcat = "systeme" | "planning" | "meteo" | "iot" | "sante" | "finance";

export interface WidgetDef {
  id: WidgetId; label: string; description: string;
  icon: LucideIcon; color: string; bg: string;
  subcat: WidgetSubcat; href?: string;
}

/* ═══════════════════════════════════════════
   Static data
   ═══════════════════════════════════════════ */
const ALL_CATEGORIES: Category[] = [
  { id: "planning", label: "Planning", icon: Calendar, gradient: "from-orange-500 to-amber-500", primaryHref: "/dashboard/agenda", stat: "Agenda & contacts", statSub: "Vos rendez-vous et votre réseau", modules: [{ id: "agenda", label: "Agenda", href: "/dashboard/agenda", icon: Calendar }, { id: "annuaire", label: "Annuaire", href: "/dashboard/annuaire", icon: Users }, { id: "messages", label: "Messages", href: "/dashboard/messages", icon: MessageCircle }] },
  { id: "sante", label: "Santé", icon: Heart, gradient: "from-pink-500 to-rose-500", primaryHref: "/dashboard/sante", stat: "Bien-être & activité", statSub: "Suivi de votre santé quotidienne", modules: [{ id: "sante", label: "Santé", href: "/dashboard/sante", icon: Heart }] },
  { id: "maison", label: "Maison", icon: Home, gradient: "from-amber-500 to-yellow-500", primaryHref: "/dashboard/logement", stat: "Logement & IoT", statSub: "Gestion et automatisation du domicile", modules: [{ id: "logement", label: "Logement", href: "/dashboard/logement", icon: Home }] },
  { id: "documents", label: "Documents", icon: FolderOpen, gradient: "from-green-500 to-emerald-500", primaryHref: "/dashboard/fichiers", stat: "Fichiers & stockage", statSub: "Vos documents et dossiers", modules: [{ id: "fichiers", label: "Fichiers", href: "/dashboard/fichiers", icon: FolderOpen }] },
  { id: "finances", label: "Finances", icon: DollarSign, gradient: "from-emerald-500 to-teal-500", primaryHref: "/dashboard/finance", stat: "Budget & dépenses", statSub: "Suivi financier personnel", modules: [{ id: "finance", label: "Finances", href: "/dashboard/finance", icon: DollarSign }] },
  { id: "meteo", label: "Météo", icon: Cloud, gradient: "from-sky-500 to-blue-500", primaryHref: "/dashboard/meteo", stat: "Prévisions & villes", statSub: "Météo sur 7 jours", modules: [{ id: "meteo", label: "Météo", href: "/dashboard/meteo", icon: Cloud }] },
];

export const WIDGET_SUBCATS: Record<WidgetSubcat, { defaultLabel: string; icon: LucideIcon; color: string }> = {
  systeme:  { defaultLabel: "Système",    icon: Cpu,        color: "text-slate-400" },
  planning: { defaultLabel: "Planning",   icon: Calendar,   color: "text-orange-400" },
  meteo:    { defaultLabel: "Météo",      icon: Cloud,      color: "text-sky-400" },
  iot:      { defaultLabel: "Maison IoT", icon: Home,       color: "text-amber-400" },
  sante:    { defaultLabel: "Santé",      icon: Heart,      color: "text-pink-400" },
  finance:  { defaultLabel: "Finances",   icon: DollarSign, color: "text-emerald-400" },
};

export const ALL_WIDGETS: WidgetDef[] = [
  { id: "horloge",            subcat: "systeme",  label: "Horloge",             description: "Heure et date en direct",           icon: Clock,           color: "text-purple-400",  bg: "bg-purple-500/10" },
  { id: "notifications",      subcat: "systeme",  label: "Alertes",              description: "Notifications actives",             icon: Bell,            color: "text-amber-400",   bg: "bg-amber-500/10" },
  { id: "batterie",           subcat: "systeme",  label: "Batterie",             description: "Niveau batterie de l'appareil",     icon: BatteryCharging, color: "text-green-400",   bg: "bg-green-500/10" },
  { id: "wifi",               subcat: "systeme",  label: "Réseau",               description: "Qualité de la connexion Wi-Fi",     icon: Lock,            color: "text-blue-400",    bg: "bg-blue-500/10" },
  { id: "messages",           subcat: "planning", label: "Messages",             description: "Messages non lus",                  icon: MessageCircle,   color: "text-teal-400",    bg: "bg-teal-500/10",    href: "/dashboard/messages" },
  { id: "prochain-rdv",       subcat: "planning", label: "Prochain RDV",         description: "Prochain rendez-vous",              icon: Calendar,        color: "text-orange-400",  bg: "bg-orange-500/10",  href: "/dashboard/agenda" },
  { id: "taches",             subcat: "planning", label: "Tâches",               description: "Tâches du jour",                    icon: Activity,        color: "text-indigo-400",  bg: "bg-indigo-500/10",  href: "/dashboard/agenda" },
  { id: "meteo-temp",         subcat: "meteo",    label: "Température ext.",     description: "Température extérieure",            icon: Sun,             color: "text-sky-400",     bg: "bg-sky-500/10",     href: "/dashboard/meteo" },
  { id: "meteo-vent",         subcat: "meteo",    label: "Vent",                 description: "Vitesse du vent",                   icon: Wind,            color: "text-cyan-400",    bg: "bg-cyan-500/10",    href: "/dashboard/meteo" },
  { id: "meteo-pluie",        subcat: "meteo",    label: "Précipitations",       description: "Probabilité de pluie",              icon: Umbrella,        color: "text-blue-400",    bg: "bg-blue-500/10",    href: "/dashboard/meteo" },
  { id: "meteo-humidite-ext", subcat: "meteo",    label: "Humidité ext.",        description: "Humidité relative extérieure",      icon: Droplets,        color: "text-sky-300",     bg: "bg-sky-500/10",     href: "/dashboard/meteo" },
  { id: "meteo-uv",           subcat: "meteo",    label: "UV Index",             description: "Indice UV du moment",               icon: Sun,             color: "text-yellow-400",  bg: "bg-yellow-500/10",  href: "/dashboard/meteo" },
  { id: "meteo-lever",        subcat: "meteo",    label: "Lever du soleil",      description: "Heure de lever et coucher",         icon: Sunrise,         color: "text-orange-300",  bg: "bg-orange-500/10",  href: "/dashboard/meteo" },
  { id: "iot-temp",           subcat: "iot",      label: "Température int.",     description: "Température intérieure IoT",        icon: Thermometer,     color: "text-red-400",     bg: "bg-red-500/10",     href: "/dashboard/logement" },
  { id: "iot-humidite",       subcat: "iot",      label: "Humidité int.",        description: "Humidité intérieure IoT",           icon: Droplets,        color: "text-blue-400",    bg: "bg-blue-500/10",    href: "/dashboard/logement" },
  { id: "iot-co2",            subcat: "iot",      label: "CO₂",                 description: "Taux de CO₂ intérieur (ppm)",       icon: Waves,           color: "text-emerald-400", bg: "bg-emerald-500/10", href: "/dashboard/logement" },
  { id: "iot-lumiere",        subcat: "iot",      label: "Luminosité",           description: "Niveau de luminosité",              icon: Lightbulb,       color: "text-yellow-400",  bg: "bg-yellow-500/10",  href: "/dashboard/logement" },
  { id: "iot-energie",        subcat: "iot",      label: "Énergie",              description: "Consommation du jour",              icon: Zap,             color: "text-yellow-500",  bg: "bg-yellow-500/10",  href: "/dashboard/logement" },
  { id: "iot-eau",            subcat: "iot",      label: "Eau",                  description: "Consommation eau du jour",          icon: Droplets,        color: "text-blue-500",    bg: "bg-blue-500/10",    href: "/dashboard/logement" },
  { id: "iot-thermostat",     subcat: "iot",      label: "Thermostat",           description: "Consigne de chauffage",             icon: Gauge,           color: "text-orange-400",  bg: "bg-orange-500/10",  href: "/dashboard/logement" },
  { id: "iot-securite",       subcat: "iot",      label: "Sécurité",             description: "État du système de sécurité",       icon: ShieldCheck,     color: "text-green-400",   bg: "bg-green-500/10",   href: "/dashboard/logement" },
  { id: "iot-prise",          subcat: "iot",      label: "Prises",               description: "Appareils connectés actifs",        icon: BatteryCharging, color: "text-violet-400",  bg: "bg-violet-500/10",  href: "/dashboard/logement" },
  { id: "iot-qualite-air",    subcat: "iot",      label: "Qualité air",          description: "Indice de qualité de l'air",        icon: Activity,        color: "text-teal-400",    bg: "bg-teal-500/10",    href: "/dashboard/logement" },
  { id: "sante-pas",          subcat: "sante",    label: "Pas",                  description: "Pas effectués aujourd'hui",         icon: Footprints,      color: "text-indigo-400",  bg: "bg-indigo-500/10",  href: "/dashboard/sante" },
  { id: "sante-sommeil",      subcat: "sante",    label: "Sommeil",              description: "Durée de sommeil dernière nuit",    icon: Moon,            color: "text-violet-400",  bg: "bg-violet-500/10",  href: "/dashboard/sante" },
  { id: "sante-calories",     subcat: "sante",    label: "Calories",             description: "Apport calorique du jour",          icon: Flame,           color: "text-orange-400",  bg: "bg-orange-500/10",  href: "/dashboard/sante" },
  { id: "sante-hydratation",  subcat: "sante",    label: "Hydratation",          description: "Eau bue aujourd'hui",               icon: Droplets,        color: "text-cyan-400",    bg: "bg-cyan-500/10",    href: "/dashboard/sante" },
  { id: "sante-fc",           subcat: "sante",    label: "Fréquence cardiaque",  description: "FC de repos",                       icon: HeartPulse,      color: "text-red-400",     bg: "bg-red-500/10",     href: "/dashboard/sante" },
  { id: "sante-poids",        subcat: "sante",    label: "Poids",                description: "Dernier poids enregistré",          icon: Scale,           color: "text-pink-400",    bg: "bg-pink-500/10",    href: "/dashboard/sante" },
  { id: "sante-score",        subcat: "sante",    label: "Score bien-être",      description: "Indice de bien-être global",        icon: Heart,           color: "text-pink-500",    bg: "bg-pink-500/10",    href: "/dashboard/sante" },
  { id: "finance-solde",      subcat: "finance",  label: "Solde",                description: "Compte courant principal",          icon: Wallet,          color: "text-emerald-400", bg: "bg-emerald-500/10", href: "/dashboard/finance" },
  { id: "finance-depenses",   subcat: "finance",  label: "Dépenses",             description: "Dépenses du jour",                  icon: TrendingDown,    color: "text-red-400",     bg: "bg-red-500/10",     href: "/dashboard/finance" },
  { id: "finance-budget",     subcat: "finance",  label: "Budget restant",       description: "Budget mensuel disponible",         icon: TrendingUp,      color: "text-green-400",   bg: "bg-green-500/10",   href: "/dashboard/finance" },
  { id: "finance-crypto",     subcat: "finance",  label: "Crypto",               description: "Valeur du portefeuille crypto",     icon: Bitcoin,         color: "text-amber-400",   bg: "bg-amber-500/10",   href: "/dashboard/finance" },
];

/* ═══════════════════════════════════════════
   Preferences store (in-memory, synced to Supabase)
   ═══════════════════════════════════════════ */
interface PrefsState {
  loaded: boolean;
  activeWidgets: WidgetId[];
  categoryOrder: string[];
  categoryHidden: string[];
  subcatNames: Record<string, string>;   // subcat id → custom label

  setAll: (p: Omit<PrefsState, "loaded" | "setAll" | "setActiveWidgets" | "setCategoryOrder" | "setCategoryHidden" | "setSubcatNames">) => void;
  setActiveWidgets: (v: WidgetId[]) => void;
  setCategoryOrder: (v: string[]) => void;
  setCategoryHidden: (v: string[]) => void;
  setSubcatNames: (v: Record<string, string>) => void;
}

const DEFAULT_ACTIVE: WidgetId[] = ["messages", "prochain-rdv", "meteo-temp", "horloge"];
const DEFAULT_CAT_ORDER = ALL_CATEGORIES.map(c => c.id);

const usePrefsStore = create<PrefsState>()((set) => ({
  loaded: false,
  activeWidgets: DEFAULT_ACTIVE,
  categoryOrder: DEFAULT_CAT_ORDER,
  categoryHidden: [],
  subcatNames: {},
  setAll: (p) => set({ ...p, loaded: true }),
  setActiveWidgets: (v) => set({ activeWidgets: v }),
  setCategoryOrder: (v) => set({ categoryOrder: v }),
  setCategoryHidden: (v) => set({ categoryHidden: v }),
  setSubcatNames: (v) => set({ subcatNames: v }),
}));

/* ═══════════════════════════════════════════
   Supabase sync hook
   ═══════════════════════════════════════════ */
function useSupabasePrefs() {
  const store = usePrefsStore();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load on mount
  useEffect(() => {
    fetch("/api/dashboard/preferences")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          store.setAll({
            activeWidgets: data.active_widgets ?? DEFAULT_ACTIVE,
            categoryOrder: data.category_order ?? DEFAULT_CAT_ORDER,
            categoryHidden: data.category_hidden ?? [],
            subcatNames: data.subcat_names ?? {},
          });
        } else {
          store.setAll({
            activeWidgets: DEFAULT_ACTIVE,
            categoryOrder: DEFAULT_CAT_ORDER,
            categoryHidden: [],
            subcatNames: {},
          });
        }
      })
      .catch(() => {
        store.setAll({
          activeWidgets: DEFAULT_ACTIVE,
          categoryOrder: DEFAULT_CAT_ORDER,
          categoryHidden: [],
          subcatNames: {},
        });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced save
  const save = useCallback((patch: {
    active_widgets: WidgetId[];
    category_order: string[];
    category_hidden: string[];
    subcat_names: Record<string, string>;
  }) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch("/api/dashboard/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).catch(() => {});
    }, 800);
  }, []);

  return { save };
}

/* ═══════════════════════════════════════════
   Live data hooks
   ═══════════════════════════════════════════ */
function useNextAppointment() {
  const [value, setValue] = useState("...");
  const [sub, setSub] = useState("");
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
      const dayLabel = isToday ? "Auj." : isTomorrow ? "Demain" : d.toLocaleDateString("fr", { weekday: "short", day: "numeric" });
      setValue(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
      setSub(`${dayLabel} · ${next.guest_name.split(" ")[0]}`);
    }).catch(() => setValue("—"));
  }, []);
  return { value, sub };
}

function useMeteoData() {
  const [temp, setTemp] = useState("...");
  const [wind, setWind] = useState("...");
  const [rain, setRain] = useState("...");
  const [humidity, setHumidity] = useState("...");
  const [uv, setUv] = useState("...");
  const [sunrise, setSunrise] = useState("...");
  const [city, setCity] = useState("...");
  useEffect(() => {
    let lat: number, lon: number;
    try {
      const cities = JSON.parse(localStorage.getItem("life-weather-cities") ?? "[]");
      if (!cities[0]) { setTemp("—"); setWind("—"); setRain("—"); setHumidity("—"); setUv("—"); setSunrise("—"); setCity("Aucune ville"); return; }
      lat = cities[0].latitude; lon = cities[0].longitude; setCity(cities[0].name);
    } catch { setTemp("—"); return; }
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,precipitation_probability,windspeed_10m,uv_index&daily=sunrise,sunset&timezone=auto`)
      .then(r => r.json()).then(d => {
        setTemp(`${Math.round(d.current_weather?.temperature ?? 0)}°C`);
        setWind(`${Math.round(d.current_weather?.windspeed ?? 0)} km/h`);
        const h = new Date().getHours();
        const p = d.hourly?.precipitation_probability?.[h]; setRain(p != null ? `${p}%` : "—");
        const hu = d.hourly?.relativehumidity_2m?.[h]; setHumidity(hu != null ? `${hu}%` : "—");
        const uvv = d.hourly?.uv_index?.[h]; setUv(uvv != null ? String(Math.round(uvv)) : "—");
        const sr = d.daily?.sunrise?.[0]; setSunrise(sr ? new Date(sr).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" }) : "—");
      }).catch(() => { setTemp("—"); setWind("—"); setRain("—"); });
  }, []);
  return { temp, wind, rain, humidity, uv, sunrise, city };
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
function WidgetTile({
  id, editMode, onRemove, isDragOver, onPointerDown,
}: {
  id: WidgetId; editMode: boolean; onRemove: () => void;
  isDragOver: boolean; onPointerDown: (e: React.PointerEvent) => void;
}) {
  const def = ALL_WIDGETS.find(w => w.id === id)!;
  const Icon = def.icon;
  const unread = useUnreadMessages(s => s.totalUnread);
  const nextRdv = useNextAppointment();
  const meteo = useMeteoData();
  const clock = useClock();

  let value = "—";
  let sub = def.description;

  switch (id) {
    case "messages":            value = String(unread); sub = unread === 1 ? "message non lu" : "messages non lus"; break;
    case "prochain-rdv":        value = nextRdv.value; sub = nextRdv.sub || "Aucun rendez-vous"; break;
    case "taches":              value = "0"; sub = "tâches aujourd'hui"; break;
    case "horloge":             value = clock.value; sub = clock.sub; break;
    case "notifications":       value = "0"; sub = "alertes actives"; break;
    case "batterie":            value = "—"; sub = "Non disponible"; break;
    case "wifi":                value = "—"; sub = "Signal Wi-Fi"; break;
    case "meteo-temp":          value = meteo.temp; sub = meteo.city; break;
    case "meteo-vent":          value = meteo.wind; sub = "Vent actuel"; break;
    case "meteo-pluie":         value = meteo.rain; sub = "Prob. pluie"; break;
    case "meteo-humidite-ext":  value = meteo.humidity; sub = "Humidité ext."; break;
    case "meteo-uv":            value = meteo.uv; sub = "UV Index"; break;
    case "meteo-lever":         value = meteo.sunrise; sub = "Lever du soleil"; break;
    case "iot-temp":            value = "22°C"; sub = "Salon · IoT"; break;
    case "iot-humidite":        value = "45%"; sub = "Salon · IoT"; break;
    case "iot-co2":             value = "412 ppm"; sub = "Qualité air bonne"; break;
    case "iot-lumiere":         value = "320 lx"; sub = "Luminosité"; break;
    case "iot-energie":         value = "3.2 kWh"; sub = "Aujourd'hui"; break;
    case "iot-eau":             value = "42 L"; sub = "Aujourd'hui"; break;
    case "iot-thermostat":      value = "19°C"; sub = "Consigne active"; break;
    case "iot-securite":        value = "OK"; sub = "Système armé"; break;
    case "iot-prise":           value = "5"; sub = "Prises actives"; break;
    case "iot-qualite-air":     value = "Bon"; sub = "AQI · 42"; break;
    case "sante-pas":           value = "—"; sub = "Non connecté"; break;
    case "sante-sommeil":       value = "—"; sub = "Non connecté"; break;
    case "sante-calories":      value = "—"; sub = "Non connecté"; break;
    case "sante-hydratation":   value = "—"; sub = "Non connecté"; break;
    case "sante-fc":            value = "—"; sub = "Non connecté"; break;
    case "sante-poids":         value = "—"; sub = "Non connecté"; break;
    case "sante-score":         value = "—"; sub = "Non connecté"; break;
    case "finance-solde":       value = "—"; sub = "Connectez un compte"; break;
    case "finance-depenses":    value = "—"; sub = "Connectez un compte"; break;
    case "finance-budget":      value = "—"; sub = "Connectez un compte"; break;
    case "finance-crypto":      value = "—"; sub = "Connectez un compte"; break;
  }

  const tile = (
    <div
      onPointerDown={onPointerDown}
      className={cn(
        "relative rounded-[1.4rem] p-4 flex flex-col gap-2 transition-all select-none",
        def.bg,
        "border border-white/[0.08] dark:border-white/[0.04]",
        editMode && "cursor-grab ring-2 ring-dashed ring-foreground/20",
        isDragOver && "ring-2 ring-primary scale-[0.97]",
        def.href && !editMode && "cursor-pointer hover:brightness-105",
      )}
    >
      {editMode && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
          className="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {editMode && <GripVertical className="absolute top-3 left-3 h-3.5 w-3.5 text-foreground/20" />}
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl", def.bg, "ring-1 ring-white/10")}>
        <Icon className={cn("h-4 w-4", def.color)} />
      </div>
      <div className="mt-0.5">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{def.label}</p>
        <p className="text-[22px] font-bold tracking-tight mt-0.5 leading-none">{value}</p>
        <p className="text-[10px] text-muted-foreground/70 mt-1 leading-tight line-clamp-1">{sub}</p>
      </div>
    </div>
  );

  if (def.href && !editMode) return <Link href={def.href}>{tile}</Link>;
  return tile;
}

/* ═══════════════════════════════════════════
   Editable subcat label
   ═══════════════════════════════════════════ */
function SubcatLabel({
  subcat, customNames, editMode,
  onChange,
}: {
  subcat: WidgetSubcat; customNames: Record<string, string>; editMode: boolean;
  onChange: (subcat: WidgetSubcat, val: string) => void;
}) {
  const meta = WIDGET_SUBCATS[subcat];
  const SubIcon = meta.icon;
  const label = customNames[subcat] ?? meta.defaultLabel;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const trimmed = draft.trim() || meta.defaultLabel;
    onChange(subcat, trimmed === meta.defaultLabel ? "" : trimmed);
    setEditing(false);
  };

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setDraft(label); }, [label]);

  return (
    <div className="flex items-center gap-2 mb-2.5 px-0.5">
      <SubIcon className={cn("h-3.5 w-3.5 shrink-0", meta.color)} />
      {editing ? (
        <form onSubmit={(e) => { e.preventDefault(); commit(); }} className="flex items-center gap-1">
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => e.key === "Escape" && setEditing(false)}
            className="text-[10px] font-semibold uppercase tracking-[0.18em] bg-transparent border-b border-primary/50 outline-none text-foreground min-w-0 w-28"
          />
          <button type="submit" className="p-0.5 rounded text-primary hover:text-primary/80">
            <Check className="h-3 w-3" />
          </button>
        </form>
      ) : (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          {editMode && (
            <button
              onClick={() => { setDraft(label); setEditing(true); }}
              className="p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              <Pencil className="h-2.5 w-2.5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Widget catalog — grouped accordion
   ═══════════════════════════════════════════ */
function WidgetCatalog({
  activeWidgets, customNames, onToggle, onReset, onClose,
}: {
  activeWidgets: WidgetId[]; customNames: Record<string, string>;
  onToggle: (id: WidgetId) => void; onReset: () => void; onClose: () => void;
}) {
  const [openSubcat, setOpenSubcat] = useState<WidgetSubcat | null>("planning");
  const subcats = Object.keys(WIDGET_SUBCATS) as WidgetSubcat[];
  return (
    <div className="space-y-2 pt-1">
      {subcats.map((subcat) => {
        const meta = WIDGET_SUBCATS[subcat];
        const SubIcon = meta.icon;
        const label = customNames[subcat] ?? meta.defaultLabel;
        const widgets = ALL_WIDGETS.filter(w => w.subcat === subcat);
        const activeCount = widgets.filter(w => activeWidgets.includes(w.id)).length;
        const isOpen = openSubcat === subcat;
        return (
          <div key={subcat} className="rounded-2xl overflow-hidden border border-foreground/[0.06]">
            <button
              onClick={() => setOpenSubcat(isOpen ? null : subcat)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-foreground/[0.03] hover:bg-foreground/[0.06] transition-colors"
            >
              <SubIcon className={cn("h-4 w-4 shrink-0", meta.color)} />
              <span className="flex-1 text-left text-[13px] font-semibold">{label}</span>
              {activeCount > 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                  {activeCount} actif{activeCount > 1 ? "s" : ""}
                </span>
              )}
              <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
            </button>
            {isOpen && (
              <div className="divide-y divide-foreground/[0.04]">
                {widgets.map((w) => {
                  const WIcon = w.icon;
                  const isActive = activeWidgets.includes(w.id);
                  return (
                    <div key={w.id} className="flex items-center gap-3 px-4 py-2.5 bg-foreground/[0.01] hover:bg-foreground/[0.04] transition-colors">
                      <div className={cn("flex h-7 w-7 items-center justify-center rounded-xl shrink-0", w.bg)}>
                        <WIcon className={cn("h-3.5 w-3.5", w.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium">{w.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{w.description}</p>
                      </div>
                      <button
                        onClick={() => onToggle(w.id)}
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
            )}
          </div>
        );
      })}
      <button
        onClick={() => { onReset(); toast.success("Modules réinitialisés"); onClose(); }}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-foreground/[0.05] py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <RotateCcw className="h-3.5 w-3.5" />Réinitialiser
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════ */
export default function DashboardPage() {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  // Store
  const loaded        = usePrefsStore(s => s.loaded);
  const activeWidgets = usePrefsStore(s => s.activeWidgets);
  const categoryOrder = usePrefsStore(s => s.categoryOrder);
  const categoryHidden = usePrefsStore(s => s.categoryHidden);
  const subcatNames   = usePrefsStore(s => s.subcatNames);
  const setActiveWidgets  = usePrefsStore(s => s.setActiveWidgets);
  const setCategoryOrder  = usePrefsStore(s => s.setCategoryOrder);
  const setCategoryHidden = usePrefsStore(s => s.setCategoryHidden);
  const setSubcatNames    = usePrefsStore(s => s.setSubcatNames);

  const { save } = useSupabasePrefs();

  // Helper: update and persist
  const updateWidgets = useCallback((next: WidgetId[]) => {
    setActiveWidgets(next);
    save({ active_widgets: next, category_order: categoryOrder, category_hidden: categoryHidden, subcat_names: subcatNames });
  }, [setActiveWidgets, save, categoryOrder, categoryHidden, subcatNames]);

  const updateCatOrder = useCallback((next: string[]) => {
    setCategoryOrder(next);
    save({ active_widgets: activeWidgets, category_order: next, category_hidden: categoryHidden, subcat_names: subcatNames });
  }, [setCategoryOrder, save, activeWidgets, categoryHidden, subcatNames]);

  const updateCatHidden = useCallback((next: string[]) => {
    setCategoryHidden(next);
    save({ active_widgets: activeWidgets, category_order: categoryOrder, category_hidden: next, subcat_names: subcatNames });
  }, [setCategoryHidden, save, activeWidgets, categoryOrder, subcatNames]);

  const updateSubcatNames = useCallback((next: Record<string, string>) => {
    setSubcatNames(next);
    save({ active_widgets: activeWidgets, category_order: categoryOrder, category_hidden: categoryHidden, subcat_names: next });
  }, [setSubcatNames, save, activeWidgets, categoryOrder, categoryHidden]);

  // UI state
  const [catSettingsOpen, setCatSettingsOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [editWidgets, setEditWidgets] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  // Drag & drop state
  const [draggedId, setDraggedId] = useState<WidgetId | null>(null);
  const [dropTargetId, setDropTargetId] = useState<WidgetId | null>(null);
  const tileRefs = useRef<Map<WidgetId, HTMLDivElement>>(new Map());
  const dragInfoRef = useRef<{ startX: number; startY: number; isDragging: boolean; id: WidgetId } | null>(null);

  const handleTilePointerDown = useCallback((e: React.PointerEvent, id: WidgetId) => {
    if (!editMode) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragInfoRef.current = { startX: e.clientX, startY: e.clientY, isDragging: false, id };
  }, []);

  // editMode ref for use in pointer events
  const editMode = editWidgets;
  const editModeRef = useRef(editMode);
  useEffect(() => { editModeRef.current = editMode; }, [editMode]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const info = dragInfoRef.current;
      if (!info) return;
      if (!info.isDragging) {
        if (Math.abs(e.clientX - info.startX) < 8 && Math.abs(e.clientY - info.startY) < 8) return;
        info.isDragging = true;
        setDraggedId(info.id);
      }
      // Find which tile we're hovering over
      let found: WidgetId | null = null;
      tileRefs.current.forEach((el, wid) => {
        if (wid === info.id) return;
        const rect = el.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          found = wid;
        }
      });
      setDropTargetId(found);
    };

    const handlePointerUp = () => {
      const info = dragInfoRef.current;
      dragInfoRef.current = null;
      if (info?.isDragging && dropTargetId && info.id !== dropTargetId) {
        // Swap positions — read current state from store directly
        const current = usePrefsStore.getState().activeWidgets;
        const next = [...current];
        const ai = next.indexOf(info.id);
        const bi = next.indexOf(dropTargetId as WidgetId);
        if (ai !== -1 && bi !== -1) { [next[ai], next[bi]] = [next[bi], next[ai]]; }
        setActiveWidgets(next);
        save({ active_widgets: next, category_order: categoryOrder, category_hidden: categoryHidden, subcat_names: subcatNames });
      }
      setDraggedId(null);
      setDropTargetId(null);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dropTargetId, setActiveWidgets, save, categoryOrder, categoryHidden, subcatNames]);

  // Category helpers
  const categories = categoryOrder.map(id => ALL_CATEGORIES.find(c => c.id === id)).filter(Boolean) as Category[];
  const visibleCats = categories.filter(c => !categoryHidden.includes(c.id));
  const hiddenCats = categories.filter(c => categoryHidden.includes(c.id));

  const toggleCat = (id: string) => {
    const next = categoryHidden.includes(id) ? categoryHidden.filter(h => h !== id) : [...categoryHidden, id];
    updateCatHidden(next);
  };
  const moveCat = (id: string, dir: "up" | "down") => {
    const a = [...categoryOrder]; const i = a.indexOf(id);
    if (dir === "up" && i > 0) { [a[i-1], a[i]] = [a[i], a[i-1]]; }
    else if (dir === "down" && i < a.length - 1) { [a[i], a[i+1]] = [a[i+1], a[i]]; }
    else return;
    updateCatOrder(a);
  };

  // Widget helpers
  const toggleWidget = (id: WidgetId) => {
    const next = activeWidgets.includes(id) ? activeWidgets.filter(w => w !== id) : [...activeWidgets, id];
    updateWidgets(next);
  };
  const resetWidgets = () => updateWidgets(DEFAULT_ACTIVE);

  // Grouped display
  const SUBCAT_ORDER: WidgetSubcat[] = ["systeme", "planning", "meteo", "iot", "sante", "finance"];
  const widgetsBySubcat: Record<WidgetSubcat, WidgetId[]> = { systeme: [], planning: [], meteo: [], iot: [], sante: [], finance: [] };
  activeWidgets.forEach(id => {
    const def = ALL_WIDGETS.find(w => w.id === id);
    if (def) widgetsBySubcat[def.subcat].push(id);
  });
  const nonEmptySubcats = SUBCAT_ORDER.filter(s => widgetsBySubcat[s].length > 0);

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Bonjour" : now.getHours() < 18 ? "Bon après-midi" : "Bonsoir";

  if (!mounted || !loaded) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 lg:space-y-8">

      {/* ── Hero ── */}
      <div className="premium-panel relative overflow-hidden rounded-[2rem] px-5 py-5 lg:px-7 lg:py-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,122,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(52,199,89,0.10),transparent_24%)]" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">Tableau de bord</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.04em] lg:text-[36px]">{greeting}, Louis.</h1>
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
                        <ModIcon className="h-3.5 w-3.5 shrink-0" />{mod.label}
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
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10"><Plus className="h-5 w-5 text-primary" /></div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-foreground/70">Ajouter une catégorie</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{hiddenCats.length} masquée{hiddenCats.length > 1 ? "s" : ""}</p>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* ── Quick Modules ── */}
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
            <button
              onClick={() => setCatalogOpen(true)}
              className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-xl text-primary hover:bg-primary/10 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />Ajouter
            </button>
          </div>
        </div>

        {activeWidgets.length === 0 ? (
          <button
            onClick={() => setCatalogOpen(true)}
            className="w-full premium-panel-soft flex items-center justify-center gap-3 rounded-[1.8rem] border-2 border-dashed border-foreground/[0.08] py-12 transition-all hover:border-primary/30 hover:bg-primary/[0.02]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10"><Plus className="h-5 w-5 text-primary" /></div>
            <div className="text-left">
              <p className="text-[13px] font-semibold text-foreground/70">Ajouter des modules</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">IoT, météo, santé, finances, planning…</p>
            </div>
          </button>
        ) : (
          <div className="space-y-5">
            {nonEmptySubcats.map(subcat => {
              const ids = widgetsBySubcat[subcat];
              return (
                <div key={subcat}>
                  <SubcatLabel
                    subcat={subcat}
                    customNames={subcatNames}
                    editMode={editWidgets}
                    onChange={(sc, val) => {
                      const next = { ...subcatNames };
                      if (val) next[sc] = val; else delete next[sc];
                      updateSubcatNames(next);
                    }}
                  />
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {ids.map((id) => (
                      <div
                        key={id}
                        ref={el => { if (el) tileRefs.current.set(id, el); else tileRefs.current.delete(id); }}
                      >
                        <WidgetTile
                          id={id}
                          editMode={editWidgets}
                          onRemove={() => { toggleWidget(id); toast.success("Module retiré"); }}
                          isDragOver={dropTargetId === id}
                          onPointerDown={(e) => handleTilePointerDown(e, id)}
                        />
                      </div>
                    ))}
                    {editWidgets && (
                      <button
                        onClick={() => setCatalogOpen(true)}
                        className="flex flex-col items-center justify-center gap-2 rounded-[1.4rem] border-2 border-dashed border-foreground/[0.08] p-4 transition-all hover:border-primary/30 hover:bg-primary/[0.02] min-h-[110px]"
                      >
                        <Plus className="h-4 w-4 text-primary" />
                        <p className="text-[10px] font-medium text-muted-foreground">Ajouter</p>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
              const isHidden = categoryHidden.includes(cat.id);
              return (
                <div key={cat.id} className={cn("flex items-center gap-2 rounded-xl px-3 py-2", isHidden ? "opacity-45" : "bg-foreground/[0.04]")}>
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br shrink-0", cat.gradient)}><CatIcon className="h-3.5 w-3.5 text-white" /></div>
                  <span className="flex-1 text-[13px] font-medium">{cat.label}</span>
                  {!isHidden && (<>
                    <button onClick={() => moveCat(cat.id, "up")} disabled={i === 0} className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronRight className="h-3.5 w-3.5 -rotate-90" /></button>
                    <button onClick={() => moveCat(cat.id, "down")} disabled={i === categories.length - 1} className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronRight className="h-3.5 w-3.5 rotate-90" /></button>
                  </>)}
                  <button onClick={() => toggleCat(cat.id)} className="p-1 rounded text-muted-foreground hover:text-foreground">{isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
                </div>
              );
            })}
          </div>
          <button onClick={() => { updateCatOrder(DEFAULT_CAT_ORDER); updateCatHidden([]); toast.success("Catégories réinitialisées"); }} className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-foreground/[0.05] py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            <RotateCcw className="h-3.5 w-3.5" />Réinitialiser
          </button>
        </DialogContent>
      </Dialog>

      {/* ── Module Catalog Dialog ── */}
      <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DialogContent className="premium-panel border-white/10 sm:max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4 text-primary" />Catalogue de modules</DialogTitle>
            <DialogDescription>{ALL_WIDGETS.length} modules disponibles · {activeWidgets.length} actif{activeWidgets.length > 1 ? "s" : ""}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-0.5">
            <WidgetCatalog
              activeWidgets={activeWidgets}
              customNames={subcatNames}
              onToggle={(id) => { toggleWidget(id); toast.success(activeWidgets.includes(id) ? "Module retiré" : "Module ajouté"); }}
              onReset={resetWidgets}
              onClose={() => setCatalogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── FAB ── */}
      <div className="fixed bottom-20 right-5 z-[60] flex flex-col items-end gap-2 lg:bottom-10 lg:right-10">
        {fabOpen && (<>
          <button onClick={() => { setCatalogOpen(true); setFabOpen(false); }} className="flex items-center gap-2 rounded-full bg-foreground/10 backdrop-blur-xl border border-white/20 text-muted-foreground shadow-md px-4 h-10 text-sm transition-all hover:shadow-lg active:scale-95 lg:bg-white/58 lg:border-white/45 lg:text-foreground dark:lg:bg-white/[0.08]">
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
