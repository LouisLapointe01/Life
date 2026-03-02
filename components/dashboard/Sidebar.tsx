"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Heart,
  Home,
  FolderOpen,
  Users,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useRdvModal } from "@/contexts/rdv-modal-context";
import { CalendarPlus } from "lucide-react";

const navItems = [
  {
    href: "/dashboard",
    label: "Accueil",
    icon: LayoutDashboard,
    color: "from-blue-500/20 to-blue-600/20",
    iconColor: "text-blue-500",
  },
  {
    href: "/dashboard/agenda",
    label: "Agenda",
    icon: Calendar,
    color: "from-orange-500/20 to-orange-600/20",
    iconColor: "text-orange-500",
  },
  {
    href: "/dashboard/sante",
    label: "Santé",
    icon: Heart,
    color: "from-pink-500/20 to-pink-600/20",
    iconColor: "text-pink-500",
  },
  {
    href: "/dashboard/logement",
    label: "Logement",
    icon: Home,
    color: "from-amber-500/20 to-amber-600/20",
    iconColor: "text-amber-500",
  },
  {
    href: "/dashboard/fichiers",
    label: "Fichiers",
    icon: FolderOpen,
    color: "from-green-500/20 to-green-600/20",
    iconColor: "text-green-500",
  },
  {
    href: "/dashboard/annuaire",
    label: "Annuaire",
    icon: Users,
    color: "from-purple-500/20 to-purple-600/20",
    iconColor: "text-purple-500",
  },
  {
    href: "/dashboard/parametres",
    label: "Paramètres",
    icon: Settings,
    color: "from-gray-500/20 to-gray-600/20",
    iconColor: "text-gray-500",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { open: openRdv } = useRdvModal();

  return (
    <aside
      className={cn(
        "glass-sidebar hidden lg:flex h-dvh flex-col transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-[72px] items-center gap-3 px-5">
        {!collapsed && (
          <div className="flex items-center gap-2.5 animate-fade-in">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Life
            </span>
          </div>
        )}
        {collapsed && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 mx-auto">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-3">
        {navItems.map((item, index) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-medium transition-all duration-300",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Active background indicator */}
              {isActive && (
                <div
                  className={cn(
                    "absolute inset-0 rounded-2xl bg-gradient-to-r opacity-100",
                    item.color,
                    "shadow-sm"
                  )}
                />
              )}

              {/* Hover background */}
              {!isActive && (
                <div className="absolute inset-0 rounded-2xl bg-foreground/[0.04] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              )}

              <div
                className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
                  isActive
                    ? `${item.iconColor}`
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
              </div>

              {!collapsed && (
                <span className="relative z-10 truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* New RDV Button */}
      <div className="px-3 pb-2">
        <button
          onClick={openRdv}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-primary/15 to-primary/5 px-3 py-2.5 text-[13px] font-semibold text-primary transition-all duration-200 hover:from-primary/25 hover:to-primary/10 hover:-translate-y-0.5",
            collapsed && "justify-center"
          )}
        >
          <CalendarPlus className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Prendre RDV</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <div className="px-3 pb-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-muted-foreground transition-all duration-200 hover:bg-foreground/[0.04] hover:text-foreground"
        >
          {collapsed ? (
            <PanelLeft className="h-[18px] w-[18px]" />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px]" />
              <span className="text-[13px] font-medium">Réduire</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
