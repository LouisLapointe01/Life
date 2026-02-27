import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageSquare } from "lucide-react";

export default async function MessagesAdminPage() {
  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Messages reçus ({messages.length})</h1>
      <div className="space-y-3">
        {messages.length === 0 && (
          <p className="text-slate-400">Aucun message pour l&apos;instant.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-4 h-4 text-slate-500 mt-1 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-white font-medium">{msg.name}</p>
                  <span className="text-slate-600 text-xs">
                    {format(msg.createdAt, "d MMM yyyy", { locale: fr })}
                  </span>
                </div>
                <p className="text-slate-400 text-sm">{msg.email}</p>
                <p className="text-slate-300 text-sm mt-2">{msg.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
