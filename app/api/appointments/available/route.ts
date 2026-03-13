import { createAdminClient } from "@/lib/supabase/admin";
import { getGoogleBusySlots } from "@/lib/google-calendar";
import { NextResponse } from "next/server";

/**
 * GET /api/appointments/available?date=YYYY-MM-DD&type_id=UUID&user_ids=UUID,...&duration_min=N
 * Retourne les créneaux disponibles.
 *
 * Moteur refactorisé :
 * - Dispo 24/7 par défaut (plus de plage fixe 7h-22h)
 * - Conflits = RDV Life + Google Calendar (multi-comptes) + unavailabilities
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const typeId = searchParams.get("type_id");
    const userIdsRaw = searchParams.get("user_ids") || searchParams.get("user_id");
    const durationParam = searchParams.get("duration_min");

    if (!date || !typeId) {
      return NextResponse.json({ error: "date et type_id requis" }, { status: 400 });
    }

    const targetDate = new Date(date + "T00:00:00");
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: "Format de date invalide" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Type de RDV (duration_min peut être null maintenant)
    const { data: aptType } = await supabase
      .from("appointment_types")
      .select("duration_min")
      .eq("id", typeId)
      .eq("is_active", true)
      .single();

    if (!aptType) {
      return NextResponse.json({ error: "Type de RDV invalide" }, { status: 400 });
    }

    // Priorité : query param > type > défaut 30
    const durationMin = durationParam ? parseInt(durationParam) : (aptType.duration_min || 30);
    const durationMs = durationMin * 60 * 1000;
    const dayStart = date + "T00:00:00.000Z";
    const dayEnd = date + "T23:59:59.999Z";

    const userIds = userIdsRaw ? userIdsRaw.split(",").filter(Boolean) : [];

    type SlotInfo = {
      time: string;
      status: "available" | "busy";
      busy_users: string[];
    };

    // Plage : 00:00 → 23:59 (dispo 24/7, bloqué par unavailabilities)
    const rangeStart = new Date(targetDate);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(targetDate);
    rangeEnd.setHours(23, 59, 0, 0);

    // Récupérer les créneaux occupés par utilisateur (Life + Google + Unavailabilities)
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

      // Événements Google Calendar (tous comptes, tous calendriers)
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

      // Indisponibilités
      const unavailSlots = await getUnavailabilitySlots(supabase, uid, targetDate);
      busy.push(...unavailSlots);

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

/**
 * Calcule les plages d'indisponibilité pour un utilisateur sur une journée donnée.
 * Gère les règles ponctuelles et récurrentes, y compris le cas minuit (22h→7h).
 */
async function getUnavailabilitySlots(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  date: Date
): Promise<{ start: number; end: number }[]> {
  const { data: rules } = await supabase
    .from("unavailabilities")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (!rules || rules.length === 0) return [];

  const slots: { start: number; end: number }[] = [];
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const dayOfWeek = date.getDay(); // 0=dim..6=sam

  for (const rule of rules) {
    if (!rule.is_recurring) {
      // Ponctuel : intersection avec la journée
      if (!rule.start_at || !rule.end_at) continue;
      const rStart = new Date(rule.start_at);
      const rEnd = new Date(rule.end_at);
      // Vérifier chevauchement avec la journée
      if (rEnd.getTime() <= dayStart.getTime() || rStart.getTime() >= dayEnd.getTime()) continue;
      slots.push({
        start: Math.max(rStart.getTime(), dayStart.getTime()),
        end: Math.min(rEnd.getTime(), dayEnd.getTime()),
      });
    } else {
      // Récurrent : vérifier recurrence_days
      if (!rule.start_time || !rule.end_time) continue;
      const days: number[] | null = rule.recurrence_days;
      const matchesDay = !days || days.length === 0 || days.includes(dayOfWeek);
      if (!matchesDay) {
        // Vérifier si le jour précédent a une règle qui déborde sur aujourd'hui
        const prevDay = (dayOfWeek + 6) % 7;
        const prevMatches = !days || days.length === 0 || days.includes(prevDay);
        if (prevMatches) {
          const [sh, sm] = rule.start_time.split(":").map(Number);
          const [eh, em] = rule.end_time.split(":").map(Number);
          const startMin = sh * 60 + sm;
          const endMin = eh * 60 + em;
          // Cas minuit : start > end (ex: 22:00 → 07:00)
          if (endMin < startMin) {
            // La partie qui déborde sur aujourd'hui : 00:00 → end_time
            const blockEnd = new Date(date);
            blockEnd.setHours(eh, em, 0, 0);
            slots.push({
              start: dayStart.getTime(),
              end: blockEnd.getTime(),
            });
          }
        }
        continue;
      }

      const [sh, sm] = rule.start_time.split(":").map(Number);
      const [eh, em] = rule.end_time.split(":").map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      if (endMin > startMin) {
        // Cas normal : ex 09:00 → 17:00
        const blockStart = new Date(date);
        blockStart.setHours(sh, sm, 0, 0);
        const blockEnd = new Date(date);
        blockEnd.setHours(eh, em, 0, 0);
        slots.push({ start: blockStart.getTime(), end: blockEnd.getTime() });
      } else if (endMin < startMin) {
        // Cas minuit : ex 22:00 → 07:00 → split en 2 blocs
        // Bloc 1 : start_time → 23:59 (aujourd'hui)
        const block1Start = new Date(date);
        block1Start.setHours(sh, sm, 0, 0);
        const block1End = new Date(date);
        block1End.setHours(23, 59, 59, 999);
        slots.push({ start: block1Start.getTime(), end: block1End.getTime() });
        // Bloc 2 : 00:00 → end_time (demain, mais on gère via le check jour précédent ci-dessus)
      } else {
        // start == end → ignore
      }
    }
  }

  return slots;
}
