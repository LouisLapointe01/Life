import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { InstallPWAPrompt } from "@/components/InstallPWAPrompt";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Life Dashboard",
  description: "Votre tableau de bord personnel — santé, agenda, logement et plus.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Life",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: [
      { url: "/icons/icon-192.svg", sizes: "192x192" },
      { url: "/icons/icon-512.svg", sizes: "512x512" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileImage": "/icons/icon-192.svg",
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
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.svg" />
        <link rel="icon" type="image/svg+xml" href="/icons/icon-192.svg" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
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
