"use client";

// LE TABLEAU DU JOUR — un nom, un score, et rien d'autre.
//
// ══ LA RÈGLE ═══════════════════════════════════════════════════════════════
//
// Pour figurer au tableau il faut SOIT un compte Placet — et alors on écrit son
// nom librement — SOIT déposer un nom PRIS DANS LA LISTE FERMÉE
// (`src/content/banalo/noms.ts`, 600 noms par langue). Qui ne fait ni l'un ni
// l'autre joue normalement, voit son rang et son centile sur sa carte de score,
// et n'apparaît pas ici.
//
// ⚠️ CE N'EST PAS UNE PRÉCAUTION DE FAÇADE, C'EST CE QUI REND LE TABLEAU
// POSSIBLE. Un champ de pseudo sur un classement public n'est pas un champ
// d'identité : c'est un canal de publication d'une ligne, adressé à tous les
// joueurs du jour. Par gravité réelle : du harcèlement visant quelqu'un de
// précis (« Marie du CM2 pue ») ; des données personnelles déposées sans malice
// par un enfant, sur un jeu dont la politique déclare une tranche d'âge
// « enfant » ; puis seulement les insultes. ⚠️ Un filtre de gros mots ne règle
// que le troisième. La sortie n'est donc pas de filtrer le texte libre, c'est de
// ne pas en ouvrir — sauf là où quelqu'un en répond, c'est-à-dire derrière un
// compte : un jeton anonyme ne se bannit pas, on efface son `localStorage` et on
// revient.
//
// ⚠️ ET LE COMPTE CONDITIONNE LE NOM, JAMAIS LA PRÉSENCE, parce que c'est
// mesuré : la base compte 2 comptes rattachés contre 11 joueurs sur la
// journée 2. Exiger un compte pour figurer au tableau le réduirait à deux lignes
// sur onze — un tableau vide n'est pas un tableau prudent, c'est un tableau
// mort.
//
// ⚠️ ON N'Y ENTRE QUE PAR UN GESTE. Personne n'est inscrit sans l'avoir voulu :
// c'est ce qui rend acceptable d'afficher le dernier autant que le premier,
// puisque le dernier n'y est que s'il a choisi d'y être.
//
// ⚠️ ET IL NE MONTRE JAMAIS LES MOTS. Un nom et un score. La garde du format
// « mots » — ne jamais rendre à un joueur le mot d'un autre — n'est pas entamée
// d'un pouce, et le tableau n'est pas la porte dérobée par laquelle elle
// tomberait.
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/useAuth";
import type { GameSkin } from "@/lib/games/skin";
import { GBtn, GCard, GLabel } from "@/components/games/ui";
import { nomDe } from "@/content/banalo/noms";
import ChoisirSonNom, { NOM_VIERGE, choixDeNom, type EtatNom } from "./ChoisirSonNom";
import type { ChoixDeNom, DepotNom, Tableau } from "@/lib/db/banalo";


/** Le plancher d'affichage, celui de la base (`v_min`). Seul inscrit, on serait « premier sur un ». */
const INSCRITS_MIN = 2;

export default function TableauDuJour({
  skin,
  jeton,
  lis,
  depose: deposeChoix,
  score: enMots,
  explication,
  duree,
  onDemande,
}: {
  skin: GameSkin;
  /** Le jeton du jeu appelant. Chaque jeu a le sien, et ils sont distincts. */
  jeton: string | null;
  /** Relire le tableau. L'appelant sait quelles clés son jeu exige. */
  lis: () => Promise<Tableau | null>;
  /** Déposer un nom, et rendre le statut de la base. */
  depose: (choix: ChoixDeNom) => Promise<DepotNom>;
  /**
   * Le chiffre d'une ligne, mis en mots.
   *
   * ⚠️ CHAQUE JEU A SON UNITÉ, ET ELLES NE SE COMPARENT PAS : une somme de voix
   * chez Banalo, une note sur 100 sur son format chiffré, un NOMBRE D'ESSAIS
   * chez Cinq sur cinq — où le meilleur est le plus PETIT. Le tableau ne
   * formate donc rien lui-même : il affiche ce que l'appelant lui rend.
   */
  score: (n: number) => string;
  /** Pourquoi la liste est fermée, en une phrase (voir `ChoisirSonNom`). */
  explication: string;
  /** Ce que devient ce nom, en une phrase — ou `null` si le joueur a un compte. */
  duree: string;
  /**
   * Prévient le parent que CE bloc demande un nom au joueur.
   *
   * ⚠️ IL NE PEUT Y AVOIR QU'UNE DEMANDE DE NOM PAR ÉCRAN. La tablée en pose une
   * aussi, et les deux formulaires se sont retrouvés l'un sous l'autre, avec les
   * MÊMES quatre noms proposés (même graine, même tour) : le joueur voyait deux
   * fois « Renard des sables » dans deux cartes différentes, et le choisir d'un
   * côté ne le choisissait pas de l'autre. Vu au navigateur, invisible autrement.
   */
  onDemande?: (demande: boolean) => void;
}) {
  const t = useTranslations("TableauJeux");
  const locale = useLocale();
  // ⚠️ `loading` COMPTE : sans lui, le champ de nom libre clignoterait — absent
  // le temps que la session revienne, puis présent — devant quelqu'un qui a un
  // compte. Le même défaut que `CompteBanalo` évite en ne rendant rien.
  const { user, loading } = useAuth();

  const [tableau, setTableau] = useState<Tableau | null>(null);
  // ⚠️ LE CHOIX DU NOM VIT DANS `ChoisirSonNom`, PAS ICI — la règle est partagée
  // avec la tablée, et une règle recopiée dérive.
  const [nom, setNom] = useState<EtatNom>(NOM_VIERGE);
  const [envoi, setEnvoi] = useState(false);
  const [souci, setSouci] = useState<DepotNom | null>(null);

  const relis = useCallback(async () => (jeton ? lis() : null), [jeton, lis]);

  useEffect(() => {
    let vivant = true;
    void relis().then((tb) => {
      if (vivant && tb) setTableau(tb);
    });
    return () => {
      vivant = false;
    };
  }, [relis]);

  // ⚠️ DANS UN EFFET, PAS PENDANT LE RENDU : appeler `onDemande` au fil du rendu
  // ferait un `setState` du parent pendant le rendu de l'enfant, ce que React
  // refuse.
  const demande = tableau !== null && !tableau.inscrit;
  useEffect(() => {
    onDemande?.(demande);
  }, [demande, onDemande]);

  const deposeLeNom = async () => {
    if (!jeton || envoi) return;
    const choix = choixDeNom(nom);
    if (!choix) return;
    setEnvoi(true);
    setSouci(null);
    const r = await deposeChoix(choix);
    setEnvoi(false);
    if (r === "ok") {
      const tb = await relis();
      if (tb) setTableau(tb);
      return;
    }
    setSouci(r);
    // ⚠️ UN NOM PRIS SE REMPLACE, IL NE SE REDEMANDE PAS. Laisser la même liste
    // sous un message d'erreur invite à recliquer le nom qui vient d'échouer.
    if (r === "pris") setNom({ ...nom, tour: nom.tour + 1, index: null, libre: "" });
    // « deja » veut dire que ce joueur est inscrit — depuis un autre onglet, ou
    // parce que la réponse du premier dépôt s'est perdue en route. On relit
    // plutôt que de le laisser devant un formulaire qui ne marchera jamais.
    if (r === "deja") {
      const tb = await relis();
      if (tb) setTableau(tb);
    }
  };

  // ⚠️ LE GARDE DE RENDU VIENT APRÈS TOUS LES CROCHETS, jamais avant : un
  // `return` placé plus haut sauterait `useEffect` selon l'état,
  // ce que React interdit.
  if (loading || !tableau) return null;

  const pret = choixDeNom(nom) !== null;

  const ligne = (nom: string, score: number, moi: boolean, cle: string) => (
    <li
      key={cle}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
        padding: "5px 8px",
        borderRadius: 6,
        // ⚠️ MA LIGNE EST TEINTÉE, PAS ENCADRÉE. Un cadre au milieu d'une liste
        // fait un trou rectangulaire — la même leçon que les barres des deux
        // bandes, où le repère est une barre pleine et jamais un contour.
        background: moi ? `${skin.accent}1A` : "transparent",
        fontWeight: moi ? 800 : 600,
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {nom}
        {moi ? <span style={{ color: skin.accent, fontWeight: 800 }}> · {t("vous")}</span> : null}
      </span>
      <span
        style={{
          flex: "none",
          fontFamily: skin.fontDisplay,
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {enMots(score)}
      </span>
    </li>
  );

  return (
    <GCard skin={skin} padding={18}>
      <GLabel skin={skin}>{t("titre")}</GLabel>

      {tableau.lignes.length > 0 ? (
        <>
          {/* ⚠️ UNE VRAIE LISTE ORDONNÉE, et ma ligne lointaine est DEHORS. Un
              lecteur d'écran annonce le numéro de chaque élément : dans la tête
              de liste, « 3ᵉ élément » est vrai. Ma ligne, elle, peut être la
              34ᵉ du classement — la laisser dans le même `ol` la ferait
              annoncer « 12ᵉ élément », c'est-à-dire un rang faux, exactement le
              chiffre que ce tableau refuse d'imprimer. */}
          <ol
            style={{
              display: "grid",
              gap: 2,
              margin: "10px 0 0",
              padding: 0,
              listStyle: "none",
              fontSize: 14.5,
            }}
          >
            {tableau.lignes.map((l, i) =>
              ligne(l.index !== null ? nomDe(l.index, locale) : (l.nom ?? ""), l.score, l.moi, `l${i}`),
            )}
          </ol>
          {/* ⚠️ MA LIGNE SORT MÊME HORS DE LA TÊTE DE LISTE, précédée de trois
              points : un tableau où l'on ne se trouve pas est un tableau qui
              parle des autres. Les points disent qu'il manque des lignes entre
              les deux, sinon la mienne se lirait comme la suivante. */}
          {tableau.moi ? (
            <ul style={{ display: "grid", gap: 2, margin: 0, padding: 0, listStyle: "none", fontSize: 14.5 }}>
              <li aria-hidden style={{ color: skin.muted, padding: "2px 8px", letterSpacing: "0.2em" }}>
                ···
              </li>
              {ligne(
                tableau.moi.index !== null ? nomDe(tableau.moi.index, locale) : (tableau.moi.nom ?? ""),
                tableau.moi.score,
                true,
                "moi",
              )}
            </ul>
          ) : null}
          {/* ⚠️ L'EFFECTIF PORTE L'ÉCHELLE, comme sous les deux bandes. « 1er »
              d'une liste de vingt ne veut pas dire la même chose selon que trois
              joueurs ou trois mille ont déposé un nom. Et il dit du même coup
              que le tableau ne compte QUE les inscrits — ce qui explique
              pourquoi il ne porte aucun numéro de rang : le vrai rang du joueur,
              parmi TOUS les joueurs du jour, est sur sa carte de score. */}
          <p style={{ margin: "10px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
            {t("inscrits", { n: tableau.inscrits })}
          </p>
        </>
      ) : null}

      {tableau.inscrit && tableau.bloque ? (
        // ⚠️ INSCRIT, MAIS RETIRÉ DE LA LISTE. Sans cette phrase, le joueur se
        // cherche dans un tableau où il ne peut pas être, et rien ne lui dit
        // que le geste qui l'y remettrait est de reposer un pseudo.
        <p style={{ margin: "10px 0 0", fontSize: 13.5, lineHeight: 1.5, fontWeight: 700 }}>
          {t("pseudoRetire")}
        </p>
      ) : tableau.inscrit ? (
        tableau.lignes.length === 0 ? (
          // Inscrit, mais seul : le tableau n'existe pas encore. On le DIT — une
          // information absente sans un mot se lit comme une panne, et le joueur
          // part la chercher ailleurs.
          <p style={{ margin: "10px 0 0", fontSize: 13.5, color: skin.muted, lineHeight: 1.5 }}>
            {t("seul", { n: INSCRITS_MIN })}
          </p>
        ) : null
      ) : (
        <div style={{ marginTop: tableau.lignes.length > 0 ? 16 : 10 }}>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>{t("invite")}</p>

          <ChoisirSonNom
            skin={skin}
            jeton={jeton}
            explication={explication}
            connecte={Boolean(user)}
            etat={nom}
            setEtat={(e) => {
              setNom(e);
              setSouci(null);
            }}
          />

          {/* ⚠️ LE MESSAGE SE POSE SOUS LES PASTILLES, PAS SOUS LE BOUTON. Vu à
              l'écran : plus bas, « ce nom est déjà porté » se lisait quatre
              lignes après la liste qu'il vient de renouveler, et le joueur ne
              faisait pas le lien entre les deux. */}
          {/* ⚠️ LES CLÉS SONT ÉCRITES EN CLAIR, une par branche : une clé choisie
              en variable échapperait au contrôle de parité i18n. */}
          {souci ? (
            <p style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 700, color: skin.ink }}>
              {souci === "pris" ? t("pris") : null}
              {souci === "deja" ? t("deja") : null}
              {souci === "court" ? t("court") : null}
              {souci === "long" ? t("long") : null}
              {souci === "bloque" ? t("pseudoRetire") : null}
              {souci === "panne" || souci === "refus" || souci === "compte" || souci === "pseudo"
                ? t("panne")
                : null}
            </p>
          ) : null}
          <GBtn
            skin={skin}
            variant="accent"
            size="md"
            full
            style={{ marginTop: 12 }}
            disabled={!pret || envoi}
            onClick={() => void deposeLeNom()}
          >
            {t("deposer")}
          </GBtn>

          {/* ⚠️ CETTE PHRASE NE S'ADRESSE QU'À QUI N'A PAS DE COMPTE, pour deux
              raisons. Elle serait FAUSSE pour les autres — derrière un compte le
              nom est le pseudo Placet, permanent. Et elle serait REDONDANTE :
              `ChoisirSonNom` vient de dire, deux lignes plus haut, soit « c'est
              votre pseudo Placet », soit « ce nom devient votre pseudo Placet ».
              Vu à l'écran : les deux phrases s'empilaient et disaient la même
              chose deux fois.

              Pour un anonyme elle reste nécessaire : « ce nom ne vaut que pour
              aujourd'hui » est la différence entre ce tableau et le « nom
              permanent et découvrable » que `docs/regularite-des-joueurs.md` §5
              donnait comme le vrai coût d'un système d'amis. */}
          {user ? null : (
            <p style={{ margin: "10px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
              {duree}
            </p>
          )}
        </div>
      )}
    </GCard>
  );
}
