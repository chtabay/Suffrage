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
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/useAuth";
import { UNANIMO_SKIN as skin } from "@/lib/games/skin";
import { GBtn, GCard, GLabel } from "@/components/games/ui";
import { monJeton } from "@/lib/games/banalo/jeton";
import { graineDe, nomDe, nomsProposes } from "@/content/banalo/noms";
import { deposerNom, litTableauDuJour, type DepotNom, type Tableau } from "@/lib/db/banalo";

const bcp = (locale: string) => (locale === "pcm" ? "en" : locale);

/** Combien de noms on propose d'un coup. Quatre tiennent sur deux lignes d'un téléphone. */
const PROPOSES = 4;
/** Le plancher d'affichage, celui de la base (`v_min`). Seul inscrit, on serait « premier sur un ». */
const INSCRITS_MIN = 2;

export default function TableauDuJour({ jour, theme }: { jour: number; theme: string | null }) {
  const t = useTranslations("BanaloJour");
  const locale = useLocale();
  // ⚠️ `loading` COMPTE : sans lui, le champ de nom libre clignoterait — absent
  // le temps que la session revienne, puis présent — devant quelqu'un qui a un
  // compte. Le même défaut que `CompteBanalo` évite en ne rendant rien.
  const { user, loading } = useAuth();

  const [tableau, setTableau] = useState<Tableau | null>(null);
  const [tour, setTour] = useState(0);
  const [choisi, setChoisi] = useState<number | null>(null);
  const [libre, setLibre] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [souci, setSouci] = useState<DepotNom | null>(null);

  const relis = useCallback(async () => {
    const jeton = monJeton();
    if (!jeton) return null;
    return litTableauDuJour(jeton, jour, locale, theme);
  }, [jour, locale, theme]);

  useEffect(() => {
    let vivant = true;
    void relis().then((tb) => {
      if (vivant && tb) setTableau(tb);
    });
    return () => {
      vivant = false;
    };
  }, [relis]);

  // ⚠️ LES NOMS PROPOSÉS SONT TIRÉS D'UNE GRAINE, PAS DE `Math.random()`. Sans
  // graine, chaque rendu de React redistribuerait la liste et le nom que le
  // joueur s'apprêtait à choisir disparaîtrait sous ses yeux. « En proposer
  // d'autres » incrémente le tour, ce qui redonne une liste stable.
  const propositions = useMemo(() => {
    const jeton = monJeton();
    return nomsProposes(graineDe(jeton ?? "graine"), PROPOSES, tour);
  }, [tour]);

  // Le score du format « mots » est une somme de voix, celui du format chiffré
  // une note sur 100 au dixième. Deux unités, deux formats de nombre.
  const nb = useMemo(
    () => new Intl.NumberFormat(bcp(locale), { maximumFractionDigits: theme === null ? 1 : 0 }),
    [locale, theme],
  );
  const dis = (score: number) =>
    theme === null ? t("tableau.scoreNombre", { n: nb.format(score) }) : t("motsScoreCourt", { n: nb.format(score) });

  const depose = async () => {
    const jeton = monJeton();
    if (!jeton || envoi) return;
    const nom = libre.trim();
    const choix = nom.length > 0 ? { nom } : choisi !== null ? { index: choisi } : null;
    if (!choix) return;
    setEnvoi(true);
    setSouci(null);
    const r = await deposerNom(jeton, jour, locale, choix);
    setEnvoi(false);
    if (r === "ok") {
      const tb = await relis();
      if (tb) setTableau(tb);
      return;
    }
    setSouci(r);
    // ⚠️ UN NOM PRIS SE REMPLACE, IL NE SE REDEMANDE PAS. Laisser la même liste
    // sous un message d'erreur invite à recliquer le nom qui vient d'échouer.
    if (r === "pris") {
      setChoisi(null);
      setTour((n) => n + 1);
    }
    // « deja » veut dire que ce joueur est inscrit — depuis un autre onglet, ou
    // parce que la réponse du premier dépôt s'est perdue en route. On relit
    // plutôt que de le laisser devant un formulaire qui ne marchera jamais.
    if (r === "deja") {
      const tb = await relis();
      if (tb) setTableau(tb);
    }
  };

  if (loading || !tableau) return null;

  const pret = libre.trim().length > 0 || choisi !== null;

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
        {moi ? <span style={{ color: skin.accent, fontWeight: 800 }}> · {t("tableau.vous")}</span> : null}
      </span>
      <span
        style={{
          flex: "none",
          fontFamily: skin.fontDisplay,
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {dis(score)}
      </span>
    </li>
  );

  return (
    <GCard skin={skin} padding={18}>
      <GLabel skin={skin}>{t("tableau.titre")}</GLabel>

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
            {t("tableau.inscrits", { n: tableau.inscrits })}
          </p>
        </>
      ) : null}

      {tableau.inscrit ? (
        tableau.lignes.length === 0 ? (
          // Inscrit, mais seul : le tableau n'existe pas encore. On le DIT — une
          // information absente sans un mot se lit comme une panne, et le joueur
          // part la chercher ailleurs.
          <p style={{ margin: "10px 0 0", fontSize: 13.5, color: skin.muted, lineHeight: 1.5 }}>
            {t("tableau.seul", { n: INSCRITS_MIN })}
          </p>
        ) : null
      ) : (
        <div style={{ marginTop: tableau.lignes.length > 0 ? 16 : 10 }}>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>{t("tableau.invite")}</p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "10px 0 0" }}>
            {propositions.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setChoisi(i);
                  setLibre("");
                  setSouci(null);
                }}
                style={{
                  fontFamily: skin.fontDisplay,
                  fontWeight: 800,
                  fontSize: 13.5,
                  padding: "7px 11px",
                  borderRadius: 999,
                  cursor: "pointer",
                  // Le nom retenu est PLEIN, les autres sont des contours : la
                  // même règle que les pastilles de Cinq sur cinq, où une
                  // pastille qui parle n'a pas l'air d'une pastille qui se tait.
                  border: `2px solid ${skin.ink}`,
                  background: choisi === i ? skin.accent : skin.paper,
                  color: choisi === i ? "#fff" : skin.ink,
                }}
                aria-pressed={choisi === i}
              >
                {nomDe(i, locale)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setChoisi(null);
                setSouci(null);
                setTour((n) => n + 1);
              }}
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

          {/* ⚠️ LE MESSAGE SE POSE SOUS LES PASTILLES, PAS SOUS LE BOUTON. Vu à
              l'écran : plus bas, « ce nom est déjà porté » se lisait quatre
              lignes après la liste qu'il vient de renouveler, et le joueur ne
              faisait pas le lien entre les deux. */}
          {souci ? (
            <p style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 700, color: skin.ink }}>
              {souci === "pris" ? t("tableau.pris") : null}
              {souci === "deja" ? t("tableau.deja") : null}
              {souci === "panne" || souci === "refus" || souci === "compte" ? t("tableau.panne") : null}
            </p>
          ) : null}
          {/* ⚠️ LE CHAMP LIBRE N'EXISTE QUE DERRIÈRE UN COMPTE, et c'est LA
              règle. La base la tient par une contrainte de table, pas seulement
              par cette condition d'écran : une erreur ici ne peut pas l'ouvrir. */}
          {user ? (
            <div style={{ marginTop: 12 }}>
              <GLabel skin={skin}>{t("tableau.libre")}</GLabel>
              <input
                value={libre}
                maxLength={24}
                onChange={(e) => {
                  setLibre(e.target.value);
                  if (e.target.value.trim().length > 0) setChoisi(null);
                  setSouci(null);
                }}
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
                }}
              />
            </div>
          ) : (
            // Factuel, et à sa place : ça explique pourquoi la liste est fermée.
            // ⚠️ Ce n'est PAS l'offre de compte de l'après-partie — celle-là a
            // sa carte, et §0 interdit d'en empiler deux. Une phrase grise sans
            // bouton ne concurrence rien.
            <p style={{ margin: "10px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
              {t("tableau.pourquoi")}
            </p>
          )}

          <GBtn
            skin={skin}
            variant="accent"
            size="md"
            full
            style={{ marginTop: 12 }}
            disabled={!pret || envoi}
            onClick={() => void depose()}
          >
            {t("tableau.deposer")}
          </GBtn>

          {/* ⚠️ ON DIT QUE LE NOM MEURT AVEC LA JOURNÉE. C'est la différence
              entre ce tableau et le « nom permanent et découvrable » que
              `docs/regularite-des-joueurs.md` §5 donnait comme le vrai coût d'un
              système d'amis : il n'y a aucun profil, rien à chercher en dehors
              d'une journée, et la table se purge à trente jours comme les
              réponses. Le joueur a le droit de le savoir avant de déposer. */}
          <p style={{ margin: "10px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
            {t("tableau.duree")}
          </p>
        </div>
      )}
    </GCard>
  );
}
