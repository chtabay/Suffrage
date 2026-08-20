"use client";

// L'ÉCHIQUIER — dessiné à la main, sans aucune dépendance d'affichage.
//
// ⚠️ LE DESSIN D'UNE PIÈCE EST ASYMÉTRIQUE, ET LES TROIS ESSAIS SONT MESURÉS.
// La pièce claire est une silhouette pleine crème cernée d'un liseré marine de
// 1,2 px ; la pièce sombre est la MÊME silhouette, marine, SANS AUCUN CONTOUR.
// Rien à l'intérieur, dans les deux cas.
//
// Ce qui a été essayé avant, et pourquoi ça ne tient pas (métrique : part de
// corps clair dans l'encre du glyphe, à 32 px, sur les deux nuances de cases) :
//
//   1. Même contour sombre des deux côtés. La dame claire sur case sombre :
//      0,07 — MOINS qu'une pièce sombre au même endroit (0,15). Trois pièces
//      claires sur six se lisaient sombres. Le contour, centré sur le tracé,
//      rongeait les nervures fines jusqu'à manger le corps.
//   2. Corps + linteau du glyphe creux par-dessus, à la manière de lichess
//      (vérifié dans leur feuille de style). Lisible, mais TROP DESSINÉ à
//      34 px : perles de couronne, crinière, créneaux — du bruit sur un
//      téléphone, et loin des aplats francs de Placet.
//   3. Silhouette + contour INVERSÉ épais (2,2 px). Régression silencieuse : le
//      liseré crème autour d'un corps marine pèse tellement, à cette taille, que
//      la pièce sombre mesure ~0,55 de clair — comme une pièce claire. Le
//      remède recréait la maladie.
//
// Ce qui tient : liseré 1,2 px sur la pièce claire seulement → corps 0,62 à 0,80
// de clair ; pièce sombre nue → 0,08 à 0,32. Au moins 2× d'écart sur les six
// pièces et les deux nuances, avec le dessin le plus simple des trois.
//
// `paint-order: stroke fill` est OBLIGATOIRE : sans lui le liseré se peint
// par-dessus le corps et le ronge de moitié — c'est exactement l'essai 1.
//
// ⚠️ LES MARQUES SONT DES APLATS TRANSLUCIDES, PAS DES FORMES. Lichess, lu à la
// source : `square.selected {background:rgba(20,85,30,.5)}` et
// `square.move-dest {background:radial-gradient(rgba(20,85,30,.5) 19%,transparent 20%)}`.
// Zéro contour nulle part. C'est la convention que tout joueur reconnaît, et la
// translucidité est ce qui permet à une seule couleur de tenir sur les deux
// nuances de cases. Les opacités sont mesurées (voir `ECHIQUIER`).
//
// ⚠️ LES COUPS NUMÉROTÉS N'EXISTENT NULLE PART AILLEURS, ET C'EST NORMAL. Sur
// chess.com ou lichess on joue seul : il n'y a jamais de « coup n° 2 ». Ici la
// pièce entière discute à voix haute — il faut pouvoir dire « je suis pour le 2 »
// sans épeler une case. Le NUMÉRO porte le sens ; la couleur ne fait que
// distinguer mon bulletin des autres, jamais l'identité d'un coup.
//
// ⚠️ LES CANDIDATS SONT DESSINÉS EN SVG, PAS EN CSS. Un encadré en `box-shadow`
// et une bulle en `<div>` faisaient cheap : coins durs, pastille qui flotte,
// rien qui tienne ensemble. Ici une seule couche SVG en surimpression du damier
// dessine tout — l'encadré arrondi, le numéro POSÉ DANS SON TRAIT (le cercle
// masque le coin du cadre), et le trait qui relie l'origine à l'arrivée.
//
// ⚠️ UN ENCADRÉ SEUL NE DIT PAS QUELLE PIÈCE ARRIVE, et c'est ce qui a tué la
// version précédente : « le 4 sur d4 », c'est le pion de d2 ou autre chose ? Ce
// qui a été essayé pour le dire :
//
//   • Quatre flèches en permanence — sans ambiguïté, mais ça sature un plateau
//     de 344 px et les traits se croisent.
//   • La case de DÉPART en tirets — plus léger, mais à quatre candidats on ne
//     sait plus quel tireté va avec quel encadré.
//   • Le FANTÔME de la pièce, posée en transparence sur sa case d'arrivée — le
//     plus calme et le plus littéral, mais il se casse sur une PRISE (il se
//     superpose à la pièce capturée) et un fantôme de pièce claire à 42 %
//     ressemble à une pièce claire.
//
// Ce qui tient : les encadrés numérotés, et un trait FIN pour chaque candidat
// (5,5 unités sur 100, à 60 % d'opacité). Presque deux fois plus épais, le même
// trait sature le plateau ; plus fin, il disparaît.
//
// ⚠️ LE CAVALIER SE DÉPLACE EN L, ET SON TRAIT AUSSI. Un trait droit de b1 à c3
// ne correspond à aucun chemin et fait lire un fou. On trace la grande branche
// d'abord, puis le coude — la convention de tous les échiquiers d'annotation.
//
// Le coin du numéro n'est pas un choix de goût : mesuré sur les six glyphes, le
// haut-gauche est libre à 94 %, et on bascule de coin quand on toucherait le
// bord du plateau.
//
// ⚠️ AUCUNE RÈGLE D'ÉCHECS ICI : les coups légaux viennent de l'arbitre.
import { useState } from "react";
import { ECHIQUIER } from "@/lib/games/skin";
import {
  COLONNES,
  GLYPHE,
  caseClaire,
  caseDe,
  coupsVers,
  departs,
  destinations,
  estBlanche,
  lirePosition,
  type Case,
  type Piece,
} from "@/lib/games/echecs/echiquier";

const PROMOTIONS = ["q", "r", "b", "n"] as const;

/** Unités SVG par case. Le damier entier tient dans un viewBox de 800 × 800. */
const U = 100;

interface Point {
  x: number;
  y: number;
}

/** Où tombe une case dans le repère SVG, plateau retourné compris. */
function repere(c: Case, retourne: boolean) {
  const colonne = COLONNES.indexOf(c[0] as (typeof COLONNES)[number]);
  const ligne = 8 - Number(c[1]);
  const dc = retourne ? 7 - colonne : colonne;
  const dl = retourne ? 7 - ligne : ligne;
  return { x: dc * U, y: dl * U, cx: dc * U + U / 2, cy: dl * U + U / 2, bordGauche: dc === 0, bordHaut: dl === 0 };
}

function unite(p: Point, q: Point): Point {
  const l = Math.hypot(q.x - p.x, q.y - p.y) || 1;
  return { x: (q.x - p.x) / l, y: (q.y - p.y) / l };
}

const teinteDe = (c: Candidat) => (c.mien ? ECHIQUIER.corailSombre : ECHIQUIER.pastille);

/** L'encadré d'une case candidate, et son numéro POSÉ DANS SON TRAIT — le
 *  cercle masque le coin du cadre, plutôt que de flotter à côté. */
function Cadre({ cand, retourne }: { cand: Candidat; retourne: boolean }) {
  const p = repere(cand.uci.slice(2, 4), retourne);
  const teinte = teinteDe(cand);
  const m = 9;
  // Haut-gauche par défaut — mesuré comme le coin le plus libre des glyphes —
  // et on bascule de coin quand la pastille sortirait du plateau.
  const cx = p.x + (p.bordGauche ? U - m : m);
  const cy = p.y + (p.bordHaut ? U - m : m);
  return (
    <g>
      <rect
        x={p.x + m}
        y={p.y + m}
        width={U - 2 * m}
        height={U - 2 * m}
        rx={13}
        fill="none"
        stroke={teinte}
        strokeWidth={5.5}
      />
      <circle cx={cx} cy={cy} r={17} fill={teinte} />
      <text
        x={cx}
        y={cy}
        fill={ECHIQUIER.encrePastille}
        fontSize={22}
        fontWeight={800}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {cand.no}
      </text>
    </g>
  );
}

/** Le trait origine → arrivée, raccourci aux deux bouts pour ne masquer ni la
 *  pièce qui part ni celle qui arrive. En L pour le cavalier. */
function Trait({ cand, retourne }: { cand: Candidat; retourne: boolean }) {
  const a = repere(cand.uci.slice(0, 2), retourne);
  const b = repere(cand.uci.slice(2, 4), retourne);
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  // Un déplacement de deux cases sur un axe et d'une sur l'autre n'appartient
  // qu'au cavalier : aucune autre pièce ne peut produire ce vecteur.
  const cavalier =
    (Math.abs(dx) === 2 * U && Math.abs(dy) === U) || (Math.abs(dx) === U && Math.abs(dy) === 2 * U);
  const brut: Point[] = cavalier
    ? [
        { x: a.cx, y: a.cy },
        Math.abs(dx) > Math.abs(dy) ? { x: b.cx, y: a.cy } : { x: a.cx, y: b.cy },
        { x: b.cx, y: b.cy },
      ]
    : [
        { x: a.cx, y: a.cy },
        { x: b.cx, y: b.cy },
      ];
  const n = brut.length - 1;
  const u0 = unite(brut[0], brut[1]);
  const un = unite(brut[n - 1], brut[n]);
  const chemin = brut.map((p, i) =>
    i === 0
      ? { x: p.x + u0.x * 30, y: p.y + u0.y * 30 }
      : i === n
        ? { x: p.x - un.x * 40, y: p.y - un.y * 40 }
        : p,
  );
  const teinte = teinteDe(cand);
  const EP = 5.5;
  const bout = chemin[n];
  const h = EP * 2.4;
  const w = EP * 1.45;
  const tete: Point[] = [
    { x: bout.x + un.x * h, y: bout.y + un.y * h },
    { x: bout.x - un.y * w, y: bout.y + un.x * w },
    { x: bout.x + un.y * w, y: bout.y - un.x * w },
  ];
  return (
    <g opacity={0.6}>
      <polyline
        points={chemin.map((q) => `${q.x},${q.y}`).join(" ")}
        fill="none"
        stroke={teinte}
        strokeWidth={EP}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon points={tete.map((q) => `${q.x},${q.y}`).join(" ")} fill={teinte} />
    </g>
  );
}

/** Un coup mis en avant pour la délibération : « je suis pour le 2 ». */
export interface Candidat {
  uci: string;
  /** Le numéro affiché. C'est LUI qui porte le sens, pas la couleur. */
  no: number;
  /** Le mien : contour et bulle passent au corail, pour le retrouver d'un œil. */
  mien?: boolean;
}

/** Une silhouette pleine. Liseré sur la pièce claire, rien sur la sombre. */
function Silhouette({ piece, taille }: { piece: Piece; taille: number }) {
  const clair = estBlanche(piece);
  return (
    <span
      aria-hidden
      style={{
        fontSize: taille,
        lineHeight: 1,
        color: clair ? ECHIQUIER.corpsClair : ECHIQUIER.corpsSombre,
        // La pièce sombre se détache toute seule (6,96:1 sur la case sombre,
        // 13:1 sur la claire). Lui ajouter un liseré ne l'aiderait pas et la
        // ferait mesurer clair.
        WebkitTextStroke: clair ? `${ECHIQUIER.lisere * 2}px ${ECHIQUIER.corpsSombre}` : undefined,
        paintOrder: clair ? "stroke fill" : undefined,
      }}
    >
      {GLYPHE[piece.toLowerCase()]}
    </span>
  );
}

export default function Echiquier({
  fen,
  legal,
  camp,
  dernier,
  choix,
  candidats,
  onChoix,
  labels,
}: {
  fen: string;
  /** Les coups légaux servis par l'arbitre. Vide = on regarde, on ne joue pas. */
  legal: string[];
  /** Le camp du joueur : le plateau se retourne pour les noirs. */
  camp: "w" | "b" | null;
  /** Le dernier coup joué, en UCI. */
  dernier?: string | null;
  /** Mon vote en cours, en UCI. */
  choix?: string | null;
  /** Les coups mis au vote, numérotés. Vide en temps normal. */
  candidats?: Candidat[];
  onChoix?: (uci: string) => void;
  labels: { piece: Record<string, string>; vide: string; promotion: string; blanc: string; noir: string };
}) {
  const [depuis, setDepuis] = useState<Case | null>(null);
  const [promo, setPromo] = useState<{ de: Case; vers: Case } | null>(null);

  const plateau = lirePosition(fen);
  const jouables = departs(legal);
  const cibles = depuis ? destinations(legal, depuis) : [];
  // Les noirs voient le plateau retourné : leur roi en bas, comme sur une vraie
  // table. Sans ça, la moitié des joueurs lit à l'envers toute la partie.
  const retourne = camp === "b";
  const lignes = retourne ? [...plateau].reverse().map((l) => [...l].reverse()) : plateau;

  const taper = (c: Case, piece: Piece | null) => {
    if (!legal.length || !onChoix) return;
    if (depuis && cibles.includes(c)) {
      const coups = coupsVers(legal, depuis, c);
      // Quatre coups vers la même case : c'est une promotion, et on ne devine
      // pas la pièce à la place du joueur.
      if (coups.length > 1) setPromo({ de: depuis, vers: c });
      else onChoix(coups[0]);
      setDepuis(null);
      return;
    }
    if (piece && jouables.has(c)) setDepuis(depuis === c ? null : c);
    else setDepuis(null);
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        role="grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          aspectRatio: "1",
          width: "100%",
          border: `3px solid ${ECHIQUIER.trait}`,
          borderRadius: 8,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {lignes.map((ligne, i) =>
          ligne.map((piece, j) => {
            const vi = retourne ? 7 - i : i;
            const vj = retourne ? 7 - j : j;
            const c = caseDe(vi, vj);
            const claire = caseClaire(vi, vj);
            const selectionnee = depuis === c;
            const cible = cibles.includes(c);
            const dansDernier = !!dernier && (dernier.slice(0, 2) === c || dernier.slice(2, 4) === c);
            const dansChoix = !!choix && (choix.slice(0, 2) === c || choix.slice(2, 4) === c);
            const nom = piece ? (labels.piece[piece.toLowerCase()] ?? "") : labels.vide;
            const couleur = piece ? (estBlanche(piece) ? labels.blanc : labels.noir) : "";
            return (
              <button
                key={c}
                type="button"
                role="gridcell"
                aria-label={piece ? `${c}, ${couleur} ${nom}` : `${c}, ${nom}`}
                // ⚠️ `aria-selected`, PAS `aria-pressed` : le rôle `gridcell`
                // n'accepte pas `aria-pressed` (eslint le signale, et dans ce
                // dépôt un avertissement casse le déploiement en silence). Une
                // case cochée dans une grille est « sélectionnée », pas
                // « enfoncée » — et c'est aussi ce qu'un lecteur d'écran
                // attend d'un damier.
                aria-selected={selectionnee || dansChoix || undefined}
                onClick={() => taper(c, piece)}
                style={{
                  position: "relative",
                  border: "none",
                  padding: 0,
                  background: claire ? ECHIQUIER.claire : ECHIQUIER.sombre,
                  display: "grid",
                  placeItems: "center",
                  cursor: legal.length && (jouables.has(c) || cible) ? "pointer" : "default",
                  minWidth: 0,
                  minHeight: 0,
                  aspectRatio: "1",
                  font: "inherit",
                  lineHeight: 1,
                  // ⚠️ Le liseré bas double le lavis corail par une information
                  // qui ne dépend pas de la teinte : le corail se distingue du
                  // lavis d'encre par sa COULEUR, pas par sa clarté (2,16 contre
                  // 2,67). Sans lui, qui ne distingue pas les teintes ne verrait
                  // qu'une case grisée de plus.
                  boxShadow: dansDernier ? `inset 0 -4px 0 ${ECHIQUIER.corailSombre}` : undefined,
                }}
              >
                {/* LE DERNIER COUP : un lavis corail sur toute la case. */}
                {dansDernier ? (
                  <span aria-hidden style={{ position: "absolute", inset: 0, background: ECHIQUIER.dernier }} />
                ) : null}
                {/* MON VOTE, ou LA PIÈCE QUE JE TIENS : le même lavis d'encre.
                    Les deux ne se contredisent pas — l'un est mon bulletin
                    déposé, l'autre le geste en cours. */}
                {dansChoix || selectionnee ? (
                  <span aria-hidden style={{ position: "absolute", inset: 0, background: ECHIQUIER.selection }} />
                ) : null}

                {piece ? <Silhouette piece={piece} taille={34} /> : null}

                {/* UNE DESTINATION : une pastille pleine sur case vide, un
                    anneau autour d'une pièce à prendre — pour ne pas la cacher. */}
                {cible ? (
                  <span
                    aria-hidden
                    style={
                      piece
                        ? {
                            position: "absolute",
                            inset: "5%",
                            borderRadius: "50%",
                            border: `4px solid ${ECHIQUIER.destination}`,
                          }
                        : {
                            position: "absolute",
                            inset: 0,
                            background: `radial-gradient(${ECHIQUIER.destination} 19%, transparent 20%)`,
                          }
                    }
                  />
                ) : null}

              </button>
            );
          }),
        )}

        {/* LA COUCHE DES CANDIDATS — un seul SVG par-dessus tout le damier.
            Les traits d'abord, les encadrés ensuite : une pastille numérotée ne
            doit jamais passer sous un trait. */}
        {candidats && candidats.length > 0 ? (
          <svg
            viewBox={`0 0 ${8 * U} ${8 * U}`}
            aria-hidden
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          >
            {candidats.map((cand) => (
              <Trait key={`trait-${cand.uci}`} cand={cand} retourne={retourne} />
            ))}
            {candidats.map((cand) => (
              <Cadre key={`cadre-${cand.uci}`} cand={cand} retourne={retourne} />
            ))}
          </svg>
        ) : null}
      </div>

      {/* LA PROMOTION — quatre pièces, jamais un défaut deviné. */}
      {promo ? (
        <div
          role="dialog"
          aria-label={labels.promotion}
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            background: "rgba(22,33,58,0.82)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 6,
              padding: 10,
              background: ECHIQUIER.claire,
              borderRadius: 12,
              border: `2.5px solid ${ECHIQUIER.trait}`,
            }}
          >
            {PROMOTIONS.map((p) => (
              <button
                key={p}
                type="button"
                aria-label={labels.piece[p]}
                onClick={() => {
                  onChoix?.(`${promo.de}${promo.vers}${p}`);
                  setPromo(null);
                }}
                style={{
                  border: `2px solid ${ECHIQUIER.trait}`,
                  borderRadius: 8,
                  background: ECHIQUIER.claire,
                  cursor: "pointer",
                  width: 52,
                  height: 52,
                  display: "grid",
                  placeItems: "center",
                  font: "inherit",
                }}
              >
                <Silhouette piece={(camp === "b" ? p : p.toUpperCase()) as Piece} taille={34} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
