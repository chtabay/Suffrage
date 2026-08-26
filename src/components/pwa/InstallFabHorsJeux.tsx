"use client";

// LE FAB D'INSTALLATION, SAUF SUR LES JEUX.
//
// ⚠️ IL FLOTTAIT SUR LES PAGES DE JEU, ET IL Y ÉTAIT DEUX FOIS À CÔTÉ DE LA
// PLAQUE. Monté dans la coquille, il apparaissait partout — donc aussi sur Cinq
// sur cinq et Banalo du jour, aux couleurs de Placet (encre navy, jaune) au
// milieu d'un jeu qui a les siennes, et en tutoyant (« ton écran d'accueil »)
// alors que les deux jeux vouvoient. C'est exactement ce que les skins existent
// pour empêcher : « le jour où Banalo vit sur son propre domaine, seul ce
// fichier change ».
//
// Les jeux proposent maintenant l'installation eux-mêmes (`InstallJeu`), à leurs
// couleurs et APRÈS la partie — le seul moment où revenir demain veut dire
// quelque chose. Deux invitations concurrentes sur le même écran n'en font pas
// une meilleure ; on retire donc celle qui ne connaît pas le contexte.
import { usePathname } from "next/navigation";
import InstallFab from "./InstallFab";

export default function InstallFabHorsJeux() {
  const chemin = usePathname() ?? "";
  // `usePathname` rend le chemin AVEC le préfixe de langue (`/es/games/…`) et
  // sans lui pour le français, qui est la langue par défaut. On teste donc le
  // segment, pas le début de la chaîne.
  // Horizon est une page de lecture sobre ouverte depuis un QR personnalisé :
  // le FAB flottant y masquerait le partage et donnerait l'impression d'une collecte.
  const segments = chemin.split("/");
  if (segments.includes("games") || segments.includes("horizon")) return null;
  return <InstallFab />;
}
