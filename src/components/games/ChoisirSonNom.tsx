"use client";

// CHOISIR SON NOM — la règle, en un seul endroit.
//
// ⚠️ ELLE VIT MAINTENANT SUR DEUX SURFACES (le tableau du jour, la tablée) ET
// C'EST POUR ÇA QU'ELLE EST ICI. Une règle recopiée dérive : celle du mot
// orphelin a déjà dû être appliquée à deux endroits le 22 août, et le calcul des
// scores d'une journée a fini par exister en trois exemplaires avant qu'on ne le
// sorte en base. Le nom suit le même chemin, et on le coupe avant.
//
// LA RÈGLE : sans compte, ON ÉCRIT SON NOM, et la liste fermée de 600 noms
// n'est plus qu'une suggestion pour qui n'a pas d'idée. Avec un compte, LE
// PSEUDO DU COMPTE, et rien à retaper.
//
// ⚠️ C'EST UN RENVERSEMENT, ET IL EST DATÉ DU 2026-08-24. Retour de terrain,
// urgent : « la proposition de pseudo prégénéré en cas d'absence de compte ne
// fonctionne pas et les joueurs refusent ». La liste n'était pas une friction
// qu'on absorbe, c'était un REFUS — on offrait « Renard de minuit » à quelqu'un
// qui voulait figurer sous son nom, et il ne figurait pas du tout. Mesuré au
// moment du changement : 3 noms déposés sur Banalo, 1 sur Cinq sur cinq, pour
// 12 joueurs.
//
// ⚠️ CE QUE ÇA COÛTE EST ÉCRIT, PAS EFFACÉ. L'argument d'origine reste vrai mot
// pour mot : un champ de pseudo sur un classement public n'est pas un champ
// d'identité, c'est un canal de publication d'une ligne vers tous les autres —
// du harcèlement visant quelqu'un de précis (« Marie du CM2 pue »), des données
// personnelles déposées sans malice par un enfant, puis seulement les insultes ;
// et un filtre de gros mots ne règle que le troisième. Rien de tout ça n'est
// réfuté. Ce qui a changé est l'autre plateau : la règle avait un coût qu'on
// croyait payable et qui ne l'était pas. La politique de modération est
// REPORTÉE, pas décidée — et `20260913-jeux-nom-libre-sans-compte.sql` pose la
// plus petite prise qui rende un retrait possible.
//
// ⚠️ LA LISTE N'EST PAS PARTIE, ET ELLE NE DOIT PAS PARTIR. Elle sert deux
// choses qu'un champ vide ne sert pas : elle donne un nom à qui n'en cherche
// pas, et surtout **elle est traduite** — c'est un INDEX qu'on stocke, donc
// « Renard de minuit » s'affiche « Midnight Fox » à l'anglophone du même
// tableau. Un nom écrit, lui, est figé dans la langue où on l'a tapé. C'est
// pourquoi une suggestion CHOISIE reste un index tant qu'on n'y touche pas : le
// champ montre son libellé, la ligne stocke son rang.
//
// ⚠️ ET LE CHAMP MONTRE TOUJOURS CE QUI SERA PUBLIÉ. Un champ vide sous une
// pastille allumée poserait la question que l'écran doit justement fermer —
// « je figure sous quoi, au juste ? » — juste avant d'appuyer sur un bouton qui
// dit « Déposer ce nom ». Dès la première frappe la pastille s'éteint et le
// texte devient le nom : c'est le même geste, il n'y a rien à comprendre.

import { useEffect, useMemo, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { GameSkin } from "@/lib/games/skin";
import { GLabel } from "@/components/games/ui";
import { graineDe, nomDe, nomsProposes } from "@/content/banalo/noms";
import { monPseudo } from "@/lib/db/jeux";
import type { ChoixDeNom } from "@/lib/db/banalo";  // le type, pas le jeu : les deux jeux le partagent

/**
 * Combien de noms on propose d'un coup.
 *
 * ⚠️ TROIS, ET LE COMMENTAIRE D'AVANT ÉTAIT FAUX : il disait « quatre tiennent
 * sur deux lignes d'un téléphone ». Mesuré à 390 px, quatre en prennent TROIS —
 * les noms font jusqu'à vingt caractères — soit ~130 px de pastilles sous un
 * champ de 40. Depuis que la liste n'est qu'une SUGGESTION, l'aide pesait plus
 * lourd que ce qu'elle aide. Trois tiennent sur deux lignes, « en proposer
 * d'autres » compris. Ça ne se voit qu'à l'écran.
 */
const PROPOSES = 3;

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
  skin,
  jeton,
  connecte,
  etat,
  setEtat,
  explication,
}: {
  skin: GameSkin;
  jeton: string | null;
  connecte: boolean;
  etat: EtatNom;
  setEtat: (e: EtatNom) => void;
  /**
   * Qui lira ce nom, en une phrase.
   *
   * ⚠️ ELLE ARRIVE DE L'APPELANT PARCE QU'ELLE N'EST PAS LA MÊME, et c'est
   * précisément ce qui la rend utile depuis que le champ est ouvert : un
   * tableau du jour est lu par des inconnus, une tablée par les gens qui vous
   * ont invité. Vu à l'écran du temps de la liste fermée : le composant partagé
   * servait la phrase du tableau sur la page d'invitation. La choisir ICI
   * demanderait une clé par appelant, et une clé prise en variable échappe au
   * contrôle de parité i18n — donc c'est le texte qui voyage, pas la clé.
   */
  explication: string;
}) {
  const t = useTranslations("TableauJeux");
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
          {t("pseudoRetire")}
        </p>
      );
    }

    // Le cas ordinaire : le compte a un nom, on le REPREND.
    if (etat.pseudo) {
      return (
        <div style={{ marginTop: 12 }}>
          <GLabel skin={skin}>{t("sousCeNom")}</GLabel>
          <p style={{ margin: "4px 0 0", fontSize: 17, fontWeight: 800, fontFamily: skin.fontDisplay }}>
            {etat.pseudo}
          </p>
          {/* ⚠️ ON DIT OÙ IL SE CHANGE, sans mettre un lien : `GameShell` interdit
              la nav de Placet pendant une partie, et cet écran vit juste après
              une manche. Une phrase suffit à lever le « et si je veux en
              changer ? » sans ouvrir une sortie. */}
          <p style={{ margin: "6px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
            {t("pseudoOu")}
          </p>
        </div>
      );
    }

    // Le compte n'a pas encore de nom : on le demande UNE fois, et on le dit.
    return (
      <div style={{ marginTop: 12 }}>
        <GLabel skin={skin}>{t("libreSeul")}</GLabel>
        <input
          value={etat.libre}
          maxLength={20}
          onChange={(e) => setEtat({ ...etat, libre: e.target.value, index: null })}
          placeholder={t("librePlace")}
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
          {t("pseudoGarde")}
        </p>
      </div>
    );
  }

  // ⚠️ LE CHAMP D'ABORD, LES SUGGESTIONS ENSUITE, et l'ordre EST la correction.
  // Quatre pastilles en tête de carte se lisent « choisissez parmi ceci » ; le
  // champ posé dessous passait pour l'exception réservée aux comptes — ce qu'il
  // était, d'ailleurs. On inverse : on demande son nom, et on aide qui n'en a
  // pas.
  return (
    <>
      <div style={{ marginTop: 10 }}>
        <GLabel skin={skin}>{t("libreSeul")}</GLabel>
        <input
          value={etat.libre || (etat.index !== null ? nomDe(etat.index, locale) : "")}
          maxLength={20}
          onChange={(e) => setEtat({ ...etat, libre: e.target.value, index: null })}
          placeholder={t("librePlace")}
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

      {/* ⚠️ LES SUGGESTIONS SONT UNE AIDE, PLUS UN MENU — d'où l'amorce qui les
          introduit. Sans elle, quatre pastilles sous un champ rempli se lisent
          comme quatre autres champs, ou comme une question qu'on n'a pas posée. */}
      <p style={{ margin: "12px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
        {t("suggestions")}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "6px 0 0" }}>
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
          {t("autres")}
        </button>
      </div>

      {/* ⚠️ CETTE PHRASE A CHANGÉ DE MÉTIER LE JOUR OÙ LE CHAMP S'EST OUVERT.
          Elle expliquait pourquoi la liste était FERMÉE ; la liste ne l'est
          plus. Elle dit maintenant QUI VA LIRE ce nom — la seule information
          qui compte au moment de l'écrire, et la seule qui fasse réfléchir
          quelqu'un avant de taper. Elle reste passée par l'appelant : le public
          d'un tableau du jour et celui d'un groupe ne sont pas le même, et une
          clé choisie en variable échapperait au contrôle de parité i18n. */}
      <p style={{ margin: "10px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
        {explication}
      </p>
    </>
  );
}
