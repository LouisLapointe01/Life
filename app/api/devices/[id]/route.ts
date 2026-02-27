import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateDeviceSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/devices/:id — Détail d'un device
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        plant: true,
        config: true,
        alerts: {
          where: { isResolved: false },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        sensorReadings: {
          orderBy: { recordedAt: "desc" },
          take: 1,
        },
        wateringEvents: {
          orderBy: { startedAt: "desc" },
          take: 10,
        },
      },
    });

    if (!device) {
      return NextResponse.json(
        { error: "Appareil non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(device);
  } catch (error) {
    console.error("[API] GET /devices/:id error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'appareil" },
      { status: 500 }
    );
  }
}

// PATCH /api/devices/:id — Modifier un device
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateDeviceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const device = await prisma.device.update({
      where: { id },
      data: parsed.data,
      include: { plant: true, config: true },
    });

    return NextResponse.json(device);
  } catch (error) {
    console.error("[API] PATCH /devices/:id error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la modification de l'appareil" },
      { status: 500 }
    );
  }
}

// DELETE /api/devices/:id — Supprimer un device
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    await prisma.device.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] DELETE /devices/:id error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'appareil" },
      { status: 500 }
    );
  }
}
