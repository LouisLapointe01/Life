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
import { LogOut, User, Bell } from "lucide-react";
import { LeafLogo } from "@/components/LeafLogo";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import Link from "next/link";
import { usePageTitle } from "@/lib/stores/dashboard-tabs";

export function Header({ title }: { title?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const dynamicTitle = usePageTitle(pathname);

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
  const pageTitle = title ?? dynamicTitle;

  return (
    <header className="flex h-[64px] shrink-0 items-center justify-between px-4 lg:px-8 z-10 bg-white/40 dark:bg-white/[0.06] backdrop-blur-2xl border-b border-white/30 dark:border-white/10">
      {/* Left: Logo (mobile only) + Title */}
      <div className="flex items-center gap-3">
        {/* Logo visible only on mobile (sidebar hidden) */}
        <Link
          href="/dashboard"
          className="flex lg:hidden"
        >
          <LeafLogo size={32} className="rounded-xl shadow-md shadow-teal-500/30" />
        </Link>

        <h1 className="text-[17px] lg:text-xl font-bold tracking-tight">
          {pageTitle}
        </h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-foreground/[0.06] hover:text-foreground">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
        </button>

        {/* Separator */}
        <div className="mx-1 h-5 w-px bg-border" />

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-2xl px-2 py-1.5 transition-all duration-200 hover:bg-foreground/[0.06]">
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
              <span className="hidden text-[13px] font-medium md:block max-w-[120px] truncate">
                {fullName}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5">
            <div className="px-3 py-2 mb-1">
              <p className="text-[13px] font-semibold truncate">{fullName}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
            <DropdownMenuSeparator className="my-1" />
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
