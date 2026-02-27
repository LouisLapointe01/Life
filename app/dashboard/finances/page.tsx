import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

export default async function FinancesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 50,
  });

  const monthTx = transactions.filter(
    (t) => t.date >= monthStart && t.date <= monthEnd
  );

  const income  = monthTx.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Finances 💰</h1>

      {/* Résumé du mois */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" /> Revenus (ce mois)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-400">{fmt(income)}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" /> Dépenses (ce mois)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-400">{fmt(expense)}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-400" /> Solde net
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${balance >= 0 ? "text-green-400" : "text-red-400"}`}>
              {fmt(balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des transactions */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-white mb-3">Transactions récentes</h2>
        {transactions.length === 0 && (
          <p className="text-slate-400">Aucune transaction enregistrée.</p>
        )}
        {transactions.map((tx) => (
          <div key={tx.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-white text-sm font-medium">{tx.description ?? tx.category}</p>
              <p className="text-slate-500 text-xs">
                {tx.category} · {format(tx.date, "d MMM yyyy", { locale: fr })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={tx.type === "INCOME"
                ? "bg-green-900/40 text-green-300 border border-green-700 text-xs"
                : "bg-red-900/40 text-red-300 border border-red-700 text-xs"
              }>
                {tx.type === "INCOME" ? "+" : "-"}{fmt(tx.amount)}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
