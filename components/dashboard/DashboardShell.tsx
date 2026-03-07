"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { PageTransition } from "@/components/dashboard/PageTransition";
import { PushNotificationManager } from "@/components/dashboard/PushNotificationManager";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-dvh overflow-hidden">
      {/* Gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#43CEA2]/20 via-[#2B8ECC]/15 to-[#185A9D]/20" />
      <div className="fixed inset-0 gradient-mesh" />
      {/* Subtle glass orbs */}
      <div className="glass-orb glass-orb-cyan fixed w-[500px] h-[500px] -top-40 -left-40 opacity-30 hidden lg:block" />
      <div className="glass-orb glass-orb-green fixed w-[400px] h-[400px] bottom-[-100px] right-[-100px] opacity-25 hidden lg:block" style={{ animationDelay: "4s" }} />
      <div className="glass-orb glass-orb-purple fixed w-[300px] h-[300px] top-[50%] left-[50%] opacity-20 hidden lg:block" style={{ animationDelay: "7s" }} />

      <div className="relative z-10 flex flex-1 h-full min-h-0">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden min-h-0">
          <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-4 py-4 pb-[120px] lg:px-8 lg:py-6 lg:pb-6">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
        <Header />
        <MobileBottomNav />
        <PushNotificationManager />
      </div>
    </div>
  );
}
