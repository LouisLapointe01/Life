import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Droplets, Wind, Zap } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

const sensorConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  temperature: { label: "Température",   icon: Thermometer, color: "text-orange-400" },
  humidity:    { label: "Humidité",      icon: Droplets,    color: "text-blue-400"   },
  co2:         { label: "CO₂",           icon: Wind,        color: "text-green-400"  },
  electricity: { label: "Consommation",  icon: Zap,         color: "text-yellow-400" },
};

export default async function MaisonPage() {
  // Dernière lecture par capteur
  const sensors = ["temperature", "humidity", "co2", "electricity"];
  const readings = await Promise.all(
    sensors.map((s) =>
      prisma.homeReading.findFirst({
        where: { sensor: s },
        orderBy: { recordedAt: "desc" },
      })
    )
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Constantes Maison 🏠</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {sensors.map((sensor, i) => {
          const cfg = sensorConfig[sensor];
          const reading = readings[i];
          const Icon = cfg.icon;

          return (
            <Card key={sensor} className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                  {cfg.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reading ? (
                  <>
                    <p className="text-3xl font-bold text-white">
                      {reading.value}
                      <span className="text-lg text-slate-400 ml-1">{reading.unit}</span>
                    </p>
                    {reading.location && (
                      <p className="text-xs text-slate-500 mt-1">{reading.location}</p>
                    )}
                    <p className="text-xs text-slate-600 mt-1">
                      {formatRelativeTime(reading.recordedAt.toISOString())}
                    </p>
                  </>
                ) : (
                  <p className="text-slate-500 text-sm">Aucune donnée</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-slate-500 text-sm">
        Les données sont mises à jour automatiquement via les capteurs IoT.
        Connectez vos appareils via MQTT sur le topic{" "}
        <code className="bg-slate-800 px-1 rounded text-slate-300">iot/home/+/telemetry</code>.
      </p>
    </div>
  );
}
