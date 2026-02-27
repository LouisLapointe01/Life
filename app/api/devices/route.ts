import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDeviceSchema } from "@/lib/validations";

// GET /api/devices — Liste tous les devices avec leur plante et config
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // all | online | offline | alerts

    const where: Record<string, unknown> = {};
    if (status === "online") where.isOnline = true;
    if (status === "offline") where.isOnline = false;
    if (status === "alerts") {
      where.alerts = { some: { isRead: false, isResolved: false } };
    }

    const devices = await prisma.device.findMany({
      where,
      include: {
        plant: true,
        config: true,
        alerts: {
          where: { isRead: false, isResolved: false },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        sensorReadings: {
          orderBy: { recordedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(devices);
  } catch (error) {
    console.error("[API] GET /devices error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des appareils" },
      { status: 500 }
    );
  }
}

// POST /api/devices — Créer un nouveau device
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createDeviceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const device = await prisma.device.create({
      data: {
        ...parsed.data,
        config: {
          create: {}, // Config par défaut
        },
      },
      include: { config: true },
    });

    return NextResponse.json(device, { status: 201 });
  } catch (error) {
    console.error("[API] POST /devices error:", error);
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Un appareil avec cette adresse MAC existe déjà" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Erreur lors de la création de l'appareil" },
      { status: 500 }
    );
  }
}
