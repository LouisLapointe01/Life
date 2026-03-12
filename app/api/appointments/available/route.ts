import { createAdminClient } from "@/lib/supabase/admin";
import { getGoogleBusySlots } from "@/lib/google-calendar";
import { NextResponse } from "next/server";

/**
 * GET /api/appointments/available?date=YYYY-MM-DD&type_id=UUID&user_ids=UUID,UUID,...
 * Retourne les créneaux disponibles.
 *
 * Moteur simplifié :
 * - Plage fixe 7:00 → 22:00 (toujours dispo sauf conflits)
 * - Conflits = RDV Life existants + événements Google Calendar
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const typeId = searchParams.get("type_id");
    const userIdsRaw = searchParams.get("user_ids") || searchParams.get("user_id");

    if (!date || !typeId) {
      return NextResponse.json({ error: "date et type_id requis" }, { status: 400 });
    }

    const targetDate = new Date(date + "T00:00:00");
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: "Format de date invalide" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Type de RDV
    const { data: aptType } = await supabase
      .from("appointment_types")
      .select("duration_min")
      .eq("id", typeId)
      .eq("is_active", true)
      .single();

    if (!aptType) {
      return NextResponse.json({ error: "Type de RDV invalide" }, { status: 400 });
    }

    const durationMs = aptType.duration_min * 60 * 1000;
    const dayStart = date + "T00:00:00.000Z";
    const dayEnd = date + "T23:59:59.999Z";

    const userIds = userIdsRaw ? userIdsRaw.split(",").filter(Boolean) : [];

    type SlotInfo = {
      time: string;
      status: "available" | "busy";
      busy_users: string[];
    };

    // Plage fixe : 7:00 → 22:00
    const rangeStart = new Date(targetDate);
    rangeStart.setHours(7, 0, 0, 0);
    const rangeEnd = new Date(targetDate);
    rangeEnd.setHours(22, 0, 0, 0);

    // Récupérer les créneaux occupés par utilisateur (Life + Google)
    const busyByUser: Record<string, { start: number; end: number }[]> = {};

    for (const uid of userIds) {
      const busy: { start: number; end: number }[] = [];

      // RDV Life existants
      const { data: participations } = await supabase
        .from("appointment_participants")
        .select("appointment_id, appointments!inner(start_at, end_at, status)")
        .eq("user_id", uid)
        .neq("status", "declined");

      for (const p of participations || []) {
        const a = p.appointments as unknown as { start_at: string; end_at: string; status: string };
        if (a.status === "cancelled") continue;
        const s = new Date(a.start_at);
        const e = new Date(a.end_at);
        if (s.toISOString() >= dayEnd || e.toISOString() <= dayStart) continue;
        busy.push({ start: s.getTime(), end: e.getTime() });
      }

      // Événements Google Calendar (tous calendriers, filtrés pour éviter les doublons)
      const googleBusy = await getGoogleBusySlots(uid, dayStart, dayEnd);
      const { data: syncedEvents } = await supabase
        .from("appointments")
        .select("google_event_id, start_at, end_at")
        .eq("requester_id", uid)
        .not("google_event_id", "is", null)
        .gte("start_at", dayStart)
        .lte("start_at", dayEnd);

      const syncedTimes = new Set(
        (syncedEvents || []).map((e) => `${new Date(e.start_at).getTime()}-${new Date(e.end_at).getTime()}`)
      );

      for (const gb of googleBusy) {
        const key = `${gb.start}-${gb.end}`;
        if (!syncedTimes.has(key)) {
          busy.push(gb);
        }
      }

      busyByUser[uid] = busy;
    }

    // Générer les créneaux
    const slots: SlotInfo[] = [];
    let current = rangeStart.getTime();

    while (current + durationMs <= rangeEnd.getTime()) {
      const slotEnd = current + durationMs;
      const busyUsers: string[] = [];

      for (const uid of userIds) {
        const userBusy = busyByUser[uid] || [];
        const hasConflict = userBusy.some((b) => current < b.end && slotEnd > b.start);
        if (hasConflict) busyUsers.push(uid);
      }

      slots.push({
        time: new Date(current).toISOString(),
        status: busyUsers.length > 0 ? "busy" : "available",
        busy_users: busyUsers,
      });

      current += 30 * 60 * 1000; // step 30 min
    }

    return NextResponse.json({ slots });
  } catch (err) {
    console.error("[GET /api/appointments/available]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
