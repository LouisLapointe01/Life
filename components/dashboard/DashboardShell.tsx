"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { RdvModal } from "@/components/dashboard/RdvModal";
import { RdvModalProvider } from "@/contexts/rdv-modal-context";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <RdvModalProvider>
      <div className="flex h-dvh gradient-mesh">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 pb-24 lg:px-8 lg:py-6 lg:pb-6">
            {children}
          </main>
        </div>
        <MobileBottomNav />
        <RdvModal />
      </div>
    </RdvModalProvider>
  );
}
