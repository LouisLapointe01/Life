"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Users,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LeafLogo } from "@/components/LeafLogo";
import { useRdvModal } from "@/contexts/rdv-modal-context";

type Contact = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  is_close: boolean;
};

type AppointmentType = {
  id: string;
  name: string;
  duration_min: number;
  color: string;
};

type SlotInfo = {
  time: string;
  status: "available" | "busy" | "unavailable";
};

type Step = "type" | "date" | "slot" | "form" | "confirmation";

const stepLabels = ["Type", "Date", "Créneau", "Infos"];

const emptyForm = {
  guest_name: "",
  guest_email: "",
  guest_phone: "",
  message: "",
};

export function RdvModal() {
  const { isOpen, close } = useRdvModal();

  const [step, setStep] = useState<Step>("type");
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [selectedType, setSelectedType] = useState<AppointmentType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const [isAdmin, setIsAdmin] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [showContactPicker, setShowContactPicker] = useState(false);

  /* Reset state when modal closes */
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep("type");
        setSelectedType(null);
        setSelectedDate(undefined);
        setSlots([]);
        setSelectedSlot(null);
        setFormData(emptyForm);
        setError(null);
        setShowContactPicker(false);
        setContactSearch("");
      }, 300); // after close animation
    }
  }, [isOpen]);

  /* Load types + admin contacts once */
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("appointment_types")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => { if (data) setTypes(data); });

    async function loadAdminData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role === "admin") {
        setIsAdmin(true);
        const { data: contactsData } = await supabase
          .from("contacts")
          .select("id, first_name, last_name, email, phone, is_close")
          .order("first_name");
        if (contactsData) setContacts(contactsData);
      }
    }
    loadAdminData();
  }, []);

  const fetchSlots = useCallback(async (date: Date, typeId: string) => {
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const res = await fetch(`/api/appointments/available?date=${dateStr}&type_id=${typeId}`);
      const data = await res.json();
      const raw = data.slots || [];
      setSlots(raw.map((s: { time: string; status?: string }) => ({
        time: s.time ?? s,
        status: s.status ?? "available",
      })));
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
        body: JSON.stringify({ type_id: selectedType.id, start_at: selectedSlot, ...formData }),
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

  const stepIndex = (["type", "date", "slot", "form"] as const).indexOf(
    step as "type" | "date" | "slot" | "form"
  );

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-lg w-full max-h-[92dvh] overflow-y-auto p-0 gap-0 rounded-3xl">
        <DialogHeader className="px-4 pt-4 pb-0 sm:px-6 sm:pt-6">
          <DialogTitle className="flex items-center gap-3 text-[18px]">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            Prendre rendez-vous
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-5 space-y-5">
          {/* Step indicator */}
          {step !== "confirmation" && (
            <div className="flex items-center justify-center gap-1">
              {stepLabels.map((label, i) => {
                const isActive = stepIndex === i;
                const isPast = stepIndex > i;
                return (
                  <div key={label} className="flex items-center gap-1">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-2xl text-[12px] font-bold transition-all duration-300",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-110"
                          : isPast
                            ? "bg-primary/15 text-primary"
                            : "bg-foreground/[0.06] text-muted-foreground"
                      )}
                    >
                      {isPast ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    {i < 3 && (
                      <div
                        className={cn(
                          "h-[2px] w-8 rounded-full transition-colors duration-500",
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
              <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Choisissez un type
              </p>
              {types.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <CalendarDays className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-[14px] text-muted-foreground">Aucun type disponible.</p>
                </div>
              ) : (
                <div className="grid gap-2.5">
                  {types.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => { setSelectedType(type); setStep("date"); }}
                      className="group premium-panel-soft flex items-center gap-4 p-4 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                    >
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-2xl"
                        style={{ background: `linear-gradient(135deg, ${type.color}30, ${type.color}10)` }}
                      >
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: type.color }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[14px] font-semibold">{type.name}</p>
                        <p className="text-[12px] text-muted-foreground">{type.duration_min} minutes</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Step 2: Date ─── */}
          {step === "date" && (
            <div className="space-y-4 animate-slide-up">
              {selectedType && (
                <div className="flex w-fit mx-auto items-center gap-2 rounded-2xl bg-foreground/[0.04] px-4 py-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedType.color }} />
                  <span className="text-[13px] font-medium">{selectedType.name}</span>
                  <span className="text-[12px] text-muted-foreground">· {selectedType.duration_min} min</span>
                </div>
              )}
              <div className="premium-panel overflow-hidden">
                <div className="p-5">
                  <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Choisissez une date
                  </p>
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      disabled={{ before: new Date() }}
                      locale={fr}
                      className="rounded-2xl"
                    />
                  </div>
                </div>
                <div className="border-t border-foreground/[0.06] px-5 py-3">
                  <button
                    onClick={() => { setStep("type"); setSelectedType(null); }}
                    className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" /> Retour
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 3: Slot ─── */}
          {step === "slot" && (
            <div className="space-y-4 animate-slide-up">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {selectedType && (
                  <div className="flex items-center gap-2 rounded-2xl bg-foreground/[0.04] px-3 py-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedType.color }} />
                    <span className="text-[12px] font-medium">{selectedType.name}</span>
                  </div>
                )}
                {selectedDate && (
                  <div className="flex items-center gap-1.5 rounded-2xl bg-foreground/[0.04] px-3 py-1.5">
                    <CalendarDays className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[12px] font-medium">{format(selectedDate, "d MMMM yyyy", { locale: fr })}</span>
                  </div>
                )}
              </div>
              <div className="premium-panel overflow-hidden">
                <div className="p-5">
                  <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Créneaux disponibles
                  </p>
                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-10">
                      <Clock className="h-9 w-9 text-muted-foreground/40" />
                      <p className="text-[14px] text-muted-foreground">Aucun créneau disponible.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {slots.map((slot) => (
                          <button
                            key={slot.time}
                            onClick={() => {
                              if (slot.status === "available") {
                                setSelectedSlot(slot.time);
                                setStep("form");
                              }
                            }}
                            disabled={slot.status !== "available"}
                            className={cn(
                              "rounded-2xl px-3 py-3 text-[14px] font-semibold transition-all duration-200 border",
                              slot.status === "available" &&
                                "bg-white dark:bg-white/95 text-foreground border-border shadow-sm hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 hover:border-primary cursor-pointer",
                              slot.status === "busy" &&
                                "bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20 cursor-not-allowed opacity-80",
                              slot.status === "unavailable" &&
                                "bg-muted/40 text-muted-foreground/40 border-transparent cursor-not-allowed"
                            )}
                          >
                            {format(new Date(slot.time), "HH:mm")}
                          </button>
                        ))}
                      </div>
                      {/* Légende */}
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <div className="h-3 w-3 rounded-md bg-white dark:bg-white/95 border border-border shadow-sm" />
                          <span>Disponible</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-3 w-3 rounded-md bg-red-500/15 border border-red-500/20" />
                          <span>Déjà pris</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-3 w-3 rounded-md bg-muted/40" />
                          <span>Non disponible</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="border-t border-foreground/[0.06] px-5 py-3">
                  <button
                    onClick={() => { setStep("date"); setSelectedSlot(null); }}
                    className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" /> Retour
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 4: Form ─── */}
          {step === "form" && (
            <div className="space-y-4 animate-slide-up">
              {/* Recap pills */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {selectedType && (
                  <div className="flex items-center gap-2 rounded-2xl bg-foreground/[0.04] px-3 py-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedType.color }} />
                    <span className="text-[12px] font-medium">{selectedType.name}</span>
                  </div>
                )}
                {selectedDate && (
                  <div className="flex items-center gap-1.5 rounded-2xl bg-foreground/[0.04] px-3 py-1.5">
                    <CalendarDays className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[12px] font-medium">{format(selectedDate, "d MMMM", { locale: fr })}</span>
                  </div>
                )}
                {selectedSlot && (
                  <div className="flex items-center gap-1.5 rounded-2xl bg-foreground/[0.04] px-3 py-1.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[12px] font-medium">{format(new Date(selectedSlot), "HH:mm")}</span>
                  </div>
                )}
              </div>

              {/* Contact picker (admin only) */}
              {isAdmin && contacts.length > 0 && (
                <div className="premium-panel overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Choisir depuis l&apos;annuaire
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowContactPicker(!showContactPicker)}
                        className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-[12px] font-medium text-primary transition-all hover:bg-primary/20"
                      >
                        <Users className="h-3.5 w-3.5" />
                        {showContactPicker ? "Masquer" : "Ouvrir"}
                      </button>
                    </div>
                    {showContactPicker && (
                      <div className="space-y-3 animate-slide-up">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input
                            value={contactSearch}
                            onChange={(e) => setContactSearch(e.target.value)}
                            placeholder="Rechercher un contact..."
                            className="glass-input w-full py-2.5 pl-9 pr-4 text-[13px]"
                          />
                        </div>
                        <div className="max-h-44 overflow-y-auto space-y-1">
                          {contacts
                            .filter((c) => {
                              const q = contactSearch.toLowerCase();
                              return !q || c.first_name.toLowerCase().includes(q) || (c.last_name ?? "").toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q);
                            })
                            .map((contact) => (
                              <button
                                key={contact.id}
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    guest_name: `${contact.first_name} ${contact.last_name ?? ""}`.trim(),
                                    guest_email: contact.email ?? "",
                                    guest_phone: contact.phone ?? "",
                                    message: formData.message,
                                  });
                                  setShowContactPicker(false);
                                  setContactSearch("");
                                }}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-foreground/[0.05]"
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/20 text-[12px] font-bold text-purple-600 dark:text-purple-400">
                                  {contact.first_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-semibold truncate">
                                    {contact.first_name} {contact.last_name ?? ""}
                                    {contact.is_close && <span className="ml-1.5 text-[10px] text-amber-500">⭐</span>}
                                  </p>
                                  {contact.email && <p className="text-[11px] text-muted-foreground truncate">{contact.email}</p>}
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                    {formData.guest_name && (
                      <div className="mt-3 flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
                          {formData.guest_name.charAt(0).toUpperCase()}
                        </div>
                        <p className="flex-1 text-[13px] font-medium truncate">{formData.guest_name}</p>
                        <button
                          type="button"
                          onClick={() => setFormData({ guest_name: "", guest_email: "", guest_phone: "", message: formData.message })}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="premium-panel overflow-hidden">
                <div className="p-5">
                  <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
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
                        onChange={(e) => setFormData((d) => ({ ...d, guest_name: e.target.value }))}
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
                        onChange={(e) => setFormData((d) => ({ ...d, guest_email: e.target.value }))}
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
                        onChange={(e) => setFormData((d) => ({ ...d, guest_phone: e.target.value }))}
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
                        onChange={(e) => setFormData((d) => ({ ...d, message: e.target.value }))}
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
                    <div className="flex gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setStep("slot")}
                        className="flex items-center gap-2 rounded-2xl bg-foreground/[0.06] px-5 py-3 text-[13px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground"
                      >
                        <ArrowLeft className="h-4 w-4" /> Retour
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-[14px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50"
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LeafLogo size={16} /> Réserver</>}
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
              <div className="flex flex-col items-center gap-5 py-8 text-center">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-green-400/20 to-green-500/20">
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                  </div>
                  <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white shadow-lg shadow-green-500/30">
                    <LeafLogo size={16} />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Rendez-vous réservé !</h2>
                  <p className="mt-2 text-[14px] text-muted-foreground max-w-[300px]">
                    Votre demande a bien été envoyée. Vous recevrez une confirmation prochainement.
                  </p>
                </div>
                {selectedType && selectedDate && selectedSlot && (
                  <div className="w-full max-w-xs rounded-2xl bg-foreground/[0.03] p-4 space-y-1.5">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedType.color }} />
                      <span className="text-[14px] font-semibold">{selectedType.name}</span>
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })} à {format(new Date(selectedSlot), "HH:mm")}
                    </p>
                  </div>
                )}
                <div className="flex gap-3 w-full max-w-xs">
                  <button
                    onClick={() => {
                      setStep("type");
                      setSelectedType(null);
                      setSelectedDate(undefined);
                      setSelectedSlot(null);
                      setFormData(emptyForm);
                    }}
                    className="flex-1 rounded-2xl bg-foreground/[0.06] px-5 py-3 text-[13px] font-medium transition-all hover:bg-foreground/[0.1]"
                  >
                    Nouveau RDV
                  </button>
                  <button
                    onClick={close}
                    className="flex-1 rounded-2xl bg-primary px-5 py-3 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:-translate-y-0.5"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
