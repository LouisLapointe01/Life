import { Card, CardContent } from "@/components/ui/card";
import { Code2, Cpu, Globe, Zap } from "lucide-react";

const skills = [
  { icon: Globe, label: "Web Full-Stack", desc: "Next.js, React, TypeScript, Node.js" },
  { icon: Cpu, label: "IoT & Embarqué", desc: "MQTT, Arduino, capteurs, automatisation" },
  { icon: Code2, label: "Bases de données", desc: "PostgreSQL, Supabase, Prisma" },
  { icon: Zap, label: "DevOps & Cloud", desc: "Vercel, GitHub, CI/CD" },
];

export function AboutSection() {
  return (
    <section id="a-propos" className="py-24 px-4 bg-slate-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            À propos
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Développeur passionné avec une expertise dans la création
            d&apos;applications web modernes et de solutions IoT innovantes.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <p className="text-slate-300 leading-relaxed mb-6">
              Je suis développeur full-stack basé au Québec, Canada. Je
              m&apos;intéresse particulièrement à la domotique et aux objets
              connectés, ce qui m&apos;a amené à créer des systèmes IoT
              pour surveiller et automatiser mon environnement.
            </p>
            <p className="text-slate-300 leading-relaxed">
              Mon approche combine des technologies modernes (Next.js,
              TypeScript, Supabase) avec des solutions embarquées (MQTT,
              Arduino) pour créer des applications qui connectent le monde
              physique au numérique.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {skills.map(({ icon: Icon, label, desc }) => (
              <Card key={label} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4">
                  <Icon className="w-6 h-6 text-blue-400 mb-2" />
                  <p className="text-white font-medium text-sm mb-1">{label}</p>
                  <p className="text-slate-400 text-xs">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
