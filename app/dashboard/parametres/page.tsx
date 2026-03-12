"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { clientCache } from "@/lib/client-cache";
import { useProfile } from "@/hooks/use-profile";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Loader2,
  Users,
  CalendarDays,
  Star,
  Palette,
  LayoutGrid,
  Smartphone,
  Lock,
  ArrowUp,
  ArrowDown,
  Bell,
  BellOff,
  BellRing,
  RefreshCw,
  Unlink,
  Link2,
} from "lucide-react";
import {
  subscribeToPush,
  unsubscribeFromPush,
  getPushStatus,
} from "@/components/dashboard/PushNotificationManager";
import {
  ALL_TABS,
  useDashboardTabs,
  useVisibleTabs,
  useHiddenTabs,
  useMobileVisibleTabs,
  type TabId,
} from "@/lib/stores/dashboard-tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

type Contact = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  is_close: boolean;
};

type Tab = "types" | "contacts" | "sections" | "notifications" | "google";

const tabs: { key: Tab; label: string; icon: typeof CalendarDays }[] = [
  { key: "sections", label: "Sections", icon: LayoutGrid },
  { key: "notifications", label: "Notifs", icon: Bell },
  { key: "types", label: "Types RDV", icon: CalendarDays },
  { key: "google", label: "Google", icon: RefreshCw },
  { key: "contacts", label: "Proches", icon: Users },
];

/* ═══════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════ */

export default function ParametresPage() {
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState<Tab>("types");
  const [compactMobileTabs, setCompactMobileTabs] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 430px)");
    const updateCompactTabs = (event?: MediaQueryListEvent) => {
      setCompactMobileTabs(event ? event.matches : mediaQuery.matches);
    };

    updateCompactTabs();
    mediaQuery.addEventListener("change", updateCompactTabs);

    return () => {
      mediaQuery.removeEventListener("change", updateCompactTabs);
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 pb-16 lg:pb-24">
      <section className="premium-panel overflow-hidden p-5 sm:p-7">
        <div className="premium-grid absolute inset-0 opacity-40" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Paramètres
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Une zone de configuration plus claire et mieux hiérarchisée.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Les réglages clés sont maintenant présentés comme de vrais modules, plus cohérents avec le reste du dashboard.
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-white/55 p-4 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:bg-white/[0.04]">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Onglet actif</p>
            <p className="mt-2 text-lg font-semibold tracking-tight">{tabs.find((tab) => tab.key === activeTab)?.label}</p>
          </div>
        </div>
      </section>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full"
        >
          {activeTab === "sections" && <DashboardSectionsSettings />}
          {activeTab === "notifications" && <NotificationsSettings />}
          {activeTab === "types" && (
            profile?.id ? <AppointmentTypesSection userId={profile.id} /> : (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
            )
          )}
          {activeTab === "google" && (
            profile?.id ? <GoogleCalendarSection userId={profile.id} /> : (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
            )
          )}
          {activeTab === "contacts" && <ContactsSection />}
        </motion.div>
      </AnimatePresence>

      {/* Tab Navigation — pill flottant (mobile + pc) */}
      <div className="fixed bottom-[4.5rem] left-0 right-0 z-40 pointer-events-none flex justify-center items-end px-2 lg:bottom-4 lg:left-[260px] lg:right-0 lg:px-0">
        <div className="pointer-events-auto flex max-w-full items-center gap-0.5 rounded-[1.35rem] border border-white/10 bg-white/65 px-1 py-1 shadow-[0_22px_50px_-32px_rgba(15,23,42,0.6)] backdrop-blur-2xl dark:bg-white/[0.05] dark:border-white/[0.08]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                aria-label={tab.label}
                title={tab.label}
                className={cn(
                  "relative flex items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-medium transition-colors duration-200 whitespace-nowrap",
                  compactMobileTabs ? "px-2.5" : "px-3",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="params-tab-active"
                    className="absolute inset-0 rounded-xl bg-white shadow-sm dark:bg-white/[0.08]"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <tab.icon className="relative z-10 h-3.5 w-3.5 shrink-0" />
                <span className="relative z-10 hidden sm:inline">{tab.label}</span>
                {!compactMobileTabs && (
                  <span className="relative z-10 sm:hidden">{tab.label.split(" ")[0]}</span>
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
    visibleTabs: visibleIds,
    mobileTabs: mobileIds,
  } = useDashboardTabs();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/20">
          <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />
        </div>
        <div className="min-w-0">
          <h3 className="text-[14px] sm:text-[16px] font-semibold truncate">Sections du dashboard</h3>
          <p className="text-[11px] sm:text-[12px] text-muted-foreground truncate">
            Choisissez les sections visibles et leur ordre.
          </p>
        </div>
      </div>

      {/* Sections sidebar (visibles) */}
      <div className="space-y-2">
        <p className="text-[11px] sm:text-[12px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
          Sidebar — Visible ({visibleTabs.length})
        </p>
        <div className="space-y-1.5">
          {visibleTabs.map((tab, index) => (
            <div
              key={tab.id}
              className="premium-panel-soft flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3.5"
            >
              {/* Icon du tab */}
              <div
                className={cn(
                  "flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br",
                  tab.color
                )}
              >
                <tab.icon className={cn("h-3.5 w-3.5 sm:h-4.5 sm:w-4.5", tab.iconColor)} />
              </div>

              {/* Nom */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <p className="text-[13px] sm:text-[14px] font-semibold truncate">
                    {tab.label}
                  </p>
                  {tab.locked && (
                    <span className="hidden sm:flex items-center gap-1 rounded-lg bg-foreground/[0.06] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      <Lock className="h-2.5 w-2.5" />
                      Fixe
                    </span>
                  )}
                </div>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                  {tab.href}
                </p>
              </div>

              {/* Actions: réordonner + supprimer */}
              <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                <button
                  onClick={() => index > 0 && moveTab(index, index - 1)}
                  disabled={index === 0}
                  className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-foreground/[0.06] hover:text-foreground disabled:opacity-30"
                >
                  <ArrowUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </button>
                <button
                  onClick={() =>
                    index < visibleTabs.length - 1 &&
                    moveTab(index, index + 1)
                  }
                  disabled={index === visibleTabs.length - 1}
                  className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-foreground/[0.06] hover:text-foreground disabled:opacity-30"
                >
                  <ArrowDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </button>
                <div className="w-6 sm:w-7" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Barre mobile */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[11px] sm:text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">
            Barre mobile (max 8)
          </p>
        </div>
        <p className="text-[11px] sm:text-[12px] text-muted-foreground px-1">
          Sélectionnez jusqu&apos;à 8 sections pour la navigation mobile.
        </p>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2">
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
                  "flex flex-col items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 transition-all duration-200",
                  isInMobile
                    ? "premium-panel shadow-sm ring-2 ring-primary/20"
                    : "bg-foreground/[0.03] hover:bg-foreground/[0.06]",
                  !isVisible && "opacity-30 cursor-not-allowed"
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br",
                    tab.color
                  )}
                >
                  <tab.icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", tab.iconColor)} />
                </div>
                <span className="text-[10px] sm:text-[11px] font-medium text-center leading-tight">{tab.label}</span>
                {isInMobile && (
                  <span className="rounded-lg bg-primary/10 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-primary">
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

function AppointmentTypesSection({ userId }: { userId?: string }) {
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
    const cacheKey = `appt-types:${userId || ""}`;
    const cached = clientCache.get<AppointmentType[]>(cacheKey);
    if (cached) { setTypes(cached); setLoading(false); }
    try {
      const url = userId
        ? `/api/appointments/types?user_id=${userId}&all=true`
        : `/api/appointments/types?all=true`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTypes(data);
        clientCache.set(cacheKey, data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const addType = async () => {
    if (!form.name.trim()) { toast.error("Le nom est requis."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/appointments/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          duration_min: parseInt(form.duration_min) || 30,
          color: form.color,
          sort_order: types.length,
          user_id: userId || null,
        }),
      });
      if (res.ok) {
        setForm({ name: "", duration_min: "30", color: "#007AFF" });
        setDialogOpen(false);
        toast.success("Type créé avec succès !");
        await fetchTypes();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erreur lors de la création du type.");
      }
    } catch {
      toast.error("Erreur de connexion au serveur.");
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, is_active: !is_active } : t)));
    try {
      const res = await fetch("/api/appointments/types", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: !is_active }),
      });
      if (!res.ok) {
        setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, is_active } : t)));
        toast.error("Erreur lors de la modification.");
      }
    } catch {
      setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, is_active } : t)));
      toast.error("Erreur de connexion.");
    }
  };

  const deleteType = async (id: string) => {
    const original = [...types];
    setTypes((prev) => prev.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/appointments/types?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Type supprimé.");
      } else {
        setTypes(original);
        toast.error("Erreur lors de la suppression.");
      }
    } catch {
      setTypes(original);
      toast.error("Erreur de connexion.");
    }
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
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20">
          <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
        </div>
        <div className="min-w-0">
          <h3 className="text-[14px] sm:text-[16px] font-semibold truncate">Types de rendez-vous</h3>
          <p className="text-[11px] sm:text-[12px] text-muted-foreground">
            {types.length} type{types.length > 1 ? "s" : ""} configuré
            {types.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* FAB Ajouter type */}
      <button
        onClick={() => setDialogOpen(true)}
        className="fixed bottom-28 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-foreground/10 backdrop-blur-xl text-muted-foreground shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95 border border-white/10 lg:bottom-14"
        aria-label="Ajouter un type"
        title="Ajouter un type"
      >
        <Plus className="h-5 w-5" />
      </button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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

      {/* List */}
      {types.length === 0 ? (
        <div className="premium-panel flex flex-col items-center gap-3 py-12 sm:py-16 px-4">
          <CalendarDays className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/40" />
          <p className="text-[13px] sm:text-[14px] text-muted-foreground text-center">
            Aucun type de rendez-vous. Créez-en un pour commencer.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 sm:space-y-2">
          {types.map((type) => (
            <div
              key={type.id}
              className="premium-panel-soft flex items-center gap-2.5 sm:gap-4 p-3 sm:p-4"
            >
              <div
                className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl"
                style={{
                  background: `linear-gradient(135deg, ${type.color}30, ${type.color}10)`,
                }}
              >
                <div
                  className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full"
                  style={{ backgroundColor: type.color }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] sm:text-[14px] font-semibold truncate">
                  {type.name}
                </p>
                <p className="text-[11px] sm:text-[12px] text-muted-foreground">
                  {type.duration_min} min
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
   Contacts proches
   ═══════════════════════════════════════════════════════ */

function ContactsSection() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    const cached = clientCache.get<Contact[]>("contacts-parametres");
    if (cached) { setContacts(cached); setLoading(false); }
    const supabase = createClient();
    const { data } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, phone, is_close")
      .order("first_name");
    if (data) { setContacts(data); clientCache.set("contacts-parametres", data); }
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
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20">
          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
        </div>
        <div className="min-w-0">
          <h3 className="text-[14px] sm:text-[16px] font-semibold">Contacts proches</h3>
          <p className="text-[11px] sm:text-[12px] text-muted-foreground">
            Les proches reçoivent un SMS à la confirmation du RDV.
          </p>
        </div>
      </div>

      {contacts.length === 0 ? (
        <div className="premium-panel flex flex-col items-center gap-3 py-12 sm:py-16 px-4">
          <Users className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/40" />
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

/* ═══════════════════════════════════════════════════════
   Notifications push
   ═══════════════════════════════════════════════════════ */

function NotificationsSettings() {
  const [status, setStatus] = useState<"granted" | "denied" | "default" | "unsupported" | "loading">("loading");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPushStatus().then(setStatus);
  }, []);

  const handleEnable = async () => {
    setSaving(true);
    const result = await subscribeToPush();
    if (result === "granted") {
      setStatus("granted");
      toast.success("Notifications activées !");
    } else if (result === "denied") {
      setStatus("denied");
      toast.error("Permission refusée. Modifie les paramètres de ton navigateur.");
    } else if (result === "unsupported") {
      toast.error("Ton navigateur ne supporte pas les notifications push.");
    } else {
      toast.error("Erreur lors de l'activation. Vérifie la console.");
    }
    setSaving(false);
  };

  const handleDisable = async () => {
    setSaving(true);
    await unsubscribeFromPush();
    setStatus("default");
    toast.success("Notifications désactivées.");
    setSaving(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/20">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-violet-500" />
        </div>
        <div className="min-w-0">
          <h3 className="text-[14px] sm:text-[16px] font-semibold">Notifications push</h3>
          <p className="text-[11px] sm:text-[12px] text-muted-foreground">
            Reçois des notifications même quand l&apos;app est fermée.
          </p>
        </div>
      </div>

      <div className="premium-panel p-4 sm:p-5 space-y-4">
        {status === "loading" && (
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-[13px] text-muted-foreground">Vérification…</span>
          </div>
        )}

        {status === "unsupported" && (
          <div className="flex items-center gap-3">
            <BellOff className="h-4 w-4 text-muted-foreground" />
            <span className="text-[13px] text-muted-foreground">
              Notifications non supportées par ce navigateur.
            </span>
          </div>
        )}

        {status === "denied" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 px-4 py-3">
              <BellOff className="h-4 w-4 shrink-0 text-red-500" />
              <p className="text-[12px] sm:text-[13px] text-red-500 font-medium">
                Permission bloquée dans le navigateur.
              </p>
            </div>
            <p className="text-[12px] text-muted-foreground px-1">
              Pour réactiver : icône 🔒 dans la barre d&apos;adresse → Notifications → Autoriser, puis recharge la page.
            </p>
          </div>
        )}

        {(status === "default" || status === "granted") && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {status === "granted" ? (
                <BellRing className="h-4 w-4 text-violet-500" />
              ) : (
                <Bell className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-[13px] sm:text-[14px] font-semibold">
                  {status === "granted" ? "Notifications activées" : "Notifications désactivées"}
                </p>
                <p className="text-[11px] sm:text-[12px] text-muted-foreground">
                  {status === "granted"
                    ? "Tu recevras une notif pour chaque nouveau message."
                    : "Active pour être notifié des nouveaux messages."}
                </p>
              </div>
            </div>
            <button
              onClick={status === "granted" ? handleDisable : handleEnable}
              disabled={saving}
              className={cn(
                "shrink-0 flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] sm:text-[13px] font-semibold transition-all disabled:opacity-50",
                status === "granted"
                  ? "bg-foreground/[0.06] text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                  : "bg-violet-500 text-white shadow-lg shadow-violet-500/25 hover:bg-violet-600"
              )}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : status === "granted" ? (
                <BellOff className="h-3.5 w-3.5" />
              ) : (
                <Bell className="h-3.5 w-3.5" />
              )}
              {status === "granted" ? "Désactiver" : "Activer"}
            </button>
          </div>
        )}
      </div>

      {status === "granted" && (
        <div className="premium-panel-soft p-4 sm:p-5 space-y-2">
          <p className="text-[11px] sm:text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">
            Ce qui déclenche une notification
          </p>
          <div className="space-y-2 pt-1">
            {[
              { icon: Bell, label: "Nouveau message reçu", desc: "Avec le contenu et la possibilité de répondre directement" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                  <item.icon className="h-3.5 w-3.5 text-violet-500" />
                </div>
                <div>
                  <p className="text-[12px] sm:text-[13px] font-medium">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
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
    <div className="premium-panel-soft flex items-center gap-2.5 sm:gap-4 p-3 sm:p-4">
      <div
        className={cn(
          "flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl text-[12px] sm:text-[14px] font-bold",
          contact.is_close
            ? "bg-gradient-to-br from-yellow-400/20 to-amber-500/20 text-amber-600"
            : "bg-foreground/[0.06] text-muted-foreground"
        )}
      >
        {contact.first_name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <p className="text-[13px] sm:text-[14px] font-semibold truncate">
            {contact.first_name} {contact.last_name || ""}
          </p>
          {contact.is_close && (
            <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
          )}
        </div>
        <div className="flex gap-2 sm:gap-3 text-[11px] sm:text-[12px] text-muted-foreground">
          {contact.email && <span className="truncate max-w-[120px] sm:max-w-none">{contact.email}</span>}
          {contact.phone && <span className="shrink-0">{contact.phone}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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

/* ═══════════════════════════════════════════════════════
   Google Calendar — Connexion & Sync & Calendriers importés
   ═══════════════════════════════════════════════════════ */

type GoogleSyncStatus = {
  connected: boolean;
  sync_enabled?: boolean;
  last_synced_at?: string | null;
  webhook_active?: boolean;
  calendar_id?: string;
  connected_since?: string;
};

type GoogleCalendarType = {
  id: string;
  name: string;
  color: string;
  google_calendar_id: string;
  is_active: boolean;
};

function GoogleCalendarSection({ userId }: { userId: string }) {
  const [status, setStatus] = useState<GoogleSyncStatus | null>(null);
  const [googleTypes, setGoogleTypes] = useState<GoogleCalendarType[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const [syncRes, typesRes] = await Promise.all([
        fetch("/api/google/sync"),
        fetch(`/api/appointments/types?user_id=${userId}&all=true`),
      ]);
      const syncData = await syncRes.json();
      setStatus(syncData);
      const typesData = await typesRes.json();
      const gTypes = (Array.isArray(typesData) ? typesData : [])
        .filter((t: AppointmentType & { google_calendar_id?: string }) => t.google_calendar_id);
      setGoogleTypes(gTypes);
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get("gcal_success") === "true") {
      toast.success("Google Calendar connecté !");
      window.history.replaceState({}, "", window.location.pathname);
      fetchStatus();
    } else if (params.get("gcal_error")) {
      toast.error(`Erreur Google Calendar : ${params.get("gcal_error")}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [fetchStatus]);

  const handleConnect = async () => {
    try {
      const res = await fetch("/api/google/auth");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Impossible de générer l'URL Google");
      }
    } catch (err) {
      console.error("Google auth error:", err);
      toast.error("Erreur de connexion Google");
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch("/api/google/auth", { method: "DELETE" });
      toast.success("Google Calendar déconnecté");
      setStatus({ connected: false });
      setGoogleTypes([]);
    } catch {
      toast.error("Erreur de déconnexion");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/google/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`Sync terminée — ${data.stats.pushed} envoyés, ${data.stats.pulled} reçus`);
        fetchStatus();
      } else {
        toast.error(data.error || "Erreur de synchronisation");
      }
    } catch {
      toast.error("Erreur de synchronisation");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20">
          <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
        </div>
        <div className="min-w-0">
          <h3 className="text-[14px] sm:text-[16px] font-semibold truncate">Google Calendar</h3>
          <p className="text-[11px] sm:text-[12px] text-muted-foreground truncate">
            Synchronisation bidirectionnelle avec vos agendas Google.
          </p>
        </div>
      </div>

      {/* Statut de connexion */}
      <div className="premium-panel-soft p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-3 w-3 rounded-full",
              status?.connected ? "bg-green-500" : "bg-gray-400"
            )} />
            <div>
              <p className="text-[13px] sm:text-[14px] font-semibold">
                {status?.connected ? "Connecté" : "Non connecté"}
              </p>
              {status?.connected && status.last_synced_at && (
                <p className="text-[11px] text-muted-foreground">
                  Dernière sync : {new Date(status.last_synced_at).toLocaleString("fr-FR")}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status?.connected ? (
              <>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-500/10 px-3 py-1.5 text-[12px] font-medium text-blue-600 transition-colors hover:bg-blue-500/20 disabled:opacity-50 dark:text-blue-400"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
                  Synchroniser
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-1.5 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-500/20 disabled:opacity-50 dark:text-red-400"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  Déconnecter
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                className="flex items-center gap-1.5 rounded-xl bg-blue-500/10 px-4 py-2 text-[12px] font-medium text-blue-600 transition-colors hover:bg-blue-500/20 dark:text-blue-400"
              >
                <Link2 className="h-3.5 w-3.5" />
                Connecter Google Calendar
              </button>
            )}
          </div>
        </div>

        {status?.connected && (
          <div className="mt-3 flex gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              {status.webhook_active ? (
                <><span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Webhook actif</>
              ) : (
                <><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Polling</>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Calendriers Google importés */}
      {status?.connected && googleTypes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <p className="text-[11px] sm:text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">
              Calendriers importés ({googleTypes.length})
            </p>
          </div>
          <p className="text-[11px] sm:text-[12px] text-muted-foreground px-1">
            Vos calendriers Google sont automatiquement importés comme types de RDV dans Life.
          </p>
          <div className="space-y-1.5">
            {googleTypes.map((gType) => (
              <div
                key={gType.id}
                className="premium-panel-soft flex items-center gap-3 p-3"
              >
                <div
                  className="h-6 w-6 rounded-lg shrink-0"
                  style={{ backgroundColor: gType.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] sm:text-[13px] font-medium truncate">
                    {gType.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {gType.google_calendar_id}
                  </p>
                </div>
                <span className={cn(
                  "rounded-lg px-2 py-0.5 text-[10px] font-medium",
                  gType.is_active
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-foreground/[0.06] text-muted-foreground"
                )}>
                  {gType.is_active ? "Actif" : "Inactif"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

