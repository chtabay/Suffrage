"use client";

// CHOISIR SON NOM — la règle, en un seul endroit.
//
// ⚠️ ELLE VIT MAINTENANT SUR DEUX SURFACES (le tableau du jour, la tablée) ET
// C'EST POUR ÇA QU'ELLE EST ICI. Une règle recopiée dérive : celle du mot
// orphelin a déjà dû être appliquée à deux endroits le 22 août, et le calcul des
// scores d'une journée a fini par exister en trois exemplaires avant qu'on ne le
// sorte en base. Le nom suit le même chemin, et on le coupe avant.
//
// LA RÈGLE : sans compte, un nom PRIS DANS LA LISTE FERMÉE (600 par langue).
// Avec un compte, LE PSEUDO DU COMPTE, et rien à retaper.
//
// ⚠️ IL Y AVAIT DEUX DÉPÔTS DE PSEUDO INDÉPENDANTS, ET UN JOUEUR L'A VU AVANT
// NOUS : « j'ai associé un pseudo sur mon compte, or après avoir renseigné le
// Banalo du jour il m'a été proposé de préciser un pseudo, au lieu de le
// reprendre ». Vérifié en base : son compte portait `Le duc` depuis deux jours,
// et il avait retapé `Le duc` à la main pour la journée 3. Le champ libre de cet
// écran écrivait dans `scrutin_banalo_noms`, celui des classements dans
// `scrutin_jeux_pseudos`, et rien ne les reliait.
//
// ⚠️ CE N'ÉTAIT PAS QU'UNE FRICTION : LA PRISE DE LA RÉGIE NE COUVRAIT QU'UN DES
// DEUX. Un pseudo retiré par un modérateur pouvait continuer à publier le même
// texte au tableau public tous les jours. Or c'est cette prise qui payait le
// droit d'avoir du texte libre — voir `20260907-jeux-un-seul-pseudo.sql`.
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
import { useEffect, useMemo, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { UNANIMO_SKIN as skin } from "@/lib/games/skin";
import { GLabel } from "@/components/games/ui";
import { graineDe, nomDe, nomsProposes } from "@/content/banalo/noms";
import { monPseudo } from "@/lib/db/jeux";
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
  /**
   * Le pseudo du compte, une fois lu. `null` tant qu'on ne l'a pas lu, ou si le
   * compte n'en a pas encore.
   */
  pseudo: string | null;
  /** Un modérateur l'a retiré : il faut en poser un autre avant de figurer. */
  bloque: boolean;
  /** La lecture est finie. Sert à ne rien afficher plutôt qu'un état faux. */
  lu: boolean;
}

export const NOM_VIERGE: EtatNom = {
  tour: 0,
  index: null,
  libre: "",
  pseudo: null,
  bloque: false,
  lu: false,
};

/**
 * Le choix à envoyer, ou `null` si rien n'est choisi.
 *
 * ⚠️ LE PSEUDO DU COMPTE PASSE AVANT TOUT, et il n'envoie AUCUN libellé : la
 * base résout le nom elle-même à la lecture. C'est ce qui fait qu'un pseudo
 * changé — ou retiré par la Régie — se répercute partout sans qu'aucune ligne
 * n'ait à être réécrite.
 */
export function choixDeNom(e: EtatNom): ChoixDeNom | null {
  if (e.bloque) return null;
  if (e.pseudo) return { compte: true };
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

  /**
   * Le pseudo du compte, lu UNE fois.
   *
   * ⚠️ `etat` ET `setEtat` NE SONT PAS DANS LES DÉPENDANCES, ET C'EST VOLONTAIRE.
   * Les appelants passent `setEtat` en fonction fléchée, donc sa référence change
   * à chaque rendu : l'y mettre relancerait la lecture en boucle, et chaque
   * relance couperait la précédente — le défaut déjà payé sur `MonHistorique` et
   * sur `Quotidien`, ici avec une fonction plutôt qu'un objet de session. Le
   * `ref` garantit un appel unique, et rien ne peut avoir modifié l'état d'ici
   * là : tant que `lu` est faux, un connecté ne voit aucun champ à remplir.
   */
  const demande = useRef(false);
  useEffect(() => {
    if (!connecte || demande.current) return;
    demande.current = true;
    let vivant = true;
    void monPseudo().then((p) => {
      if (!vivant) return;
      // ⚠️ UN REFUS (`null`) N'EST PAS « PAS DE PSEUDO ». On le traite comme une
      // lecture finie sans nom : l'écran proposera d'en poser un et la base
      // tranchera. Mentir dans l'autre sens — prétendre qu'il en a un —
      // afficherait un nom vide en gros caractères.
      setEtat({ ...etat, pseudo: p?.pseudo ?? null, bloque: p?.bloque === true, lu: true });
    });
    return () => {
      vivant = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecte]);

  // ⚠️ LES NOMS TOUT FAITS NE S'AFFICHENT PAS À QUI EST CONNECTÉ. Ils existent
  // pour permettre de se nommer SANS COMPTE ; devant quelqu'un qui a un compte,
  // ils proposent quatre noms d'animaux au-dessus du champ où il va de toute
  // façon écrire le sien. C'est quatre pastilles, une ligne de « en proposer
  // d'autres » et un paragraphe d'explication en moins — sur un écran qui se
  // bat pour sa hauteur.
  if (connecte) {
    // ⚠️ ON N'AFFICHE RIEN TANT QU'ON NE SAIT PAS. Un champ vide montré une
    // demi-seconde à quelqu'un qui a déjà un pseudo, puis remplacé par son nom,
    // c'est exactement la demande de trop qu'on est en train de retirer.
    if (!etat.lu) return null;

    // ⚠️ UN PSEUDO RETIRÉ SE DIT, ET RENVOIE LÀ OÙ ON EN REPOSE UN. Sans cette
    // phrase, le bouton reste inerte et rien n'explique pourquoi.
    if (etat.bloque) {
      return (
        <p style={{ margin: "12px 0 0", fontSize: 13.5, lineHeight: 1.5, fontWeight: 700 }}>
          {t("tableau.pseudoRetire")}
        </p>
      );
    }

    // Le cas ordinaire : le compte a un nom, on le REPREND.
    if (etat.pseudo) {
      return (
        <div style={{ marginTop: 12 }}>
          <GLabel skin={skin}>{t("tableau.sousCeNom")}</GLabel>
          <p style={{ margin: "4px 0 0", fontSize: 17, fontWeight: 800, fontFamily: skin.fontDisplay }}>
            {etat.pseudo}
          </p>
          {/* ⚠️ ON DIT OÙ IL SE CHANGE, sans mettre un lien : `GameShell` interdit
              la nav de Placet pendant une partie, et cet écran vit juste après
              une manche. Une phrase suffit à lever le « et si je veux en
              changer ? » sans ouvrir une sortie. */}
          <p style={{ margin: "6px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
            {t("tableau.pseudoOu")}
          </p>
        </div>
      );
    }

    // Le compte n'a pas encore de nom : on le demande UNE fois, et on le dit.
    return (
      <div style={{ marginTop: 12 }}>
        <GLabel skin={skin}>{t("tableau.libreSeul")}</GLabel>
        <input
          value={etat.libre}
          maxLength={20}
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
        {/* ⚠️ ON PRÉVIENT QUE CE NOM EST GARDÉ. C'est la contrepartie du fait
            qu'on ne le redemandera plus : un nom tapé « pour aujourd'hui » qui
            devient permanent en silence serait la même surprise, à l'envers. */}
        <p style={{ margin: "8px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
          {t("tableau.pseudoGarde")}
        </p>
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
          onClick={() => setEtat({ ...etat, tour: etat.tour + 1, index: null, libre: etat.libre })}
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
