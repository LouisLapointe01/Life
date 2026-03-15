import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { InstallPWAPrompt } from "@/components/InstallPWAPrompt";
import { Toaster } from "@/components/ui/sonner";
import { SplashRemover } from "@/components/ui/splash-remover";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Life",
  description: "Votre espace personnel pour suivre messages, agenda, santé et documents.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Life",
  },
  icons: {
    icon: [
      { url: "/favicon.svg",          type: "image/svg+xml" },
      { url: "/icons/icon-32.png",    sizes: "32x32",    type: "image/png" },
      { url: "/icons/icon-192.png",   sizes: "192x192",  type: "image/png" },
      { url: "/icons/icon-512.png",   sizes: "512x512",  type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-icon-180.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/apple-icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/apple-icon-120.png", sizes: "120x120", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileImage": "/icons/icon-192.png",
    "msapplication-TileColor": "#3BA5A0",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3BA5A0" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a2e" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-icon-180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-icon-152.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-icon-120.png" />
        <meta name="msapplication-TileImage" content="/icons/icon-192.png" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* HTML splash — visible immediately, before React hydrates */}
        <div id="__life_splash" suppressHydrationWarning>
          <div id="__spl_logo_wrap">
            <div id="__spl_halo" />
            <div id="__spl_logo">
              <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="__spl_bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#44BDB7"/>
                    <stop offset="55%" stopColor="#2DA09B"/>
                    <stop offset="100%" stopColor="#1B7C8A"/>
                  </linearGradient>
                  <linearGradient id="__spl_lf" x1="50" y1="10" x2="50" y2="90" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FFFFFF"/>
                    <stop offset="100%" stopColor="#E2F5F4"/>
                  </linearGradient>
                  <radialGradient id="__spl_shine" cx="42%" cy="27%" r="34%">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55"/>
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0"/>
                  </radialGradient>
                </defs>
                <rect width="100" height="100" fill="url(#__spl_bg)"/>
                <path d="M50 11 C58.5 11.5 72 23 72.5 44 C73 65.5 65 84 50 88.5 C35 84 27 65.5 27.5 44 C28 23 41.5 11.5 50 11 Z" fill="url(#__spl_lf)" opacity="0.97"/>
                <path d="M50 11 C58.5 11.5 72 23 72.5 44 C73 65.5 65 84 50 88.5 C35 84 27 65.5 27.5 44 C28 23 41.5 11.5 50 11 Z" fill="url(#__spl_shine)"/>
                <line x1="50" y1="14" x2="50" y2="84.5" stroke="#1E8986" strokeWidth="1.15" strokeLinecap="round" opacity="0.42"/>
                <path d="M50 30 C46 28.5 41.5 27 36.5 26.5" stroke="#1E8986" strokeWidth="0.95" fill="none" strokeLinecap="round" opacity="0.38"/>
                <path d="M50 30 C54 28.5 58.5 27 63.5 26.5" stroke="#1E8986" strokeWidth="0.95" fill="none" strokeLinecap="round" opacity="0.38"/>
                <path d="M50 50 C45.5 49 40 48.5 34 49" stroke="#1E8986" strokeWidth="0.95" fill="none" strokeLinecap="round" opacity="0.34"/>
                <path d="M50 50 C54.5 49 60 48.5 66 49" stroke="#1E8986" strokeWidth="0.95" fill="none" strokeLinecap="round" opacity="0.34"/>
                <path d="M50 67 C46.5 67.5 42.5 69 38 71.5" stroke="#1E8986" strokeWidth="0.95" fill="none" strokeLinecap="round" opacity="0.28"/>
                <path d="M50 67 C53.5 67.5 57.5 69 62 71.5" stroke="#1E8986" strokeWidth="0.95" fill="none" strokeLinecap="round" opacity="0.28"/>
              </svg>
            </div>
          </div>
          <div id="__spl_dots">
            <div className="spl-dot" />
            <div className="spl-dot" />
            <div className="spl-dot" />
          </div>
        </div>
        <SplashRemover />
        {children}
        <Toaster richColors position="top-right" />
        <InstallPWAPrompt />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
