import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getHumidityColor, formatRelativeTime } from "@/lib/utils";
import { Plant, Device, SensorReading, Alert } from "@prisma/client";
import Image from "next/image";

export interface DeviceCardProps {
  device: Device & {
    plant?: Plant | null;
    sensorReadings?: SensorReading[];
    alerts?: Alert[];
  };
}

export function DeviceCard({ device }: DeviceCardProps) {
  const reading = device.sensorReadings?.[0];
  const alert = device.alerts?.find((a) => !a.isRead && !a.isResolved);
  return (
    <Card className="w-full max-w-xs shadow-md relative">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-100">
          {device.plant?.imageUrl ? (
            <Image src={device.plant.imageUrl} alt={device.plant.name} fill style={{objectFit:'cover'}} />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-3xl">🌱</span>
          )}
        </div>
        <div className="flex-1">
          <CardTitle className="text-lg font-semibold truncate">
            {device.plant?.name || device.name}
          </CardTitle>
          <div className="text-xs text-zinc-500 truncate">{device.location}</div>
        </div>
        <span
          className={
            "w-3 h-3 rounded-full " +
            (device.isOnline ? "bg-green-500" : "bg-zinc-400 animate-pulse")
          }
          aria-label={device.isOnline ? "En ligne" : "Hors ligne"}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">Humidité sol :</span>
          <span className={getHumidityColor(reading?.soilHumidity ?? 0)}>
            {reading?.soilHumidity != null ? `${reading.soilHumidity.toFixed(0)}%` : "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">Réservoir :</span>
          <span className="text-blue-600 font-medium">
            {reading?.waterLevel != null ? `${reading.waterLevel.toFixed(0)}% 💧` : "—"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>Dernière mesure :</span>
          <span>{reading?.recordedAt ? formatRelativeTime(reading.recordedAt) : "—"}</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button className="px-3 py-1 rounded bg-primary text-white text-xs hover:bg-primary/90 transition" aria-label="Arroser maintenant">
            Arroser maintenant
          </button>
          {alert && (
            <Badge variant="destructive" className="ml-2">Alerte</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
