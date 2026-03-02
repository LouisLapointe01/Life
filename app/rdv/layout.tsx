import { Sparkles } from "lucide-react";

export default function RdvLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh gradient-mesh">
      <header className="glass-header sticky top-0 z-50">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-[16px] font-bold tracking-tight">Life</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-10">{children}</main>
    </div>
  );
}
