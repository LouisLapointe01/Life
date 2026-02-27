"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle2 } from "lucide-react";

const subjects = [
  "Consultation technique",
  "Développement web",
  "Projet IoT",
  "Collaboration / Partenariat",
  "Autre",
];

export function AppointmentSection() {
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    date: "", time: "", subject: "", message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Une erreur est survenue");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Impossible de soumettre la demande. Réessayez plus tard.");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <section id="rdv" className="py-24 px-4 bg-slate-950">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Prendre un rendez-vous
          </h2>
          <p className="text-slate-400">
            Réservez un créneau pour discuter de votre projet ou de vos
            besoins. Je vous confirme par retour.
          </p>
        </div>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              Demande de rendez-vous
            </CardTitle>
            <CardDescription className="text-slate-400">
              Je reçois une notification par SMS et vous contacte pour
              confirmer le créneau.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-400" />
                <p className="text-white font-medium text-lg">Demande envoyée !</p>
                <p className="text-slate-400 text-sm max-w-xs">
                  Votre demande de rendez-vous a bien été reçue. Je vous
                  contacterai sous 24h pour confirmer.
                </p>
                <Button
                  variant="outline"
                  className="mt-2 border-slate-600 text-slate-300"
                  onClick={() => setSuccess(false)}
                >
                  Nouvelle demande
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rdv-name" className="text-slate-300">Nom *</Label>
                    <Input
                      id="rdv-name"
                      placeholder="Votre nom"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rdv-phone" className="text-slate-300">Téléphone *</Label>
                    <Input
                      id="rdv-phone"
                      type="tel"
                      placeholder="+1 (514) 000-0000"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      required
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rdv-email" className="text-slate-300">Email *</Label>
                  <Input
                    id="rdv-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rdv-date" className="text-slate-300">Date souhaitée *</Label>
                    <Input
                      id="rdv-date"
                      type="date"
                      min={today}
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      required
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rdv-time" className="text-slate-300">Heure souhaitée *</Label>
                    <Input
                      id="rdv-time"
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                      required
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rdv-subject" className="text-slate-300">Sujet *</Label>
                  <select
                    id="rdv-subject"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                    className="w-full rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="" className="bg-slate-800">Choisir un sujet...</option>
                    {subjects.map((s) => (
                      <option key={s} value={s} className="bg-slate-800">{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rdv-message" className="text-slate-300">
                    Message (optionnel)
                  </Label>
                  <textarea
                    id="rdv-message"
                    rows={3}
                    placeholder="Décrivez brièvement votre projet ou vos besoins..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-white placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <Button type="submit" className="w-full gap-2" disabled={loading}>
                  <Calendar className="w-4 h-4" />
                  {loading ? "Envoi en cours..." : "Demander un rendez-vous"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
