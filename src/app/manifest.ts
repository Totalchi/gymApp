import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "GymApp",
    short_name: "GymApp",
    description:
      "Bouw trainingsschema's, log je workouts en volg je voortgang.",
    start_url: "/dashboard",
    scope: "/",
    lang: "nl",
    categories: ["health", "fitness", "sports"],
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0c11",
    theme_color: "#0a0c11",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
