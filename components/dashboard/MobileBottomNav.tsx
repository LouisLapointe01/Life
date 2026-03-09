"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMobileVisibleTabs } from "@/lib/stores/dashboard-tabs";
import { useUnreadMessages } from "@/lib/stores/unread-messages";

export function MobileBottomNav() {
  const pathname = usePathname();
  const mobileTabs = useMobileVisibleTabs();
  const totalUnread = useUnreadMessages((s) => s.totalUnread);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div
        className="flex items-stretch bg-white/50 dark:bg-white/[0.06] backdrop-blur-2xl border-t border-white/30 dark:border-white/10"
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
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-[2px] py-2 text-[9px] font-medium transition-all duration-200 min-w-0",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <item.icon
                  className={cn("h-[20px] w-[20px] transition-all duration-200", isActive && "scale-110")}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {item.id === "messages" && totalUnread > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white ring-2 ring-background">
                    {totalUnread > 9 ? "9+" : totalUnread}
                  </span>
                )}
              </div>
              <span className={cn(isActive && "font-semibold text-primary")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
