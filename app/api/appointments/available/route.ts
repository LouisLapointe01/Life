import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const typeId = searchParams.get("type_id");

    if (!date || !typeId) {
      return NextResponse.json(
        { error: "Les paramètres date et type_id sont requis" },
        { status: 400 }
      );
    }

    // Valider le format de la date
    const targetDate = new Date(date + "T00:00:00");
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { error: "Format de date invalide" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Récupérer la durée du type
    const { data: appointmentType } = await supabase
      .from("appointment_types")
      .select("duration_min")
      .eq("id", typeId)
      .eq("is_active", true)
      .single();

    if (!appointmentType) {
      return NextResponse.json(
        { error: "Type de rendez-vous invalide" },
        { status: 400 }
      );
    }

    // Jour de la semaine (0=dimanche)
    const dayOfWeek = targetDate.getDay();

    // Récupérer les règles de disponibilité pour ce jour
    const { data: rules } = await supabase
      .from("availability_rules")
      .select("start_time, end_time")
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true);

    if (!rules || rules.length === 0) {
      return NextResponse.json({ slots: [] });
    }

    // Récupérer les RDV existants pour cette date
    const dayStart = date + "T00:00:00.000Z";
    const dayEnd = date + "T23:59:59.999Z";

    const { data: existingAppointments } = await supabase
      .from("appointments")
      .select("start_at, end_at")
      .neq("status", "cancelled")
      .gte("start_at", dayStart)
      .lte("start_at", dayEnd);

    const booked = (existingAppointments || []).map((a) => ({
      start: new Date(a.start_at).getTime(),
      end: new Date(a.end_at).getTime(),
    }));

    // Calculer les créneaux disponibles
    const durationMs = appointmentType.duration_min * 60 * 1000;
    const slots: string[] = [];

    for (const rule of rules) {
      const [startH, startM] = rule.start_time.split(":").map(Number);
      const [endH, endM] = rule.end_time.split(":").map(Number);

      const ruleStart = new Date(targetDate);
      ruleStart.setHours(startH, startM, 0, 0);

      const ruleEnd = new Date(targetDate);
      ruleEnd.setHours(endH, endM, 0, 0);

      let current = ruleStart.getTime();

      while (current + durationMs <= ruleEnd.getTime()) {
        const slotEnd = current + durationMs;

        // Vérifier qu'il n'y a pas de conflit
        const hasConflict = booked.some(
          (b) => current < b.end && slotEnd > b.start
        );

        if (!hasConflict) {
          slots.push(new Date(current).toISOString());
        }

        // Avancer de 30 minutes (pas de créneau)
        current += 30 * 60 * 1000;
      }
    }

    return NextResponse.json({ slots });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
