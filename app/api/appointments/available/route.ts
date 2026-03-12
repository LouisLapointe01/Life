import { createAdminClient } from "@/lib/supabase/admin";
import { getGoogleBusySlots } from "@/lib/google-calendar";
import { NextResponse } from "next/server";

/**
 * GET /api/appointments/available?date=YYYY-MM-DD&type_id=UUID&user_ids=UUID,UUID,...
 * Retourne les créneaux avec 3 statuts :
 *   - available : tous les participants sont disponibles, pas de conflit
 *   - busy : dans les disponibilités mais un participant a déjà un RDV
 *   - unavailable : au moins un participant n'est pas disponible (hors règles)
 *
 * Moteur de disponibilité enrichi :
 * (Temps total) - (Événements Life) - (Événements Google) - (Plages d'indisponibilité paramétrées)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const typeId = searchParams.get("type_id");
    // Support both user_id (singular) and user_ids (plural)
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

    const dayOfWeek = targetDate.getDay();
    const durationMs = aptType.duration_min * 60 * 1000;
    const dayStart = date + "T00:00:00.000Z";
    const dayEnd = date + "T23:59:59.999Z";

    const userIds = userIdsRaw ? userIdsRaw.split(",").filter(Boolean) : [];

    type SlotInfo = {
      time: string;
      status: "available" | "busy" | "unavailable";
      busy_users: string[];
    };

    // 1. Récupérer les règles de disponibilité PAR utilisateur
    const rulesByUser: Record<string, { start_time: string; end_time: string }[]> = {};

    if (userIds.length > 0) {
      for (const uid of userIds) {
        const { data: userRules } = await supabase
          .from("availability_rules")
          .select("start_time, end_time")
          .eq("day_of_week", dayOfWeek)
          .eq("is_active", true)
          .eq("user_id", uid);

        if (userRules && userRules.length > 0) {
          rulesByUser[uid] = userRules;
        } else {
          // Fallback vers les règles globales
          const { data: globalRules } = await supabase
            .from("availability_rules")
            .select("start_time, end_time")
            .eq("day_of_week", dayOfWeek)
            .eq("is_active", true)
            .is("user_id", null);
          rulesByUser[uid] = globalRules || [];
        }
      }
    } else {
      // Pas d'utilisateur spécifié → règles globales
      const { data: globalRules } = await supabase
        .from("availability_rules")
        .select("start_time, end_time")
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true);
      rulesByUser["_global"] = globalRules || [];
    }

    // Collecter toutes les règles pour déterminer la plage horaire la plus large
    const allRules = Object.values(rulesByUser).flat();
    if (allRules.length === 0) {
      return NextResponse.json({ slots: [] });
    }

    // Trouver la plage horaire la plus large (union de toutes les règles)
    let earliestStart = "23:59";
    let latestEnd = "00:00";
    for (const rule of allRules) {
      if (rule.start_time < earliestStart) earliestStart = rule.start_time;
      if (rule.end_time > latestEnd) latestEnd = rule.end_time;
    }

    // 2. Récupérer les créneaux occupés par utilisateur (Life + Google + Indisponibilités)
    const busyByUser: Record<string, { start: number; end: number }[]> = {};

    for (const uid of userIds) {
      const busy: { start: number; end: number }[] = [];

      // 2a. RDV Life existants
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

      // 2b. Événements Google Calendar (seulement pour les events non-Life)
      const googleBusy = await getGoogleBusySlots(uid, dayStart, dayEnd);
      // Filtrer pour ne pas compter en double les events Life déjà syncés
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

      // 2c. Plages d'indisponibilité fixes
      const { data: unavailBlocks } = await supabase
        .from("unavailability_blocks")
        .select("start_time, end_time, day_of_week, specific_date, is_recurring")
        .eq("user_id", uid)
        .eq("is_active", true);

      for (const block of unavailBlocks || []) {
        const isApplicable =
          (block.is_recurring && (block.day_of_week === null || block.day_of_week === dayOfWeek)) ||
          (!block.is_recurring && block.specific_date === date);

        if (isApplicable) {
          const [bSH, bSM] = block.start_time.split(":").map(Number);
          const [bEH, bEM] = block.end_time.split(":").map(Number);
          const blockStart = new Date(targetDate);
          blockStart.setHours(bSH, bSM, 0, 0);
          const blockEnd = new Date(targetDate);
          blockEnd.setHours(bEH, bEM, 0, 0);
          busy.push({ start: blockStart.getTime(), end: blockEnd.getTime() });
        }
      }

      busyByUser[uid] = busy;
    }

    // 3. Générer les créneaux pour la plage complète
    const [startH, startM] = earliestStart.split(":").map(Number);
    const [endH, endM] = latestEnd.split(":").map(Number);

    const rangeStart = new Date(targetDate);
    rangeStart.setHours(startH, startM, 0, 0);
    const rangeEnd = new Date(targetDate);
    rangeEnd.setHours(endH, endM, 0, 0);

    // Helper : vérifie si un créneau est dans les règles d'un utilisateur
    function isWithinRules(
      slotStart: number,
      slotEnd: number,
      rules: { start_time: string; end_time: string }[]
    ): boolean {
      return rules.some((rule) => {
        const [rSH, rSM] = rule.start_time.split(":").map(Number);
        const [rEH, rEM] = rule.end_time.split(":").map(Number);
        const ruleStart = new Date(targetDate);
        ruleStart.setHours(rSH, rSM, 0, 0);
        const ruleEnd = new Date(targetDate);
        ruleEnd.setHours(rEH, rEM, 0, 0);
        return slotStart >= ruleStart.getTime() && slotEnd <= ruleEnd.getTime();
      });
    }

    const slots: SlotInfo[] = [];
    let current = rangeStart.getTime();

    while (current + durationMs <= rangeEnd.getTime()) {
      const slotEnd = current + durationMs;

      const unavailableUsers: string[] = [];
      const busyUsers: string[] = [];

      if (userIds.length > 0) {
        for (const uid of userIds) {
          const rules = rulesByUser[uid] || [];
          if (!isWithinRules(current, slotEnd, rules)) {
            unavailableUsers.push(uid);
          } else {
            // Vérifier les conflits (RDV Life + Google + indisponibilités)
            const userBusy = busyByUser[uid] || [];
            const hasConflict = userBusy.some((b) => current < b.end && slotEnd > b.start);
            if (hasConflict) busyUsers.push(uid);
          }
        }
      } else {
        // Pas d'utilisateurs → vérifier les règles globales
        const rules = rulesByUser["_global"] || [];
        if (!isWithinRules(current, slotEnd, rules)) {
          unavailableUsers.push("_global");
        }
      }

      let status: "available" | "busy" | "unavailable";
      if (unavailableUsers.length > 0) {
        status = "unavailable";
      } else if (busyUsers.length > 0) {
        status = "busy";
      } else {
        status = "available";
      }

      slots.push({
        time: new Date(current).toISOString(),
        status,
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
