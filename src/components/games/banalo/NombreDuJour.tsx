"use client";

// L'ÉCRAN DU FORMAT CHIFFRÉ — une question, un nombre, et c'est tout.
//
// ⚠️ L'ÉCRAN DOIT DIRE QUE LE JEU NE CHERCHE PAS LA VÉRITÉ. C'est la consigne
// écrite en tête de `bareme.ts`, et elle est ici parce qu'elle ne survit nulle
// part ailleurs : la référence est la réponse MÉDIANE des autres joueurs, pas
// la bonne réponse. Sur « combien de fenêtres à Paris », la foule peut être
// collectivement très loin, et le jeu la récompensera quand même. Si l'écran ne
// l'annonce pas, quelqu'un viendra reprocher au jeu de s'être trompé — et il
// aura raison de le croire.
//
// ⚠️ LE SCORE NE SE CALCULE PAS ICI. `bareme.ts` sait le faire et sert de
// spécification exécutable, mais le navigateur n'a pas les réponses des autres,
// donc pas la médiane. Tout ce qui s'affiche vient de `scrutin_banalo_etat`.
//
// TROIS RÉGIMES, ET L'ÉCRAN SAIT DIRE LES TROIS (voir la migration) : pas
// encore répondu ; répondu mais foule trop mince pour noter ; noté. Le régime du
// milieu est celui qu'on oublie, et c'est le seul que verront les premiers
// joueurs de la journée.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { UNANIMO_SKIN as skin } from "@/lib/games/skin";
import { GBtn, GCard, GLabel } from "@/components/games/ui";
import { UNITES, enLangue, questionDe } from "@/content/banalo/questions";
import { monJeton } from "@/lib/games/banalo/jeton";
import { nombreDe } from "@/lib/games/banalo/saisie";
import { blocDe, motDe, teinteDe } from "@/lib/games/banalo/chaleur";
import PartageBanalo from "./PartageBanalo";
import InviterBanalo from "./InviterBanalo";
import ComparaisonAmi from "@/components/games/ComparaisonAmi";
import { litDefi, type Defi } from "@/lib/games/comparaison";
import { POINTS_MAX, VOTANTS_MIN } from "@/lib/games/banalo/bareme";
import InstallJeu from "@/components/games/InstallJeu";
import CompteBanalo from "./CompteBanalo";
import TableauDuJour from "./TableauDuJour";
import { etat as litEtat, repond, type EtatBanalo } from "@/lib/db/banalo";

/**
 * ⚠️ `Intl` NE CONNAÎT PAS `pcm`. Lui passer la locale telle quelle rendrait un
 * `RangeError` sur certains moteurs et, au mieux, un format inattendu. Le pidgin
 * s'écrit avec les conventions anglaises.
 */
const bcp = (locale: string) => (locale === "pcm" ? "en" : locale);

export default function NombreDuJour({ jour }: { jour: number }) {
  const t = useTranslations("BanaloJour");
  const locale = useLocale();
  const question = questionDe(jour);

  const [jeu, setJeu] = useState<EtatBanalo | null>(null);

  // ⚠️ LE DÉFI SE LIT APRÈS LE MONTAGE, depuis `window`. `useSearchParams` de
  // Next exige une frontière `Suspense` au prérendu ; ici on est de toute façon
  // côté client, et la lecture directe évite d'ajouter une contrainte de rendu
  // pour un bloc qui ne s'affiche presque jamais.
  const [defi, setDefi] = useState<Defi | null>(null);
  useEffect(() => {
    setDefi(litDefi(window.location.search, POINTS_MAX));
  }, []);

  const [panne, setPanne] = useState(false);
  const [pret, setPret] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [explique, setExplique] = useState(false);

  // ⚠️ LES CINQ MOTS DE CHALEUR SONT ÉCRITS EN CLAIR, un par un. Un
  // `t(`chaleur.${mot}`)` marcherait — et échapperait au contrôle de parité, qui
  // ne voit que les clés littérales. La clé pourrait alors manquer dans une
  // langue, ou vivre dans le mauvais namespace, sans que rien ne le dise avant
  // que l'écran n'affiche « BanaloJour.chaleur.tiede » en toutes lettres.
  const CHALEUR: Record<string, string> = {
    brule: t("chaleur.brule"),
    chaud: t("chaleur.chaud"),
    tiede: t("chaleur.tiede"),
    froid: t("chaleur.froid"),
    glace: t("chaleur.glace"),
  };

  const format = useMemo(() => new Intl.NumberFormat(bcp(locale)), [locale]);
  const chiffre = useCallback((n: number) => format.format(n), [format]);
  // ⚠️ LE FACTEUR AUSSI PASSE PAR `Intl`. `toFixed(1)` rendait « ×1.6 » —
  // un point décimal anglais au milieu d'un écran français, à côté de nombres
  // groupés à la française. Vu à l'écran, invisible au test.
  //
  // ⚠️ ET IL EN FAUT DEUX DÉCIMALES, PAS UNE. La ligne de barème posée sous
  // l'écart invite explicitement à refaire le calcul ; avec « ×1,3 » on retombe
  // sur 8,86 quand l'écran affiche 8,75, et la règle annoncée a l'air fausse.
  // « ×1,33 » donne 8,76 : l'arrondi se voit, le barème tient. Au-delà de ×10 le
  // score est zéro de toute façon, la décimale n'a plus rien à vérifier.
  const ecartFin = useMemo(
    () => new Intl.NumberFormat(bcp(locale), { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [locale],
  );
  const ecartGros = useMemo(() => new Intl.NumberFormat(bcp(locale), { maximumFractionDigits: 0 }), [locale]);
  const ecart = useCallback(
    (f: number) => (f < 10 ? ecartFin.format(f) : ecartGros.format(f)),
    [ecartFin, ecartGros],
  );
  // ⚠️ LE SCORE S'AFFICHE TOUJOURS AVEC SA DÉCIMALE, « 100,0 » compris. Laisser
  // ICU couper le zéro donnerait « 87 » puis « 87,5 » d'un joueur à l'autre —
  // deux largeurs, deux précisions apparentes, pour une même note. Et c'est
  // cette valeur-là, au dixième, qui décide du rang : l'afficher tronquée ferait
  // apparaître deux joueurs au même score avec deux rangs différents.
  const note = useMemo(
    () => new Intl.NumberFormat(bcp(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    [locale],
  );

  // ⚠️ LE JETON NE SE LIT QU'APRÈS LE MONTAGE. Le lire au rendu en créerait un
  // nouveau à chaque passage côté serveur, et l'hydratation le changerait — le
  // joueur perdrait sa réponse en rafraîchissant. Même leçon que la sauvegarde
  // de Cinq sur cinq.
  useEffect(() => {
    let vivant = true;
    const jeton = monJeton();
    if (!jeton) return;
    litEtat(jeton, jour, locale).then((e) => {
      if (!vivant) return;
      if (e) setJeu(e);
      else setPanne(true);
      setPret(true);
    });
    return () => {
      vivant = false;
    };
  }, [jour, locale]);

  const envoie = useCallback(async () => {
    const n = nombreDe(saisie);
    const jeton = monJeton();
    if (!n || !jeton || envoi) return;
    setEnvoi(true);
    setPanne(false);
    const e = await repond(jeton, jour, locale, n);
    setEnvoi(false);
    // ⚠️ UNE PANNE ICI NE VEUT PAS DIRE « RIEN N'EST PARTI ». L'insertion a pu
    // aboutir avant que la réponse ne se perde ; proposer de rejouer ferait
    // taper un second nombre qui serait ignoré en silence (dépôt définitif), et
    // le joueur croirait avoir joué celui-là. On demande donc de recharger.
    if (e) setJeu(e);
    else setPanne(true);
  }, [saisie, jour, locale, envoi]);

  const n = nombreDe(saisie);
  const unite = enLangue(UNITES[question.unite], locale);

  return (
    <>
      <GCard skin={skin} accent={skin.accent2} padding={20}>
        <GLabel skin={skin}>{t("question")}</GLabel>
        <p
          style={{
            fontFamily: skin.fontDisplay,
            fontWeight: 800,
            fontSize: 25,
            lineHeight: 1.22,
            letterSpacing: "-0.02em",
            margin: "8px 0 0",
            textWrap: "balance",
          }}
        >
          {enLangue(question.texte, locale)}
        </p>
        {/* La consigne est une INSTRUCTION, pas une description : une fois la
            réponse déposée, elle demande de faire une chose qui n'est plus
            possible, et elle occupe la place du résultat. */}
        {jeu?.repondu ? null : (
          <p style={{ margin: "12px 0 0", fontSize: 14, color: skin.muted, lineHeight: 1.45 }}>
            {t("consigne")}
          </p>
        )}
      </GCard>

      {!pret && !panne ? (
        <p style={{ marginTop: 18, color: skin.muted, fontSize: 14 }}>{t("chargement")}</p>
      ) : null}

      {pret && jeu && !jeu.repondu ? (
        <div style={{ marginTop: 18 }}>
          <GCard skin={skin} padding={18}>
            <label
              htmlFor="banalo-nombre"
              style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: skin.muted }}
            >
              {t("saisieLabel", { unite })}
            </label>
            <input
              id="banalo-nombre"
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void envoie();
              }}
              // `inputMode` sort le pavé numérique sur téléphone sans imposer
              // `type="number"`, dont les flèches et le collage sont hostiles.
              inputMode="numeric"
              autoComplete="off"
              placeholder={t("placeholder")}
              style={{
                width: "100%",
                marginTop: 8,
                fontFamily: skin.fontDisplay,
                fontWeight: 800,
                fontSize: 30,
                fontVariantNumeric: "tabular-nums",
                padding: "12px 14px",
                color: skin.ink,
                background: skin.bg,
                border: `${skin.border}px solid ${skin.ink}`,
                borderRadius: skin.radius - 4,
              }}
            />
            {/* ⚠️ LA RELECTURE FORMATÉE EST LA CONFIRMATION. Une frappe de trop
                multiplie l'estimation par dix et le joueur ne le voit pas dans
                une suite de chiffres collés ; groupée par milliers, l'erreur
                d'ordre de grandeur saute aux yeux avant l'envoi. C'est ce qui
                permet de garder UN seul geste malgré un dépôt définitif. */}
            <p
              aria-live="polite"
              style={{
                minHeight: 24,
                margin: "10px 0 0",
                fontSize: 16.5,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                color: n ? skin.ink : skin.muted,
              }}
            >
              {n ? `${chiffre(n)} — ${unite}` : t("relectureVide")}
            </p>
            <div style={{ marginTop: 12 }}>
              <GBtn skin={skin} size="lg" full disabled={!n || envoi} onClick={() => void envoie()}>
                {envoi ? "…" : t("envoyer")}
              </GBtn>
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.4 }}>
              {t("definitif")}
            </p>
            <InviterBanalo
              jour={jour}
              sujet={enLangue(question.texte, locale)}
              consigne={t("inviteNombre")}
            />
          </GCard>
        </div>
      ) : null}

      {/* ⚠️ LE SCORE NE DÉPEND PLUS DU NOMBRE DE VOTANTS, seulement d'avoir
          répondu. Le plancher de cinq gardait tout un écran derrière lui : le
          joueur d'une journée jeune déposait son nombre et n'obtenait rien en
          retour, c'est-à-dire l'inverse de ce qu'un jeu quotidien doit rendre
          au moment du dépôt. À trois joueurs le score n'est pas significatif,
          mais il n'est pas gênant — et la réserve, plus bas, le dit. */}
      {pret && jeu?.repondu && jeu.points !== null ? (
        <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
          <GCard skin={skin} accent={skin.accent} padding={20}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <GLabel skin={skin}>{t("scoreTitre")}</GLabel>
              {/* ⚠️ LE CALCUL EST À DEUX DOIGTS, PAS À L'ÉCRAN. La règle tenait
                  en une ligne sous l'écart, ce qui était honnête mais coûtait de
                  la place à tout le monde pour une question que se pose une
                  minorité. Derrière un (i), elle peut être PLUS complète — la
                  formule, l'exemple avec les chiffres du joueur, les repères —
                  sans peser sur la lecture ordinaire. */}
              <button
                type="button"
                onClick={() => setExplique((v) => !v)}
                aria-expanded={explique}
                aria-controls="banalo-calcul"
                aria-label={t("expliquer")}
                title={t("expliquer")}
                // ⚠️ LA CIBLE FAIT 42 px, LE CERCLE EN FAIT 26. Un bouton de
                // 26 px est sous le seuil confortable au pouce ; le grossir
                // visuellement en ferait une action principale, ce qu'il n'est
                // pas. On élargit donc la ZONE et pas le dessin — d'où le
                // rembourrage transparent autour du disque.
                style={{
                  flex: "0 0 auto",
                  padding: 8,
                  margin: -8,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  lineHeight: 0,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    border: `2px solid ${explique ? skin.ink : skin.muted}`,
                    background: explique ? skin.ink : "transparent",
                    color: explique ? skin.paper : skin.muted,
                    fontFamily: skin.fontDisplay,
                    fontWeight: 800,
                    fontSize: 14,
                    lineHeight: 1,
                  }}
                >
                  i
                </span>
              </button>
            </div>
            {/* ⚠️ LA CHALEUR DOUBLE LE NOMBRE, ELLE NE LE REMPLACE PAS. Un
                score au dixième se lit lentement — il faut le comparer à 100,
                puis se rappeler ce que vaut 87. La couleur et le mot donnent le
                sens avant la lecture, et le mot fait que la couleur n'est jamais
                seule à porter l'information. */}
            <p
              style={{
                fontFamily: skin.fontDisplay,
                fontWeight: 800,
                fontSize: 46,
                lineHeight: 1,
                margin: "6px 0 0",
                fontVariantNumeric: "tabular-nums",
                color: teinteDe(jeu.points),
              }}
            >
              {/* ⚠️ `t.rich` PLUTÔT QU'UNE CLÉ « sur 100 » À PART. Le suffixe
                  suit le nombre dans les quatre langues d'aujourd'hui, mais une
                  clé séparée figerait cet ordre pour toutes les suivantes ; ici
                  la phrase reste entière et c'est la traduction qui place le
                  morceau. */}
              {t.rich("points", {
                n: note.format(jeu.points),
                petit: (c) => (
                  <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em" }}>{c}</span>
                ),
              })}
            </p>
            <p
              style={{
                fontFamily: skin.fontDisplay,
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                margin: "4px 0 0",
                color: teinteDe(jeu.points),
              }}
            >
              {CHALEUR[motDe(jeu.points)]}
            </p>
            {/* ⚠️ LA PART PASSE DEVANT LE RANG, ET C'EST LA MÊME LEÇON QUE CINQ
                SUR CINQ. Le rang provisoire empire mécaniquement : 38e sur 210 à
                midi, 412e sur 2 300 le lendemain, sans rien avoir fait de mal.
                La part, elle, ne bouge pas quand la foule grandit — c'est donc
                elle qui porte le sens, et le rang se lit en second. */}
            {/* Même règle que sur le format « mots » : on dit pourquoi la
                position manque, plutôt que de laisser un trou. */}
            {jeu.partMieux === null ? (
              <p style={{ margin: "12px 0 0", fontSize: 13.5, color: skin.muted, lineHeight: 1.45 }}>
                {t("positionPlusTard", { n: VOTANTS_MIN })}
              </p>
            ) : null}
            {jeu.partMieux !== null ? (
              <p style={{ margin: "12px 0 0", fontSize: 17, fontWeight: 700 }}>
                {t("partMieux", { n: jeu.partMieux })}
              </p>
            ) : null}
            {jeu.rang !== null ? (
              <p style={{ margin: "6px 0 0", fontSize: 13, color: skin.muted }}>
                {t("rang", { rang: jeu.rang, votants: jeu.votants })}
                {jeu.exAequo && jeu.exAequo > 1 ? ` · ${t("exAequo", { n: jeu.exAequo - 1 })}` : ""}
              </p>
            ) : null}
            {explique ? (
              <div
                id="banalo-calcul"
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: `2px dashed ${skin.ink}22`,
                  display: "grid",
                  gap: 6,
                  fontSize: 13,
                  color: skin.muted,
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: skin.ink, fontFamily: skin.fontDisplay, fontSize: 13.5 }}>
                  {t("expliquer")}
                </strong>
                <p style={{ margin: 0 }}>{t("bareme")}</p>
                {/* L'exemple porte les chiffres DU JOUEUR. Une formule abstraite
                    se relit ; une formule où l'on reconnaît son propre écart se
                    vérifie, et c'est ce qui fait qu'un score cesse d'être une
                    décision de la machine. */}
                {jeu.facteur !== null ? (
                  <p style={{ margin: 0, fontVariantNumeric: "tabular-nums" }}>
                    {t("calculDetail", { f: ecart(jeu.facteur), points: note.format(jeu.points) })}
                  </p>
                ) : null}
                <p style={{ margin: 0, fontVariantNumeric: "tabular-nums" }}>{t("calculReperes")}</p>
              </div>
            ) : null}
          </GCard>

          <GCard skin={skin} padding={18}>
            <div style={{ display: "grid", gap: 10 }}>
              <Ligne
                libelle={t("mienne")}
                valeur={`${jeu.mienne !== null ? chiffre(jeu.mienne) : "—"} ${unite}`}
              />
              {/* ⚠️ SCELLÉE TANT QUE LA JOURNÉE EST OUVERTE, et la base ne la
                  renvoie même pas — voir `20260820-banalo-mediane-scellee.sql`.
                  La médiane EST la réponse : affichée, elle se recopie dans une
                  conversation de groupe et tout le monde marque 100. On ne
                  laisse pas non plus un « — » : une case vide invite à demander
                  pourquoi, la phrase de clôture l'explique. */}
              {jeu.mediane !== null ? (
                <Ligne libelle={t("mediane")} valeur={`${chiffre(jeu.mediane)} ${unite}`} fort />
              ) : null}
              {jeu.facteur !== null ? (
                <Ligne
                  libelle={t("ecart")}
                  valeur={t("facteur", { f: ecart(jeu.facteur) })}
                />
              ) : null}
              <Ligne libelle={t("votants")} valeur={chiffre(jeu.votants)} />
            </div>
            {/* ⚠️ LA RÉSERVE A REMPLACÉ LE VERROU. Sous cinq réponses, le score
                ne s'affichait pas du tout ; on le montre désormais, mais on dit
                sur quoi il repose. Elle est ICI et pas sur la carte d'accent :
                c'est la ligne « Réponses » juste au-dessus qu'elle qualifie, et
                une réserve posée sur la récompense elle-même l'annulerait. */}
            {!jeu.assez ? (
              <p style={{ margin: "14px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
                {t("attente", { n: jeu.votants })}
              </p>
            ) : null}
            {/* ⚠️ ON DIT POURQUOI ELLE MANQUE. Une ligne qui disparaît sans un
                mot se lit comme une panne — et le joueur cherche l'information
                ailleurs, c'est-à-dire chez quelqu'un qui l'a. */}
            {jeu.mediane === null ? (
              <p style={{ margin: "14px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
                {t("medianeScellee")}
              </p>
            ) : null}
            {/* La phrase qui empêche le malentendu. Elle n'est pas décorative :
                sans elle, la « médiane » se lit comme « la bonne réponse ». */}
            <p style={{ margin: "14px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
              {t("pasDeVerite")}
            </p>
          </GCard>

          {/* LE TABLEAU DU JOUR, DERNIER BLOC DE RÉSULTAT — avant les offres, et
              jamais parmi elles. Ce n'est pas une demande de quitter le jeu
              (compte, installation, pont vers Placet) mais un geste DANS le
              jeu : §0 de `docs/regularite-des-joueurs.md` ne compte donc pas ce
              bloc dans la place unique de l'après-partie. ⚠️ `theme` vaut `null`
              ici, et c'est ce qui dit à la base que la journée est chiffrée. */}
          <TableauDuJour jour={jour} theme={null} />

          <div>
            {/* ⚠️ UNE SEULE OFFRE, ET LE PLANCHER CHOISIT LAQUELLE. Le score
                s'affiche maintenant dès la première réponse, mais un résultat
                que trois joueurs appuient ne vaut pas d'être envoyé à un ami :
                ce dont cette journée-là a besoin, c'est de MONDE. Sous cinq
                votants c'est donc l'invitation qui occupe la place, au-dessus
                le partage du résultat — jamais les deux, elles se
                cannibaliseraient (même arbitrage que `CompteBanalo`). */}
            {jeu.assez ? (
              <PartageBanalo
                jour={jour}
                titre={t("partageTitre", { n: jour, points: note.format(jeu.points) })}
                brut={jeu.points}
                // Le format chiffré, lui, note bien sur 100.
                max={POINTS_MAX}
                // La FORME du format chiffré : le bloc de chaleur, le mot, et
                // l'écart. Jamais la réponse ni la médiane — les deux se
                // recopient, et ce jeu note par rapport à la foule.
                // ⚠️ PAS DE `?? 1` ICI. L'écart est scellé tant que la journée
                // est ouverte ; le repli affichait « ×1,00 », c'est-à-dire un
                // résultat parfait, à des joueurs qui n'en avaient pas.
                forme={[blocDe(jeu.points), CHALEUR[motDe(jeu.points)]]
                  .concat(jeu.facteur !== null ? [t("facteur", { f: ecart(jeu.facteur) })] : [])
                  .join(" · ")}
                partMieux={jeu.partMieux}
              />
            ) : (
              <InviterBanalo
                jour={jour}
                sujet={enLangue(question.texte, locale)}
                consigne={t("inviteNombre")}
              />
            )}
            {defi && jeu.points !== null ? (
              <ComparaisonAmi
                skin={skin}
                mien={note.format(jeu.points)}
                sien={note.format(defi.resultat)}
                memeJournee={defi.jour === jour}
                textes={{
                  titre: t("compareTitre"),
                  moi: t("compareMoi"),
                  ami: t("compareAmi"),
                  passee: t("comparePassee"),
                }}
              />
            ) : null}
            {/* Une seule offre à la fois — voir `CompteBanalo`. */}
            <CompteBanalo jour={jour} install={<InstallJeu skin={skin} />} />
          </div>
        </div>
      ) : null}

      {panne ? (
        <p style={{ marginTop: 18, fontSize: 14, color: skin.ink, fontWeight: 700 }}>{t("panne")}</p>
      ) : null}
    </>
    );
}

function Ligne({ libelle, valeur, fort }: { libelle: string; valeur: string; fort?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
      <span style={{ fontSize: 13.5, color: skin.muted, fontWeight: 600 }}>{libelle}</span>
      <span
        style={{
          fontFamily: skin.fontDisplay,
          fontWeight: 800,
          fontSize: fort ? 18 : 16,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {valeur}
      </span>
    </div>
  );
}
