"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { LeafLogo } from "@/components/LeafLogo";

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type BrowserType = "ios-safari" | "ios-chrome" | "firefox" | "opera" | "samsung" | "chromium" | "unknown";

function detectBrowser(): BrowserType {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    if (isIOS && /CriOS/i.test(ua)) return "ios-chrome";
    if (isIOS) return "ios-safari";
    if (/SamsungBrowser/i.test(ua)) return "samsung";
    if (/OPR|Opera/i.test(ua)) return "opera";
    if (/Firefox/i.test(ua)) return "firefox";
    if (/Chrome|Chromium|Edg/i.test(ua)) return "chromium";
    return "unknown";
}

function getInstructions(browser: BrowserType): { title: string; steps: string[] } {
    switch (browser) {
        case "ios-safari":
            return {
                title: "Installer sur Safari (iOS)",
                steps: [
                    "Appuyez sur le bouton Partager ⬆ en bas de Safari",
                    'Faites défiler et appuyez sur "Sur l\'écran d\'accueil"',
                    "Confirmez en appuyant sur Ajouter",
                ],
            };
        case "ios-chrome":
            return {
                title: "Installer sur Chrome (iOS)",
                steps: [
                    "Appuyez sur le menu ··· en bas à droite",
                    'Sélectionnez "Ajouter à l\'écran d\'accueil"',
                    "Confirmez en appuyant sur Ajouter",
                ],
            };
        case "firefox":
            return {
                title: "Installer sur Firefox",
                steps: [
                    "Appuyez sur le menu ☰ (trois lignes)",
                    'Sélectionnez "Installer" ou "Ajouter à l\'écran d\'accueil"',
                    "Confirmez l'installation",
                ],
            };
        case "opera":
            return {
                title: "Installer sur Opera",
                steps: [
                    "Appuyez sur le menu ⋮ en haut à droite",
                    'Sélectionnez "Ajouter à l\'écran d\'accueil"',
                    "Confirmez en appuyant sur Ajouter",
                ],
            };
        case "samsung":
            return {
                title: "Installer sur Samsung Internet",
                steps: [
                    "Appuyez sur le menu ☰ en bas",
                    'Sélectionnez "Ajouter page à" → "Écran d\'accueil"',
                    "Confirmez en appuyant sur Ajouter",
                ],
            };
        default:
            return {
                title: "Installer l'application",
                steps: [
                    "Ouvrez le menu de votre navigateur",
                    'Cherchez "Installer" ou "Ajouter à l\'écran d\'accueil"',
                    "Confirmez l'installation",
                ],
            };
    }
}

export function InstallPWAPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [browser, setBrowser] = useState<BrowserType>("unknown");
    const [showManualInstructions, setShowManualInstructions] = useState(false);

    useEffect(() => {
        const detected = detectBrowser();
        setBrowser(detected);

        // Vérifier si l'app est déjà installée
        const isStandalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as unknown as { standalone?: boolean }).standalone === true;

        if (isStandalone) return;

        // Vérifier si l'utilisateur a déjà fermé le prompt
        const dismissed = localStorage.getItem("pwa-prompt-dismissed");
        if (dismissed) {
            const dismissedDate = new Date(dismissed);
            const daysSince = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSince < 7) return;
        }

        // Pour iOS et navigateurs sans beforeinstallprompt
        if (detected.startsWith("ios") || detected === "firefox" || detected === "samsung") {
            const timer = setTimeout(() => setShowPrompt(true), 2000);
            return () => clearTimeout(timer);
        }

        // Pour Chrome/Edge/Opera, écouter l'événement beforeinstallprompt
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setTimeout(() => setShowPrompt(true), 2000);
        };

        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === "accepted") {
                setShowPrompt(false);
            }
            setDeferredPrompt(null);
        } else {
            setShowManualInstructions(true);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        setShowManualInstructions(false);
        localStorage.setItem("pwa-prompt-dismissed", new Date().toISOString());
    };

    if (!showPrompt) return null;

    const instructions = getInstructions(browser);

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm animate-fade-in"
                onClick={handleDismiss}
            />

            {/* Prompt */}
            <div className="fixed bottom-0 left-0 right-0 z-[101] p-4 animate-slide-up safe-bottom">
                <div className="glass-card mx-auto max-w-md overflow-hidden">
                    {/* Header gradient */}
                    <div className="relative h-2 bg-gradient-to-r from-teal-500 via-cyan-400 to-emerald-400" />

                    <div className="p-5">
                        {!showManualInstructions ? (
                            <>
                                <div className="flex items-start gap-4">
                                    {/* App icon */}
                                    <LeafLogo size={56} className="shrink-0 rounded-2xl shadow-xl shadow-teal-500/30" />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-[16px] font-bold">Installer Life</h3>
                                        <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
                                            Ajoutez Life à votre écran d&apos;accueil pour un accès rapide, même hors ligne.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleDismiss}
                                        className="shrink-0 rounded-xl p-1.5 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="mt-4 flex gap-3">
                                    <button
                                        onClick={handleDismiss}
                                        className="flex-1 rounded-2xl bg-foreground/[0.06] py-3 text-[14px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground"
                                    >
                                        Plus tard
                                    </button>
                                    <button
                                        onClick={handleInstall}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-[14px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:-translate-y-0.5"
                                    >
                                        <Download className="h-4 w-4" />
                                        Installer
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* Manual install instructions */
                            <>
                                <div className="flex items-start justify-between">
                                    <h3 className="text-[16px] font-bold">{instructions.title}</h3>
                                    <button
                                        onClick={handleDismiss}
                                        className="shrink-0 rounded-xl p-1.5 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="mt-4 space-y-3">
                                    {instructions.steps.map((step, i) => (
                                        <div key={i} className="flex items-center gap-3 rounded-2xl bg-foreground/[0.04] p-3">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-[14px] font-bold text-primary">
                                                {i + 1}
                                            </div>
                                            <p className="text-[13px]">{step}</p>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={handleDismiss}
                                    className="mt-4 w-full rounded-2xl bg-foreground/[0.06] py-3 text-[14px] font-medium text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground"
                                >
                                    J&apos;ai compris
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
