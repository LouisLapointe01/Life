"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Leaf, Home, Wallet, Heart, CalendarCheck,
  Shield, LayoutDashboard,
} from "lucide-react";

const navItems = [
  { href: "/dashboard/plants",   label: "Plantes IoT",   icon: Leaf },
  { href: "/dashboard/maison",   label: "Maison",        icon: Home },
  { href: "/dashboard/finances", label: "Finances",      icon: Wallet },
  { href: "/dashboard/sante",    label: "Santé",         icon: Heart },
  { href: "/dashboard/agenda",   label: "Agenda",        icon: CalendarCheck },
];

interface DashboardSidebarProps {
  isAdmin: boolean;
}

export function DashboardSidebar({ isAdmin }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-800">
        <LayoutDashboard className="w-5 h-5 text-blue-400" />
        <span className="font-semibold text-white">MyLife</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-slate-700 text-white font-medium"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Administration
              </p>
            </div>
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-amber-900/40 text-amber-300 font-medium"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Shield className="w-4 h-4 shrink-0" />
              Panneau Admin
            </Link>
          </>
        )}
      </nav>

      {/* Lien retour vitrine */}
      <div className="px-3 py-4 border-t border-slate-800">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
        >
          ← Site vitrine
        </Link>
      </div>
    </aside>
  );
}
