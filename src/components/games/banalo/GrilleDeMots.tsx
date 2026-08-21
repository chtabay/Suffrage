"use client";

// L'ÉCRAN DU FORMAT « MOTS » — un thème, six cases, et la foule décide.
//
// ⚠️ LA CONSIGNE EST LA MÊME QUE POUR LES NOMBRES : répondez comme la foule.
// L'étude avertissait que « deux barèmes inverses cohabitent » — viser le centre
// un jour, viser la bande rare le lendemain — et qu'un joueur qui applique le
// mauvais perd sans comprendre. En choisissant le barème du CENTRE, il n'y a
// plus qu'une règle à retenir, et elle vaut tous les jours.
//
// ⚠️ LE SCORE NE SE CALCULE PAS ICI. Le navigateur n'a pas les grilles des
// autres, donc pas les parts. Tout vient de `scrutin_banalo_mots_etat`, jusqu'à
// l'arrondi.
//
// ⚠️ ET LE TEMPS EST MESURÉ SANS ÊTRE MONTRÉ. Aucun chronomètre à l'écran,
// aucune mention : il part avec le dépôt et ne décide de rien. C'est la même
// posture que Cinq sur cinq, qui stocke `secondes` et classe sur les essais —
// on saura sur des journées réelles si le temps sépare autre chose que le
// téléphone de l'ordinateur.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { UNANIMO_SKIN as skin } from "@/lib/games/skin";
import { GBtn, GCard, GLabel } from "@/components/games/ui";
import { themeLabel } from "@/lib/games/banalo/themes";
import type { Theme } from "@/lib/games/banalo/themes";
import { monJeton } from "@/lib/games/banalo/jeton";
import { blocDe, motDe, teinteDe } from "@/lib/games/banalo/chaleur";
import PartageBanalo from "./PartageBanalo";
import ConcentrationDuJour from "./ConcentrationDuJour";
import InviterBanalo from "./InviterBanalo";
import ComparaisonAmi from "@/components/games/ComparaisonAmi";
import { litDefi, type Defi } from "@/lib/games/comparaison";
import { POINTS_MAX } from "@/lib/games/banalo/bareme";
import InstallJeu from "@/components/games/InstallJeu";
import CompteBanalo from "./CompteBanalo";
import { etatMots, repondMots, type EtatMots } from "@/lib/db/banalo";

const bcp = (locale: string) => (locale === "pcm" ? "en" : locale);

export default function GrilleDeMots({
  jour,
  theme,
  cases,
}: {
  jour: number;
  theme: Theme;
  cases: number;
}) {
  const t = useTranslations("BanaloJour");
  const locale = useLocale();

  // ⚠️ LES CINQ MOTS DE CHALEUR SONT ÉCRITS EN CLAIR, un par un : une clé passée
  // en variable échapperait au contrôle de parité i18n.
  const CHALEUR: Record<string, string> = {
    brule: t("chaleur.brule"),
    chaud: t("chaleur.chaud"),
    tiede: t("chaleur.tiede"),
    froid: t("chaleur.froid"),
    glace: t("chaleur.glace"),
  };

  const [saisies, setSaisies] = useState<string[]>(() => Array(cases).fill(""));
  const [jeu, setJeu] = useState<EtatMots | null>(null);

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
  const [envoi, setEnvoi] = useState(false);
  const debut = useRef<number>(0);

  // ⚠️ LA CLÉ DE FOULE EST LE LIBELLÉ FRANÇAIS DU THÈME, PAS CELUI DE L'ÉCRAN.
  // Les quatre langues jouent le même thème le même jour, mais chacune dans sa
  // propre foule (`langue` fait partie de la clé) ; ce qui doit être stable,
  // c'est l'identifiant, pas la traduction.
  const cle = theme.fr;

  const note = useMemo(
    () => new Intl.NumberFormat(bcp(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    [locale],
  );
  const part = useMemo(
    () => new Intl.NumberFormat(bcp(locale), { maximumFractionDigits: 1 }),
    [locale],
  );

  useEffect(() => {
    let vivant = true;
    const jeton = monJeton();
    if (!jeton) return;
    debut.current = Date.now();
    etatMots(jeton, jour, locale, cle).then((e) => {
      if (!vivant) return;
      if (e) setJeu(e);
      else setPanne(true);
      setPret(true);
    });
    return () => {
      vivant = false;
    };
  }, [jour, locale, cle]);

  const remplies = saisies.filter((m) => m.trim().length > 0).length;

  const envoie = useCallback(async () => {
    const jeton = monJeton();
    if (!jeton || envoi || remplies === 0) return;
    setEnvoi(true);
    setPanne(false);
    const secondes = Math.round((Date.now() - debut.current) / 1000);
    const e = await repondMots(jeton, jour, locale, cle, saisies, secondes);
    setEnvoi(false);
    // ⚠️ UNE PANNE ICI NE VEUT PAS DIRE « RIEN N'EST PARTI ». Le dépôt a pu
    // aboutir avant que la réponse ne se perde ; proposer de rejouer ferait
    // taper une seconde grille qui serait ignorée en silence.
    if (e) setJeu(e);
    else setPanne(true);
  }, [saisies, jour, locale, cle, envoi, remplies]);

  const change = (i: number, v: string) =>
    setSaisies((s) => s.map((x, k) => (k === i ? v : x)));

  return (
    <>
      <GCard skin={skin} accent={skin.accent2} padding={20}>
        <GLabel skin={skin}>{t("themeTitre")}</GLabel>
        <p
          style={{
            fontFamily: skin.fontDisplay,
            fontWeight: 800,
            fontSize: 27,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            margin: "8px 0 0",
            textWrap: "balance",
          }}
        >
          <span aria-hidden style={{ marginRight: 8 }}>
            {theme.emoji}
          </span>
          {themeLabel(theme, locale)}
        </p>
        {jeu?.repondu ? null : (
          <p style={{ margin: "12px 0 0", fontSize: 14, color: skin.muted, lineHeight: 1.45 }}>
            {t("motsConsigne", { n: cases })}
          </p>
        )}
      </GCard>

      {!pret && !panne ? (
        <p style={{ marginTop: 18, color: skin.muted, fontSize: 14 }}>{t("chargement")}</p>
      ) : null}

      {pret && jeu && !jeu.repondu ? (
        <div style={{ marginTop: 18 }}>
          <GCard skin={skin} padding={18}>
            <div style={{ display: "grid", gap: 8 }}>
              {saisies.map((v, i) => (
                <input
                  key={i}
                  value={v}
                  onChange={(e) => change(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && i === saisies.length - 1) void envoie();
                  }}
                  autoComplete="off"
                  // ⚠️ PAS D'AUTOFOCUS. Sur téléphone il ouvre le clavier avant
                  // que le thème n'ait été lu, et le thème est la question.
                  aria-label={t("motsCase", { n: i + 1 })}
                  placeholder={t("motsCase", { n: i + 1 })}
                  style={{
                    width: "100%",
                    fontFamily: skin.fontBody,
                    fontWeight: 700,
                    fontSize: 17,
                    padding: "11px 13px",
                    color: skin.ink,
                    background: skin.bg,
                    border: `${skin.border}px solid ${skin.ink}`,
                    borderRadius: skin.radius - 4,
                  }}
                />
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <GBtn skin={skin} size="lg" full disabled={remplies === 0 || envoi} onClick={() => void envoie()}>
                {envoi ? "…" : t("envoyer")}
              </GBtn>
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.4 }}>
              {t("definitif")}
              {remplies > 0 && remplies < cases ? ` ${t("motsIncomplet", { n: cases - remplies })}` : ""}
            </p>
            <InviterBanalo jour={jour} sujet={themeLabel(theme, locale)} consigne={t("inviteMots", { n: cases })} />
          </GCard>
        </div>
      ) : null}

      {pret && jeu?.repondu ? (
        <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
          {/* ⚠️ LE SCORE NE DÉPEND PLUS DU NOMBRE DE VOTANTS, seulement d'avoir
              répondu. Sous cinq joueurs il n'existait pas du tout : celui qui
              ouvrait une journée jeune déposait ses six mots et n'obtenait rien
              en retour. À trois joueurs le score n'est pas significatif, mais
              il n'est pas gênant — et la réserve, sous la grille, le dit. */}
          {jeu.points !== null ? (
            <GCard skin={skin} accent={skin.accent} padding={20}>
              <GLabel skin={skin}>{t("scoreTitre")}</GLabel>
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
            </GCard>
          ) : null}

          <GCard skin={skin} padding={18}>
            <GLabel skin={skin}>{t("motsGrille")}</GLabel>
            {/* ⚠️ ON AFFICHE LA GRILLE RENDUE PAR LA BASE, jamais celle qu'on
                vient de taper : c'est elle qui fait foi (mot du thème écarté,
                doublons pliés, dépôt définitif). Un joueur doit voir ce qui a
                réellement été enregistré. */}
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {jeu.grille.map((c, i) => (
                <div
                  key={`${c.mot}-${i}`}
                  style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}
                >
                  <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 16 }}>{c.mot}</span>
                  {/* ⚠️ AUCUNE COLONNE PLUTÔT QU'UN TIRET. Un « — » en face de
                      chaque mot se lit comme une panne, et le joueur va
                      chercher le chiffre ailleurs — c'est-à-dire chez quelqu'un
                      qui l'a. La phrase sous la grille dit pourquoi il manque. */}
                  {c.part !== null ? (
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        color: teinteDe(c.part),
                      }}
                    >
                      {t("motsPart", { p: part.format(c.part) })}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
            {/* ⚠️ SCELLÉES TANT QUE LA JOURNÉE EST OUVERTE, et la base ne les
                renvoie même pas — voir `20260821-banalo-mots-parts-scellees.sql`.
                La grille EST la solution : lue maintenant, elle se recopie mot à
                mot dans une conversation de groupe. On la rend le lendemain,
                dans `JourneePrecedente`. */}
            {jeu.repondu && jeu.grille.some((c) => c.part === null) ? (
              <p style={{ margin: "14px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
                {t("motsPartsScellees")}
              </p>
            ) : null}
            <p style={{ margin: "14px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
              {/* ⚠️ PAS LA MÊME PHRASE QUE POUR LES NOMBRES. Le format chiffré
                  dit « pour que la MÉDIANE veuille dire quelque chose » — il n'y
                  a pas de médiane ici, il y a des parts. Vu à l'écran, invisible
                  au test : la clé existait et rendait un texte parfaitement
                  formé, simplement faux. */}
              {t("motsRegle")}
            </p>
            {/* ⚠️ LA RÉSERVE A REMPLACÉ LE VERROU, ET ELLE NE REMPLACE PLUS LA
                RÈGLE. Les deux phrases s'excluaient : sous le plancher, le
                joueur lisait qu'il fallait attendre et n'apprenait jamais
                comment il était noté. La règle vaut à tout effectif ; la
                réserve dit seulement sur combien de monde les parts reposent. */}
            {!jeu.assez ? (
              <p style={{ margin: "6px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
                {t("motsAttente", { n: jeu.votants })}
              </p>
            ) : null}
            {/* ⚠️ UNE SEULE OFFRE, ET LE PLANCHER CHOISIT LAQUELLE. Le score
                s'affiche maintenant dès la première réponse, mais un résultat
                que trois joueurs appuient ne vaut pas d'être envoyé à un ami :
                ce dont cette journée-là a besoin, c'est de MONDE. Le partage du
                résultat reste donc au-dessus du plancher, l'invitation en
                dessous — jamais les deux à la fois. */}
            {!jeu.assez && (
              <InviterBanalo
                jour={jour}
                sujet={themeLabel(theme, locale)}
                consigne={t("inviteMots", { n: cases })}
              />
            )}
          </GCard>

          {/* LA FORME DE LA JOURNÉE, TOUT DE SUITE APRÈS LA RÉPONSE. C'était la
              demande : avoir quelque chose de satisfaisant à proposer au moment
              du dépôt, pas un jour plus tard. ⚠️ Elle ne fuit rien parce que les
              barres sont ANONYMES tant que la journée est ouverte — même les
              miennes. Le libellé, lui, reste scellé avec les parts et n'arrive
              qu'à la clôture, dans `JourneePrecedente`. */}
          {jeu.concentration ? (
            <GCard skin={skin} padding={18}>
              <ConcentrationDuJour conc={jeu.concentration} />
            </GCard>
          ) : null}

          {jeu.assez && jeu.points !== null ? (
            <PartageBanalo
              jour={jour}
              points={note.format(jeu.points)}
              brut={jeu.points}
              // La FORME du format « mots » : un bloc par case, coloré par la
              // part. ⚠️ JAMAIS LES MOTS EUX-MÊMES — un ami qui les lit n'a plus
              // qu'à les recopier, et comme on est noté par rapport à la foule,
              // il ferait au moins aussi bien sans avoir joué.
              //
              // ⚠️ ET PAS DE `?? 0` ICI, exactement comme le format chiffré
              // n'a pas de `?? 1` sur son écart. Les parts sont scellées tant
              // que la journée est ouverte : le repli peignait six blocs de la
              // couleur la plus froide — « tout raté » — sous un score de 51,3.
              // La ligne se tait, et `PartageBanalo` écarte déjà les vides.
              forme={
                jeu.grille.some((c) => c.part === null)
                  ? ""
                  : jeu.grille.map((c) => blocDe(c.part ?? 0)).join("")
              }
              partMieux={jeu.partMieux}
            />
          ) : null}
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
          {/* ⚠️ UNE SEULE OFFRE À LA FOIS, et c'est `CompteBanalo` qui arbitre.
              §0 de `docs/regularite-des-joueurs.md` : l'après-partie n'a QU'UNE
              place, et empiler l'installation sous le compte les fait se
              cannibaliser — deux demandes molles valent moins qu'une nette.
              L'installation ne sort donc que pour qui a déjà un compte. */}
          <CompteBanalo jour={jour} install={<InstallJeu skin={skin} />} />
        </div>
      ) : null}

      {panne ? (
        <p style={{ marginTop: 18, fontSize: 14, color: skin.ink, fontWeight: 700 }}>{t("panne")}</p>
      ) : null}
    </>
  );
}
