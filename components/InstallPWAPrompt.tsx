"use client";

import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPWAPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    useEffect(() => {
        // Vérifier si on est sur mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );

        // Vérifier si c'est iOS
        const isIOSDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        setIsIOS(isIOSDevice);

        // Vérifier si l'app est déjà installée
        const isStandalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as unknown as { standalone?: boolean }).standalone === true;

        if (isStandalone || !isMobile) return;

        // Vérifier si l'utilisateur a déjà fermé le prompt
        const dismissed = localStorage.getItem("pwa-prompt-dismissed");
        if (dismissed) {
            const dismissedDate = new Date(dismissed);
            const daysSince = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSince < 7) return; // Re-montrer après 7 jours
        }

        // Pour iOS, montrer les instructions manuelles
        if (isIOSDevice) {
            const timer = setTimeout(() => setShowPrompt(true), 2000);
            return () => clearTimeout(timer);
        }

        // Pour Android/Chrome, écouter l'événement beforeinstallprompt
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
        } else if (isIOS) {
            setShowIOSInstructions(true);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        setShowIOSInstructions(false);
        localStorage.setItem("pwa-prompt-dismissed", new Date().toISOString());
    };

    if (!showPrompt) return null;

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
                    <div className="relative h-2 bg-gradient-to-r from-blue-500 via-cyan-400 to-green-400" />

                    <div className="p-5">
                        {!showIOSInstructions ? (
                            <>
                                <div className="flex items-start gap-4">
                                    {/* App icon */}
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-xl shadow-blue-500/30">
                                        <Smartphone className="h-6 w-6 text-white" />
                                    </div>
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
                            /* iOS instructions */
                            <>
                                <div className="flex items-start justify-between">
                                    <h3 className="text-[16px] font-bold">Installer sur iPhone</h3>
                                    <button
                                        onClick={handleDismiss}
                                        className="shrink-0 rounded-xl p-1.5 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="mt-4 space-y-3">
                                    <div className="flex items-center gap-3 rounded-2xl bg-foreground/[0.04] p-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-[14px] font-bold text-primary">
                                            1
                                        </div>
                                        <p className="text-[13px]">
                                            Appuyez sur le bouton <span className="font-semibold">Partager</span>{" "}
                                            <span className="inline-block text-[16px]">⬆</span> en bas de Safari
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 rounded-2xl bg-foreground/[0.04] p-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-[14px] font-bold text-primary">
                                            2
                                        </div>
                                        <p className="text-[13px]">
                                            Faites défiler et appuyez sur{" "}
                                            <span className="font-semibold">&quot;Sur l&apos;écran d&apos;accueil&quot;</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 rounded-2xl bg-foreground/[0.04] p-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-[14px] font-bold text-primary">
                                            3
                                        </div>
                                        <p className="text-[13px]">
                                            Confirmez en appuyant sur <span className="font-semibold">Ajouter</span>
                                        </p>
                                    </div>
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
