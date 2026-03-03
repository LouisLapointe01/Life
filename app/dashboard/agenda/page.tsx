"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isTomorrow, startOfDay, addDays, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  Star,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Filter,
  Search,
  BarChart3,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */
type Appointment = {
  id: string;
  type_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  start_at: string;
  end_at: string;
  message: string | null;
  status: string;
  is_close_contact: boolean;
  created_at: string;
  appointment_types: { name: string; color: string; duration_min: number };
};

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string; dot: string }
> = {
  pending: {
    label: "En attente",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    dot: "bg-amber-500",
  },
  confirmed: {
    label: "Confirmé",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10",
    dot: "bg-green-500",
  },
  cancelled: {
    label: "Annulé",
    color: "text-red-500 dark:text-red-400",
    bg: "bg-red-500/10",
    dot: "bg-red-500",
  },
};

/* ═══════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════ */
export default function AgendaPage() {
  const profile = useProfile();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");
  const [search, setSearch] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const isAdmin = profile?.role === "admin";

  const fetchAppointments = useCallback(async () => {
    const supabase = createClient();
    // Les guests ne voient que leurs RDV (RLS Supabase + filtre local)
    const { data } = await supabase
      .from("appointments")
      .select("*, appointment_types(name, color, duration_min)")
      .order("start_at", { ascending: true });

    if (data) setAppointments(data as Appointment[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    const supabase = createClient();

    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);

    if (!error) {
      // Envoyer email de confirmation ou d'annulation au guest
      await fetch("/api/appointments/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: id,
          action: status,
        }),
      });
      await fetchAppointments();
    }
    setActionLoading(null);
  };

  // ─── Computed Data ───
  const now = new Date();

  const stats = useMemo(() => {
    const upcoming = appointments.filter(
      (a) => new Date(a.start_at) >= now && a.status !== "cancelled"
    );
    const pending = appointments.filter((a) => a.status === "pending");
    const todayAppts = appointments.filter((a) =>
      isToday(new Date(a.start_at)) && a.status !== "cancelled"
    );
    return {
      total: upcoming.length,
      pending: pending.length,
      today: todayAppts.length,
      confirmed: appointments.filter((a) => a.status === "confirmed").length,
    };
  }, [appointments, now]);

  // Mini calendar: 7 jours
  const weekDays = useMemo(() => {
    const start = startOfDay(selectedDate);
    const dayOffset = start.getDay() === 0 ? -6 : 1 - start.getDay(); // week starts Monday
    const monday = addDays(start, dayOffset);
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [selectedDate]);

  const appointmentsForDay = useMemo(() => {
    return appointments
      .filter((a) => isSameDay(new Date(a.start_at), selectedDate))
      .filter((a) => filter === "all" || a.status === filter)
      .filter(
        (a) =>
          !search ||
          a.guest_name.toLowerCase().includes(search.toLowerCase()) ||
          a.guest_email.toLowerCase().includes(search.toLowerCase())
      );
  }, [appointments, selectedDate, filter, search]);

  const appointmentCountForDay = useCallback(
    (day: Date) =>
      appointments.filter(
        (a) => isSameDay(new Date(a.start_at), day) && a.status !== "cancelled"
      ).length,
    [appointments]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 lg:space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Agenda</h2>
          <p className="mt-1 text-[14px] lg:text-[15px] text-muted-foreground">
            Gérez vos rendez-vous et confirmez les demandes.
          </p>
        </div>
        <Link
          href="/rdv"
          target="_blank"
          className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:-translate-y-0.5"
        >
          <ExternalLink className="h-4 w-4" />
          <span className="hidden sm:inline">Page de réservation</span>
          <span className="sm:hidden">Réserver</span>
        </Link>
      </div>

      {/* ─── Stats Cards ─── */}
      <div
        className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
      >
        {[
          {
            label: "Aujourd'hui",
            value: stats.today,
            icon: CalendarDays,
            color: "text-blue-500",
            gradient: "from-blue-500/20 to-blue-600/20",
          },
          {
            label: "En attente",
            value: stats.pending,
            icon: Clock,
            color: "text-amber-500",
            gradient: "from-amber-500/20 to-amber-600/20",
          },
          {
            label: "Confirmés",
            value: stats.confirmed,
            icon: CheckCircle2,
            color: "text-green-500",
            gradient: "from-green-500/20 to-green-600/20",
          },
          {
            label: "À venir",
            value: stats.total,
            icon: TrendingUp,
            color: "text-purple-500",
            gradient: "from-purple-500/20 to-purple-600/20",
          },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-5">
            <div className="flex items-center justify-between">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient}`}
              >
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold">{stat.value}</p>
            <p className="text-[12px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ─── Main Content ─── */}
      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6"
      >
        {/* ── Left: Calendar + List ── */}
        <div className={cn("space-y-4", selectedAppointment ? "hidden lg:block lg:col-span-8" : "lg:col-span-8")}>
          {/* Week Navigation */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSelectedDate((d) => addDays(d, -7))}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h3 className="text-[15px] font-semibold">
                {format(weekDays[0], "d MMM", { locale: fr })} —{" "}
                {format(weekDays[6], "d MMM yyyy", { locale: fr })}
              </h3>
              <button
                onClick={() => setSelectedDate((d) => addDays(d, 7))}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const count = appointmentCountForDay(day);
                const isSelected = isSameDay(day, selectedDate);
                const isTodayDay = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "relative flex flex-col items-center gap-1 rounded-2xl px-2 py-3 transition-all duration-300",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : isTodayDay
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-foreground/[0.04]"
                    )}
                  >
                    <span className="text-[11px] font-medium uppercase">
                      {format(day, "EEE", { locale: fr })}
                    </span>
                    <span className="text-lg font-bold">{format(day, "d")}</span>
                    {count > 0 && (
                      <div
                        className={cn(
                          "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                          isSelected
                            ? "bg-white/25 text-white"
                            : "bg-primary/15 text-primary"
                        )}
                      >
                        {count}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters bar */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher un rendez-vous..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full glass-input py-2.5 pl-10 pr-4 text-[13px]"
              />
            </div>
            <div className="flex gap-1 rounded-2xl bg-foreground/[0.04] p-1">
              {(
                [
                  { key: "all", label: "Tous" },
                  { key: "pending", label: "En attente" },
                  { key: "confirmed", label: "Confirmés" },
                  { key: "cancelled", label: "Annulés" },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-[12px] font-medium transition-all",
                    filter === f.key
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Appointments List */}
          <div className="space-y-2">
            <div className="px-1 text-[13px] font-semibold text-muted-foreground">
              {isToday(selectedDate)
                ? "Aujourd'hui"
                : isTomorrow(selectedDate)
                  ? "Demain"
                  : format(selectedDate, "EEEE d MMMM", { locale: fr })}
              {" · "}
              {appointmentsForDay.length} rendez-vous
            </div>

            {appointmentsForDay.length === 0 ? (
              <div className="glass-card flex flex-col items-center gap-3 py-16">
                <Calendar className="h-12 w-12 text-muted-foreground/40" />
                <p className="text-[14px] text-muted-foreground">
                  Aucun rendez-vous ce jour.
                </p>
              </div>
            ) : (
              appointmentsForDay.map((apt) => {
                const config = statusConfig[apt.status] || statusConfig.pending;
                const isSelected = selectedAppointment?.id === apt.id;

                return (
                  <button
                    key={apt.id}
                    onClick={() => setSelectedAppointment(apt)}
                    className={cn(
                      "group w-full text-left rounded-2xl p-4 transition-all duration-300",
                      isSelected ? "glass-card shadow-lg" : "hover:bg-foreground/[0.04]"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Time column */}
                      <div className="flex flex-col items-center text-center min-w-[56px]">
                        <span className="text-lg font-bold">
                          {format(new Date(apt.start_at), "HH:mm")}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {apt.appointment_types.duration_min} min
                        </span>
                      </div>

                      {/* Color bar */}
                      <div
                        className="mt-1 h-12 w-1 rounded-full"
                        style={{
                          backgroundColor: apt.appointment_types.color,
                        }}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold truncate">
                            {apt.guest_name}
                          </span>
                          {apt.is_close_contact && (
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="text-[12px] font-medium"
                            style={{
                              color: apt.appointment_types.color,
                            }}
                          >
                            {apt.appointment_types.name}
                          </span>
                        </div>
                      </div>

                      {/* Status */}
                      <div
                        className={cn(
                          "flex items-center gap-1.5 rounded-xl px-2.5 py-1",
                          config.bg
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            config.dot
                          )}
                        />
                        <span
                          className={cn(
                            "text-[11px] font-medium",
                            config.color
                          )}
                        >
                          {config.label}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: Detail Panel ── */}
        <div className={cn(selectedAppointment ? "lg:col-span-4" : "hidden lg:block lg:col-span-4")}>
          {selectedAppointment ? (
            <AppointmentDetail
              appointment={selectedAppointment}
              onConfirm={() => updateStatus(selectedAppointment.id, "confirmed")}
              onCancel={() => updateStatus(selectedAppointment.id, "cancelled")}
              isLoading={actionLoading === selectedAppointment.id}
              onClose={() => setSelectedAppointment(null)}
              isAdmin={isAdmin}
            />
          ) : (
            <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 mb-4">
                <Calendar className="h-7 w-7 text-primary" />
              </div>
              <p className="text-[14px] font-medium">Aucun RDV sélectionné</p>
              <p className="mt-1 text-[12px] text-muted-foreground max-w-[200px]">
                Cliquez sur un rendez-vous pour voir les détails.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Detail Panel
   ═══════════════════════════════════════════════════════ */
function AppointmentDetail({
  appointment: apt,
  onConfirm,
  onCancel,
  isLoading,
  onClose,
  isAdmin,
}: {
  appointment: Appointment;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  onClose: () => void;
  isAdmin: boolean;
}) {
  const config = statusConfig[apt.status] || statusConfig.pending;

  return (
    <div className="glass-card overflow-hidden">
      {/* Header with appointment type color */}
      <div
        className="relative p-6"
        style={{
          background: `linear-gradient(135deg, ${apt.appointment_types.color}22, ${apt.appointment_types.color}08)`,
        }}
      >
        {/* Bouton fermer — croix sur desktop, flèche retour sur mobile */}
        <button
          onClick={onClose}
          className="absolute left-4 top-4 flex items-center gap-1.5 rounded-xl px-2 py-1 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors lg:hidden"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour
        </button>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors"
        >
          <XCircle className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: apt.appointment_types.color }}
          />
          <span
            className="text-[13px] font-semibold"
            style={{ color: apt.appointment_types.color }}
          >
            {apt.appointment_types.name}
          </span>
          {apt.is_close_contact && (
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
          )}
        </div>

        <h3 className="text-xl font-bold">{apt.guest_name}</h3>

        <div className={cn("mt-2 inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1", config.bg)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
          <span className={cn("text-[12px] font-medium", config.color)}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="p-6 space-y-5">
        {/* Date/Time */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
              <CalendarDays className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-[13px] font-medium">
                {format(new Date(apt.start_at), "EEEE d MMMM yyyy", {
                  locale: fr,
                })}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {format(new Date(apt.start_at), "HH:mm")} —{" "}
                {format(new Date(apt.end_at), "HH:mm")} ·{" "}
                {apt.appointment_types.duration_min} min
              </p>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Contact
          </p>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/[0.04]">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] truncate">{apt.guest_email}</p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(apt.guest_email)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>

          {apt.guest_phone && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/[0.04]">
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-[13px]">{apt.guest_phone}</p>
              </div>
              <button
                onClick={() =>
                  navigator.clipboard.writeText(apt.guest_phone!)
                }
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Message */}
        {apt.message && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Message
            </p>
            <div className="rounded-2xl bg-foreground/[0.03] p-4">
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
                {apt.message}
              </p>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="rounded-2xl bg-foreground/[0.03] p-3">
          <p className="text-[11px] text-muted-foreground">
            Réservé le{" "}
            {format(new Date(apt.created_at), "d MMMM yyyy 'à' HH:mm", {
              locale: fr,
            })}
          </p>
        </div>

        {/* Actions — admin seulement */}
        {apt.status === "pending" && isAdmin && (
          <div className="flex gap-2 pt-2">
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-green-500 px-4 py-3 text-[13px] font-semibold text-white shadow-lg shadow-green-500/25 transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Confirmer
            </button>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded-2xl bg-foreground/[0.06] px-4 py-3 text-[13px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Refuser
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
