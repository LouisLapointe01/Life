"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Chrome } from "lucide-react";

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#F5F5F7] dark:bg-black">
      <div className="mx-4 w-full max-w-sm">
        <div className="rounded-2xl bg-white p-8 shadow-sm dark:bg-[#1C1C1E]">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-[#F5F5F7]">
              Life Dashboard
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Connectez-vous pour accéder à votre espace
            </p>
          </div>

          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="h-12 w-full gap-3 rounded-xl border-gray-200 text-sm font-medium transition-all duration-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <Chrome className="h-5 w-5" />
            Se connecter avec Google
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
          Vos données restent privées et sécurisées.
        </p>
      </div>
    </div>
  );
}
