import { createClient } from "@/lib/supabase/server";
import { sendSMS } from "@/lib/twilio";
import {
  sendConfirmationToGuest,
  sendCancellationToGuest,
} from "@/lib/mailjet";
import { NextResponse } from "next/server";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export async function POST(request: Request) {
  try {
    const { appointment_id, action } = await request.json();

    if (!appointment_id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const supabase = await createClient();

    // Vérifier que l'utilisateur est admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Récupérer le RDV avec le type
    const { data: appointment } = await supabase
      .from("appointments")
      .select("*, appointment_types(name, duration_min)")
      .eq("id", appointment_id)
      .single();

    if (!appointment) {
      return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
    }

    const results: { email?: boolean; sms?: boolean } = {};

    if (action === "cancelled") {
      // ─── Annulation : email au guest ───
      results.email = await sendCancellationToGuest({
        guestName: appointment.guest_name,
        guestEmail: appointment.guest_email,
        typeName: appointment.appointment_types.name,
        startAt: appointment.start_at,
      });
    } else {
      // ─── Confirmation : email au guest ───
      results.email = await sendConfirmationToGuest({
        guestName: appointment.guest_name,
        guestEmail: appointment.guest_email,
        typeName: appointment.appointment_types.name,
        startAt: appointment.start_at,
        endAt: appointment.end_at,
        durationMin: appointment.appointment_types.duration_min,
      });

      // ─── SMS au contact proche (si applicable) ───
      if (appointment.is_close_contact && appointment.guest_phone) {
        const dateStr = format(
          new Date(appointment.start_at),
          "EEEE d MMMM yyyy 'à' HH:mm",
          { locale: fr }
        );
        const smsMessage = `Votre rendez-vous "${appointment.appointment_types.name}" du ${dateStr} est confirmé. À bientôt !`;
        results.sms = await sendSMS(appointment.guest_phone, smsMessage);
      }
    }

    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
