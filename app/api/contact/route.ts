// app/api/contact/route.ts — Formulaire de contact
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contactMessageSchema } from "@/lib/validations";
import { sendSMS } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = contactMessageSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Données invalides", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, message } = result.data;

    const contact = await prisma.contactMessage.create({
      data: { name, email, message },
    });

    const smsText = `📩 Nouveau message de ${name} (${email}):\n"${message.substring(0, 120)}${message.length > 120 ? "..." : ""}"`;
    const smsSent = await sendSMS(smsText);

    await prisma.contactMessage.update({
      where: { id: contact.id },
      data: { smsSent },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[API /contact]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
