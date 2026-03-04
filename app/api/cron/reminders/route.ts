import { createAdminClient } from "@/lib/supabase/admin";
import { sendReminderToGuest, sendReminderToAdmin } from "@/lib/mailjet";
import { NextResponse } from "next/server";

/**
 * Cron endpoint — Envoie les rappels email J-1 et H-1
 * pour les RDV confirmés, des deux côtés (guest + admin).
 *
 * Appelé par Vercel Cron toutes les heures.
 * Protection par CRON_SECRET en production.
 */
export async function GET(request: Request) {
  // Vérifier le secret en production
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const results: string[] = [];

  // ─── Rappel H-1 : RDV entre maintenant+55min et maintenant+65min ───
  const h1Start = new Date(now.getTime() + 55 * 60 * 1000);
  const h1End = new Date(now.getTime() + 65 * 60 * 1000);

  const { data: h1Appointments } = await supabase
    .from("appointments")
    .select("*, appointment_types(name, duration_min)")
    .eq("status", "confirmed")
    .eq("notify_on_event", true)
    .gte("start_at", h1Start.toISOString())
    .lte("start_at", h1End.toISOString());

  if (h1Appointments) {
    for (const apt of h1Appointments) {
      const data = {
        guestName: apt.guest_name,
        guestEmail: apt.guest_email,
        typeName: apt.appointment_types.name,
        startAt: apt.start_at,
        endAt: apt.end_at,
        durationMin: apt.appointment_types.duration_min,
        reminderType: "1h" as const,
      };

      await sendReminderToGuest(data);
      await sendReminderToAdmin(data);
      results.push(`H-1: ${apt.guest_name} (${apt.guest_email})`);
    }
  }

  // ─── Rappel J-1 : RDV entre demain même heure -5min et +5min ───
  const d1Start = new Date(now.getTime() + 24 * 60 * 60 * 1000 - 5 * 60 * 1000);
  const d1End = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 5 * 60 * 1000);

  const { data: d1Appointments } = await supabase
    .from("appointments")
    .select("*, appointment_types(name, duration_min)")
    .eq("status", "confirmed")
    .eq("notify_on_event", true)
    .gte("start_at", d1Start.toISOString())
    .lte("start_at", d1End.toISOString());

  if (d1Appointments) {
    for (const apt of d1Appointments) {
      const data = {
        guestName: apt.guest_name,
        guestEmail: apt.guest_email,
        typeName: apt.appointment_types.name,
        startAt: apt.start_at,
        endAt: apt.end_at,
        durationMin: apt.appointment_types.duration_min,
        reminderType: "24h" as const,
      };

      await sendReminderToGuest(data);
      await sendReminderToAdmin(data);
      results.push(`J-1: ${apt.guest_name} (${apt.guest_email})`);
    }
  }

  return NextResponse.json({
    ok: true,
    sent: results.length,
    details: results,
    timestamp: now.toISOString(),
  });
}
