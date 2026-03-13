"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMobileVisibleTabs } from "@/lib/stores/dashboard-tabs";
import { useMobileUiStore } from "@/lib/stores/mobile-ui";
import { useUnreadMessages } from "@/lib/stores/unread-messages";
import { motion } from "framer-motion";

export function MobileBottomNav() {
  const pathname = usePathname();
  const mobileTabs = useMobileVisibleTabs();
  const isMobileNavVisible = useMobileUiStore((state) => state.isMobileNavVisible);
  const totalUnread = useUnreadMessages((s) => s.totalUnread);
  const [viewportWidth, setViewportWidth] = useState(390);

  useEffect(() => {
    const updateWidth = () => setViewportWidth(window.innerWidth);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);
    // Affichage uniquement sur desktop (PC)
    if (viewportWidth < 1024) return null;
    return (
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 transition-all duration-250",
          isMobileNavVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[calc(100%+1rem)] opacity-0"
        )}
        aria-hidden={!isMobileNavVisible}
      >
        <div
          className="mx-2 mb-2 flex items-stretch gap-1 rounded-[1.8rem] border border-white/40 bg-white/58 px-2 pt-2 shadow-[0_14px_40px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.06]"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {mobileTabs.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-label={item.label}
                className={cn(
                  "relative flex min-w-0 flex-1 items-center justify-center overflow-hidden rounded-2xl font-medium transition-all duration-300",
                  hideLabels ? "py-3" : "py-2.5 text-[9px]",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-bottom-nav-active"
                    className="absolute inset-0 rounded-2xl bg-white/82 shadow-[0_10px_28px_rgba(15,23,42,0.10)] dark:bg-white/[0.08]"
                    transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
                  />
                )}
                <motion.div
                  className={cn("relative z-10 flex items-center", hideLabels ? "flex-row justify-center" : "flex-col gap-[3px]")}
                  animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.02 : 1 }}
                  transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                <div className="relative">
                  <item.icon
                    className={cn("h-[20px] w-[20px] transition-all duration-300", isActive && "scale-110")}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  {item.id === "messages" && totalUnread > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white ring-2 ring-background">
                      {totalUnread > 9 ? "9+" : totalUnread}
                    </span>
                  )}
                </div>
                {!hideLabels && (
                  <span className={cn("transition-colors duration-300", isActive && "font-semibold text-primary")}>{item.label}</span>
                )}
                </motion.div>
              </Link>
            );
          })}
        </div>
      </nav>
    );
        })}
      </div>
    </nav>
  );
}
