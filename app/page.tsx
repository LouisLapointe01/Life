"use client";

import Link from "next/link";
import {
  Sparkles,
  CalendarDays,
  Heart,
  Home,
  FolderOpen,
  Users,
  ArrowRight,
  Mail,
  Send,
  Shield,
  Zap,
  Globe,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* ── Background gradient ── */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#43CEA2] via-[#2B8ECC] to-[#185A9D]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(67,206,162,0.4)_0%,transparent_50%),radial-gradient(ellipse_at_70%_80%,rgba(24,90,157,0.3)_0%,transparent_50%)]" />

      {/* ── Glass orbs ── */}
      <div className="glass-orb glass-orb-cyan fixed w-[500px] h-[500px] -top-32 -left-32" />
      <div className="glass-orb glass-orb-green fixed w-[400px] h-[400px] bottom-20 right-[-80px]" style={{ animationDelay: "3s" }} />
      <div className="glass-orb glass-orb-blue fixed w-[350px] h-[350px] top-[60%] left-[20%]" style={{ animationDelay: "5s" }} />
      <div className="glass-orb glass-orb-purple fixed w-[300px] h-[300px] top-[10%] right-[15%]" style={{ animationDelay: "7s" }} />

      {/* ── Content ── */}
      <div className="relative z-10">
        {/* ─── Navbar ─── */}
        <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/10 border-b border-white/15">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-xl shadow-lg border border-white/30">
                <Sparkles className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Life</span>
            </div>
            <div className="hidden sm:flex items-center gap-6">
              <a href="#projet" className="text-[13px] font-medium text-white/70 hover:text-white transition-colors">
                Le Projet
              </a>
              <a href="#fonctionnalites" className="text-[13px] font-medium text-white/70 hover:text-white transition-colors">
                Fonctionnalités
              </a>
              <a href="#rdv" className="text-[13px] font-medium text-white/70 hover:text-white transition-colors">
                Prendre RDV
              </a>
              <a href="#contact" className="text-[13px] font-medium text-white/70 hover:text-white transition-colors">
                Contact
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-xl px-4 py-2 text-[13px] font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all"
              >
                Connexion
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-white/20 backdrop-blur-sm border border-white/25 px-4 py-2 text-[13px] font-semibold text-white shadow-lg hover:bg-white/30 hover:-translate-y-0.5 transition-all"
              >
                S&apos;inscrire
              </Link>
            </div>
          </div>
        </nav>

        {/* ─── Hero ─── */}
        <section className="px-5 sm:px-8 pt-20 sm:pt-28 pb-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-1.5">
              <Zap className="h-3.5 w-3.5 text-yellow-300" />
              <span className="text-[12px] font-medium text-white/90">Votre tableau de bord personnel</span>
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
              Gérez votre vie,
              <br />
              <span className="bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
                simplement.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[15px] sm:text-[17px] leading-relaxed text-white/70">
              Santé, agenda, logement, fichiers — tout centralisé dans un espace unique, sécurisé et élégant. Reprenez le contrôle de votre quotidien.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-[14px] font-semibold text-[#185A9D] shadow-xl shadow-black/10 hover:shadow-2xl hover:-translate-y-1 transition-all"
              >
                Commencer gratuitement
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/rdv"
                className="flex items-center gap-2 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 px-7 py-3.5 text-[14px] font-semibold text-white hover:bg-white/25 hover:-translate-y-0.5 transition-all"
              >
                <CalendarDays className="h-4 w-4" />
                Prendre rendez-vous
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Section Projet ─── */}
        <section id="projet" className="px-5 sm:px-8 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="glass-surface p-8 sm:p-12">
              <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 mb-4">
                    <Globe className="h-3.5 w-3.5 text-white/70" />
                    <span className="text-[12px] font-medium text-white/70">Le projet</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                    Présentation de Life
                  </h2>
                  <p className="mt-4 text-[14px] sm:text-[15px] leading-relaxed text-white/70">
                    <strong className="text-white">Life</strong> est un tableau de bord personnel conçu pour centraliser tous les aspects importants de votre quotidien.
                    Fini les applications éparpillées — retrouvez votre agenda, vos données de santé,
                    vos documents et la gestion de votre logement au même endroit.
                  </p>
                  <p className="mt-3 text-[14px] sm:text-[15px] leading-relaxed text-white/70">
                    L&apos;application est pensée pour être simple, intuitive et respectueuse de votre vie privée.
                    Vos données sont sécurisées et vous gardez le contrôle total.
                  </p>
                </div>
                <div className="flex-shrink-0 grid grid-cols-2 gap-3 sm:gap-4">
                  {[
                    { icon: Shield, label: "Sécurisé", desc: "Données chiffrées" },
                    { icon: Zap, label: "Rapide", desc: "Interface fluide" },
                    { icon: Globe, label: "Accessible", desc: "Web & mobile" },
                    { icon: Heart, label: "Bien-être", desc: "Suivi santé" },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-4 sm:p-5 text-center hover:bg-white/15 transition-all">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                        <item.icon className="h-5 w-5 text-white" />
                      </div>
                      <p className="text-[13px] font-semibold text-white">{item.label}</p>
                      <p className="text-[11px] text-white/50">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Fonctionnalités ─── */}
        <section id="fonctionnalites" className="px-5 sm:px-8 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Tout ce dont vous avez besoin
              </h2>
              <p className="mt-3 text-[14px] sm:text-[15px] text-white/60 max-w-md mx-auto">
                Un écosystème complet pour gérer votre vie quotidienne.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: CalendarDays,
                  title: "Agenda",
                  desc: "Gérez vos rendez-vous, événements et rappels au même endroit.",
                  gradient: "from-orange-400 to-amber-500",
                  shadow: "shadow-orange-500/25",
                },
                {
                  icon: Heart,
                  title: "Santé",
                  desc: "Suivez votre bien-être, IMC, sommeil et activité physique.",
                  gradient: "from-pink-400 to-rose-500",
                  shadow: "shadow-pink-500/25",
                },
                {
                  icon: Home,
                  title: "Logement",
                  desc: "Température, énergie, tâches ménagères et contrats.",
                  gradient: "from-amber-400 to-yellow-500",
                  shadow: "shadow-amber-500/25",
                },
                {
                  icon: FolderOpen,
                  title: "Fichiers",
                  desc: "Centralisez vos documents importants en toute sécurité.",
                  gradient: "from-green-400 to-emerald-500",
                  shadow: "shadow-green-500/25",
                },
                {
                  icon: Users,
                  title: "Annuaire",
                  desc: "Gérez vos contacts personnels et professionnels.",
                  gradient: "from-purple-400 to-violet-500",
                  shadow: "shadow-purple-500/25",
                },
                {
                  icon: CalendarDays,
                  title: "Prise de RDV",
                  desc: "Permettez à vos proches de réserver un créneau facilement.",
                  gradient: "from-blue-400 to-cyan-500",
                  shadow: "shadow-blue-500/25",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="group glass-surface p-6 hover:bg-white/25 transition-all"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-lg ${feature.shadow}`}
                  >
                    <feature.icon className="h-5.5 w-5.5 text-white" />
                  </div>
                  <h3 className="mt-4 text-[16px] font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/60">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Section RDV ─── */}
        <section id="rdv" className="px-5 sm:px-8 py-20">
          <div className="mx-auto max-w-3xl">
            <div className="glass-surface p-8 sm:p-12 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-white/30 to-white/10 border border-white/30">
                <CalendarDays className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Prendre rendez-vous
              </h2>
              <p className="mt-3 text-[14px] sm:text-[15px] text-white/65 max-w-md mx-auto">
                Réservez un créneau directement en ligne. Choisissez la personne, le type de rendez-vous, la date et l&apos;heure qui vous conviennent.
              </p>
              <Link
                href="/rdv"
                className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-[14px] font-semibold text-[#185A9D] shadow-xl shadow-black/10 hover:shadow-2xl hover:-translate-y-1 transition-all"
              >
                <CalendarDays className="h-4 w-4" />
                Réserver un créneau
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Section Contact ─── */}
        <section id="contact" className="px-5 sm:px-8 py-20 pb-32">
          <div className="mx-auto max-w-3xl">
            <div className="glass-surface p-8 sm:p-12">
              <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 mb-4">
                    <Mail className="h-3.5 w-3.5 text-white/70" />
                    <span className="text-[12px] font-medium text-white/70">Contact</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">
                    Me contacter
                  </h2>
                  <p className="mt-3 text-[14px] leading-relaxed text-white/65">
                    Une question, une suggestion ou besoin d&apos;aide ? N&apos;hésitez pas à me contacter. Je vous répondrai le plus rapidement possible.
                  </p>
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                        <Mail className="h-4 w-4 text-white/70" />
                      </div>
                      <span className="text-[14px] text-white/80">contact@life-app.fr</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
                    <input
                      type="text"
                      placeholder="Votre nom"
                      className="w-full rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-3 text-[14px] text-white placeholder:text-white/40 outline-none transition-all focus:border-white/40 focus:bg-white/20 focus:ring-2 focus:ring-white/20"
                    />
                    <input
                      type="email"
                      placeholder="Votre email"
                      className="w-full rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-3 text-[14px] text-white placeholder:text-white/40 outline-none transition-all focus:border-white/40 focus:bg-white/20 focus:ring-2 focus:ring-white/20"
                    />
                    <textarea
                      rows={4}
                      placeholder="Votre message..."
                      className="w-full rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-3 text-[14px] text-white placeholder:text-white/40 outline-none transition-all focus:border-white/40 focus:bg-white/20 focus:ring-2 focus:ring-white/20 resize-none"
                    />
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/25 backdrop-blur-sm border border-white/30 py-3 text-[14px] font-semibold text-white shadow-lg hover:bg-white/35 hover:-translate-y-0.5 transition-all"
                    >
                      <Send className="h-4 w-4" />
                      Envoyer
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="border-t border-white/10 backdrop-blur-xl bg-white/5">
          <div className="mx-auto max-w-5xl px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 border border-white/20">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-[14px] font-semibold text-white/80">Life</span>
            </div>
            <div className="flex items-center gap-5">
              <Link href="/login" className="text-[12px] text-white/50 hover:text-white/80 transition-colors">
                Connexion
              </Link>
              <Link href="/register" className="text-[12px] text-white/50 hover:text-white/80 transition-colors">
                Inscription
              </Link>
              <Link href="/rdv" className="text-[12px] text-white/50 hover:text-white/80 transition-colors">
                Prendre RDV
              </Link>
            </div>
            <p className="text-[11px] text-white/30">
              &copy; {new Date().getFullYear()} Life. Tous droits réservés.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
