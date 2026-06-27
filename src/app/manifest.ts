import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Placet — votez vraiment comme il faut",
    short_name: "Placet",
    description: "Créez et partagez des votes de groupe avec la bonne méthode de scrutin.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF6EC",
    theme_color: "#16213A",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
