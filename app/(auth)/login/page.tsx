"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, Lock, Chrome, Eye, EyeOff, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"email" | "google">("email");
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect"
          : error.message
      );
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center gradient-mesh px-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="glass-card p-8 rounded-3xl">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-gradient-to-br from-blue-500 to-blue-600 shadow-xl shadow-blue-500/30">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">Life</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Connectez-vous pour accéder à votre espace
              </p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="mb-6 flex gap-1 rounded-2xl bg-foreground/[0.04] p-1">
            <button
              onClick={() => setTab("email")}
              className={`flex-1 rounded-xl py-2 text-[13px] font-medium transition-all duration-200 ${
                tab === "email"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Email
            </button>
            <button
              onClick={() => setTab("google")}
              className={`flex-1 rounded-xl py-2 text-[13px] font-medium transition-all duration-200 ${
                tab === "google"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Google
            </button>
          </div>

          {/* Email/password form */}
          {tab === "email" && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-[13px] font-medium">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="vous@exemple.com"
                  className="glass-input w-full px-4 py-3 text-[14px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-[13px] font-medium">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    value={form.password}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, password: e.target.value }))
                    }
                    placeholder="••••••••"
                    className="glass-input w-full px-4 py-3 pr-11 text-[14px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPwd ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-[13px] text-red-500 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-[14px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Se connecter"
                )}
              </button>
            </form>
          )}

          {/* Google */}
          {tab === "google" && (
            <button
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-foreground/[0.08] bg-foreground/[0.03] py-3 text-[14px] font-medium transition-all duration-200 hover:bg-foreground/[0.06]"
            >
              <Chrome className="h-5 w-5" />
              Continuer avec Google
            </button>
          )}

          {/* Link to register */}
          <p className="mt-6 text-center text-[13px] text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              S&apos;inscrire
            </Link>
          </p>
        </div>

        <p className="mt-5 text-center text-[12px] text-muted-foreground">
          Vos données restent privées et sécurisées.
        </p>
      </div>
    </div>
  );
}
