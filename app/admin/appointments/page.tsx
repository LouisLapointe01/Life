import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Appointment } from "@prisma/client";

const statusLabel: Record<string, { label: string; class: string }> = {
  PENDING: { label: "En attente", class: "bg-yellow-900/40 text-yellow-300 border-yellow-700" },
  CONFIRMED: { label: "Confirmé", class: "bg-green-900/40 text-green-300 border-green-700" },
  CANCELLED: { label: "Annulé", class: "bg-red-900/40 text-red-300 border-red-700" },
};

export default async function AppointmentsAdminPage() {
  const appointments = await prisma.appointment.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Rendez-vous ({appointments.length})</h1>
      <div className="space-y-3">
        {appointments.length === 0 && (
          <p className="text-slate-400">Aucun rendez-vous pour l&apos;instant.</p>
        )}
        {appointments.map((rdv: Appointment) => {
          const s = statusLabel[rdv.status] ?? statusLabel.PENDING;
          return (
            <div key={rdv.id} className="bg-slate-900 border border-slate-700 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-white font-medium">{rdv.name}</p>
                  <p className="text-slate-400 text-sm">{rdv.email} · {rdv.phone}</p>
                  <p className="text-slate-300 text-sm mt-1">
                    <span className="font-medium">{rdv.subject}</span>
                    {" — "}
                    {format(rdv.date, "d MMMM yyyy à HH:mm", { locale: fr })}
                  </p>
                  {rdv.message && (
                    <p className="text-slate-500 text-sm mt-1 italic">{rdv.message}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge className={`border text-xs ${s.class}`}>{s.label}</Badge>
                  <span className="text-slate-600 text-xs">
                    {format(rdv.createdAt, "d MMM", { locale: fr })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
