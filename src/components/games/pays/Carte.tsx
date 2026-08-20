"use client";

// LA CARTE — le geste principal du jeu.
//
// Un SVG, 193 tracés, et la promesse qu'on peut viser n'importe quel pays au
// doigt. Trois décisions qui coûtent cher si on les prend autrement :
//
// 1. **La carte est projetée d'avance** (`src/content/pays/carte.ts`). Aucune
//    bibliothèque de cartographie n'arrive dans le navigateur : le fond est un
//    tableau de chaînes `d`, calculé une fois par un script. Une carte du monde
//    coûte alors ce que coûte du texte, et rien de plus.
//
// 2. **Quarante États n'ont pas de tracé cliquable à cette résolution** (Malte,
//    Singapour, les Caraïbes, le Pacifique). Ils reçoivent un POINT, dessiné
//    par-dessus, avec un disque de saisie invisible bien plus large que lui. Sans
//    ce point, un cinquième du référentiel serait injouable au doigt — et le jeu
//    promet 193 pays.
//
// 3. **Traits et cibles sont mesurés en PIXELS D'ÉCRAN, pas en unités de carte.**
//    ⚠️ Vu sur téléphone, pas déduit : la carte fait 1000 unités de large et
//    350 pixels sur un mobile. Un contour de 0,9 unité y devient un trait de
//    0,3 pixel — invisible — et le disque de saisie de 9 unités des petits
//    États, un point de 3 pixels de rayon, quatre fois plus petit que la cible
//    tactile recommandée. Sur l'écran de bureau où tout avait été réglé, les
//    mêmes valeurs tombaient juste. On convertit donc via la largeur RÉELLE du
//    SVG, mesurée par un `ResizeObserver` — ce qui règle le zoom du même coup,
//    puisque l'échelle est déjà dans la boîte de vue.
//
// ACCESSIBILITÉ, dite franchement : la carte est un instrument de POINTAGE, et
// 193 chemins focalisables au clavier seraient un piège, pas une aide. C'est le
// champ de recherche qui porte l'équivalent accessible — même geste, même
// résultat, atteignable au clavier et au lecteur d'écran. Le SVG est donc
// annoncé comme une image, et l'historique des essais donne la lecture textuelle
// de ce que la carte montre en couleur.
import { useCallback, useEffect, useRef, useState } from "react";
import { CARTE_HAUTEUR, CARTE_LARGEUR, DECORS, POINTS, TRACES } from "@/content/pays/carte";
import { GRADIENT, NON_ESSAYE, TRAIT } from "@/lib/games/pays/palette";
import type { GameSkin } from "@/lib/games/skin";

/** Zoom maximal : au-delà, on ne lit plus une carte, on lit des pixels. */
const ZOOM_MAX = 12;
const ZOOM_MIN = 1;

interface Vue {
  x: number;
  y: number;
  k: number;
}

export default function Carte({
  skin,
  scores,
  surbrillance,
  onPays,
  etiquette,
}: {
  skin: GameSkin;
  /** Score par pays. Un pays absent n'a pas été essayé. */
  scores: Record<string, number>;
  /** Le pays visé par la recherche : il clignote sans être joué. */
  surbrillance?: string | null;
  onPays: (id: string) => void;
  /** Description du SVG pour les lecteurs d'écran. */
  etiquette: string;
}) {
  const [vue, setVue] = useState<Vue>({ x: 0, y: 0, k: 1 });
  /** Largeur RENDUE du SVG, en pixels. 1000 avant la première mesure. */
  const [largeurPx, setLargeurPx] = useState(1000);
  const svg = useRef<SVGSVGElement | null>(null);

  // Le glissé et le clic passent par les mêmes événements : on retient d'où le
  // doigt est parti, et on ne compte comme clic qu'un appui qui n'a pas voyagé.
  // Sans ce garde, tout déplacement de la carte finit par jouer un pays au
  // hasard — et sur mobile, c'est un essai perdu à chaque panoramique.
  const geste = useRef<{ x: number; y: number; vue: Vue; bouge: boolean } | null>(null);
  const pinces = useRef<Map<number, { x: number; y: number }>>(new Map());
  const ecart = useRef<number | null>(null);

  const largeur = CARTE_LARGEUR / vue.k;
  const hauteur = CARTE_HAUTEUR / vue.k;
  /** Combien d'unités de carte vaut UN pixel d'écran, zoom compris. */
  const parPx = largeur / Math.max(1, largeurPx);

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    setLargeurPx(el.getBoundingClientRect().width);
    const obs = new ResizeObserver(([e]) => setLargeurPx(e.contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /** Recadre pour que la carte ne quitte jamais l'écran. */
  const borne = useCallback((v: Vue): Vue => {
    const k = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.k));
    const l = CARTE_LARGEUR / k;
    const h = CARTE_HAUTEUR / k;
    return {
      k,
      x: Math.min(CARTE_LARGEUR - l, Math.max(0, v.x)),
      y: Math.min(CARTE_HAUTEUR - h, Math.max(0, v.y)),
    };
  }, []);

  /** Position d'un événement dans le repère de la carte. */
  const enCarte = (e: { clientX: number; clientY: number }) => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return null;
    return {
      x: vue.x + ((e.clientX - r.left) / r.width) * largeur,
      y: vue.y + ((e.clientY - r.top) / r.height) * hauteur,
    };
  };

  const zoomeVers = (facteur: number, ancre: { x: number; y: number } | null) => {
    setVue((v) => {
      const k = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.k * facteur));
      if (!ancre) return borne({ ...v, k });
      // Le point sous le doigt reste sous le doigt : sans ancre, un zoom à la
      // molette ramène toujours vers le coin haut-gauche et on perd ce qu'on
      // regardait.
      return borne({
        k,
        x: ancre.x - ((ancre.x - v.x) * v.k) / k,
        y: ancre.y - ((ancre.y - v.y) * v.k) / k,
      });
    });
  };

  // ⚠️ La molette est écoutée À LA MAIN, en `passive: false`. React attache les
  // gestionnaires `onWheel` en passif : `preventDefault()` y est ignoré, et la
  // page entière défile pendant qu'on zoome sur la carte.
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const roue = (e: WheelEvent) => {
      e.preventDefault();
      zoomeVers(e.deltaY < 0 ? 1.18 : 1 / 1.18, enCarte(e));
    };
    el.addEventListener("wheel", roue, { passive: false });
    return () => el.removeEventListener("wheel", roue);
  });

  const debut = (e: React.PointerEvent) => {
    pinces.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinces.current.size === 1) geste.current = { x: e.clientX, y: e.clientY, vue, bouge: false };
    else geste.current = null;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const deplace = (e: React.PointerEvent) => {
    if (!pinces.current.has(e.pointerId)) return;
    pinces.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinces.current.size >= 2) {
      const [a, b] = [...pinces.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (ecart.current) zoomeVers(d / ecart.current, null);
      ecart.current = d;
      return;
    }

    const g = geste.current;
    if (!g) return;
    const r = svg.current?.getBoundingClientRect();
    if (!r) return;
    const dx = ((e.clientX - g.x) / r.width) * largeur;
    const dy = ((e.clientY - g.y) / r.height) * hauteur;
    if (Math.abs(e.clientX - g.x) > 5 || Math.abs(e.clientY - g.y) > 5) g.bouge = true;
    if (g.bouge) setVue(borne({ ...g.vue, x: g.vue.x - dx, y: g.vue.y - dy }));
  };

  const fin = (e: React.PointerEvent) => {
    pinces.current.delete(e.pointerId);
    if (pinces.current.size < 2) ecart.current = null;
  };

  /** Un pays n'est joué que si le doigt n'a pas glissé. */
  const clic = (id: string) => {
    if (geste.current?.bouge) return;
    onPays(id);
  };

  const remplit = (id: string) => {
    const s = scores[id];
    return s === undefined ? NON_ESSAYE : GRADIENT[s];
  };
  const trait = (id: string) => {
    if (surbrillance === id) return TRAIT.cible * parPx;
    return (scores[id] === undefined ? TRAIT.neutre : TRAIT.essaye) * parPx;
  };
  const couleurTrait = (id: string) => (surbrillance === id ? skin.accent : scores[id] === undefined ? `${skin.ink}44` : skin.ink);

  return (
    <div
      style={{
        position: "relative",
        border: `${skin.border}px solid ${skin.ink}`,
        borderRadius: skin.radius,
        overflow: "hidden",
        background: "#CFE3EC",
        boxShadow: `5px 5px 0 ${skin.accent}`,
        touchAction: "none",
      }}
    >
      <svg
        ref={svg}
        viewBox={`${vue.x} ${vue.y} ${largeur} ${hauteur}`}
        role="img"
        aria-label={etiquette}
        style={{ display: "block", width: "100%", height: "auto", cursor: "grab" }}
        onPointerDown={debut}
        onPointerMove={deplace}
        onPointerUp={fin}
        onPointerCancel={fin}
      >
        {/* Le décor : Antarctique, Groenland, territoires hors référentiel. Ils
            ne réagissent à rien — mais les effacer ferait des trous, et un trou
            se lit comme une information. */}
        {DECORS.map((d, i) => (
          <path key={`d${i}`} d={d} fill="#E4E1D8" stroke="#B9B5AA" strokeWidth={0.6 * parPx} />
        ))}

        {Object.entries(TRACES).map(([id, d]) => (
          <path
            key={id}
            // Le code ISO en clair sur le tracé : il ne divulgue rien (les 193 y
            // sont) et c'est par lui qu'un test de bout en bout peut viser un
            // pays précis au lieu de cliquer au jugé sur une projection.
            data-pays={id}
            d={d}
            fill={remplit(id)}
            stroke={couleurTrait(id)}
            strokeWidth={trait(id)}
            strokeLinejoin="round"
            onPointerUp={() => clic(id)}
            style={{ cursor: "pointer" }}
          />
        ))}

        {/* Les petits États. Le disque transparent est la vraie cible tactile :
            le point visible reste petit pour ne pas manger la mer autour. */}
        {Object.entries(POINTS).map(([id, [x, y]]) => (
          <g key={`p${id}`} data-pays={id} onPointerUp={() => clic(id)} style={{ cursor: "pointer" }}>
            {/* La CIBLE : 22 px de rayon, soit les 44 px recommandés au doigt.
                Invisible, et bien plus large que la pastille — c'est justement
                le point : une pastille assez grosse pour être touchée mangerait
                la mer autour et transformerait les Caraïbes en grappe de
                bulles. Vu à l'écran : à 4,5 px de rayon, les micro-États
                d'Europe se chevauchaient déjà. */}
            <circle cx={x} cy={y} r={22 * parPx} fill="transparent" />
            <circle
              cx={x}
              cy={y}
              r={(surbrillance === id ? 4 : 2.6) * parPx}
              fill={remplit(id)}
              stroke={surbrillance === id ? skin.accent : skin.ink}
              strokeWidth={1 * parPx}
            />
          </g>
        ))}
      </svg>

      {/* Le zoom au doigt existe, mais deux boutons valent mieux qu'un geste
          qu'il faut deviner — et ils donnent au clavier une prise sur la carte. */}
      <div style={{ position: "absolute", right: 8, bottom: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          ["+", () => zoomeVers(1.6, null)],
          ["−", () => zoomeVers(1 / 1.6, null)],
        ].map(([libelle, action]) => (
          <button
            key={libelle as string}
            type="button"
            onClick={action as () => void}
            aria-label={libelle === "+" ? "zoom +" : "zoom −"}
            style={{
              width: 38,
              height: 38,
              fontSize: 20,
              fontWeight: 800,
              lineHeight: 1,
              cursor: "pointer",
              borderRadius: 10,
              border: `2px solid ${skin.ink}`,
              background: skin.paper,
              color: skin.ink,
            }}
          >
            {libelle as string}
          </button>
        ))}
      </div>
    </div>
  );
}
