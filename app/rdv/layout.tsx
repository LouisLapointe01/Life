import { Sparkles } from "lucide-react";
import Link from "next/link";

export default function RdvLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* Gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#43CEA2] via-[#2B8ECC] to-[#185A9D]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(67,206,162,0.4)_0%,transparent_50%),radial-gradient(ellipse_at_70%_80%,rgba(24,90,157,0.3)_0%,transparent_50%)]" />
      {/* Glass orbs */}
      <div className="glass-orb glass-orb-cyan fixed w-[400px] h-[400px] -top-20 -left-20" />
      <div className="glass-orb glass-orb-green fixed w-[300px] h-[300px] bottom-10 right-[-50px]" style={{ animationDelay: "3s" }} />
      <div className="glass-orb glass-orb-blue fixed w-[250px] h-[250px] top-[60%] left-[30%]" style={{ animationDelay: "5s" }} />

      <div className="relative z-10">
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/10 border-b border-white/15">
          <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-xl shadow-lg border border-white/30">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-[16px] font-bold tracking-tight text-white">Life</span>
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-white/25 transition-all"
            >
              Connexion
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-10">{children}</main>
      </div>
    </div>
  );
}
