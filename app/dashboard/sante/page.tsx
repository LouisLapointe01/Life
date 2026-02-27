import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Weight, Footprints, Moon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function SantePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const entries = await prisma.healthEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 30,
  });

  const latest = entries[0];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Santé & Sport 💪</h1>

      {/* Dernière entrée */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <Weight className="w-4 h-4 text-blue-400" /> Poids
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latest?.weight ? (
              <p className="text-3xl font-bold text-white">
                {latest.weight}
                <span className="text-lg text-slate-400 ml-1">kg</span>
              </p>
            ) : (
              <p className="text-slate-500">—</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <Footprints className="w-4 h-4 text-green-400" /> Pas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latest?.steps != null ? (
              <p className="text-3xl font-bold text-white">
                {latest.steps.toLocaleString("fr-CA")}
              </p>
            ) : (
              <p className="text-slate-500">—</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <Moon className="w-4 h-4 text-purple-400" /> Sommeil
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latest?.sleepHours != null ? (
              <p className="text-3xl font-bold text-white">
                {latest.sleepHours}
                <span className="text-lg text-slate-400 ml-1">h</span>
              </p>
            ) : (
              <p className="text-slate-500">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historique */}
      <h2 className="text-lg font-semibold text-white mb-3">Historique (30 jours)</h2>
      <div className="space-y-2">
        {entries.length === 0 && (
          <p className="text-slate-400">Aucune entrée enregistrée.</p>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex items-center gap-4">
            <span className="text-slate-500 text-sm w-28 shrink-0">
              {format(entry.date, "d MMM yyyy", { locale: fr })}
            </span>
            <div className="flex gap-4 text-sm">
              {entry.weight   && <span className="text-white">{entry.weight} kg</span>}
              {entry.steps    && <span className="text-green-400">{entry.steps.toLocaleString()} pas</span>}
              {entry.sleepHours && <span className="text-purple-400">{entry.sleepHours}h sommeil</span>}
            </div>
            {entry.notes && <span className="text-slate-500 text-xs italic">{entry.notes}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
