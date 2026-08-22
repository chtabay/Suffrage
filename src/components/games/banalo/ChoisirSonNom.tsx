"use client";

// CHOISIR SON NOM — la règle, en un seul endroit.
//
// ⚠️ ELLE VIT MAINTENANT SUR DEUX SURFACES (le tableau du jour, la tablée) ET
// C'EST POUR ÇA QU'ELLE EST ICI. Une règle recopiée dérive : celle du mot
// orphelin a déjà dû être appliquée à deux endroits le 22 août, et le calcul des
// scores d'une journée a fini par exister en trois exemplaires avant qu'on ne le
// sorte en base. Le nom suit le même chemin, et on le coupe avant.
//
// LA RÈGLE : soit un nom PRIS DANS LA LISTE FERMÉE (600 par langue), soit — avec
// un compte Placet — le nom qu'on veut.
//
// ⚠️ UN CHAMP DE PSEUDO LIBRE N'EST PAS UN CHAMP D'IDENTITÉ, c'est un canal de
// publication d'une ligne vers tous les autres. Par gravité réelle : du
// harcèlement visant quelqu'un de précis (« Marie du CM2 pue ») ; des données
// personnelles déposées sans malice par un enfant, sur un jeu dont la politique
// déclare une tranche d'âge « enfant » ; puis seulement les insultes. Un filtre
// de gros mots ne règle que le troisième. La sortie n'est donc pas de filtrer le
// texte libre, c'est de ne pas en ouvrir — sauf là où quelqu'un en répond,
// c'est-à-dire derrière un compte : un jeton anonyme ne se bannit pas, on efface
// son `localStorage` et on revient.
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { UNANIMO_SKIN as skin } from "@/lib/games/skin";
import { GLabel } from "@/components/games/ui";
import { graineDe, nomDe, nomsProposes } from "@/content/banalo/noms";
import type { ChoixDeNom } from "@/lib/db/banalo";

/** Combien de noms on propose d'un coup. Quatre tiennent sur deux lignes d'un téléphone. */
const PROPOSES = 4;

/**
 * L'état du choix, tenu par l'appelant.
 *
 * ⚠️ `tour` EST DANS L'ÉTAT, et pas caché ici : quand la base répond « ce nom
 * est déjà pris », c'est l'appelant qui doit pouvoir renouveler la liste. Laisser
 * la même sous un message d'erreur invite à recliquer le nom qui vient d'échouer.
 */
export interface EtatNom {
  tour: number;
  index: number | null;
  libre: string;
}

export const NOM_VIERGE: EtatNom = { tour: 0, index: null, libre: "" };

/** Le choix à envoyer, ou `null` si rien n'est choisi. Le texte libre l'emporte. */
export function choixDeNom(e: EtatNom): ChoixDeNom | null {
  const nom = e.libre.trim();
  if (nom.length > 0) return { nom };
  return e.index !== null ? { index: e.index } : null;
}

export default function ChoisirSonNom({
  jeton,
  connecte,
  etat,
  setEtat,
  portee = "jour",
}: {
  jeton: string | null;
  connecte: boolean;
  etat: EtatNom;
  setEtat: (e: EtatNom) => void;
  /**
   * Qui lira ce nom : tous les joueurs de la journée, ou les seuls membres de la
   * tablée.
   *
   * ⚠️ LA PHRASE N'EST PAS LA MÊME, ET LA RECOPIER SERAIT FAUX. « un nom que
   * tous les joueurs du jour peuvent lire » décrit le tableau public ; dans une
   * tablée, seuls ses membres le lisent. Vu à l'écran : le composant partagé
   * servait la phrase du tableau sur la page d'invitation.
   */
  portee?: "jour" | "tablee";
}) {
  const t = useTranslations("BanaloJour");
  const locale = useLocale();

  // ⚠️ LES NOMS PROPOSÉS SONT TIRÉS D'UNE GRAINE, PAS DE `Math.random()`. Sans
  // graine, chaque rendu de React redistribuerait la liste et le nom que le
  // joueur s'apprêtait à choisir disparaîtrait sous ses yeux.
  const propositions = useMemo(
    () => nomsProposes(graineDe(jeton ?? "graine"), PROPOSES, etat.tour),
    [jeton, etat.tour],
  );

  // ⚠️ LES NOMS TOUT FAITS NE S'AFFICHENT PAS À QUI EST CONNECTÉ. Ils existent
  // pour permettre de se nommer SANS COMPTE ; devant quelqu'un qui a un compte,
  // ils proposent quatre noms d'animaux au-dessus du champ où il va de toute
  // façon écrire le sien. C'est quatre pastilles, une ligne de « en proposer
  // d'autres » et un paragraphe d'explication en moins — sur un écran qui se
  // bat pour sa hauteur.
  if (connecte) {
    return (
      <div style={{ marginTop: 12 }}>
        <GLabel skin={skin}>{t("tableau.libreSeul")}</GLabel>
        <input
          value={etat.libre}
          maxLength={24}
          onChange={(e) => setEtat({ ...etat, libre: e.target.value, index: null })}
          placeholder={t("tableau.librePlace")}
          style={{
            width: "100%",
            marginTop: 6,
            padding: "9px 11px",
            fontSize: 15,
            fontWeight: 700,
            borderRadius: 8,
            border: `2px solid ${skin.ink}`,
            background: skin.paper,
            color: skin.ink,
            boxSizing: "border-box",
          }}
        />
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "10px 0 0" }}>
        {propositions.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setEtat({ ...etat, index: i, libre: "" })}
            style={{
              fontFamily: skin.fontDisplay,
              fontWeight: 800,
              fontSize: 13.5,
              padding: "7px 11px",
              borderRadius: 999,
              cursor: "pointer",
              // Le nom retenu est PLEIN, les autres sont des contours : la même
              // règle que les pastilles de Cinq sur cinq, où une pastille qui
              // parle n'a pas l'air d'une pastille qui se tait.
              border: `2px solid ${skin.ink}`,
              background: etat.index === i ? skin.accent : skin.paper,
              color: etat.index === i ? "#fff" : skin.ink,
            }}
            aria-pressed={etat.index === i}
          >
            {nomDe(i, locale)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setEtat({ tour: etat.tour + 1, index: null, libre: etat.libre })}
          style={{
            fontSize: 13,
            fontWeight: 700,
            padding: "7px 4px",
            border: "none",
            background: "none",
            color: skin.muted,
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          {t("tableau.autres")}
        </button>
      </div>

      {/* ⚠️ SANS COMPTE, IL N'Y A QUE LA LISTE — et la phrase qui dit pourquoi.
          La règle est tenue par une CONTRAINTE DE TABLE, pas par cette
          condition d'écran : une erreur ici ne peut pas ouvrir le texte libre. */}
      {/* Factuel, et à sa place : ça explique pourquoi la liste est fermée.
          ⚠️ Ce n'est PAS l'offre de compte de l'après-partie — celle-là a sa
          carte, et §0 interdit d'en empiler deux. Une phrase grise sans bouton
          ne concurrence rien. */}
      <p style={{ margin: "10px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
          {/* ⚠️ LES DEUX CLÉS SONT ÉCRITES EN CLAIR : une clé choisie en
              variable échapperait au contrôle de parité i18n. */}
        {portee === "tablee" ? t("tablee.pourquoi") : t("tableau.pourquoi")}
      </p>
    </>
  );
}
