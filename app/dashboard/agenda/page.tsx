import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const priorityStyle: Record<string, string> = {
  HIGH:   "bg-red-900/40 text-red-300 border border-red-700",
  MEDIUM: "bg-yellow-900/40 text-yellow-300 border border-yellow-700",
  LOW:    "bg-slate-800 text-slate-400 border border-slate-600",
};
const priorityLabel: Record<string, string> = { HIGH: "Haute", MEDIUM: "Moyenne", LOW: "Basse" };

export default async function AgendaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id },
    orderBy: [{ completed: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  const pending   = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Agenda & Tâches 📋</h1>

      <div className="space-y-2 mb-8">
        <h2 className="text-base font-semibold text-white mb-3">
          À faire ({pending.length})
        </h2>
        {pending.length === 0 && (
          <p className="text-slate-400">Aucune tâche en cours. 🎉</p>
        )}
        {pending.map((task) => (
          <div key={task.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex items-center gap-3">
            <Circle className="w-5 h-5 text-slate-500 shrink-0" />
            <div className="flex-1">
              <p className="text-white text-sm">{task.title}</p>
              {task.dueDate && (
                <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                  <CalendarDays className="w-3 h-3" />
                  {format(task.dueDate, "d MMM yyyy", { locale: fr })}
                </p>
              )}
            </div>
            <Badge className={`text-xs ${priorityStyle[task.priority]}`}>
              {priorityLabel[task.priority]}
            </Badge>
          </div>
        ))}
      </div>

      {completed.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-slate-500 mb-3">
            Terminées ({completed.length})
          </h2>
          {completed.map((task) => (
            <div key={task.id} className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 flex items-center gap-3 opacity-60">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <p className="text-slate-400 text-sm line-through">{task.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
