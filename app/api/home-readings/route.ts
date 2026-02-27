import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const homeReadingSchema = z.object({
  sensor:    z.string().min(1).max(50),
  value:     z.number(),
  unit:      z.string().min(1).max(20),
  location:  z.string().max(100).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const sensors = ["temperature", "humidity", "co2", "electricity"];
  const readings = await Promise.all(
    sensors.map((s) =>
      prisma.homeReading.findFirst({
        where: { sensor: s },
        orderBy: { recordedAt: "desc" },
      })
    )
  );
  return NextResponse.json(readings.filter(Boolean));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const result = homeReadingSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const reading = await prisma.homeReading.create({ data: result.data });
  return NextResponse.json(reading, { status: 201 });
}
