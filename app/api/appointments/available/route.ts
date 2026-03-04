import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * GET /api/appointments/available?date=YYYY-MM-DD&type_id=UUID&user_ids=UUID,UUID,...
 * Retourne les créneaux disponibles communs à tous les participants spécifiés.
 * 
 * - Pour chaque user_id fourni :
 *   1. Récupère ses availability_rules (perso, fallback global)
 *   2. Vérifie les conflits avec ses RDV existants (via appointment_participants)
 * - Retourne l'intersection des créneaux disponibles.
 * 
 * Si un créneau est occupé pour au moins un participant, 
 * il est quand même retourné mais marqué "busy" pour notifier.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const typeId = searchParams.get("type_id");
    const userIdsRaw = searchParams.get("user_ids"); // comma-separated

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

    // Si aucun user_id → créneaux basés sur les règles globales uniquement
    type SlotInfo = {
      time: string; // ISO
      available: boolean;
      busy_users: string[]; // user_ids qui ne sont pas dispo
    };

    // 1. Récupérer les règles de disponibilité (union de tous les users ou global)
    let commonRules: { start_time: string; end_time: string }[] = [];

    if (userIds.length > 0) {
      // On utilise les règles du PREMIER participant comme base (le destinataire principal)
      // et on vérifie les conflits pour chacun
      const primaryUserId = userIds[0];

      const { data: userRules } = await supabase
        .from("availability_rules")
        .select("start_time, end_time")
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true)
        .eq("user_id", primaryUserId);

      if (userRules && userRules.length > 0) {
        commonRules = userRules;
      } else {
        // Fallback global
        const { data: globalRules } = await supabase
          .from("availability_rules")
          .select("start_time, end_time")
          .eq("day_of_week", dayOfWeek)
          .eq("is_active", true)
          .is("user_id", null);
        commonRules = globalRules || [];
      }
    } else {
      const { data: allRules } = await supabase
        .from("availability_rules")
        .select("start_time, end_time")
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true);
      commonRules = allRules || [];
    }

    if (commonRules.length === 0) {
      return NextResponse.json({ slots: [] });
    }

    // 2. Pour chaque utilisateur, récupérer ses RDV existants via appointment_participants
    const busyByUser: Record<string, { start: number; end: number }[]> = {};

    for (const uid of userIds) {
      const { data: participations } = await supabase
        .from("appointment_participants")
        .select("appointment_id, appointments!inner(start_at, end_at, status)")
        .eq("user_id", uid)
        .neq("status", "declined");

      const busy: { start: number; end: number }[] = [];
      for (const p of participations || []) {
        const a = p.appointments as unknown as { start_at: string; end_at: string; status: string };
        if (a.status === "cancelled") continue;
        const s = new Date(a.start_at);
        const e = new Date(a.end_at);
        // Filtrer uniquement ce jour
        if (s.toISOString() >= dayEnd || e.toISOString() <= dayStart) continue;
        busy.push({ start: s.getTime(), end: e.getTime() });
      }
      busyByUser[uid] = busy;
    }

    // 3. Générer les créneaux
    const slots: SlotInfo[] = [];

    for (const rule of commonRules) {
      const [startH, startM] = rule.start_time.split(":").map(Number);
      const [endH, endM] = rule.end_time.split(":").map(Number);

      const ruleStart = new Date(targetDate);
      ruleStart.setHours(startH, startM, 0, 0);
      const ruleEnd = new Date(targetDate);
      ruleEnd.setHours(endH, endM, 0, 0);

      let current = ruleStart.getTime();

      while (current + durationMs <= ruleEnd.getTime()) {
        const slotEnd = current + durationMs;
        const busyUsers: string[] = [];

        for (const uid of userIds) {
          const userBusy = busyByUser[uid] || [];
          const hasConflict = userBusy.some((b) => current < b.end && slotEnd > b.start);
          if (hasConflict) busyUsers.push(uid);
        }

        slots.push({
          time: new Date(current).toISOString(),
          available: busyUsers.length === 0,
          busy_users: busyUsers,
        });

        current += 30 * 60 * 1000; // step 30 min
      }
    }

    return NextResponse.json({ slots });
  } catch (err) {
    console.error("[GET /api/appointments/available]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
