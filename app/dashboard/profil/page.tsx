"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Shield, Settings, MessageCircle, Pencil, Loader2, X, Check } from "lucide-react";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";

export default function ProfilPage() {
  const { profile, loading, updateProfile, updateEmail } = useProfile();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const fullName = profile?.full_name ?? "Profil";
  const email = profile?.email ?? "Adresse e-mail indisponible";
  const avatarUrl = profile?.avatar_url;
  const roleLabel = profile?.role === "admin" ? "Administrateur" : "Invité";

  function startEditing() {
    setEditName(profile?.full_name ?? "");
    setEditEmail(profile?.email ?? "");
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);

    const nameChanged = editName.trim() !== (profile?.full_name ?? "");
    const emailChanged = editEmail.trim() !== (profile?.email ?? "");

    if (nameChanged) {
      const { error } = await updateProfile({ full_name: editName.trim() });
      if (error) {
        toast.error("Erreur lors de la mise à jour du nom", { description: error });
        setSaving(false);
        return;
      }
    }

    if (emailChanged) {
      const { error } = await updateEmail(editEmail.trim());
      if (error) {
        toast.error("Erreur lors de la mise à jour de l'email", { description: error });
        setSaving(false);
        return;
      }
      toast.success("Email de confirmation envoyé", {
        description: `Un lien de confirmation a été envoyé à ${editEmail.trim()}. Vérifiez votre boîte de réception.`,
      });
    }

    if (nameChanged && !emailChanged) {
      toast.success("Profil mis à jour");
    }

    setEditing(false);
    setSaving(false);
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-16 lg:pb-0">
      <section className="premium-panel overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="premium-grid absolute inset-0 opacity-35" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName}
                className="h-20 w-20 shrink-0 rounded-[1.75rem] object-cover ring-1 ring-white/35 shadow-[0_20px_45px_rgba(15,23,42,0.14)]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-600 text-2xl font-semibold text-white shadow-[0_20px_45px_rgba(15,23,42,0.14)]">
                {fullName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-primary/75">Profil</p>
                {!editing && (
                  <button
                    onClick={startEditing}
                    className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                    title="Modifier le profil"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {editing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/30 bg-white/40 px-3 py-2 text-[22px] font-semibold tracking-[-0.05em] text-foreground backdrop-blur-sm outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/[0.06] sm:text-[28px]"
                  placeholder="Votre nom"
                  autoFocus
                />
              ) : (
                <h1 className="mt-2 truncate text-[28px] font-semibold tracking-[-0.05em] text-foreground sm:text-[34px]">
                  {fullName}
                </h1>
              )}

              {!editing && (
                <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
                  Votre photo, votre identité et les accès principaux du compte sont regroupés ici.
                </p>
              )}

              {editing && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Sauvegarder
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-xl bg-foreground/[0.06] px-4 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.1] hover:text-foreground disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="premium-panel-soft flex items-center gap-3 rounded-[1.5rem] px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Role</p>
              <p className="text-[14px] font-semibold text-foreground">{roleLabel}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="premium-panel-soft rounded-[1.75rem] p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Coordonnees</p>
          <div className="mt-4 flex items-start gap-3 rounded-[1.25rem] bg-white/55 px-4 py-3 dark:bg-white/[0.04]">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mail className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-foreground">Adresse e-mail</p>
              {editing ? (
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/30 bg-white/40 px-2.5 py-1.5 text-[13px] text-foreground backdrop-blur-sm outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/[0.06]"
                  placeholder="votre@email.com"
                />
              ) : (
                <p className="mt-1 break-all text-[13px] text-muted-foreground">{email}</p>
              )}
            </div>
          </div>
        </div>

        <div className="premium-panel-soft rounded-[1.75rem] p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Acces rapides</p>
          <div className="mt-4 grid gap-3">
            <Link
              href="/dashboard/parametres"
              className="flex items-center gap-3 rounded-[1.25rem] bg-white/55 px-4 py-3 transition-colors hover:bg-white/72 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground">
                <Settings className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-foreground">Parametres</p>
                <p className="text-[12px] text-muted-foreground">Notifications, sections et preferences.</p>
              </div>
            </Link>

            <Link
              href="/dashboard/messages"
              className="flex items-center gap-3 rounded-[1.25rem] bg-white/55 px-4 py-3 transition-colors hover:bg-white/72 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/12 text-teal-600 dark:text-teal-400">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-foreground">Messages</p>
                <p className="text-[12px] text-muted-foreground">Revenir aux discussions rapidement.</p>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
