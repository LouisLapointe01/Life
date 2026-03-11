"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type UserRole = "admin" | "guest";

export interface UserProfile {
  id: string;
  role: UserRole;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface UseProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (fields: { full_name: string }) => Promise<{ error: string | null }>;
  updateEmail: (newEmail: string) => Promise<{ error: string | null }>;
}

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

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
      setLoading(false);
    }

    fetchProfile();
  }, []);

  const updateProfile = useCallback(
    async (fields: { full_name: string }): Promise<{ error: string | null }> => {
      if (!profile) return { error: "Profil non chargé" };

      const supabase = createClient();

      const { error: dbError } = await supabase
        .from("profiles")
        .update({ full_name: fields.full_name })
        .eq("id", profile.id);

      if (dbError) return { error: dbError.message };

      // Sync auth metadata
      await supabase.auth.updateUser({
        data: { full_name: fields.full_name },
      });

      setProfile((prev) => (prev ? { ...prev, full_name: fields.full_name } : prev));
      return { error: null };
    },
    [profile]
  );

  const updateEmail = useCallback(
    async (newEmail: string): Promise<{ error: string | null }> => {
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) return { error: error.message };

      return { error: null };
    },
    []
  );

  return { profile, loading, updateProfile, updateEmail };
}
