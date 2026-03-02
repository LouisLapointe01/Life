"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export type UserRole = "admin" | "guest";

export interface UserProfile {
  id: string;
  role: UserRole;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export function useProfile(): UserProfile | null {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function fetchProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("id, role, full_name, avatar_url")
        .eq("id", user.id)
        .single();

      setProfile({
        id: user.id,
        role: (data?.role as UserRole) ?? "guest",
        email: user.email ?? null,
        full_name: data?.full_name ?? user.user_metadata?.full_name ?? null,
        avatar_url: data?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
      });
    }

    fetchProfile();
  }, []);

  return profile;
}
