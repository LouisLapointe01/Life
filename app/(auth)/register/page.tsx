"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { LeafLogo } from "@/components/LeafLogo";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (form.password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.name },
      },
    });

    if (error) {
      setError(
        error.message === "User already registered"
          ? "Un compte existe déjà avec cet email"
          : error.message
      );
      setLoading(false);
    } else {
      // Confirmation email désactivée → connecté directement
      router.push("/dashboard");
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8">
      {/* Background gradient bleu-vert */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#43CEA2] via-[#2B8ECC] to-[#185A9D]" />
      {/* Glass orbs */}
      <div className="glass-orb glass-orb-cyan fixed w-[400px] h-[400px] -top-20 -right-20" />
      <div className="glass-orb glass-orb-green fixed w-[300px] h-[300px] bottom-10 left-10" style={{ animationDelay: "3s" }} />
      <div className="glass-orb glass-orb-purple fixed w-[250px] h-[250px] top-1/3 left-1/4" style={{ animationDelay: "5s" }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-4 rounded-[1.7rem] border border-white/14 bg-white/10 p-4 text-white/80 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">Inscription</p>
          <p className="mt-2 text-sm leading-6 text-white/72">
            Créez votre espace Life avec une entrée plus premium, plus propre et mieux hiérarchisée.
          </p>
        </div>

        <div className="rounded-[2rem] border border-white/14 bg-white/12 p-8 shadow-[0_34px_90px_-48px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-xl shadow-xl border border-white/30">
              <LeafLogo size={48} />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-white">Créer un compte</h1>
              <p className="mt-1 text-[13px] text-white/70">
                Accédez à votre espace personnel
              </p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-[13px] font-medium text-white/80">
                <User className="h-3.5 w-3.5 text-white/60" />
                Nom complet
              </label>
              <input
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Jean Dupont"
                className="w-full rounded-xl border border-white/18 bg-white/12 px-4 py-3 text-[14px] text-white placeholder:text-white/40 outline-none transition-all focus:border-white/34 focus:bg-white/16 focus:ring-2 focus:ring-white/16"
              />
            </div>

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
                className="w-full rounded-xl border border-white/18 bg-white/12 px-4 py-3 text-[14px] text-white placeholder:text-white/40 outline-none transition-all focus:border-white/34 focus:bg-white/16 focus:ring-2 focus:ring-white/16"
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
                  className="w-full rounded-xl border border-white/18 bg-white/12 px-4 py-3 pr-11 text-[14px] text-white placeholder:text-white/40 outline-none transition-all focus:border-white/34 focus:bg-white/16 focus:ring-2 focus:ring-white/16"
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

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-[13px] font-medium text-white/80">
                <Lock className="h-3.5 w-3.5 text-white/60" />
                Confirmer le mot de passe
              </label>
              <input
                type={showPwd ? "text" : "password"}
                required
                value={form.confirm}
                onChange={(e) =>
                  setForm((f) => ({ ...f, confirm: e.target.value }))
                }
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/18 bg-white/12 px-4 py-3 text-[14px] text-white placeholder:text-white/40 outline-none transition-all focus:border-white/34 focus:bg-white/16 focus:ring-2 focus:ring-white/16"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-300/24 bg-red-500/18 px-4 py-3 text-[13px] font-medium text-red-100 backdrop-blur-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/24 bg-white/18 py-3 text-[14px] font-semibold text-white shadow-[0_18px_45px_-28px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white/28 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Créer mon compte"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-[13px] text-white/60">
            Déjà un compte ?{" "}
            <Link
              href="/login"
              className="font-medium text-white hover:underline"
            >
              Se connecter
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
