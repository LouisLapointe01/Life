import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Github, Linkedin } from "lucide-react";

export function HeroSection() {
  return (
    <section
      id="accueil"
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4"
    >
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-full px-4 py-1.5 text-sm text-slate-300 mb-8">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Disponible pour de nouveaux projets
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
          Louis{" "}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Lapointe
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-slate-400 mb-4 font-light">
          Développeur Full-Stack & Passionné d&apos;IoT
        </p>

        <p className="text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed">
          Je conçois des applications web modernes, des systèmes IoT et des
          solutions numériques sur mesure. Passionné par la technologie et
          l&apos;automatisation.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Button asChild size="lg" className="gap-2">
            <a href="#projets">
              Voir mes projets
              <ArrowRight className="w-4 h-4" />
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2 border-slate-600 text-slate-300 hover:bg-slate-800">
            <Link href="/dashboard">
              Accéder au Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        <div className="flex gap-4 justify-center">
          <a
            href="https://github.com/LouisLapointe01"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="GitHub"
          >
            <Github className="w-6 h-6" />
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="LinkedIn"
          >
            <Linkedin className="w-6 h-6" />
          </a>
        </div>
      </div>
    </section>
  );
}
