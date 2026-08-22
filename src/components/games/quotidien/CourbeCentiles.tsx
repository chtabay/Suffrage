"use client";

// LA COURBE D'UN JOUEUR DANS LE TEMPS — l'équivalent, ici, du graphe de classement
// d'un site d'échecs : c'est l'objet qui transforme une liste de journées en
// progression.
//
// ⚠️ L'AXE EST INVERSÉ, ET C'EST ÉCRIT SUR LE DESSIN. Le jeu ne connaît qu'une
// phrase — « X % ont fait mieux » — et plus ce nombre est BAS, meilleur est le
// résultat. Deux sorties étaient possibles : retourner le chiffre (« mieux que
// 86 % ») pour que la courbe monte, ou retourner l'AXE. La première introduit un
// second vocabulaire sur une seule page, et c'est exactement ce qui fait qu'on
// ne sait plus lequel on lit. On garde donc la phrase du produit et on met **0 %
// en haut**, imprimé sur l'axe : l'inversion se voit, elle ne se devine pas.
//
// ⚠️ ET LES TROUS NE SE REBOUCHENT PAS. Une journée sans position (joueur seul)
// et une journée non jouée sont absentes, pas à zéro : relier deux points par
// une droite qui traverse un jour non joué dessinerait une progression qui n'a
// pas eu lieu. Chaque segment ne relie que des journées CONSÉCUTIVES.
import { useTranslations } from "next-intl";
import type { GameSkin } from "@/lib/games/skin";

const L = 300;
const H = 92;
/** De quoi laisser respirer le trait sans que les points touchent les bords. */
const MARGE = 8;
/**
 * ⚠️ LA GOUTTIÈRE DE GAUCHE N'EST PAS DE L'ESPACE, C'EST UNE CORRECTION. Les
 * deux bornes de l'axe étaient écrites en `x={0}` alors que le tracé commençait
 * à `MARGE` : « 0 % » se retrouvait SOUS le premier point de la courbe. Vu sur
 * une vraie capture d'iPhone, invisible à la relecture — un texte SVG n'a pas
 * de boîte qui pousse ses voisins, il se superpose en silence.
 */
const GOUTTIERE = 26;

export default function CourbeCentiles({
  skin,
  points,
  couleur,
}: {
  skin: GameSkin;
  /** Les journées, de la plus ANCIENNE à la plus récente. */
  points: { jour: number; mieux: number | null }[];
  couleur: string;
}) {
  const t = useTranslations("JeuxQuotidiens");
  const vus = points.filter((p): p is { jour: number; mieux: number } => p.mieux !== null);
  // ⚠️ DEUX POINTS AU MOINS. Un seul ne fait pas une courbe : il ferait un
  // segment de longueur nulle sous un axe qui promet une évolution.
  if (vus.length < 2) return null;

  const premier = vus[0]!.jour;
  const dernier = vus[vus.length - 1]!.jour;
  const etendue = Math.max(1, dernier - premier);
  const x = (jour: number) => GOUTTIERE + ((jour - premier) / etendue) * (L - GOUTTIERE - MARGE);
  // 0 % en HAUT : c'est l'inversion, et l'axe l'imprime.
  const y = (mieux: number) => MARGE + (mieux / 100) * (H - 2 * MARGE);

  // Les segments PLEINS ne relient que des journées consécutives ; les TROUS
  // sont enjambés par un pointillé.
  const segments: string[] = [];
  const trous: string[] = [];
  let courant: string[] = [];
  vus.forEach((p, i) => {
    const precedent = vus[i - 1];
    if (precedent && p.jour - precedent.jour > 1) {
      if (courant.length > 0) segments.push(courant.join(" "));
      courant = [];
      // ⚠️ LE POINTILLÉ DIT « ON NE SAIT PAS », il ne dit pas « ça a baissé ».
      // Sans lui, une série interrompue se dessine en traits flottants qu'on lit
      // comme un défaut d'affichage ; avec un trait PLEIN, elle affirmerait une
      // progression qui n'a pas eu lieu — c'est l'un ou l'autre, jamais rien.
      trous.push(
        `M${x(precedent.jour).toFixed(1)},${y(precedent.mieux).toFixed(1)} ` +
          `L${x(p.jour).toFixed(1)},${y(p.mieux).toFixed(1)}`,
      );
    }
    courant.push(`${courant.length === 0 ? "M" : "L"}${x(p.jour).toFixed(1)},${y(p.mieux).toFixed(1)}`);
  });
  if (courant.length > 0) segments.push(courant.join(" "));

  const bout = vus[vus.length - 1]!;

  return (
    <figure style={{ margin: "12px 0 0" }}>
      <svg
        viewBox={`0 0 ${L} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label={t("courbeAlt", { n: vus.length })}
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Les deux bornes de l'axe, écrites : c'est ce qui rend l'inversion
            lisible sans légende supplémentaire. Alignées à DROITE sur la
            gouttière — « 0 % » et « 100 % » n'ont pas la même largeur, et deux
            nombres calés à gauche donnent deux repères qui ne se répondent pas. */}
        <text x={GOUTTIERE - 5} y={MARGE + 3} fontSize={9} fill={skin.muted} textAnchor="end">
          0 %
        </text>
        <text x={GOUTTIERE - 5} y={H - MARGE + 3} fontSize={9} fill={skin.muted} textAnchor="end">
          100 %
        </text>
        <line
          x1={GOUTTIERE}
          y1={MARGE}
          x2={L - MARGE}
          y2={MARGE}
          stroke={skin.muted}
          strokeWidth={0.5}
          opacity={0.35}
        />
        <line
          x1={GOUTTIERE}
          y1={H - MARGE}
          x2={L - MARGE}
          y2={H - MARGE}
          stroke={skin.muted}
          strokeWidth={0.5}
          opacity={0.35}
        />
        {trous.map((d, i) => (
          <path
            key={`trou-${i}`}
            d={d}
            fill="none"
            stroke={couleur}
            strokeWidth={1.5}
            strokeDasharray="3 4"
            opacity={0.4}
          />
        ))}
        {segments.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={couleur} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {/* ⚠️ UN POINT PAR JOURNÉE, ET C'EST CE QUI REND LES TROUS LISIBLES. Sans
            eux, une série interrompue se dessine en plusieurs traits flottants
            qu'on lit comme un défaut d'affichage, pas comme des jours non joués.
            Vu à l'écran sur vingt journées dont deux manquantes. */}
        {vus.map((p) => (
          <circle key={p.jour} cx={x(p.jour)} cy={y(p.mieux)} r={2.6} fill={couleur} opacity={0.9} />
        ))}
        {/* Le dernier point est marqué plus gros : c'est celui qu'on est venu voir. */}
        <circle cx={x(bout.jour)} cy={y(bout.mieux)} r={4} fill={couleur} stroke={skin.paper} strokeWidth={2} />
      </svg>
      <figcaption style={{ marginTop: 4, fontSize: 11.5, color: skin.muted, lineHeight: 1.4 }}>
        {t("courbeLegende")}
      </figcaption>
    </figure>
  );
}
