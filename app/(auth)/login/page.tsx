"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, Lock, Chrome, Eye, EyeOff } from "lucide-react";
import { LeafLogo } from "@/components/LeafLogo";
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
      router.refresh();
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      {/* Background gradient bleu-vert */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#43CEA2] via-[#2B8ECC] to-[#185A9D]" />
      {/* Glass orbs */}
      <div className="glass-orb glass-orb-cyan fixed w-[400px] h-[400px] -top-20 -left-20" />
      <div className="glass-orb glass-orb-green fixed w-[300px] h-[300px] bottom-10 right-10" style={{ animationDelay: "3s" }} />
      <div className="glass-orb glass-orb-blue fixed w-[250px] h-[250px] top-1/2 left-1/2" style={{ animationDelay: "5s" }} />

      <div className="relative z-10 w-full max-w-sm">
        {/* Card glassmorphism */}
        <div className="glass-surface p-8">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-xl shadow-xl border border-white/30">
              <LeafLogo size={48} className="" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-white">Life</h1>
              <p className="mt-1 text-[13px] text-white/70">
                Connectez-vous pour accéder à votre espace
              </p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="mb-6 flex gap-1 rounded-2xl bg-white/10 p-1 backdrop-blur-sm">
            <button
              onClick={() => setTab("email")}
              className={`flex-1 rounded-xl py-2 text-[13px] font-medium transition-all duration-200 ${tab === "email"
                  ? "bg-white/20 shadow-sm text-white backdrop-blur-sm"
                  : "text-white/60 hover:text-white"
                }`}
            >
              Email
            </button>
            <button
              onClick={() => setTab("google")}
              className={`flex-1 rounded-xl py-2 text-[13px] font-medium transition-all duration-200 ${tab === "google"
                  ? "bg-white/20 shadow-sm text-white backdrop-blur-sm"
                  : "text-white/60 hover:text-white"
                }`}
            >
              Google
            </button>
          </div>

          {/* Email/password form */}
          {tab === "email" && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-[13px] font-medium text-white/80">
                  <Mail className="h-3.5 w-3.5 text-white/60" />
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
                  className="w-full rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-3 text-[14px] text-white placeholder:text-white/40 outline-none transition-all focus:border-white/40 focus:bg-white/20 focus:ring-2 focus:ring-white/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-[13px] font-medium text-white/80">
                  <Lock className="h-3.5 w-3.5 text-white/60" />
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
                    className="w-full rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-3 pr-11 text-[14px] text-white placeholder:text-white/40 outline-none transition-all focus:border-white/40 focus:bg-white/20 focus:ring-2 focus:ring-white/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
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
                <div className="rounded-2xl bg-red-500/20 backdrop-blur-sm border border-red-400/30 px-4 py-3 text-[13px] text-red-100 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/25 backdrop-blur-sm border border-white/30 py-3 text-[14px] font-semibold text-white shadow-lg transition-all hover:bg-white/35 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50"
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
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 py-3 text-[14px] font-medium text-white transition-all duration-200 hover:bg-white/25"
            >
              <Chrome className="h-5 w-5" />
              Continuer avec Google
            </button>
          )}

          {/* Link to register */}
          <p className="mt-6 text-center text-[13px] text-white/60">
            Pas encore de compte ?{" "}
            <Link
              href="/register"
              className="font-medium text-white hover:underline"
            >
              S&apos;inscrire
            </Link>
          </p>
        </div>

        <p className="mt-5 text-center text-[12px] text-white/40">
          Vos données restent privées et sécurisées.
        </p>
      </div>
    </div>
  );
}
