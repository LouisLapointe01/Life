"use client";

import { useState, useEffect, useRef } from "react";
import { Download, X, Share, MoreVertical, Menu } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type BrowserType = "ios-safari" | "ios-chrome" | "ios-firefox" | "ios-opera" | "firefox" | "opera" | "samsung" | "edge" | "chromium" | "unknown";

function detectBrowser(): BrowserType {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    if (isIOS && /CriOS/i.test(ua)) return "ios-chrome";
    if (isIOS && /FxiOS/i.test(ua)) return "ios-firefox";
    if (isIOS && /OPiOS/i.test(ua)) return "ios-opera";
    if (isIOS) return "ios-safari";
    if (/SamsungBrowser/i.test(ua)) return "samsung";
    if (/OPR|Opera/i.test(ua)) return "opera";
    if (/Firefox/i.test(ua)) return "firefox";
    if (/Edg/i.test(ua)) return "edge";
    if (/Chrome|Chromium/i.test(ua)) return "chromium";
    return "unknown";
}

function getInstructions(browser: BrowserType): { title: string; steps: string[]; icon: React.ReactNode } {
    switch (browser) {
        case "ios-safari":
            return {
                title: "Installer sur Safari (iOS)",
                icon: <Share className="h-4 w-4 inline-block text-blue-500" />,
                steps: [
                    "Appuyez sur le bouton Partager ⬆ en bas de Safari",
                    'Faites défiler et appuyez sur "Sur l\'écran d\'accueil"',
                    "Confirmez en appuyant sur Ajouter",
                ],
            };
        case "ios-chrome":
            return {
                title: "Installer sur Chrome (iOS)",
                icon: <MoreVertical className="h-4 w-4 inline-block text-gray-600" />,
                steps: [
                    "Appuyez sur le menu ··· en bas à droite",
                    'Sélectionnez "Ajouter à l\'écran d\'accueil"',
                    "Confirmez en appuyant sur Ajouter",
                ],
            };
        case "ios-firefox":
            return {
                title: "Installer sur Firefox (iOS)",
                icon: <Menu className="h-4 w-4 inline-block text-orange-500" />,
                steps: [
                    "Appuyez sur le menu ☰ en bas à droite",
                    'Sélectionnez "Partager"',
                    'Puis "Sur l\'écran d\'accueil"',
                    "Confirmez en appuyant sur Ajouter",
                ],
            };
        case "ios-opera":
            return {
                title: "Installer sur Opera (iOS)",
                icon: <MoreVertical className="h-4 w-4 inline-block text-red-500" />,
                steps: [
                    "Appuyez sur le menu ··· en bas",
                    'Sélectionnez "Ajouter à l\'écran d\'accueil"',
                    "Confirmez en appuyant sur Ajouter",
                ],
            };
        case "firefox":
            return {
                title: "Installer sur Firefox",
                icon: <Menu className="h-4 w-4 inline-block text-orange-500" />,
                steps: [
                    "Appuyez sur le menu ☰ (trois lignes) en haut à droite",
                    'Sélectionnez "Installer" ou "Ajouter à l\'écran d\'accueil"',
                    "Confirmez l'installation",
                ],
            };
        case "opera":
            return {
                title: "Installer sur Opera",
                icon: <MoreVertical className="h-4 w-4 inline-block text-red-500" />,
                steps: [
                    "Appuyez sur le menu ⋮ en haut à droite",
                    'Sélectionnez "Ajouter à l\'écran d\'accueil"',
                    "Confirmez en appuyant sur Ajouter",
                ],
            };
        case "edge":
            return {
                title: "Installer sur Edge",
                icon: <MoreVertical className="h-4 w-4 inline-block text-blue-600" />,
                steps: [
                    "Appuyez sur le menu ··· en bas à droite",
                    'Sélectionnez "Ajouter au téléphone" ou "Installer"',
                    "Confirmez l'installation",
                ],
            };
        case "samsung":
            return {
                title: "Installer sur Samsung Internet",
                icon: <Menu className="h-4 w-4 inline-block text-purple-600" />,
                steps: [
                    "Appuyez sur le menu ☰ en bas",
                    'Sélectionnez "Ajouter page à" → "Écran d\'accueil"',
                    "Confirmez en appuyant sur Ajouter",
                ],
            };
        default:
            return {
                title: "Installer l'application",
                icon: <Download className="h-4 w-4 inline-block" />,
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
    const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [browser, setBrowser] = useState<BrowserType>("unknown");
    const [showManualInstructions, setShowManualInstructions] = useState(false);

    useEffect(() => {
        const detected = detectBrowser();
        setBrowser(detected);

        // Vérifier si l'app est déjà installée
        const isStandalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            window.matchMedia("(display-mode: fullscreen)").matches ||
            window.matchMedia("(display-mode: minimal-ui)").matches ||
            (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
            document.referrer.startsWith("android-app://");

        if (isStandalone) return;

        // Vérifier si l'utilisateur a déjà fermé le prompt
        const dismissed = localStorage.getItem("pwa-prompt-dismissed");
        if (dismissed) {
            const dismissedDate = new Date(dismissed);
            const daysSince = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSince < 7) return;
        }

        // Pour iOS et navigateurs sans beforeinstallprompt
        if (detected.startsWith("ios") || detected === "firefox" || detected === "samsung" || detected === "unknown") {
            const timer = setTimeout(() => setShowPrompt(true), 2000);
            return () => clearTimeout(timer);
        }

        // Pour Chrome/Edge/Opera (desktop & Android), écouter l'événement beforeinstallprompt
        const handler = (e: Event) => {
            e.preventDefault();
            const evt = e as BeforeInstallPromptEvent;
            setDeferredPrompt(evt);
            deferredPromptRef.current = evt;
            setTimeout(() => setShowPrompt(true), 2000);
        };

        window.addEventListener("beforeinstallprompt", handler);

        // Fallback : si aucun événement beforeinstallprompt après 4s, afficher quand même
        const fallbackTimer = setTimeout(() => {
            if (!deferredPromptRef.current) {
                setShowPrompt(true);
            }
        }, 4000);

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
            clearTimeout(fallbackTimer);
        };
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
                <div className="premium-panel mx-auto max-w-md overflow-hidden">
                    {/* Header gradient */}
                    <div className="relative h-2 bg-gradient-to-r from-teal-500 via-cyan-400 to-emerald-400" />

                    <div className="p-5">
                        {!showManualInstructions ? (
                            <>
                                <div className="flex items-start gap-4">
                                    {/* App icon */}
                                    <img
                                        src="/icons/icon-192.png"
                                        alt="Life"
                                        width={56}
                                        height={56}
                                        className="shrink-0 rounded-2xl shadow-xl shadow-teal-500/30"
                                    />
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
