// app/api/appointments/route.ts — Prise de rendez-vous
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appointmentSchema } from "@/lib/validations";
import { sendSMS } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = appointmentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Données invalides", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, phone, date, time, subject, message } = result.data;

    const appointmentDate = new Date(`${date}T${time}`);

    const appointment = await prisma.appointment.create({
      data: { name, email, phone, date: appointmentDate, subject, message },
    });

    const smsText = `📅 Nouveau RDV de ${name} (${phone})\nDate : ${date} à ${time}\nSujet : ${subject}`;
    const smsSent = await sendSMS(smsText);

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { smsSent },
    });

    return NextResponse.json({ success: true, id: appointment.id }, { status: 201 });
  } catch (err) {
    console.error("[API /appointments]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const appointments = await prisma.appointment.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(appointments);
  } catch (err) {
    console.error("[API /appointments GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
