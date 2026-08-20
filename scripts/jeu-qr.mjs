// GÉNÉRATEUR DU QR DE PARTAGE — à lancer À LA MAIN, jamais au build.
//
//     npm i --no-save qrcode && node scripts/pays-qr.mjs
//
// Il écrit `src/content/pays/qr.ts`, qui est COMMITÉ. Même choix que la carte du
// monde : on projette une fois, on garde le résultat, et le navigateur ne paie
// ni la bibliothèque ni le calcul.
//
// ⚠️ POURQUOI CE N'EST PAS CALCULÉ DANS LE NAVIGATEUR. L'URL du jeu ne change
// jamais — c'est la même chaque jour, pour tout le monde, dans les quatre
// langues. Embarquer un encodeur QR (~15 ko) pour recalculer indéfiniment une
// image constante serait payer un moteur pour afficher une affiche.
//
// ⚠️ ET POURQUOI L'URL EST ÉCRITE EN DUR ICI plutôt que lue de la page. Le QR
// est montré à quelqu'un d'AUTRE, en face de soi. Le pointer sur `location.href`
// enverrait le lecteur sur `/es/...` parce que le partageur est en espagnol, ou
// pire sur un `localhost` en développement. L'URL canonique laisse la
// négociation de langue se faire chez celui qui scanne, ce qui est le bon
// comportement quand deux personnes ne parlent pas la même langue.
import { writeFileSync } from "node:fs";
import QRCode from "qrcode";

const URL_JEU = "https://placet.app/games/pays";

// Niveau M, et c'est un arbitrage de LISIBILITÉ, pas de robustesse. Monter en Q
// ou H ajoute des modules : à taille d'écran égale, chaque module devient plus
// petit et le QR se scanne MOINS bien. La correction d'erreur sert à survivre à
// une tache ou un pli — un écran de téléphone n'a ni l'un ni l'autre.
// ⚠️ LA MARGE EST DANS L'IMAGE, PAS DANS LE CSS. La norme exige une « zone de
// silence » de 4 modules autour du code ; laissée au `padding` d'un conteneur,
// elle vaut ce que valent les pixels du moment — au premier écran étroit, 12 px
// de marge autour d'un module de 11 px font UN module au lieu de quatre. Le QR
// se décode alors sur un décodeur logiciel tolérant et refuse sur une caméra de
// biais. Gravée dans le `viewBox`, elle ne peut plus se perdre.
const MARGE = 4;

const svg = await QRCode.toString(URL_JEU, {
  type: "svg",
  errorCorrectionLevel: "M",
  margin: MARGE,
});

const chemin = /\sd="([^"]+)"/.exec(svg.replace(/<path[^>]*fill="#ffffff"[^>]*\/?>/, ""))?.[1];
const vue = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
if (!chemin || !vue) throw new Error("SVG inattendu — la forme de sortie de `qrcode` a changé");
const taille = Number(vue[1]);

const sortie = `// ⚠️ FICHIER GÉNÉRÉ — ne pas modifier à la main.
// Produit par \`node scripts/pays-qr.mjs\` (voir l'en-tête du script).
//
// LE QR DE PARTAGE EN PRÉSENCE. Le partage texte marche par messagerie ; devant
// quelqu'un, il ne sert à rien — on ne dicte pas une URL. Le QR est l'outil de
// ce moment-là, et il est CONSTANT : l'URL du jeu ne change jamais, donc l'image
// non plus. Elle est donc gravée ici plutôt que recalculée à chaque affichage.

/** Ce que le QR encode. Montré aussi en toutes lettres : tout le monde n'a pas de caméra. */
export const QR_URL = ${JSON.stringify(URL_JEU)};

/** La zone de silence, en modules, de chaque côté. La norme en demande quatre. */
export const QR_MARGE = ${MARGE};

/** Côté total, zone de silence comprise. Le \`viewBox\` vaut \`0 0 T T\`. */
export const QR_TAILLE = ${taille};

/** Les modules sombres, en un seul chemin. */
export const QR_CHEMIN =
  ${JSON.stringify(chemin)};
`;

writeFileSync(new URL("../src/content/pays/qr.ts", import.meta.url), sortie);
console.log(`✓ qr.ts — ${taille}×${taille} modules (dont ${MARGE} de silence par côté), chemin de ${chemin.length} caractères, pour ${URL_JEU}`);
