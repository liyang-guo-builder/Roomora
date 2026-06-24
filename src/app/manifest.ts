import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Roomora",
    short_name: "Roomora",
    description: "Redesign your real room. It stays your room.",
    start_url: "/app",
    display: "standalone",
    background_color: "#F6F3EA",
    theme_color: "#7C8866",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
