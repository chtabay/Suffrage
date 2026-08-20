// ⚠️ FICHIER GÉNÉRÉ — ne pas modifier à la main.
// Produit par `node scripts/jeu-qr.mjs pays` (voir l'en-tête du script).
//
// LE QR DE PARTAGE EN PRÉSENCE. Le partage texte marche par messagerie ; devant
// quelqu'un, il ne sert à rien — on ne dicte pas une URL. Le QR est l'outil de
// ce moment-là, et il est CONSTANT : l'URL du jeu ne change jamais, donc l'image
// non plus. Elle est donc gravée ici plutôt que recalculée à chaque affichage.

/** Ce que le QR encode. Montré aussi en toutes lettres : tout le monde n'a pas de caméra. */
export const QR_URL = "https://placet.app/games/pays";

/** La zone de silence, en modules, de chaque côté. La norme en demande quatre. */
export const QR_MARGE = 4;

/** Côté total, zone de silence comprise. Le `viewBox` vaut `0 0 T T`. */
export const QR_TAILLE = 37;

/** Les modules sombres, en un seul chemin. */
export const QR_CHEMIN =
  "M4 4.5h7m1 0h3m4 0h2m1 0h3m1 0h7M4 5.5h1m5 0h1m1 0h1m3 0h1m1 0h2m1 0h2m3 0h1m5 0h1M4 6.5h1m1 0h3m1 0h1m3 0h1m2 0h3m2 0h3m1 0h1m1 0h3m1 0h1M4 7.5h1m1 0h3m1 0h1m1 0h2m1 0h2m3 0h2m1 0h1m2 0h1m1 0h3m1 0h1M4 8.5h1m1 0h3m1 0h1m2 0h1m2 0h2m3 0h3m2 0h1m1 0h3m1 0h1M4 9.5h1m5 0h1m4 0h1m2 0h1m2 0h1m1 0h2m1 0h1m5 0h1M4 10.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M12 11.5h1m2 0h4m2 0h2m1 0h1M4 12.5h1m1 0h2m1 0h3m1 0h3m1 0h2m1 0h2m1 0h1m2 0h1m2 0h1m1 0h2M5 13.5h2m2 0h1m4 0h1m4 0h10m3 0h1M8 14.5h1m1 0h4m4 0h2m2 0h1m2 0h1m2 0h1m1 0h2M4 15.5h1m7 0h1m4 0h3m2 0h1m1 0h3m5 0h1M4 16.5h1m1 0h2m2 0h2m1 0h4m3 0h2m7 0h2M6 17.5h2m6 0h1m2 0h1m3 0h3m1 0h2m3 0h3M10 18.5h3m2 0h2m1 0h1m4 0h5m2 0h3M4 19.5h1m2 0h1m1 0h1m2 0h1m2 0h1m1 0h1m1 0h1m2 0h4m2 0h1m2 0h1M4 20.5h2m4 0h3m2 0h2m5 0h3m2 0h3m1 0h1M5 21.5h2m1 0h2m1 0h2m2 0h3m9 0h1m1 0h3M4 22.5h1m3 0h4m2 0h3m5 0h1m3 0h1m1 0h1m1 0h1M6 23.5h3m6 0h2m2 0h4m1 0h1m1 0h1m1 0h1m1 0h1M5 24.5h2m2 0h2m1 0h1m1 0h1m2 0h1m1 0h1m1 0h10M12 25.5h1m1 0h1m1 0h4m1 0h1m1 0h2m3 0h5M4 26.5h7m1 0h3m1 0h2m2 0h2m1 0h2m1 0h1m1 0h2m1 0h1M4 27.5h1m5 0h1m1 0h1m1 0h3m3 0h1m1 0h1m1 0h1m3 0h2m1 0h2M4 28.5h1m1 0h3m1 0h1m3 0h3m1 0h2m1 0h1m2 0h5m1 0h1m1 0h1M4 29.5h1m1 0h3m1 0h1m1 0h3m1 0h1m1 0h1m1 0h3m1 0h2m1 0h3m1 0h1M4 30.5h1m1 0h3m1 0h1m1 0h1m2 0h7m1 0h1m3 0h1m2 0h1m1 0h1M4 31.5h1m5 0h1m4 0h1m4 0h1m2 0h3m2 0h2m1 0h1M4 32.5h7m1 0h1m4 0h3m1 0h1m1 0h3m1 0h1m1 0h1m1 0h1";
