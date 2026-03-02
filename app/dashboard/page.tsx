import { Calendar, Heart, Home, FolderOpen } from "lucide-react";

const widgets = [
  {
    title: "Agenda du jour",
    icon: Calendar,
    description: "Vos rendez-vous et événements",
    color: "text-[#007AFF] dark:text-[#0A84FF]",
  },
  {
    title: "Santé",
    icon: Heart,
    description: "Suivi bien-être et activité",
    color: "text-[#FF2D55] dark:text-[#FF375F]",
  },
  {
    title: "Logement",
    icon: Home,
    description: "État de votre maison connectée",
    color: "text-[#FF9500] dark:text-[#FF9F0A]",
  },
  {
    title: "Fichiers récents",
    icon: FolderOpen,
    description: "Documents et fichiers partagés",
    color: "text-[#34C759] dark:text-[#30D158]",
  },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Bonjour</h2>
        <p className="mt-1 text-muted-foreground">
          Voici un aperçu de votre journée.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
        {widgets.map((widget) => (
          <div
            key={widget.title}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow duration-200 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl bg-accent ${widget.color}`}
              >
                <widget.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{widget.title}</h3>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {widget.description}
            </p>
            <div className="mt-6 flex h-32 items-center justify-center rounded-xl bg-muted">
              <span className="text-xs text-muted-foreground">
                Bientôt disponible
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
