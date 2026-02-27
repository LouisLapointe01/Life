import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function UsersAdminPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Utilisateurs ({users.length})</h1>
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex items-center gap-3">
            {user.image ? (
              <Image src={user.image} alt={user.name ?? ""} width={36} height={36} className="rounded-full" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-sm font-bold">
                {(user.name ?? user.email ?? "?")[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <p className="text-white text-sm font-medium">{user.name ?? "—"}</p>
              <p className="text-slate-400 text-xs">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={user.role === "ADMIN"
                ? "bg-amber-900/40 text-amber-300 border border-amber-700 text-xs"
                : "bg-slate-800 text-slate-400 border border-slate-600 text-xs"
              }>
                {user.role === "ADMIN" ? "Admin" : "Utilisateur"}
              </Badge>
              <span className="text-slate-600 text-xs">
                {format(user.createdAt, "d MMM yyyy", { locale: fr })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
