"use client";

import { signOut } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Shield } from "lucide-react";
import type { Session } from "next-auth";

interface DashboardHeaderProps {
  user: Session["user"];
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const isAdmin = user.role === "ADMIN";

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        {user.image && (
          <Image
            src={user.image}
            alt={user.name ?? "Avatar"}
            width={32}
            height={32}
            className="rounded-full"
          />
        )}
        <span className="text-sm text-slate-300 font-medium">
          {user.name ?? user.email}
        </span>
        {isAdmin && (
          <Badge className="bg-amber-900/40 text-amber-300 border border-amber-700 gap-1 text-xs">
            <Shield className="w-3 h-3" />
            Admin
          </Badge>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="text-slate-400 hover:text-white gap-2"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        <LogOut className="w-4 h-4" />
        Déconnexion
      </Button>
    </header>
  );
}
