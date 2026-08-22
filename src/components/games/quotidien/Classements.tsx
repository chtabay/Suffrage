"use client";

// LE CLASSEMENT DE LA SAISON — un mois de points, puis on remet à zéro.
//
// ⚠️ IL A REMPLACÉ LA MOYENNE GLISSANTE SUR TRENTE JOURNÉES, et ce n'est pas un
// ajout : les deux classaient les MÊMES comptes en disant des choses
// différentes, donc un joueur qui voyait les deux ne savait plus lequel était le
// vrai. C'est le défaut des deux vocabulaires, déjà écarté pour la courbe (on
// retourne l'AXE, pas le CHIFFRE). Et une moyenne PUNIT la journée en plus :
// jouer un jour de moins bonne forme fait baisser un chiffre, alors que ce
// produit veut qu'on revienne. Des points, eux, n'enlèvent jamais rien.
//
// ⚠️ LE BARÈME EST EN BASE, PAS ICI (`scrutin_jeux_points`) : une table de
// points recopiée à l'écran finirait par diverger de celle qui a gelé les
// trophées, et un trophée ne se recalcule pas. L'écran affiche, il ne calcule
// rien.
//
// ⚠️ TROIS PORTÉES, ET LA TROISIÈME EST L'INTÉRÊT DE LA PAGE : chaque jeu
// séparément, et TOUS JEUX CONFONDUS. C'est possible parce que ce qui se cumule
// est une PLACE — être premier veut dire la même chose chez Banalo et chez Cinq
// sur cinq, là où un nombre d'essais et une somme de voix ne s'additionnent pas.
//
// ⚠️ ICI LE RANG S'AFFICHE, ALORS QUE LE TABLEAU DU JOUR LE REFUSE. Ce n'est pas
// un revirement : au jour, un vrai rang existe parmi TOUS les joueurs (la carte
// de score l'affiche), donc un rang parmi les seuls inscrits serait un mensonge.
// Sur la durée, aucun rang « vrai » n'existe — la plupart des joueurs sont des
// jetons anonymes sans identité d'un jour à l'autre. Le rang parmi les comptes
// classés est donc le SEUL qui existe, et l'effectif est affiché avec.
//
// ⚠️ IL FAUT UN COMPTE POUR Y FIGURER, PAS POUR LE REGARDER. Un classement qu'on
// ne peut pas voir avant de s'inscrire ne donne aucune raison de s'inscrire.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { User } from "@supabase/supabase-js";
import { PLACET_GAMES_SKIN as skin } from "@/lib/games/skin";
import { GBtn, GCard, GLabel } from "@/components/games/ui";
import {
  monPseudo,
  poserPseudo,
  saison as litSaison,
  type DepotPseudo,
  type LigneSaison,
  type PorteeCumul,
  type Saison,
} from "@/lib/db/jeux";

const bcp = (locale: string) => (locale === "pcm" ? "en" : locale);
const PORTEES: PorteeCumul[] = ["tout", "banalo", "pays"];

/**
 * « 2026-08 » → « août 2026 », dans la langue du lecteur.
 *
 * ⚠️ PAS DE CLÉ i18n POUR LES DOUZE MOIS. `Intl` les connaît déjà dans les
 * quatre langues, et douze clés × quatre serait quarante-huit traductions à
 * tenir pour un mot que la plateforme donne. On construit la date au MILIEU du
 * mois : le 1er à minuit bascule d'un mois en arrière dans les fuseaux à l'ouest
 * de Paris.
 */
function moisLisible(saison: string, locale: string): string {
  const [a, m] = saison.split("-").map(Number);
  if (!a || !m) return saison;
  return new Intl.DateTimeFormat(bcp(locale), { month: "long", year: "numeric" })
    .format(new Date(Date.UTC(a, m - 1, 15)));
}

export default function Classements({ user }: { user: User | null }) {
  const t = useTranslations("JeuxQuotidiens");
  const locale = useLocale();

  const [portee, setPortee] = useState<PorteeCumul>("tout");
  const [table, setTable] = useState<Saison | null>(null);
  const [pseudo, setPseudo] = useState<string | null>(null);
  const [bloque, setBloque] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [souci, setSouci] = useState<DepotPseudo | null>(null);
  // ⚠️ RIEN NE CONFIRMAIT LE DÉPÔT, ET UN VRAI JOUEUR A CONCLU À LA PANNE. Le
  // pseudo s'enregistrait bien : la SEULE trace à l'écran était une étiquette de
  // 11 px qui passait de « CHOISIR UN PSEUDO » à « VOTRE PSEUDO », au-dessus
  // d'un champ qui contenait déjà le texte tapé. Rien ne bougeait là où l'œil
  // était — sur le bouton qu'on vient de presser.
  const [confirme, setConfirme] = useState(false);

  const relis = useCallback(async () => litSaison(portee), [portee]);

  useEffect(() => {
    let vivant = true;
    setTable(null);
    void relis().then((c) => {
      if (vivant) setTable(c);
    });
    return () => {
      vivant = false;
    };
  }, [relis]);

  // ⚠️ `user?.id` ET PAS `user` : `useAuth` rend un objet dont la référence
  // change à chaque relecture de session, et un effet qui en dépend se relance
  // en boucle en coupant sa propre réponse. Défaut déjà payé sur `MonHistorique`.
  const uid = user?.id ?? null;
  useEffect(() => {
    if (!uid) return;
    let vivant = true;
    void monPseudo().then((p) => {
      if (!vivant || !p) return;
      setPseudo(p.pseudo);
      setBloque(p.bloque);
      setSaisie(p.pseudo ?? "");
    });
    return () => {
      vivant = false;
    };
  }, [uid]);

  const nb = useMemo(() => new Intl.NumberFormat(bcp(locale), { maximumFractionDigits: 1 }), [locale]);

  // ⚠️ « ET MOI, POURQUOI JE N'Y SUIS PAS ? » — LA QUESTION QUE LA CARTE NE
  // SAVAIT PAS ENTENDRE. Elle ne répondait que par une phrase sur TOUT LE MONDE
  // là où le joueur pose une question sur LUI ; sans un état à lui, il ne peut
  // pas distinguer « ça n'a pas marché » de « il me manque quelque chose », et
  // il conclut à la panne. Elle sort AUSSI quand la liste n'est pas vide : ne
  // pas se trouver dans un classement peuplé pose exactement la même question.
  const moiAucune = Boolean(uid && table && !table.moi && table.mesJournees === 0);
  // ⚠️ ET LE SECOND ÉTAT MUET : le classement existe, j'en fais peut-être partie,
  // mais on est moins de deux — la base ne rend alors ni lignes ni `moi`. Sans un
  // mot, c'est une absence qui se lit comme une panne.
  const troisPeu = Boolean(table && table.joueurs > 0 && table.joueurs < table.minimumClasses);
  // ⚠️ ET LE SEUL CLASSÉ, C'EST MOI — ça se DÉDUIT, la base ne le dit pas. Avec
  // un pseudo non bloqué et au moins une journée qui compte, je suis classé ;
  // s'ils ne sont qu'un, c'est donc moi. Le dire change la nature du message :
  // « vous y êtes » est une récompense, « un seul joueur est classé » est un
  // constat sur les autres. On ne peut pas le faire dire à la base sans lui
  // faire rendre « 1er sur 1 », que ce produit refuse partout.
  const seulEtCestMoi = Boolean(troisPeu && pseudo && !bloque && table && table.mesJournees > 0);
  // ⚠️ ET CELUI QUI A DES POINTS SANS PSEUDO NE DOIT PAS LIRE « 0 ». Ses journées
  // comptent déjà ; il ne lui manque qu'un nom sous lequel figurer, et c'est la
  // carte juste en dessous qui le lui propose.
  const pointsSansNom = Boolean(uid && table && !table.moi && table.mesJournees > 0 && !troisPeu);

  const pose = async () => {
    if (envoi || saisie.trim().length < 2) return;
    setEnvoi(true);
    setSouci(null);
    setConfirme(false);
    const r = await poserPseudo(saisie);
    setEnvoi(false);
    if (r !== "ok") {
      setSouci(r);
      return;
    }
    setPseudo(saisie.trim());
    setBloque(false);
    setConfirme(true);
    const c = await relis();
    if (c) setTable(c);
  };

  const message = () => {
    if (souci === "pris") return t("pseudoPris");
    if (souci === "court") return t("pseudoCourt");
    if (souci === "long") return t("pseudoLong");
    return t("panne");
  };

  const ligne = (l: Omit<LigneSaison, "moi">, moi: boolean) => (
    <li
      key={`${l.place}-${l.pseudo}`}
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        minWidth: 0,
        padding: "6px 8px",
        borderRadius: 6,
        background: moi ? `${skin.accent}1A` : "transparent",
        fontWeight: moi ? 800 : 600,
      }}
    >
      <span
        style={{
          flex: "none",
          minWidth: 26,
          fontFamily: skin.fontDisplay,
          fontWeight: 800,
          color: skin.muted,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {l.place}
      </span>
      <span style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {l.pseudo}
        {moi ? <span style={{ color: skin.accent, fontWeight: 800 }}> · {t("vous")}</span> : null}
      </span>
      {/* L'effectif de journées reste à côté des points : c'est lui qui dit d'où
          ils viennent — trente journées de présence valent autant qu'une
          victoire, et le lecteur doit pouvoir le voir. */}
      <span style={{ flex: "none", fontSize: 12, color: skin.muted }}>{t("surN", { n: l.journees })}</span>
      <span
        style={{
          flex: "none",
          fontFamily: skin.fontDisplay,
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {t("points", { n: nb.format(l.points) })}
      </span>
    </li>
  );

  return (
    <>
      {/* LES TROIS PORTÉES. Des onglets plutôt qu'un menu : à trois choix, un
          menu cache deux options derrière un geste.

          ⚠️ ELLES SONT PLUS PETITES QUE LES ONGLETS DE PAGE, et c'est mesuré.
          Aux mêmes dimensions, les deux rangées se repliaient chacune sur deux
          lignes : 380 px de pastilles avant le moindre contenu sur un téléphone
          de 390 — près de la moitié du premier écran passée en navigation.
          Réduites, les trois portées tiennent sur UNE ligne, et la hiérarchie y
          gagne : la page d'abord, ce qu'on y regarde ensuite. */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
        {PORTEES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPortee(p)}
            aria-pressed={portee === p}
            style={{
              fontFamily: skin.fontDisplay,
              fontWeight: 800,
              fontSize: 12.5,
              padding: "5px 10px",
              borderRadius: 999,
              cursor: "pointer",
              border: `2px solid ${skin.ink}`,
              background: portee === p ? skin.accent : skin.paper,
              color: portee === p ? "#fff" : skin.ink,
            }}
          >
            {/* Les trois clés sont écrites EN CLAIR : une clé choisie en variable
                échapperait au contrôle de parité i18n. */}
            {p === "tout" ? t("porteeTout") : p === "banalo" ? t("banalo") : t("pays")}
          </button>
        ))}
      </div>

      <GCard skin={skin} padding={18} style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          {/* ⚠️ LE MOIS EST LE TITRE, pas une note. Une saison qui ne dit pas
              laquelle elle est n'a ni début ni fin — c'est précisément ce qu'on
              vient de corriger. */}
          <GLabel skin={skin}>{table ? moisLisible(table.saison, locale) : t("saisonTitre")}</GLabel>
          {table ? (
            <span style={{ fontSize: 12, fontWeight: 700, color: skin.muted }}>
              {t("classes", { n: table.joueurs })}
            </span>
          ) : null}
        </div>

        {/* MES POINTS, MÊME QUAND JE NE SUIS PAS DANS LA LISTE. C'est le chiffre
            qui bouge tous les jours, donc celui qui donne envie de revenir. */}
        {uid && table && table.mesJournees > 0 ? (
          <p style={{ margin: "10px 0 0", fontSize: 13.5, fontWeight: 700, lineHeight: 1.5 }}>
            {t("mesPoints", { p: nb.format(table.mesPoints), n: table.mesJournees })}
          </p>
        ) : null}

        {moiAucune && table ? (
          <p style={{ margin: "10px 0 0", fontSize: 13.5, fontWeight: 700, lineHeight: 1.5 }}>
            {t("saisonMoiAucune")}
          </p>
        ) : null}
        {pointsSansNom ? (
          <p style={{ margin: "6px 0 0", fontSize: 13.5, fontWeight: 700, lineHeight: 1.5 }}>
            {t("saisonSansPseudo")}
          </p>
        ) : null}

        {table === null ? null : table.lignes.length === 0 ? (
          // ⚠️ LA PHRASE IMPERSONNELLE S'EFFACE QUAND LA LIGNE PERSONNELLE PARLE.
          // Empilées, les deux disent la même chose : vu à l'écran, ça faisait
          // trois paragraphes gris dont deux répétaient le même plancher.
          moiAucune || pointsSansNom ? null : (
            // ⚠️ CE QUI PARLE DE MOI EST EN ENCRE ET EN GRAS, ce qui parle des
            // autres est en gris. « Vous y êtes » est une récompense ; servie
            // dans la même grisaille qu'un constat sur la foule, elle ne se lit
            // plus comme une bonne nouvelle mais comme une note de bas de page.
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 13.5,
                lineHeight: 1.5,
                ...(seulEtCestMoi ? { fontWeight: 700 } : { color: skin.muted }),
              }}
            >
              {seulEtCestMoi
                ? t("cumulSeulVous")
                : troisPeu
                  ? t("cumulPresqueVide", { n: table.minimumClasses })
                  : t("saisonVide")}
            </p>
          )
        ) : (
          <>
            <ol style={{ display: "grid", gap: 2, margin: "10px 0 0", padding: 0, listStyle: "none", minWidth: 0, fontSize: 14.5 }}>
              {table.lignes.map((l) => ligne(l, l.moi))}
            </ol>
            {/* ⚠️ MA LIGNE SORT MÊME HORS DE LA TÊTE DE LISTE, et elle est DEHORS
                de l'`ol` : un lecteur d'écran annonce le numéro de chaque
                élément, et « 11ᵉ élément » pour une 34ᵉ place serait faux. */}
            {table.moi && !table.lignes.some((l) => l.moi) ? (
              <ul style={{ display: "grid", gap: 2, margin: 0, padding: 0, listStyle: "none", fontSize: 14.5 }}>
                <li aria-hidden style={{ color: skin.muted, padding: "2px 8px", letterSpacing: "0.2em" }}>
                  ···
                </li>
                {ligne(table.moi, true)}
              </ul>
            ) : null}
          </>
        )}

        <p style={{ margin: "12px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
          {t("saisonRegle")}
        </p>
        {/* ⚠️ LE PLANCHER DE MÉDAILLES SE DIT, il ne se découvre pas à la
            clôture. Un joueur qui a passé le mois en tête d'un classement de
            trois et qui ne reçoit rien le 1er a le droit de l'avoir su avant. */}
        {table ? (
          <p style={{ margin: "6px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
            {t("saisonMedailles", { n: table.minimumMedailles })}
          </p>
        ) : null}
      </GCard>

      {/* ── LE PSEUDO ──────────────────────────────────────────────────────
          ⚠️ SANS COMPTE, ON REGARDE MAIS ON N'ENTRE PAS, et on le dit — une
          absence sans un mot se lit comme une panne. */}
      {!user ? (
        <p style={{ margin: "12px 0 0", fontSize: 13, color: skin.muted, lineHeight: 1.5 }}>
          {t("cumulSansCompte")}
        </p>
      ) : (
        <GCard skin={skin} padding={16} style={{ marginTop: 12 }}>
          <GLabel skin={skin}>{pseudo && !bloque ? t("pseudoTitre") : t("pseudoPoser")}</GLabel>
          <p style={{ margin: "7px 0 0", fontSize: 13, color: skin.muted, lineHeight: 1.5 }}>
            {/* ⚠️ ON DIT CE QUE LE PSEUDO EXPOSE. C'est le seul nom du produit qui
                survit à une journée : le joueur doit le savoir avant de le poser. */}
            {bloque ? t("pseudoBloque") : t("pseudoTexte")}
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input
              value={saisie}
              maxLength={20}
              onChange={(e) => {
                setSaisie(e.target.value);
                setSouci(null);
                setConfirme(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void pose();
              }}
              placeholder={t("pseudoPlaceholder")}
              aria-label={t("pseudoPoser")}
              style={{
                flex: 1,
                minWidth: 0,
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
            <GBtn skin={skin} onClick={() => void pose()} disabled={envoi || saisie.trim().length < 2}>
              {t("pseudoBouton")}
            </GBtn>
          </div>
          {souci ? (
            <p role="alert" style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 700 }}>
              {message()}
            </p>
          ) : confirme ? (
            // `role="status"` et pas `role="alert"` : ce n'est pas une urgence,
            // et un lecteur d'écran ne doit pas couper la lecture en cours pour
            // annoncer une réussite.
            //
            // ⚠️ `skin.good` ET PAS `skin.accent` : le rouge du produit ne tient
            // que 4,21:1 sur le papier blanc, sous les 4,5 exigés pour un texte
            // de 13 px — le vert en tient 5,03. Et la couleur ne porte rien
            // toute seule ici : c'est la phrase qui dit ce qui s'est passé.
            <p role="status" style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 700, color: skin.good }}>
              {t("pseudoEnregistre")}
            </p>
          ) : null}
        </GCard>
      )}
    </>
  );
}
