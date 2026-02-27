import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { healthEntrySchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const entries = await prisma.healthEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 30,
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const result = healthEntrySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Données invalides", details: result.error.flatten() }, { status: 400 });
  }

  const entry = await prisma.healthEntry.upsert({
    where: { userId_date: { userId: session.user.id, date: new Date(result.data.date) } },
    update: { ...result.data, date: new Date(result.data.date) },
    create: { ...result.data, userId: session.user.id, date: new Date(result.data.date) },
  });
  return NextResponse.json(entry, { status: 201 });
}
