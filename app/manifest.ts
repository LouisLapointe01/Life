import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Life",
    short_name: "Life",
    description: "Votre espace personnel pour suivre messages, agenda, santé et documents.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "window-controls-overlay"],
    orientation: "portrait-primary",
    background_color: "#eef5fb",
    theme_color: "#3BA5A0",
    categories: ["lifestyle", "productivity"],
    prefer_related_applications: false,
    launch_handler: {
      client_mode: "navigate-existing",
    },
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Messages",
        short_name: "Messages",
        url: "/dashboard/messages",
        icons: [{ src: "/pwa-icon?size=192", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Agenda",
        short_name: "Agenda",
        url: "/dashboard/agenda",
        icons: [{ src: "/pwa-icon?size=192", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}