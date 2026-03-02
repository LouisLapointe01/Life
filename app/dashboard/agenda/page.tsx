"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
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
} from "lucide-react";

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

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  pending: { label: "En attente", variant: "secondary" },
  confirmed: { label: "Confirmé", variant: "default" },
  cancelled: { label: "Annulé", variant: "destructive" },
};

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    const supabase = createClient();
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
      // Si confirmation d'un proche, envoyer SMS côté serveur
      const appointment = appointments.find((a) => a.id === id);
      if (
        status === "confirmed" &&
        appointment?.is_close_contact &&
        appointment?.guest_phone
      ) {
        await fetch("/api/appointments/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointment_id: id }),
        });
      }
      await fetchAppointments();
    }
    setActionLoading(null);
  };

  const now = new Date();
  const upcoming = appointments.filter(
    (a) => new Date(a.start_at) >= now && a.status !== "cancelled"
  );
  const past = appointments.filter(
    (a) => new Date(a.start_at) < now || a.status === "cancelled"
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
        <p className="text-muted-foreground">
          Gérez vos rendez-vous et confirmez les demandes.
        </p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            À venir ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Passés / Annulés ({past.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4 mt-4">
          {upcoming.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="mx-auto mb-3 h-10 w-10" />
                Aucun rendez-vous à venir.
              </CardContent>
            </Card>
          ) : (
            upcoming.map((apt) => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                onConfirm={() => updateStatus(apt.id, "confirmed")}
                onCancel={() => updateStatus(apt.id, "cancelled")}
                isLoading={actionLoading === apt.id}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4 mt-4">
          {past.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucun rendez-vous passé.
              </CardContent>
            </Card>
          ) : (
            past.map((apt) => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                isLoading={false}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AppointmentCard({
  appointment: apt,
  onConfirm,
  onCancel,
  isLoading,
}: {
  appointment: Appointment;
  onConfirm?: () => void;
  onCancel?: () => void;
  isLoading: boolean;
}) {
  const config = statusConfig[apt.status] || statusConfig.pending;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: apt.appointment_types.color }}
            />
            {apt.appointment_types.name}
            {apt.is_close_contact && (
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            )}
          </CardTitle>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {format(new Date(apt.start_at), "EEEE d MMMM yyyy 'à' HH:mm", {
              locale: fr,
            })}
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            {apt.guest_name}
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            {apt.guest_email}
          </div>
          {apt.guest_phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {apt.guest_phone}
            </div>
          )}
        </div>

        {apt.message && (
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
            <MessageSquare className="mt-0.5 h-4 w-4 text-muted-foreground" />
            {apt.message}
          </div>
        )}

        {apt.status === "pending" && onConfirm && onCancel && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={onConfirm}
              disabled={isLoading}
              className="gap-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Confirmer
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="gap-1"
            >
              <XCircle className="h-4 w-4" />
              Annuler
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
