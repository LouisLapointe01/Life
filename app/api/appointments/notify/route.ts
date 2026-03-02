import { createClient } from "@/lib/supabase/server";
import { sendSMS } from "@/lib/twilio";
import { NextResponse } from "next/server";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export async function POST(request: Request) {
  try {
    const { appointment_id } = await request.json();

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
      .select("*, appointment_types(name)")
      .eq("id", appointment_id)
      .single();

    if (
      !appointment ||
      !appointment.is_close_contact ||
      !appointment.guest_phone
    ) {
      return NextResponse.json({ error: "SMS non applicable" }, { status: 400 });
    }

    const dateStr = format(
      new Date(appointment.start_at),
      "EEEE d MMMM yyyy 'à' HH:mm",
      { locale: fr }
    );

    const message = `Votre rendez-vous "${appointment.appointment_types.name}" du ${dateStr} est confirmé. À bientôt !`;

    const sent = await sendSMS(appointment.guest_phone, message);

    return NextResponse.json({ sent });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
