"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Loader2,
  Clock,
  Users,
  CalendarDays,
  Star,
  Settings2,
  Palette,
  LayoutGrid,
  Eye,
  EyeOff,
  Smartphone,
  RotateCcw,
  Lock,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  ALL_TABS,
  useDashboardTabs,
  useVisibleTabs,
  useHiddenTabs,
  useMobileVisibleTabs,
  type TabId,
} from "@/lib/stores/dashboard-tabs";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */

type AppointmentType = {
  id: string;
  name: string;
  duration_min: number;
  color: string;
  is_active: boolean;
  sort_order: number;
};

type AvailabilityRule = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

type Contact = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  is_close: boolean;
};

const DAYS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

type Tab = "types" | "availability" | "contacts" | "sections";

const tabs: { key: Tab; label: string; icon: typeof CalendarDays }[] = [
  { key: "sections", label: "Sections", icon: LayoutGrid },
  { key: "types", label: "Types de RDV", icon: CalendarDays },
  { key: "availability", label: "Disponibilités", icon: Clock },
  { key: "contacts", label: "Contacts proches", icon: Users },
];

/* ═══════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════ */

export default function ParametresPage() {
  const [activeTab, setActiveTab] = useState<Tab>("types");

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="animate-slide-up">
        <h2 className="text-3xl font-bold tracking-tight">Paramètres</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Configurez vos types de rendez-vous, disponibilités et contacts
          proches.
        </p>
      </div>

      {/* Tab Navigation */}
      <div
        className="overflow-x-auto rounded-2xl bg-foreground/[0.04] p-1 animate-slide-up"
        style={{ animationDelay: "80ms" }}
      >
        <div className="flex gap-1 min-w-max">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[11px] sm:text-[13px] font-medium transition-all duration-300 whitespace-nowrap",
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                style={{ minWidth: 120 }}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="animate-slide-up" style={{ animationDelay: "160ms" }}>
        {activeTab === "sections" && <DashboardSectionsSettings />}
        {activeTab === "types" && <AppointmentTypesSection />}
        {activeTab === "availability" && <AvailabilitySection />}
        {activeTab === "contacts" && <ContactsSection />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Gestion des sections du dashboard
   ═══════════════════════════════════════════════════════ */

function DashboardSectionsSettings() {
  const visibleTabs = useVisibleTabs();
  const hiddenTabs = useHiddenTabs();
  const mobileTabs = useMobileVisibleTabs();
  const {
    addTab,
    removeTab,
    moveTab,
    addMobileTab,
    removeMobileTab,
    resetToDefault,
    visibleTabs: visibleIds,
    mobileTabs: mobileIds,
  } = useDashboardTabs();

  return (
    <div className="space-y-6">
      {/* Header + Reset */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/20">
            <LayoutGrid className="h-5 w-5 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-[15px] sm:text-[16px] font-semibold">Sections du dashboard</h3>
            <p className="text-[11px] sm:text-[12px] text-muted-foreground">
              Choisissez les sections visibles et leur ordre.
            </p>
          </div>
        </div>
        <button
          onClick={resetToDefault}
          className="flex items-center gap-2 rounded-2xl bg-foreground/[0.06] px-4 py-2.5 text-[12px] sm:text-[13px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground self-end sm:self-auto"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Réinitialiser
        </button>
      </div>

      {/* Sections sidebar (visibles) */}
      <div className="space-y-2">
        <p className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
          Sidebar — Visible ({visibleTabs.length})
        </p>
        <div className="space-y-1.5">
          {visibleTabs.map((tab, index) => (
            <div
              key={tab.id}
              className="glass-card flex items-center gap-3 p-3.5"
            >
              {/* Icon du tab */}
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br",
                  tab.color
                )}
              >
                <tab.icon className={cn("h-4.5 w-4.5", tab.iconColor)} />
              </div>

              {/* Nom */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold truncate">
                    {tab.label}
                  </p>
                  {tab.locked && (
                    <span className="flex items-center gap-1 rounded-lg bg-foreground/[0.06] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      <Lock className="h-2.5 w-2.5" />
                      Fixe
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {tab.href}
                </p>
              </div>

              {/* Actions: réordonner + supprimer */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => index > 0 && moveTab(index, index - 1)}
                  disabled={index === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-foreground/[0.06] hover:text-foreground disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() =>
                    index < visibleTabs.length - 1 &&
                    moveTab(index, index + 1)
                  }
                  disabled={index === visibleTabs.length - 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-foreground/[0.06] hover:text-foreground disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                {!tab.locked ? (
                  <button
                    onClick={() => removeTab(tab.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-500"
                    title="Retirer"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <div className="w-7" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sections masquées */}
      {hiddenTabs.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
            Masquées ({hiddenTabs.length})
          </p>
          <div className="space-y-1.5">
            {hiddenTabs.map((tab) => (
              <div
                key={tab.id}
                className="glass-card flex items-center gap-3 p-3.5 opacity-60"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br",
                    tab.color
                  )}
                >
                  <tab.icon className={cn("h-4.5 w-4.5", tab.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold truncate">
                    {tab.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Masquée</p>
                </div>
                <button
                  onClick={() => addTab(tab.id)}
                  className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-[12px] font-medium text-primary transition-all hover:bg-primary/20"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Afficher
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barre mobile */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">
            Barre mobile (max 4)
          </p>
        </div>
        <p className="text-[12px] text-muted-foreground px-1">
          Sélectionnez jusqu&apos;à 4 sections pour la navigation mobile.
        </p>
        <div className="grid grid-cols-2 gap-2 xs:grid-cols-3 sm:grid-cols-4">
          {ALL_TABS.map((tab) => {
            const isInMobile = mobileIds.includes(tab.id);
            const isVisible = visibleIds.includes(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() =>
                  isInMobile
                    ? removeMobileTab(tab.id)
                    : addMobileTab(tab.id)
                }
                disabled={!isVisible || (tab.locked && isInMobile)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl p-3.5 transition-all duration-200",
                  isInMobile
                    ? "glass-card shadow-sm ring-2 ring-primary/30"
                    : "bg-foreground/[0.03] hover:bg-foreground/[0.06]",
                  !isVisible && "opacity-30 cursor-not-allowed"
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br",
                    tab.color
                  )}
                >
                  <tab.icon className={cn("h-4 w-4", tab.iconColor)} />
                </div>
                <span className="text-[11px] font-medium">{tab.label}</span>
                {isInMobile && (
                  <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    Mobile
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Types de RDV
   ═══════════════════════════════════════════════════════ */

function AppointmentTypesSection() {
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    duration_min: "30",
    color: "#007AFF",
  });
  const [saving, setSaving] = useState(false);

  const fetchTypes = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("appointment_types")
      .select("*")
      .order("sort_order");
    if (data) setTypes(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const addType = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("appointment_types").insert({
      name: form.name,
      duration_min: parseInt(form.duration_min),
      color: form.color,
      sort_order: types.length,
    });
    setForm({ name: "", duration_min: "30", color: "#007AFF" });
    setDialogOpen(false);
    setSaving(false);
    fetchTypes();
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    const supabase = createClient();
    await supabase
      .from("appointment_types")
      .update({ is_active: !is_active })
      .eq("id", id);
    fetchTypes();
  };

  const deleteType = async (id: string) => {
    const supabase = createClient();
    await supabase.from("appointment_types").delete().eq("id", id);
    fetchTypes();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20">
            <CalendarDays className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-[15px] sm:text-[16px] font-semibold">Types de rendez-vous</h3>
            <p className="text-[11px] sm:text-[12px] text-muted-foreground">
              {types.length} type{types.length > 1 ? "s" : ""} configuré
              {types.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-[12px] sm:text-[13px] font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:-translate-y-0.5 self-end sm:self-auto">
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Nouveau type de rendez-vous</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium">Nom</label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Ex: Appel téléphonique"
                  className="glass-input w-full py-3 px-4 text-[14px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium">
                  Durée (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={form.duration_min}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, duration_min: e.target.value }))
                  }
                  className="glass-input w-full py-3 px-4 text-[14px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-[13px] font-medium">
                  <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                  Couleur
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, color: e.target.value }))
                    }
                    className="h-11 w-11 cursor-pointer rounded-xl border-0 bg-transparent"
                  />
                  <input
                    value={form.color}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, color: e.target.value }))
                    }
                    className="glass-input flex-1 py-3 px-4 text-[14px] font-mono"
                  />
                </div>
              </div>
              <button
                onClick={addType}
                disabled={!form.name || saving}
                className="w-full rounded-2xl bg-primary py-3 text-[14px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  "Créer"
                )}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      {types.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 py-16">
          <CalendarDays className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-[14px] text-muted-foreground">
            Aucun type de rendez-vous. Créez-en un pour commencer.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {types.map((type) => (
            <div
              key={type.id}
              className="glass-card flex items-center gap-4 p-4"
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{
                  background: `linear-gradient(135deg, ${type.color}30, ${type.color}10)`,
                }}
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: type.color }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold truncate">
                  {type.name}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {type.duration_min} min
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={type.is_active}
                  onCheckedChange={() =>
                    toggleActive(type.id, type.is_active)
                  }
                />
                <button
                  onClick={() => deleteType(type.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Disponibilités
   ═══════════════════════════════════════════════════════ */

function AvailabilitySection() {
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    day_of_week: "1",
    start_time: "09:00",
    end_time: "17:00",
  });
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("availability_rules")
      .select("*")
      .order("day_of_week")
      .order("start_time");
    if (data) setRules(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const addRule = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("availability_rules").insert({
      day_of_week: parseInt(form.day_of_week),
      start_time: form.start_time,
      end_time: form.end_time,
    });
    setDialogOpen(false);
    setSaving(false);
    fetchRules();
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    const supabase = createClient();
    await supabase
      .from("availability_rules")
      .update({ is_active: !is_active })
      .eq("id", id);
    fetchRules();
  };

  const deleteRule = async (id: string) => {
    const supabase = createClient();
    await supabase.from("availability_rules").delete().eq("id", id);
    fetchRules();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  // Group by day
  const grouped = rules.reduce(
    (acc, rule) => {
      const day = rule.day_of_week;
      if (!acc[day]) acc[day] = [];
      acc[day].push(rule);
      return acc;
    },
    {} as Record<number, AvailabilityRule[]>
  );

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20">
            <Clock className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h3 className="text-[15px] sm:text-[16px] font-semibold">Plages horaires</h3>
            <p className="text-[11px] sm:text-[12px] text-muted-foreground">
              {rules.length} plage{rules.length > 1 ? "s" : ""} configurée
              {rules.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-[12px] sm:text-[13px] font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:-translate-y-0.5 self-end sm:self-auto">
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Nouvelle plage horaire</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium">Jour</label>
                <Select
                  value={form.day_of_week}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, day_of_week: v }))
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium">Début</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, start_time: e.target.value }))
                    }
                    className="glass-input w-full py-3 px-4 text-[14px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium">Fin</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, end_time: e.target.value }))
                    }
                    className="glass-input w-full py-3 px-4 text-[14px]"
                  />
                </div>
              </div>
              <button
                onClick={addRule}
                disabled={saving}
                className="w-full rounded-2xl bg-primary py-3 text-[14px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  "Créer"
                )}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* List grouped by day */}
      {rules.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 py-16">
          <Clock className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-[14px] text-muted-foreground">
            Aucune plage horaire. Ajoutez vos disponibilités.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([dayNum, dayRules]) => (
              <div key={dayNum} className="space-y-2">
                <p className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
                  {DAYS[Number(dayNum)]}
                </p>
                {dayRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="glass-card flex items-center gap-4 p-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
                      <Clock className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-semibold">
                        {rule.start_time.slice(0, 5)} —{" "}
                        {rule.end_time.slice(0, 5)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() =>
                          toggleActive(rule.id, rule.is_active)
                        }
                      />
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Contacts proches
   ═══════════════════════════════════════════════════════ */

function ContactsSection() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, phone, is_close")
      .order("first_name");
    if (data) setContacts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const toggleClose = async (id: string, is_close: boolean) => {
    const supabase = createClient();
    await supabase
      .from("contacts")
      .update({ is_close: !is_close })
      .eq("id", id);
    fetchContacts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  const closeContacts = contacts.filter((c) => c.is_close);
  const otherContacts = contacts.filter((c) => !c.is_close);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20">
          <Users className="h-5 w-5 text-purple-500" />
        </div>
        <div>
          <h3 className="text-[16px] font-semibold">Contacts proches</h3>
          <p className="text-[12px] text-muted-foreground">
            Les proches reçoivent un SMS à la confirmation du RDV.
          </p>
        </div>
      </div>

      {contacts.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 py-16">
          <Users className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-[14px] text-muted-foreground">
            Aucun contact dans l&apos;annuaire.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {closeContacts.length > 0 && (
            <div className="space-y-2">
              <p className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
                Proches ({closeContacts.length})
              </p>
              {closeContacts.map((contact) => (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  onToggle={() => toggleClose(contact.id, contact.is_close)}
                />
              ))}
            </div>
          )}

          {otherContacts.length > 0 && (
            <div className="space-y-2">
              <p className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
                Autres contacts ({otherContacts.length})
              </p>
              {otherContacts.map((contact) => (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  onToggle={() => toggleClose(contact.id, contact.is_close)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContactRow({
  contact,
  onToggle,
}: {
  contact: Contact;
  onToggle: () => void;
}) {
  return (
    <div className="glass-card flex items-center gap-4 p-4">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-2xl text-[14px] font-bold",
          contact.is_close
            ? "bg-gradient-to-br from-yellow-400/20 to-amber-500/20 text-amber-600"
            : "bg-foreground/[0.06] text-muted-foreground"
        )}
      >
        {contact.first_name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-semibold truncate">
            {contact.first_name} {contact.last_name || ""}
          </p>
          {contact.is_close && (
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
          )}
        </div>
        <div className="flex gap-3 text-[12px] text-muted-foreground">
          {contact.email && <span className="truncate">{contact.email}</span>}
          {contact.phone && <span>{contact.phone}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "hidden sm:inline-block rounded-xl px-2.5 py-1 text-[11px] font-medium",
            contact.is_close
              ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
              : "bg-foreground/[0.06] text-muted-foreground"
          )}
        >
          {contact.is_close ? "Proche" : "Standard"}
        </span>
        <Switch
          checked={contact.is_close}
          onCheckedChange={onToggle}
        />
      </div>
    </div>
  );
}
