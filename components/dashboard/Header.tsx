"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Search, Bell } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const pageTitles: Record<string, string> = {
  "/dashboard": "Accueil",
  "/dashboard/agenda": "Agenda",
  "/dashboard/sante": "Santé",
  "/dashboard/logement": "Logement",
  "/dashboard/fichiers": "Fichiers",
  "/dashboard/annuaire": "Annuaire",
  "/dashboard/parametres": "Paramètres",
};

export function Header({ title }: { title?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const avatarUrl = user?.user_metadata?.avatar_url;
  const fullName = user?.user_metadata?.full_name ?? user?.email ?? "";
  const pageTitle = title ?? pageTitles[pathname] ?? "Dashboard";

  return (
    <header className="glass-header flex h-[72px] shrink-0 items-center justify-between px-8 z-10">
      {/* Left: Title */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold tracking-tight">
          {pageTitle}
        </h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-foreground/[0.06] hover:text-foreground">
          <Search className="h-[18px] w-[18px]" />
        </button>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-foreground/[0.06] hover:text-foreground">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
        </button>

        {/* Separator */}
        <div className="mx-2 h-6 w-px bg-border" />

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 rounded-2xl px-2.5 py-1.5 transition-all duration-200 hover:bg-foreground/[0.06]">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="h-8 w-8 rounded-full ring-2 ring-white/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-500/20">
                  {fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hidden text-[13px] font-medium md:block">
                {fullName}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5">
            <DropdownMenuItem className="rounded-xl px-3 py-2.5 text-[13px] cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="rounded-xl px-3 py-2.5 text-[13px] text-red-500 cursor-pointer focus:text-red-500"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
