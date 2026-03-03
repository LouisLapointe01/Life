"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  PanelLeftClose,
  PanelLeft,
  Plus,
  X,
  GripVertical,
} from "lucide-react";
import { LeafLogo } from "@/components/LeafLogo";
import { useState } from "react";
import { useRdvModal } from "@/contexts/rdv-modal-context";
import { CalendarPlus } from "lucide-react";
import {
  useVisibleTabs,
  useHiddenTabs,
  useDashboardTabs,
  type TabDefinition,
} from "@/lib/stores/dashboard-tabs";
import { motion, AnimatePresence } from "framer-motion";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const { open: openRdv } = useRdvModal();
  const visibleTabs = useVisibleTabs();
  const hiddenTabs = useHiddenTabs();
  const { removeTab, addTab } = useDashboardTabs();

  return (
    <aside
      className={cn(
        "hidden lg:flex h-dvh flex-col transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] bg-white/40 dark:bg-white/[0.06] backdrop-blur-2xl border-r border-white/30 dark:border-white/10",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-[72px] items-center gap-3 px-5">
        {!collapsed && (
          <div className="flex items-center gap-2.5 animate-fade-in">
            <LeafLogo size={36} className="shrink-0 rounded-xl shadow-lg shadow-teal-500/30" />
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Life
            </span>
          </div>
        )}
        {collapsed && (
          <LeafLogo size={36} className="shrink-0 rounded-xl shadow-lg shadow-teal-500/30 mx-auto" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-3 overflow-y-auto scrollbar-thin">
        <AnimatePresence initial={false}>
          {visibleTabs.map((item, index) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <div className="group relative flex items-center">
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-medium transition-all duration-300",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Active background indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className={cn(
                          "absolute inset-0 rounded-2xl bg-gradient-to-r opacity-100",
                          item.color,
                          "shadow-sm"
                        )}
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
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

                  {/* Bouton supprimer (visible au hover, non locked) */}
                  {!collapsed && !item.locked && (
                    <button
                      onClick={() => removeTab(item.id)}
                      className="absolute right-1 z-20 flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-red-500 hover:!bg-red-500/10 transition-all duration-200"
                      title={`Retirer ${item.label}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Bouton ajouter un onglet */}
        {hiddenTabs.length > 0 && !collapsed && (
          <div className="relative pt-1">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-medium text-muted-foreground/60 transition-all duration-200 hover:text-muted-foreground hover:bg-foreground/[0.04]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20">
                <Plus className="h-4 w-4" />
              </div>
              <span>Ajouter section</span>
            </button>

            <AnimatePresence>
              {showAddMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-1 space-y-0.5 rounded-2xl bg-foreground/[0.03] p-2">
                    {hiddenTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          addTab(tab.id);
                          if (hiddenTabs.length <= 1) setShowAddMenu(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-foreground/[0.06]"
                      >
                        <div
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br",
                            tab.color
                          )}
                        >
                          <tab.icon className={cn("h-3.5 w-3.5", tab.iconColor)} />
                        </div>
                        <span>{tab.label}</span>
                        <Plus className="ml-auto h-3.5 w-3.5 text-muted-foreground/50" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Collapsed: add button */}
        {hiddenTabs.length > 0 && collapsed && (
          <div className="relative group">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex w-full items-center justify-center rounded-2xl px-3 py-2.5 text-muted-foreground/60 transition-all duration-200 hover:text-muted-foreground hover:bg-foreground/[0.04]"
            >
              <Plus className="h-[18px] w-[18px]" />
            </button>
          </div>
        )}
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
