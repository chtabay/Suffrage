import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Placet — votez vraiment comme il faut",
    short_name: "Placet",
    description: "Créez et partagez des votes de groupe avec la bonne méthode de scrutin.",
    start_url: "/",
    // ⚠️ L'ICÔNE OUVRE L'ACCUEIL DE PLACET, PAS UN JEU, et c'est assumé : il n'y
    // a qu'UNE application ici. Les jeux proposaient pourtant « installer le
    // jeu » et promettaient de l'avoir « sur l'écran d'accueil » — le joueur
    // obtenait une icône « Placet » qui ouvrait la page d'accueil, donc une
    // promesse non tenue. Le texte des jeux a été corrigé ; ces raccourcis sont
    // l'autre moitié de la réparation.
    //
    // ⚠️ ILS NE REMPLACENT PAS UN SECOND MANIFESTE, et c'est un arbitrage. Un
    // manifeste servi sur `/games` (`start_url: "/games"`) donnerait une icône
    // qui ouvre vraiment les jeux — mais deux applications installables pour un
    // même site, avec un service worker et un push à revérifier sur un vrai
    // téléphone. À douze joueurs, ça coûte plus de confusion que ça n'en
    // résout ; à rouvrir si l'icône déçoit à l'usage.
    shortcuts: [
      { name: "Banalo du jour", short_name: "Banalo", url: "/games/banalo-jour" },
      { name: "Cinq sur cinq", short_name: "Cinq sur cinq", url: "/games/pays" },
      { name: "Résultats et classements", short_name: "Classements", url: "/games/quotidien" },
    ],
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
