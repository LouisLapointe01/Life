import {
  Calendar,
  Heart,
  Home,
  FolderOpen,
  ArrowUpRight,
  Activity,
  Thermometer,
  Droplets,
  Sun,
} from "lucide-react";
import Link from "next/link";

const widgets = [
  {
    title: "Agenda",
    icon: Calendar,
    description: "3 rendez-vous aujourd'hui",
    href: "/dashboard/agenda",
    gradient: "from-orange-500 to-amber-500",
    shadowColor: "shadow-orange-500/20",
    stat: "3",
    statLabel: "événements",
  },
  {
    title: "Santé",
    icon: Heart,
    description: "Score bien-être : 87%",
    href: "/dashboard/sante",
    gradient: "from-pink-500 to-rose-500",
    shadowColor: "shadow-pink-500/20",
    stat: "87%",
    statLabel: "bien-être",
  },
  {
    title: "Logement",
    icon: Home,
    description: "Tout fonctionne correctement",
    href: "/dashboard/logement",
    gradient: "from-amber-500 to-yellow-500",
    shadowColor: "shadow-amber-500/20",
    stat: "22°C",
    statLabel: "intérieur",
  },
  {
    title: "Fichiers",
    icon: FolderOpen,
    description: "12 fichiers récents",
    href: "/dashboard/fichiers",
    gradient: "from-green-500 to-emerald-500",
    shadowColor: "shadow-green-500/20",
    stat: "12",
    statLabel: "récents",
  },
];

const quickStats = [
  { icon: Thermometer, label: "Température", value: "22°C", color: "text-orange-500" },
  { icon: Droplets, label: "Humidité", value: "45%", color: "text-blue-500" },
  { icon: Activity, label: "Énergie", value: "3.2 kWh", color: "text-green-500" },
  { icon: Sun, label: "UV Index", value: "Faible", color: "text-amber-500" },
];

export default function DashboardPage() {
  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Bonjour"
      : now.getHours() < 18
        ? "Bon après-midi"
        : "Bonsoir";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Greeting */}
      <div className="animate-slide-up">
        <h2 className="text-3xl font-bold tracking-tight">{greeting} 👋</h2>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          Voici un aperçu de votre journée du{" "}
          {now.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          .
        </p>
      </div>

      {/* Quick Stats Bar */}
      <div
        className="glass-card flex items-center justify-between px-6 py-4 animate-slide-up"
        style={{ animationDelay: "100ms" }}
      >
        {quickStats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-3">
            <div className={`${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-sm font-semibold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Widgets Grid */}
      <div className="grid gap-5 sm:grid-cols-2">
        {widgets.map((widget, index) => (
          <Link
            key={widget.title}
            href={widget.href}
            className="group animate-slide-up"
            style={{ animationDelay: `${(index + 2) * 100}ms` }}
          >
            <div className="glass-card relative overflow-hidden p-6">
              {/* Background gradient blob */}
              <div
                className={`absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${widget.gradient} opacity-20 blur-2xl transition-all duration-500 group-hover:opacity-30 group-hover:scale-125`}
              />

              {/* Header */}
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${widget.gradient} shadow-lg ${widget.shadowColor}`}
                  >
                    <widget.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold">{widget.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {widget.description}
                    </p>
                  </div>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/[0.04] text-muted-foreground transition-all duration-300 group-hover:bg-foreground/[0.08] group-hover:text-foreground">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>

              {/* Stat */}
              <div className="relative mt-8">
                <span className="text-4xl font-bold tracking-tight">
                  {widget.stat}
                </span>
                <span className="ml-2 text-sm text-muted-foreground">
                  {widget.statLabel}
                </span>
              </div>

              {/* Mini chart placeholder */}
              <div className="relative mt-4 h-12 overflow-hidden rounded-xl bg-foreground/[0.03]">
                <div
                  className={`absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t ${widget.gradient} opacity-10 rounded-b-xl`}
                />
                <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 40">
                  <path
                    d="M0 35 Q 15 28, 25 30 T 50 20 T 75 25 T 100 15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-muted-foreground/30"
                  />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
