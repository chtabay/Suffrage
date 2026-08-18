"use client";

// LES PORTRAITS DU MANOIR — ce que la borne montre vraiment.
//
// Le jeu promet que de vieux appareils posés dans les pièces DEVIENNENT des
// portraits. Cette promesse était tenue, jusqu'ici, par un emoji `👁️` dans un
// cadre doré. Deux défauts, et le second est le pire :
//   · une tablette dans le noir affichant un emoji ne ressemble pas à un
//     tableau, elle ressemble à une tablette ;
//   · un emoji est rendu par la POLICE SYSTÈME. L'objet le plus atmosphérique
//     du jeu n'avait donc pas la même tête sur un iPad, une tablette Samsung et
//     un vieux portable — la seule chose qu'on ne pouvait pas voir en testant
//     sur une seule machine.
//
// ⚠️ DESSINÉS, PAS GÉNÉRÉS, et pour des raisons qui tiennent :
//   · le dépôt est PUBLIC — la provenance d'images générées y devient une
//     question, pas un détail ;
//   · tout Placet est en aplats et traits épais : un rendu peint tomberait
//     dedans comme un collage ;
//   · la maison a souvent un mauvais wifi et la borne doit tenir la soirée.
//     Un SVG en ligne ne coûte AUCUNE requête — même choix que le glas, qui est
//     synthétisé plutôt que chargé.
//
// ⚠️ UNE SEULE CONSTRUCTION POUR LES DIX, et c'est de la direction artistique,
// pas de l'économie. Le paquet dit : « l'oncle Barnabé peignait mal, mais il
// peignait beaucoup ». Dix portraits bâtis sur le même gabarit — même ovale,
// mêmes épaules, mêmes yeux — SE RESSEMBLENT comme se ressemblent dix tableaux
// du même peintre maladroit. La contrainte technique et la fiction disent ici
// la même chose ; il aurait été absurde de les séparer.
//
// Ce qui change d'une pièce à l'autre : la coiffe, un attribut, et rien d'autre.
import { FANTOME_SKIN as skin } from "@/lib/games/skin";

// La palette de la toile. L'or est RARE — il ne sert qu'aux yeux et à l'attribut,
// parce que dans une pièce sombre c'est la seule chose qu'on doit voir de loin.
const TOILE = "#2C2340";
const VETEMENT = "#533572";
const VISAGE = "#8C79A6";
const TRAIT = skin.ink;
const BLANC = "#EDE7F0";
const OR = skin.accent2;

/** La coiffe et l'attribut de chaque pièce — le seul endroit où ils diffèrent. */
function Coiffe({ piece }: { piece: string }) {
  switch (piece) {
    case "cuisine": // la cuisinière : un bonnet trop haut
      return <path d="M30,36 C30,16 70,16 70,36 C62,30 38,30 30,36 Z" fill={BLANC} stroke={TRAIT} strokeWidth="2.5" />;
    case "salon": // la douairière : un chignon, et des perles
      return (
        <>
          <ellipse cx="50" cy="26" rx="11" ry="9" fill={VETEMENT} stroke={TRAIT} strokeWidth="2.5" />
          <path d="M27,44 C32,32 68,32 73,44" fill={VETEMENT} stroke={TRAIT} strokeWidth="2.5" />
        </>
      );
    case "bibliotheque": // le lettré : des besicles rondes
      return <path d="M28,42 C34,28 66,28 72,42 C64,36 36,36 28,42 Z" fill={VETEMENT} stroke={TRAIT} strokeWidth="2.5" />;
    case "fumoir": // le capitaine : une casquette plate
      return (
        <>
          <path d="M27,40 C30,26 70,26 73,40 Z" fill={VETEMENT} stroke={TRAIT} strokeWidth="2.5" />
          <path d="M24,40 L78,40" stroke={TRAIT} strokeWidth="3.5" strokeLinecap="round" />
        </>
      );
    case "veranda": // la botaniste : un chapeau de paille
      return (
        <>
          <path d="M18,40 C26,34 74,34 82,40 C74,44 26,44 18,40 Z" fill={OR} stroke={TRAIT} strokeWidth="2.5" />
          <path d="M34,38 C36,24 64,24 66,38 Z" fill={OR} stroke={TRAIT} strokeWidth="2.5" />
        </>
      );
    case "couloir": // l'huissier : un col monté et une perruque sage
      return <path d="M28,44 C28,26 72,26 72,44 C64,38 36,38 28,44 Z" fill={BLANC} stroke={TRAIT} strokeWidth="2.5" />;
    case "escalier": // l'enfant : deux couettes
      return (
        <>
          <circle cx="26" cy="48" r="7" fill={VETEMENT} stroke={TRAIT} strokeWidth="2.5" />
          <circle cx="74" cy="48" r="7" fill={VETEMENT} stroke={TRAIT} strokeWidth="2.5" />
          <path d="M31,40 C36,30 64,30 69,40" fill={VETEMENT} stroke={TRAIT} strokeWidth="2.5" />
        </>
      );
    case "cave": // le sommelier : le crâne dégarni, deux touffes
      return (
        <>
          <path d="M29,46 C29,40 33,36 36,38" fill="none" stroke={TRAIT} strokeWidth="3" strokeLinecap="round" />
          <path d="M71,46 C71,40 67,36 64,38" fill="none" stroke={TRAIT} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case "grenier": // la tante oubliée : une voilette
      return (
        <>
          <path d="M28,42 C32,26 68,26 72,42 Z" fill={VETEMENT} stroke={TRAIT} strokeWidth="2.5" />
          <path d="M30,44 L70,44 M36,44 L40,60 M50,44 L50,62 M64,44 L60,60" stroke={TRAIT} strokeWidth="1.4" opacity="0.75" />
        </>
      );
    case "jardin": // le jardinier : un chapeau mou
      return <path d="M22,42 C28,30 72,30 78,42 C66,38 34,38 22,42 Z" fill={VETEMENT} stroke={TRAIT} strokeWidth="2.5" />;
    default: // le portrait sans nom
      return <path d="M28,42 C33,28 67,28 72,42 C64,36 36,36 28,42 Z" fill={VETEMENT} stroke={TRAIT} strokeWidth="2.5" />;
  }
}

/** L'attribut, posé sur l'épaule : la seule autre chose dorée du tableau. */
function Attribut({ piece }: { piece: string }) {
  switch (piece) {
    case "cuisine": // une louche
      return (
        <>
          <path d="M76,104 L80,90" stroke={OR} strokeWidth="3" strokeLinecap="round" />
          <circle cx="75" cy="107" r="5.5" fill="none" stroke={OR} strokeWidth="3" />
        </>
      );
    case "salon": // un rang de perles
      return <path d="M36,96 C42,104 58,104 64,96" fill="none" stroke={OR} strokeWidth="3.2" strokeDasharray="1 5.5" strokeLinecap="round" />;
    case "bibliotheque": // un livre tenu
      return (
        <>
          <rect x="66" y="96" width="18" height="13" rx="1.5" fill={OR} stroke={TRAIT} strokeWidth="2" />
          <path d="M75,96 L75,109" stroke={TRAIT} strokeWidth="1.6" />
        </>
      );
    case "fumoir": // une pipe
      return (
        <>
          <path d="M58,74 L70,78" stroke={OR} strokeWidth="3" strokeLinecap="round" />
          <path d="M70,78 C76,78 76,88 70,88 C66,88 66,80 70,78 Z" fill="none" stroke={OR} strokeWidth="2.6" />
        </>
      );
    case "veranda": // une feuille
      return <path d="M72,108 C72,96 82,92 84,92 C84,100 80,108 72,108 Z" fill={OR} stroke={TRAIT} strokeWidth="2" />;
    case "couloir": // une clé
      return (
        <>
          <circle cx="72" cy="96" r="5" fill="none" stroke={OR} strokeWidth="3" />
          <path d="M72,101 L72,112 M72,106 L78,106" stroke={OR} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case "escalier": // une bougie
      return (
        <>
          <rect x="72" y="98" width="7" height="14" rx="1" fill={BLANC} stroke={TRAIT} strokeWidth="2" />
          <path d="M75.5,98 C75.5,92 79,92 75.5,88 C72,92 75.5,92 75.5,98 Z" fill={OR} />
        </>
      );
    case "cave": // une bouteille
      return (
        <>
          <path d="M70,112 L70,100 C70,97 73,97 73,94 L77,94 C77,97 80,97 80,100 L80,112 Z" fill={VETEMENT} stroke={OR} strokeWidth="2.4" />
          <path d="M70,104 L80,104" stroke={OR} strokeWidth="2.4" />
        </>
      );
    case "grenier": // une toile d'araignée dans le coin
      return (
        <>
          <path d="M100,80 L78,102 M100,88 L86,102 M100,72 L70,102" stroke={OR} strokeWidth="1.6" opacity="0.8" />
          <path d="M92,80 C88,86 86,92 84,98 M96,74 C90,82 86,92 82,100" fill="none" stroke={OR} strokeWidth="1.4" opacity="0.7" />
        </>
      );
    case "jardin": // un arrosoir
      return (
        <>
          <rect x="68" y="98" width="14" height="12" rx="2" fill={VETEMENT} stroke={OR} strokeWidth="2.4" />
          <path d="M82,101 L90,97 M68,100 C64,100 64,106 68,106" fill="none" stroke={OR} strokeWidth="2.4" strokeLinecap="round" />
        </>
      );
    default:
      return null;
  }
}

/**
 * Un portrait accroché dans une pièce.
 *
 * `glas` : pendant le glas, le portrait ARRÊTE de cligner et ouvre les yeux en
 * grand, pupilles dorées. C'est le seul moment de la soirée où il cesse de faire
 * semblant d'être un tableau — et il fallait que le changement se voie du fond
 * du couloir, pas qu'il se devine.
 */
export default function Portrait({ piece, glas }: { piece: string; glas?: boolean }) {
  // Le battement de paupière est décalé par pièce : deux portraits voisins qui
  // clignent ensemble se dénoncent comme un seul programme.
  const decalage = (piece.charCodeAt(0) % 7) * 0.9;

  return (
    <svg
      viewBox="0 0 100 120"
      role="img"
      aria-hidden
      style={{
        height: "clamp(120px, 26vh, 230px)",
        width: "auto",
        display: "block",
        margin: "0 auto",
        filter: glas ? "saturate(0.5) brightness(0.85)" : undefined,
        transition: "filter 240ms",
      }}
    >
      <style>{`
        .pt-paupiere { transform-box: fill-box; transform-origin: top; transform: scaleY(0); }
        .pt-cligne { animation: pt-blink 6.5s ease-in-out infinite; }
        @keyframes pt-blink {
          0%, 92%, 100% { transform: scaleY(0); }
          94%, 97%      { transform: scaleY(1); }
        }
        /* ⚠️ Le clignement est une décoration : il s'efface pour qui a demandé
           moins d'animation. Le portrait reste un portrait, yeux ouverts. */
        @media (prefers-reduced-motion: reduce) {
          .pt-cligne { animation: none; }
        }
      `}</style>

      {/* La toile, et son vernis qui a mal vieilli dans les coins. */}
      <rect x="0" y="0" width="100" height="120" fill={TOILE} />
      <radialGradient id="pt-vernis" cx="50%" cy="42%" r="62%">
        <stop offset="0%" stopColor="#000" stopOpacity="0" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
      </radialGradient>
      <rect x="0" y="0" width="100" height="120" fill="url(#pt-vernis)" />

      {/* Épaules, cou, tête — le gabarit commun aux dix. */}
      <path d="M12,120 C16,98 33,88 50,88 C67,88 84,98 88,120 Z" fill={VETEMENT} stroke={TRAIT} strokeWidth="2.5" />
      <path d="M44,74 L56,74 L56,90 L44,90 Z" fill={VISAGE} stroke={TRAIT} strokeWidth="2.2" />
      <ellipse cx="50" cy="56" rx="21" ry="24" fill={VISAGE} stroke={TRAIT} strokeWidth="2.6" />
      <ellipse cx="28" cy="58" rx="3.4" ry="5" fill={VISAGE} stroke={TRAIT} strokeWidth="2" />
      <ellipse cx="72" cy="58" rx="3.4" ry="5" fill={VISAGE} stroke={TRAIT} strokeWidth="2" />

      <Coiffe piece={piece} />

      {/* LES YEUX — « il y a des yeux dans chaque pièce ». Ce sont eux qu'on doit
          voir en entrant, donc ce sont les seuls à porter du clair. */}
      {[42, 58].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy="54" rx="6" ry={glas ? 5.4 : 4} fill={BLANC} stroke={TRAIT} strokeWidth="2" />
          <circle cx={cx} cy="54" r={glas ? 2.9 : 2.4} fill={glas ? OR : TRAIT} />
          {!glas && (
            <rect
              className="pt-paupiere pt-cligne"
              x={cx - 7}
              y="49.4"
              width="14"
              height="9.2"
              rx="1"
              fill={VISAGE}
              style={{ animationDelay: `${decalage}s` }}
            />
          )}
        </g>
      ))}

      {/* Nez et bouche : trois traits, comme les peignait l'oncle. */}
      <path d="M50,57 L47,66 L52,66" fill="none" stroke={TRAIT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d={glas ? "M43,72 C47,68 53,68 57,72" : "M43,71 C47,74 53,74 57,71"}
        fill="none"
        stroke={TRAIT}
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      <Attribut piece={piece} />
    </svg>
  );
}
