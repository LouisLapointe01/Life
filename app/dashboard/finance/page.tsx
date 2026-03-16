"use client";

import { TrendingUp, TrendingDown, DollarSign, CreditCard, PiggyBank, BarChart3, Plus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FinancePage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finances</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gérez votre budget et vos dépenses</p>
        </div>
        <button className="premium-panel-soft flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all hover:bg-white/80 dark:hover:bg-white/[0.08]">
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      {/* Solde total */}
      <div className="relative overflow-hidden rounded-[2rem] p-6 sm:p-8 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <p className="text-sm text-white/70 font-medium">Solde total</p>
          <p className="text-5xl font-thin mt-2">—</p>
          <p className="text-white/60 text-sm mt-2">Connectez vos comptes pour commencer</p>
        </div>
        <DollarSign className="absolute right-8 top-1/2 -translate-y-1/2 h-20 w-20 text-white/10" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: <ArrowDownRight className="h-5 w-5 text-red-400" />, label: "Dépenses ce mois", value: "—", color: "text-red-400" },
          { icon: <ArrowUpRight className="h-5 w-5 text-emerald-400" />, label: "Revenus ce mois", value: "—", color: "text-emerald-400" },
          { icon: <PiggyBank className="h-5 w-5 text-sky-400" />, label: "Épargne", value: "—", color: "text-sky-400" },
          { icon: <CreditCard className="h-5 w-5 text-purple-400" />, label: "Comptes liés", value: "0", color: "text-purple-400" },
        ].map((s, i) => (
          <div key={i} className="premium-panel-soft rounded-[1.5rem] p-4 flex flex-col gap-2">
            {s.icon}
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={cn("text-2xl font-semibold", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Coming soon */}
      <div className="premium-panel-soft rounded-[2rem] py-16 flex flex-col items-center gap-4 text-center">
        <BarChart3 className="h-12 w-12 text-muted-foreground/40" />
        <div>
          <p className="font-semibold text-foreground/70">Module Finances en développement</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Suivi des dépenses, budgets, objectifs d&apos;épargne et analyses disponibles prochainement.
          </p>
        </div>
      </div>
    </div>
  );
}
