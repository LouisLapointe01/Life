"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  CalendarPlus,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRdvModal } from "@/contexts/rdv-modal-context";

const navLinks = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/agenda", label: "Agenda", icon: Calendar, exact: false },
  { href: "/dashboard/annuaire", label: "Annuaire", icon: Users, exact: false },
  { href: "/dashboard/parametres", label: "Réglages", icon: Settings, exact: false },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { open: openRdv } = useRdvModal();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div
        className="glass-sidebar border-t border-foreground/[0.06] flex items-stretch"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Regular nav links */}
        {navLinks.slice(0, 2).map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-[3px] py-2.5 text-[10px] font-medium transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon
                className={cn("h-[22px] w-[22px] transition-all duration-200", isActive && "scale-110")}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={cn(isActive && "font-semibold text-primary")}>{item.label}</span>
            </Link>
          );
        })}

        {/* RDV button (center, prominent) */}
        <button
          onClick={openRdv}
          className="flex flex-1 flex-col items-center justify-center gap-[3px] py-2.5 text-[10px] font-semibold text-primary transition-all duration-200"
        >
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/30 -mt-1">
            <CalendarPlus className="h-[18px] w-[18px] text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="text-primary">RDV</span>
        </button>

        {/* Remaining nav links */}
        {navLinks.slice(2).map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-[3px] py-2.5 text-[10px] font-medium transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon
                className={cn("h-[22px] w-[22px] transition-all duration-200", isActive && "scale-110")}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={cn(isActive && "font-semibold text-primary")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
