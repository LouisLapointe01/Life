"use client";

import { useEffect, useCallback, useRef } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { PageTransition } from "@/components/dashboard/PageTransition";
import { PushNotificationManager } from "@/components/dashboard/PushNotificationManager";
import { useUnreadMessages } from "@/lib/stores/unread-messages";
import { createClient } from "@/lib/supabase/client";

function UnreadBadgeSync() {
  const setTotalUnread = useUnreadMessages((s) => s.setTotalUnread);
  const increment = useUnreadMessages((s) => s.increment);
  const userIdRef = useRef<string | null>(null);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        const total = (data.conversations || []).reduce(
          (sum: number, c: { unread_count: number }) => sum + c.unread_count,
          0
        );
        setTotalUnread(total);
      }
    } catch { /* ignore */ }
  }, [setTotalUnread]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      userIdRef.current = data.user?.id ?? null;
    });

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // Realtime : incrémenter sur nouveau message d'un autre utilisateur
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("unread-badge-rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as { sender_id: string | null };
          if (msg.sender_id && msg.sender_id !== userIdRef.current) {
            increment();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [increment]);

  return null;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="premium-shell-bg premium-grid relative flex h-dvh overflow-hidden">
      <div className="fixed inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent_20%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_18%)]" />
      <div className="glass-orb glass-orb-cyan fixed -left-28 -top-24 hidden h-[420px] w-[420px] opacity-30 lg:block" />
      <div className="glass-orb glass-orb-green fixed bottom-[-140px] right-[-120px] hidden h-[340px] w-[340px] opacity-20 lg:block" style={{ animationDelay: "4s" }} />
      <div className="glass-orb glass-orb-purple fixed left-[44%] top-[18%] hidden h-[260px] w-[260px] opacity-15 lg:block" style={{ animationDelay: "7s" }} />

      <div className="relative z-10 flex h-full min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:pl-3 lg:pr-4 lg:py-4">
          <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-4 py-4 pb-[120px] lg:rounded-[2rem] lg:border lg:border-white/25 lg:bg-white/14 lg:px-8 lg:py-8 lg:pb-8 lg:shadow-[0_24px_70px_rgba(15,23,42,0.08)] lg:backdrop-blur-[6px] dark:lg:border-white/10 dark:lg:bg-white/[0.02]">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
        <Header />
        <MobileBottomNav />
        <PushNotificationManager />
        <UnreadBadgeSync />
      </div>
    </div>
  );
}
