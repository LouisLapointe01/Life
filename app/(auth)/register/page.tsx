"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, Lock, User, Eye, EyeOff, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      setError(
        error.message === "User already registered"
          ? "Un compte existe déjà avec cet email"
          : error.message
      );
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex min-h-dvh items-center justify-center gradient-mesh px-4">
        <div className="w-full max-w-sm">
          <div className="glass-card p-8 rounded-3xl text-center">
            <div className="mb-6 flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-green-500/15">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Compte créé !</h2>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  Un email de confirmation a été envoyé à{" "}
                  <strong>{form.email}</strong>. Vérifiez votre boîte mail pour
                  activer votre compte.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="flex w-full items-center justify-center rounded-2xl bg-primary py-3 text-[14px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center gradient-mesh px-4">
      <div className="w-full max-w-sm">
        <div className="glass-card p-8 rounded-3xl">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-gradient-to-br from-blue-500 to-blue-600 shadow-xl shadow-blue-500/30">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">Créer un compte</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Accédez à votre espace personnel
              </p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-[13px] font-medium">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Nom complet
              </label>
              <input
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Jean Dupont"
                className="glass-input w-full px-4 py-3 text-[14px]"
              />
            </div>

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

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-[13px] font-medium">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
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
                className="glass-input w-full px-4 py-3 text-[14px]"
              />
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
                "Créer mon compte"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-[13px] text-muted-foreground">
            Déjà un compte ?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Se connecter
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
