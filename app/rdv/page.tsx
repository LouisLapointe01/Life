"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarDays,
  Clock,
  User,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AppointmentType = {
  id: string;
  name: string;
  duration_min: number;
  color: string;
};

type Step = "type" | "date" | "slot" | "form" | "confirmation";

const stepLabels = ["Type", "Date", "Créneau", "Infos"];

export default function RdvPage() {
  const [step, setStep] = useState<Step>("type");
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [selectedType, setSelectedType] = useState<AppointmentType | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    message: "",
  });

  const stepIndex = (["type", "date", "slot", "form"] as const).indexOf(
    step as "type" | "date" | "slot" | "form"
  );

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("appointment_types")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data) setTypes(data);
      });
  }, []);

  const fetchSlots = useCallback(async (date: Date, typeId: string) => {
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const res = await fetch(
        `/api/appointments/available?date=${dateStr}&type_id=${typeId}`
      );
      const data = await res.json();
      setSlots(data.slots || []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date || !selectedType) return;
    setSelectedDate(date);
    fetchSlots(date, selectedType.id);
    setStep("slot");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !selectedSlot) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type_id: selectedType.id,
          start_at: selectedSlot,
          ...formData,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Une erreur est survenue");
        return;
      }

      setStep("confirmation");
    } catch {
      setError("Erreur de connexion");
    } finally {
      setSubmitting(false);
    }
  };

  const disabledDays = { before: new Date() };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ─── Header ─── */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5">
          <CalendarDays className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Prendre rendez-vous
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Choisissez un type de rendez-vous, une date et un créneau disponible.
        </p>
      </div>

      {/* ─── Step Indicator ─── */}
      {step !== "confirmation" && (
        <div className="flex items-center justify-center gap-1">
          {stepLabels.map((label, i) => {
            const isActive = stepIndex === i;
            const isPast = stepIndex > i;
            return (
              <div key={label} className="flex items-center gap-1">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-2xl text-[13px] font-bold transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-110"
                      : isPast
                        ? "bg-primary/15 text-primary"
                        : "bg-foreground/[0.06] text-muted-foreground"
                  )}
                >
                  {isPast ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 3 && (
                  <div
                    className={cn(
                      "h-[2px] w-10 rounded-full transition-colors duration-500",
                      isPast ? "bg-primary/40" : "bg-foreground/[0.08]"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Step 1: Type ─── */}
      {step === "type" && (
        <div className="space-y-3 animate-slide-up">
          <p className="text-center text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">
            Choisissez un type
          </p>

          {types.length === 0 ? (
            <div className="glass-card flex flex-col items-center gap-3 py-16">
              <CalendarDays className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-[14px] text-muted-foreground">
                Aucun type disponible pour le moment.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {types.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setSelectedType(type);
                    setStep("date");
                  }}
                  className="group glass-card flex items-center gap-4 p-5 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${type.color}30, ${type.color}10)`,
                    }}
                  >
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: type.color }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-semibold">{type.name}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {type.duration_min} minutes
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Step 2: Date ─── */}
      {step === "date" && (
        <div className="space-y-4 animate-slide-up">
          {/* Selected type recap */}
          {selectedType && (
            <div className="mx-auto flex w-fit items-center gap-2 rounded-2xl bg-foreground/[0.04] px-4 py-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: selectedType.color }}
              />
              <span className="text-[13px] font-medium">
                {selectedType.name}
              </span>
              <span className="text-[12px] text-muted-foreground">
                · {selectedType.duration_min} min
              </span>
            </div>
          )}

          <div className="glass-card overflow-hidden">
            <div className="p-6">
              <p className="mb-4 text-center text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">
                Choisissez une date
              </p>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={disabledDays}
                  locale={fr}
                  className="rounded-2xl"
                />
              </div>
            </div>

            <div className="border-t border-foreground/[0.06] px-6 py-4">
              <button
                onClick={() => {
                  setStep("type");
                  setSelectedType(null);
                }}
                className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 3: Slot ─── */}
      {step === "slot" && (
        <div className="space-y-4 animate-slide-up">
          {/* Recap pills */}
          <div className="mx-auto flex w-fit flex-wrap items-center justify-center gap-2">
            {selectedType && (
              <div className="flex items-center gap-2 rounded-2xl bg-foreground/[0.04] px-3 py-1.5">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: selectedType.color }}
                />
                <span className="text-[12px] font-medium">
                  {selectedType.name}
                </span>
              </div>
            )}
            {selectedDate && (
              <div className="flex items-center gap-1.5 rounded-2xl bg-foreground/[0.04] px-3 py-1.5">
                <CalendarDays className="h-3 w-3 text-muted-foreground" />
                <span className="text-[12px] font-medium">
                  {format(selectedDate, "d MMMM yyyy", { locale: fr })}
                </span>
              </div>
            )}
          </div>

          <div className="glass-card overflow-hidden">
            <div className="p-6">
              <p className="mb-5 text-center text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">
                Créneaux disponibles
              </p>

              {loadingSlots ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
              ) : slots.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <Clock className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-[14px] text-muted-foreground">
                    Aucun créneau disponible pour cette date.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => {
                        setSelectedSlot(slot);
                        setStep("form");
                      }}
                      className="rounded-2xl bg-foreground/[0.04] px-3 py-3 text-[14px] font-semibold transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5"
                    >
                      {format(new Date(slot), "HH:mm")}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-foreground/[0.06] px-6 py-4">
              <button
                onClick={() => {
                  setStep("date");
                  setSelectedSlot(null);
                }}
                className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 4: Form ─── */}
      {step === "form" && (
        <div className="space-y-4 animate-slide-up">
          {/* Recap pills */}
          <div className="mx-auto flex w-fit flex-wrap items-center justify-center gap-2">
            {selectedType && (
              <div className="flex items-center gap-2 rounded-2xl bg-foreground/[0.04] px-3 py-1.5">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: selectedType.color }}
                />
                <span className="text-[12px] font-medium">
                  {selectedType.name}
                </span>
              </div>
            )}
            {selectedDate && (
              <div className="flex items-center gap-1.5 rounded-2xl bg-foreground/[0.04] px-3 py-1.5">
                <CalendarDays className="h-3 w-3 text-muted-foreground" />
                <span className="text-[12px] font-medium">
                  {format(selectedDate, "d MMMM", { locale: fr })}
                </span>
              </div>
            )}
            {selectedSlot && (
              <div className="flex items-center gap-1.5 rounded-2xl bg-foreground/[0.04] px-3 py-1.5">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-[12px] font-medium">
                  {format(new Date(selectedSlot), "HH:mm")}
                </span>
              </div>
            )}
          </div>

          <div className="glass-card overflow-hidden">
            <div className="p-6">
              <p className="mb-5 text-center text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">
                Vos informations
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-[13px] font-medium">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    Nom complet <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    value={formData.guest_name}
                    onChange={(e) =>
                      setFormData((d) => ({
                        ...d,
                        guest_name: e.target.value,
                      }))
                    }
                    placeholder="Jean Dupont"
                    className="glass-input w-full py-3 px-4 text-[14px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-[13px] font-medium">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.guest_email}
                    onChange={(e) =>
                      setFormData((d) => ({
                        ...d,
                        guest_email: e.target.value,
                      }))
                    }
                    placeholder="jean@exemple.com"
                    className="glass-input w-full py-3 px-4 text-[14px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-[13px] font-medium">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.guest_phone}
                    onChange={(e) =>
                      setFormData((d) => ({
                        ...d,
                        guest_phone: e.target.value,
                      }))
                    }
                    placeholder="+33 6 12 34 56 78"
                    className="glass-input w-full py-3 px-4 text-[14px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-[13px] font-medium">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    Message
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, message: e.target.value }))
                    }
                    placeholder="Détails supplémentaires..."
                    rows={3}
                    className="glass-input w-full py-3 px-4 text-[14px] resize-none"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-[13px] text-red-500 font-medium">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep("slot")}
                    className="flex items-center gap-2 rounded-2xl bg-foreground/[0.06] px-5 py-3 text-[13px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Retour
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-[14px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Réserver
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── Confirmation ─── */}
      {step === "confirmation" && (
        <div className="animate-slide-up">
          <div className="glass-card flex flex-col items-center gap-5 py-14 px-8 text-center">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-green-400/20 to-green-500/20">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white shadow-lg shadow-green-500/30">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold">Rendez-vous réservé !</h2>
              <p className="mt-2 text-[14px] text-muted-foreground max-w-[340px]">
                Votre demande a bien été envoyée. Vous recevrez une
                confirmation prochainement.
              </p>
            </div>

            {selectedType && selectedDate && selectedSlot && (
              <div className="w-full max-w-xs rounded-2xl bg-foreground/[0.03] p-5 space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: selectedType.color }}
                  />
                  <span className="text-[14px] font-semibold">
                    {selectedType.name}
                  </span>
                </div>
                <p className="text-[13px] text-muted-foreground">
                  {format(selectedDate, "EEEE d MMMM yyyy", {
                    locale: fr,
                  })}{" "}
                  à {format(new Date(selectedSlot), "HH:mm")}
                </p>
              </div>
            )}

            <button
              onClick={() => {
                setStep("type");
                setSelectedType(null);
                setSelectedDate(undefined);
                setSelectedSlot(null);
                setFormData({
                  guest_name: "",
                  guest_email: "",
                  guest_phone: "",
                  message: "",
                });
              }}
              className="mt-2 rounded-2xl bg-foreground/[0.06] px-6 py-3 text-[13px] font-medium transition-all hover:bg-foreground/[0.1]"
            >
              Prendre un autre rendez-vous
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
