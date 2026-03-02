import { createClient } from "@/lib/supabase/server";
import { createAppointmentSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createAppointmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { type_id, guest_name, guest_email, guest_phone, start_at, message } =
      parsed.data;

    const supabase = await createClient();

    // Récupérer la durée du type de RDV
    const { data: appointmentType, error: typeError } = await supabase
      .from("appointment_types")
      .select("duration_min")
      .eq("id", type_id)
      .eq("is_active", true)
      .single();

    if (typeError || !appointmentType) {
      return NextResponse.json(
        { error: "Type de rendez-vous invalide" },
        { status: 400 }
      );
    }

    // Calculer end_at
    const startDate = new Date(start_at);
    const endDate = new Date(
      startDate.getTime() + appointmentType.duration_min * 60 * 1000
    );

    // Vérifier qu'il n'y a pas de conflit
    const { data: conflicts } = await supabase
      .from("appointments")
      .select("id")
      .neq("status", "cancelled")
      .lt("start_at", endDate.toISOString())
      .gt("end_at", startDate.toISOString());

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: "Ce créneau n'est plus disponible" },
        { status: 409 }
      );
    }

    // Vérifier si l'email correspond à un contact proche
    const { data: closeContact } = await supabase
      .from("contacts")
      .select("id, phone")
      .eq("email", guest_email)
      .eq("is_close", true)
      .single();

    const isCloseContact = !!closeContact;

    // Insérer le RDV
    const { data: appointment, error: insertError } = await supabase
      .from("appointments")
      .insert({
        type_id,
        guest_name,
        guest_email,
        guest_phone: guest_phone || closeContact?.phone || null,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        message: message || null,
        status: "pending",
        is_close_contact: isCloseContact,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Appointments] Erreur insertion:", insertError);
      return NextResponse.json(
        { error: "Erreur lors de la création du rendez-vous" },
        { status: 500 }
      );
    }

    return NextResponse.json(appointment, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
