import { HeroSection } from "@/components/vitrine/HeroSection";
import { AboutSection } from "@/components/vitrine/AboutSection";
import { ProjectsSection } from "@/components/vitrine/ProjectsSection";
import { ContactSection } from "@/components/vitrine/ContactSection";
import { AppointmentSection } from "@/components/vitrine/AppointmentSection";

export default function VitrinePage() {
  return (
    <main>
      <HeroSection />
      <AboutSection />
      <ProjectsSection />
      <AppointmentSection />
      <ContactSection />

      <footer className="bg-slate-950 border-t border-slate-800 py-8 px-4 text-center">
        <p className="text-slate-500 text-sm">
          © {new Date().getFullYear()} Louis Lapointe — Tous droits réservés
        </p>
      </footer>
    </main>
  );
}
