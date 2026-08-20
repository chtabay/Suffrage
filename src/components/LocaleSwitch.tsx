"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { CREAM, INK, YELLOW, lift } from "@/components/scrutin/theme";

// Libellés du sélecteur : code ISO par défaut (FR/EN/ES), nom lisible sinon.
const LABELS: Record<string, string> = { pcm: "Pidgin" };

/**
 * Bascule de langue COMPACTE : une seule pastille (locale courante) qui déplie
 * un petit menu. Quatre langues en rangée saturaient la Nav — le choix de langue
 * est un réglage occasionnel, pas une action de premier niveau.
 *
 * ⚠️ UN GLOBE DESSINÉ, PAS L'EMOJI 🌐. Les emoji varient d'une plateforme à
 * l'autre — le globe d'Android n'est pas celui d'Apple, et sur certains fonds il
 * disparaît. Un tracé hérite de la couleur du bouton, donc il s'inverse
 * proprement quand la pastille passe en encre pleine à l'ouverture.
 *
 * ⚠️ ET ELLE PORTE UNE OMBRE : sans elle, la pastille se lisait comme du texte
 * et les joueurs passaient à côté. L'ombre jaune la range parmi les CONTRÔLES,
 * sans lui donner le corail de « Créer » — le choix de langue ne doit pas entrer
 * en concurrence avec l'action principale.
 */
/** Le globe : cercle, équateur, méridien. Même grille que les pictos des jeux. */
function Globe() {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ display: "block", flex: "none" }}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a13.5 13.5 0 0 1 0 18a13.5 13.5 0 0 1 0-18" />
    </svg>
  );
}

/**
 * ⚠️ LA PEAU EST FACULTATIVE, ET C'EST POUR LES JEUX. Posé tel quel dans
 * l'en-tête d'un jeu, ce bouton arrivait en crème-et-navy sur un fond menthe :
 * le défaut même que le système de peaux existe pour éviter (« tout composant
 * bâti sur `scrutin/theme` est, par construction, aux couleurs de Placet — c'est
 * exactement ce que le jeu ne doit pas être »). Sans peau, il reste celui de
 * Placet et rien ne bouge sur le reste du site.
 */
export interface LocaleSwitchSkin {
  ink: string;
  paper: string;
  accent: string;
  border: number;
  radius: number;
}

export default function LocaleSwitch({ skin }: { skin?: LocaleSwitchSkin }) {
  const encre = skin?.ink ?? INK;
  const fond = skin?.paper ?? CREAM;
  const relief = skin?.accent ?? YELLOW;
  const trait = skin?.border ?? 2;
  const rayon = skin?.radius ?? 10;
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Clic hors du menu → fermeture (comportement attendu d'un dropdown).
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", flex: "none" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          fontWeight: 700,
          fontSize: 12.5,
          cursor: "pointer",
          border: `${trait}px solid ${encre}`,
          borderRadius: rayon,
          background: open ? encre : fond,
          color: open ? "#fff" : encre,
          // ⚠️ MÊME HAUTEUR QUE « CRÉER », son voisin immédiat dans la barre.
          // Trois contrôles de trois hauteurs différentes se lisaient comme
          // trois objets sans rapport ; à hauteur égale ils forment une rangée.
          height: 38,
          padding: "0 12px",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          ...lift(`3px 3px 0 ${relief}`, `4px 4px 0 ${relief}`),
        }}
      >
        <Globe />
        {LABELS[locale] ?? locale.toUpperCase()} ▾
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 200,
            minWidth: 110,
            background: "#fff",
            border: `${trait}px solid ${encre}`,
            borderRadius: rayon,
            boxShadow: `3px 3px 0 ${encre}`,
            overflow: "hidden",
          }}
        >
          {routing.locales.map((l) => {
            const active = l === locale;
            return (
              <button
                key={l}
                role="option"
                aria-selected={active}
                onClick={() => {
                  setOpen(false);
                  router.replace(pathname, { locale: l });
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  border: "none",
                  background: active ? encre : "#fff",
                  color: active ? "#fff" : encre,
                  padding: "9px 14px",
                }}
              >
                {LABELS[l] ?? l.toUpperCase()}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
