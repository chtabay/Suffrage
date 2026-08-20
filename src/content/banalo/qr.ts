// ⚠️ FICHIER GÉNÉRÉ — ne pas modifier à la main.
// Produit par `node scripts/jeu-qr.mjs banalo` (voir l'en-tête du script).
//
// LE QR DE PARTAGE EN PRÉSENCE. Le partage texte marche par messagerie ; devant
// quelqu'un, il ne sert à rien — on ne dicte pas une URL. Le QR est l'outil de
// ce moment-là, et il est CONSTANT : l'URL du jeu ne change jamais, donc l'image
// non plus. Elle est donc gravée ici plutôt que recalculée à chaque affichage.

/** Ce que le QR encode. Montré aussi en toutes lettres : tout le monde n'a pas de caméra. */
export const QR_URL = "https://placet.app/games/banalo-jour";

/** La zone de silence, en modules, de chaque côté. La norme en demande quatre. */
export const QR_MARGE = 4;

/** Côté total, zone de silence comprise. Le `viewBox` vaut `0 0 T T`. */
export const QR_TAILLE = 37;

/** Les modules sombres, en un seul chemin. */
export const QR_CHEMIN =
  "M4 4.5h7m6 0h1m1 0h1m2 0h3m1 0h7M4 5.5h1m5 0h1m3 0h6m4 0h1m1 0h1m5 0h1M4 6.5h1m1 0h3m1 0h1m1 0h2m1 0h3m6 0h1m1 0h1m1 0h3m1 0h1M4 7.5h1m1 0h3m1 0h1m1 0h1m5 0h4m1 0h1m2 0h1m1 0h3m1 0h1M4 8.5h1m1 0h3m1 0h1m1 0h1m1 0h1m5 0h1m2 0h2m1 0h1m1 0h3m1 0h1M4 9.5h1m5 0h1m1 0h2m5 0h4m1 0h1m1 0h1m5 0h1M4 10.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M12 11.5h3m1 0h1m1 0h3M4 12.5h1m1 0h5m4 0h1m3 0h4m3 0h5M4 13.5h1m2 0h3m1 0h2m3 0h3m1 0h9m3 0h1M4 14.5h1m1 0h1m3 0h1m1 0h1m1 0h1m1 0h6m2 0h1m2 0h1M4 15.5h1m1 0h1m5 0h3m1 0h2m2 0h1m2 0h2m3 0h2m1 0h1M5 16.5h1m1 0h4m3 0h1m1 0h1m1 0h1m2 0h1m7 0h2M4 17.5h4m4 0h1m1 0h1m5 0h1m1 0h3m1 0h3m3 0h1M8 18.5h3m2 0h1m1 0h1m3 0h1m1 0h2m1 0h1m2 0h4M6 19.5h1m2 0h1m1 0h2m1 0h2m2 0h1m3 0h4m2 0h1m2 0h1M5 20.5h1m2 0h4m1 0h1m1 0h2m4 0h1m1 0h1m1 0h1m3 0h2M4 21.5h3m1 0h1m2 0h2m2 0h4m1 0h1m1 0h2m1 0h4m1 0h1m1 0h1M4 22.5h1m2 0h1m2 0h4m3 0h4m1 0h1m3 0h1m1 0h1m1 0h1M4 23.5h1m1 0h4m1 0h1m2 0h1m1 0h2m1 0h2m4 0h3m3 0h1M4 24.5h1m2 0h1m1 0h3m2 0h1m1 0h1m1 0h1m2 0h1m2 0h5m1 0h3M12 25.5h1m1 0h1m1 0h1m4 0h4m3 0h5M4 26.5h7m2 0h1m2 0h1m2 0h3m1 0h2m1 0h1m1 0h3M4 27.5h1m5 0h1m1 0h1m3 0h1m1 0h1m1 0h1m1 0h3m3 0h1m2 0h1M4 28.5h1m1 0h3m1 0h1m1 0h2m1 0h1m5 0h1m2 0h5m1 0h1M4 29.5h1m1 0h3m1 0h1m1 0h1m1 0h2m1 0h2m1 0h1m1 0h1m6 0h4M4 30.5h1m1 0h3m1 0h1m1 0h3m1 0h1m2 0h1m2 0h1m2 0h7M4 31.5h1m5 0h1m2 0h2m3 0h3m2 0h3m2 0h2m1 0h1M4 32.5h7m1 0h6m3 0h1m1 0h1m4 0h3";
