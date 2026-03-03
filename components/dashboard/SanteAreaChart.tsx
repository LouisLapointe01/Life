"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";

export type GraphiqueMetrique = "sommeil" | "pas";

const donneesHebdo = [
  { jour: "Lun", sommeil: 7.5, pas: 7200 },
  { jour: "Mar", sommeil: 6.8, pas: 9100 },
  { jour: "Mer", sommeil: 8.0, pas: 6500 },
  { jour: "Jeu", sommeil: 7.2, pas: 11200 },
  { jour: "Ven", sommeil: 6.5, pas: 8800 },
  { jour: "Sam", sommeil: 9.0, pas: 5400 },
  { jour: "Dim", sommeil: 7.5, pas: 8432 },
];

interface TooltipPayloadItem { value: number; name: string }
function TooltipPerso({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-[12px]">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-muted-foreground">
          {p.name === "sommeil" ? `Sommeil : ${p.value}h` : `Pas : ${p.value.toLocaleString("fr-FR")}`}
        </p>
      ))}
    </div>
  );
}

export default function SanteAreaChart({
  graphiqueActif,
  onToggle,
}: {
  graphiqueActif: GraphiqueMetrique;
  onToggle: (v: GraphiqueMetrique) => void;
}) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-semibold">Tendance hebdomadaire</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Cette semaine — données journalières
          </p>
        </div>
        <div className="flex gap-1 rounded-2xl bg-foreground/[0.04] p-1">
          {(
            [
              { key: "sommeil" as GraphiqueMetrique, label: "Sommeil" },
              { key: "pas" as GraphiqueMetrique, label: "Pas" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => onToggle(tab.key)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-[12px] font-medium transition-all",
                graphiqueActif === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={donneesHebdo} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradSommeil" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#007AFF" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#007AFF" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradPas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34C759" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#34C759" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="jour"
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<TooltipPerso />} />
            {graphiqueActif === "sommeil" ? (
              <Area
                type="monotone" dataKey="sommeil" stroke="#007AFF" strokeWidth={2.5}
                fill="url(#gradSommeil)" dot={{ fill: "#007AFF", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: "#007AFF" }}
              />
            ) : (
              <Area
                type="monotone" dataKey="pas" stroke="#34C759" strokeWidth={2.5}
                fill="url(#gradPas)" dot={{ fill: "#34C759", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: "#34C759" }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
