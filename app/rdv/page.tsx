"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

type AppointmentType = {
  id: string;
  name: string;
  duration_min: number;
  color: string;
};

type Step = "type" | "date" | "slot" | "form" | "confirmation";

export default function RdvPage() {
  const [step, setStep] = useState<Step>("type");
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [selectedType, setSelectedType] = useState<AppointmentType | null>(null);
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

  // Charger les types de RDV
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

  // Charger les créneaux quand la date change
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

  // Dates passées désactivées
  const disabledDays = { before: new Date() };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Prendre rendez-vous
        </h1>
        <p className="mt-2 text-muted-foreground">
          Choisissez un type de rendez-vous, une date et un créneau disponible.
        </p>
      </div>

      {/* Indicateur d'étapes */}
      {step !== "confirmation" && (
        <div className="flex items-center justify-center gap-2">
          {(["type", "date", "slot", "form"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : (["type", "date", "slot", "form"] as const).indexOf(step) > i
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              {i < 3 && (
                <div className="h-px w-8 bg-border" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Étape 1 : Type de RDV */}
      {step === "type" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Type de rendez-vous
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {types.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Aucun type de rendez-vous disponible pour le moment.
              </p>
            )}
            {types.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setSelectedType(type);
                  setStep("date");
                }}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="font-medium">{type.name}</span>
                </div>
                <Badge variant="secondary">{type.duration_min} min</Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Étape 2 : Date */}
      {step === "date" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Choisir une date
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={disabledDays}
              locale={fr}
              className="rounded-xl border"
            />
          </CardContent>
          <div className="px-6 pb-4">
            <Button
              variant="ghost"
              onClick={() => {
                setStep("type");
                setSelectedType(null);
              }}
            >
              Retour
            </Button>
          </div>
        </Card>
      )}

      {/* Étape 3 : Créneau */}
      {step === "slot" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Choisir un créneau
              {selectedDate && (
                <Badge variant="secondary" className="ml-2">
                  {format(selectedDate, "d MMMM yyyy", { locale: fr })}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : slots.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucun créneau disponible pour cette date.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => {
                      setSelectedSlot(slot);
                      setStep("form");
                    }}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                      selectedSlot === slot
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary"
                    }`}
                  >
                    {format(new Date(slot), "HH:mm")}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
          <div className="px-6 pb-4">
            <Button
              variant="ghost"
              onClick={() => {
                setStep("date");
                setSelectedSlot(null);
              }}
            >
              Retour
            </Button>
          </div>
        </Card>
      )}

      {/* Étape 4 : Formulaire */}
      {step === "form" && (
        <Card>
          <CardHeader>
            <CardTitle>Vos informations</CardTitle>
            {selectedType && selectedDate && selectedSlot && (
              <p className="text-sm text-muted-foreground">
                {selectedType.name} — {format(selectedDate, "d MMMM yyyy", { locale: fr })} à{" "}
                {format(new Date(selectedSlot), "HH:mm")}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Nom complet *
                </Label>
                <Input
                  id="name"
                  required
                  value={formData.guest_name}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, guest_name: e.target.value }))
                  }
                  placeholder="Jean Dupont"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.guest_email}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, guest_email: e.target.value }))
                  }
                  placeholder="jean@exemple.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Téléphone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.guest_phone}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, guest_phone: e.target.value }))
                  }
                  placeholder="+33 6 12 34 56 78"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Message
                </Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, message: e.target.value }))
                  }
                  placeholder="Détails supplémentaires..."
                  rows={3}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("slot")}
                >
                  Retour
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Réserver"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Confirmation */}
      {step === "confirmation" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-bold">Rendez-vous réservé !</h2>
            <p className="text-center text-muted-foreground">
              Votre demande a été envoyée. Vous recevrez une confirmation
              prochainement.
            </p>
            {selectedType && selectedDate && selectedSlot && (
              <div className="mt-4 rounded-xl border border-border bg-muted/50 p-4 text-center">
                <p className="font-medium">{selectedType.name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })} à{" "}
                  {format(new Date(selectedSlot), "HH:mm")}
                </p>
              </div>
            )}
            <Button
              variant="outline"
              className="mt-4"
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
            >
              Prendre un autre rendez-vous
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
