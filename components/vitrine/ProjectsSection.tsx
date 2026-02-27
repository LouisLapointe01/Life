import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Github } from "lucide-react";

const projects = [
  {
    title: "Plant IoT",
    description:
      "Système de surveillance et d'arrosage automatique de plantes connecté via MQTT. Monitore l'humidité du sol, la température, le niveau d'eau et la batterie en temps réel.",
    tags: ["Next.js", "Prisma", "MQTT", "Supabase", "TypeScript"],
    github: "https://github.com/LouisLapointe01/plant-iot",
    live: null,
  },
  {
    title: "MyLife Dashboard",
    description:
      "Suite d'applications web personnelles : surveillance IoT de la maison, suivi budgétaire, santé/sport et agenda. Tableau de bord centralisé pour les données de vie quotidienne.",
    tags: ["Next.js", "TypeScript", "Supabase", "NextAuth", "Twilio"],
    github: "https://github.com/LouisLapointe01/plant-iot",
    live: null,
  },
];

export function ProjectsSection() {
  return (
    <section id="projets" className="py-24 px-4 bg-slate-950">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Mes projets
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Quelques projets récents qui illustrent mon approche et mes
            compétences techniques.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {projects.map((project) => (
            <Card
              key={project.title}
              className="bg-slate-900 border-slate-700 hover:border-slate-500 transition-colors"
            >
              <CardHeader>
                <CardTitle className="text-white">{project.title}</CardTitle>
                <CardDescription className="text-slate-400">
                  {project.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-slate-800 text-slate-300 border-slate-600"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  {project.github && (
                    <Button asChild size="sm" variant="outline" className="gap-1 border-slate-600 text-slate-300 hover:bg-slate-800">
                      <a href={project.github} target="_blank" rel="noopener noreferrer">
                        <Github className="w-3 h-3" />
                        Code
                      </a>
                    </Button>
                  )}
                  {project.live && (
                    <Button asChild size="sm" className="gap-1">
                      <a href={project.live} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" />
                        Démo
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
