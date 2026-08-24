"use client";

// LA JOURNÉE PRÉCÉDENTE — la SEULE place où ce que le jeu scelle se montre :
// la médiane du format chiffré, les parts de la grille du format « mots ».
//
// ⚠️ SANS CE BLOC, LE SCELLEMENT NE RÉVÈLE RIEN. `scrutin_banalo_etat` cache la
// médiane et l'écart, `scrutin_banalo_mots_etat` cache la part de chaque mot,
// tant que la journée est ouverte ; les deux les rendent à la clôture.
// Mais à la clôture, la page bascule sur la journée suivante : l'écran qui
// aurait pu les afficher n'existe plus. Le joueur ne voyait donc jamais la
// réponse de la foule, sur aucune journée — la récompense promise par la
// charnière de 11 h 30 (« le résultat clos de la veille est prêt exactement
// quand la nouvelle s'ouvre », en tête de `jour.ts`) n'était pas tenue.
//
// ⚠️ IL REGARDE LA DERNIÈRE JOURNÉE CLOSE QUE CE JOUEUR A JOUÉE, PLUS `jour − 1`
// EN DUR. C'est la réponse à « est-ce qu'on est prévenu une fois la journée
// terminée ? » : non, il n'existe aucune notification aujourd'hui (le §7 de
// `docs/regularite-des-joueurs.md` a écarté le RAPPEL quotidien ; le §6, lui,
// garde le push pour les amis — voir `docs/amis-et-notifications.md`). Le jeu
// GARDE donc le résultat arrêté et le rend quand
// le joueur revient — le lendemain, ou trois semaines plus tard. Sur `jour − 1`
// en dur, celui qui jouait lundi et revenait jeudi ne voyait jamais comment
// lundi s'était terminé, alors que c'est exactement lui que la question vise :
// celui qui revient tous les jours, lui, a déjà tout vu.
//
// ⚠️ « CLOSE », ET JAMAIS AUJOURD'HUI. C'est ce qui fait qu'il ne peut rien
// divulguer : ce qu'il montre appartient à une journée qui n'est plus jouable.
// Et il garde la ceinture avec les bretelles — si la base refusait de rendre la
// médiane (journée pas encore close de son point de vue), le bloc ne s'affiche
// pas du tout plutôt que de montrer un résultat amputé.
//
// ⚠️ ET LE TITRE NE DIT PLUS « LA JOURNÉE PRÉCÉDENTE », puisque ce n'est plus
// forcément elle. Il dit « votre dernière journée », et le numéro à droite lève
// l'ambiguïté — c'est la même règle qu'avant : on nomme une journée par son
// numéro, jamais par une date.
//
// ⚠️ ET LE TITRE NE DIT PAS « HIER ». La journée n° N s'ouvre à 11 h 30 et se
// ferme à 11 h 30 le lendemain : à 11 h 00, la journée précédente a commencé
// AVANT-HIER. « Hier » serait donc faux la moitié de la matinée, et c'est
// exactement le piège que l'en-tête de `jour.ts` interdit — on nomme la
// journée par son numéro, jamais par une date.
//
// ⚠️ IL SE TAIT QUAND ON N'A ENCORE RIEN JOUÉ. Un bloc « vous n'avez pas joué »
// n'apporte rien : c'est un reproche à quelqu'un qui vient justement de revenir.
// Le silence est le bon défaut ; la série, elle, est déjà comptée ailleurs
// (`scrutin_banalo_serie`).
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { UNANIMO_SKIN as skin } from "@/lib/games/skin";
import { GBtn, GCard, GLabel } from "@/components/games/ui";
import { UNITES, enLangue } from "@/content/banalo/questions";
import { cleTheme } from "@/content/banalo/mots";
import { themeLabel } from "@/lib/games/banalo/themes";
import { programmeDe } from "@/lib/games/banalo/programme";
import { monJeton } from "@/lib/games/banalo/jeton";
import { COURBE_MIN } from "@/lib/games/banalo/bareme";
import { teinteDe } from "@/lib/games/banalo/chaleur";
import {
  derniereJourneeClose,
  etat as litEtat,
  etatMots,
  litTableauDuJour,
  type EtatBanalo,
  type EtatMots,
  type Tableau,
} from "@/lib/db/banalo";
import Modale from "@/components/games/Modale";
import ListeDuTableau from "@/components/games/ListeDuTableau";
import RepartitionDuJour from "./RepartitionDuJour";
import ConcentrationDuJour from "./ConcentrationDuJour";
import CourbeDesScores from "./CourbeDesScores";

/** `Intl` ne connaît pas `pcm` : le pidgin s'écrit aux conventions anglaises. */
const bcp = (locale: string) => (locale === "pcm" ? "en" : locale);

export default function JourneePrecedente({ jour }: { jour: number }) {
  const t = useTranslations("BanaloJour");
  const locale = useLocale();
  // Quelle journée montrer : la base seule le sait, puisque c'est elle qui garde
  // les réponses. `null` tant qu'on n'a pas demandé — le bloc reste muet.
  const [precedente, setPrecedente] = useState<number | null>(null);

  useEffect(() => {
    let vivant = true;
    const jeton = monJeton();
    if (!jeton) return;
    void derniereJourneeClose(jeton, jour).then((j) => {
      if (vivant) setPrecedente(j);
    });
    return () => {
      vivant = false;
    };
  }, [jour]);

  // ⚠️ MÉMORISÉ, parce que `programmeDe` rend un objet neuf à chaque rendu et
  // qu'il sert de dépendance à l'effet : sans ça, l'effet rappellerait la base
  // à chaque rendu du parent.
  const prog = useMemo(
    () => (precedente !== null && precedente >= 1 ? programmeDe(precedente) : null),
    [precedente],
  );

  /** Le tiroir du détail. Fermé au départ : rien ne s'ouvre tout seul. */
  const [ouvert, setOuvert] = useState(false);
  const [nombre, setNombre] = useState<EtatBanalo | null>(null);
  const [mots, setMots] = useState<EtatMots | null>(null);
  /**
   * Le tableau ARRÊTÉ de cette journée-là.
   *
   * ⚠️ C'EST LA MÊME FONCTION QUE LE TABLEAU DU JOUR, appelée sur une autre
   * journée : `scrutin_banalo_tableau` prend son jour en paramètre et n'a jamais
   * su qu'il était « aujourd'hui ». Rien à ajouter en base — et surtout rien à
   * ajouter qui puisse ÉCRIRE : sur une journée close, inscrire quelqu'un serait
   * le poser sur une partie qu'il ne peut plus jouer.
   */
  const [tableau, setTableau] = useState<Tableau | null>(null);

  // Le jeton ne se lit qu'après le montage — même leçon qu'ailleurs : le lire au
  // rendu en créerait un nouveau côté serveur, et l'hydratation le changerait.
  useEffect(() => {
    if (!prog || precedente === null) return;
    let vivant = true;
    const jeton = monJeton();
    if (!jeton) return;
    const cle = prog.type === "mots" ? cleTheme(prog.theme) : null;
    if (prog.type === "mots") {
      void etatMots(jeton, precedente, locale, cleTheme(prog.theme)).then((e) => {
        if (vivant) setMots(e);
      });
    } else {
      void litEtat(jeton, precedente, locale).then((e) => {
        if (vivant) setNombre(e);
      });
    }
    // ⚠️ LA MÊME LANGUE QUE L'ÉTAT, forcément : chez Banalo la foule EST par
    // langue, et le tableau classe parmi ceux qui ont répondu dans la même. Un
    // tableau lu dans une autre langue que sa partie montrerait des gens que ce
    // joueur n'a jamais affrontés.
    void litTableauDuJour(jeton, precedente, locale, cle).then((tb) => {
      if (vivant) setTableau(tb);
    });
    return () => {
      vivant = false;
    };
  }, [prog, precedente, locale]);

  const format = useMemo(() => new Intl.NumberFormat(bcp(locale)), [locale]);
  // Deux décimales pour l'écart, comme sur l'écran du jour : la ligne de barème
  // invite à refaire le calcul, et « ×1,3 » ne retombe pas sur le score affiché.
  const ecartFin = useMemo(
    () => new Intl.NumberFormat(bcp(locale), { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [locale],
  );
  const ecartGros = useMemo(() => new Intl.NumberFormat(bcp(locale), { maximumFractionDigits: 0 }), [locale]);
  // Les parts de la grille : un chiffre après la virgule, comme sur l'écran du
  // format « mots ».
  const part = useMemo(
    () => new Intl.NumberFormat(bcp(locale), { maximumFractionDigits: 1 }),
    [locale],
  );
  const entier = useMemo(() => new Intl.NumberFormat(bcp(locale)), [locale]);
  // Le score garde sa décimale, « 100,0 » compris : c'est elle qui décide du rang.
  const note = useMemo(
    () => new Intl.NumberFormat(bcp(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    [locale],
  );

  // `prog` n'existe pas sans `precedente` — mais TypeScript ne le sait pas, et
  // ce garde vaut mieux qu'une assertion : c'est la même valeur qui décide.
  if (!prog || precedente === null) return null;

  // ⚠️ LE SUR-100 SERT ENCORE — MAIS PLUS À S'AFFICHER, seulement à colorer et à
  // décider qu'une journée a été jouée. Le format « mots » montre sa SOMME.
  const points = prog.type === "mots" ? mots?.points : nombre?.points;
  const sommeMots = mots?.total ?? null;
  const partMieux = prog.type === "mots" ? mots?.partMieux : nombre?.partMieux;
  // Rien à raconter tant que la journée précédente n'a pas été jouée. Depuis que
  // le plancher de cinq votants est tombé, une note existe dès qu'on a répondu :
  // un score absent veut donc dire « pas joué », et un bloc « vous n'avez pas
  // joué » est un reproche adressé à quelqu'un qui vient précisément de revenir.
  if (points === undefined || points === null) return null;

  const chapeau = (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
      <GLabel skin={skin}>{t("derniereTitre")}</GLabel>
      <span style={{ fontSize: 12, fontWeight: 700, color: skin.muted }}>{t("numero", { n: precedente })}</span>
    </div>
  );

  // ⚠️ ON DIT QUE C'EST ARRÊTÉ, ET C'EST LE CŒUR DU BLOC. Un joueur qui répond à
  // 11 h 35 voit des chiffres calculés sur trente personnes ; rien ne lui disait
  // que ceux-ci, eux, ne bougeront plus. Sans cette phrase, il ne peut pas
  // distinguer « votre résultat » de « votre résultat provisoire », et il repart
  // en croyant qu'il lui manque encore quelque chose — exactement ce qu'une
  // notification aurait annoncé, et qu'on a refusé d'envoyer.
  const arrete = (
    <p style={{ margin: "10px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
      {t("derniereClose")}
    </p>
  );

  const score = (
    <p style={{ margin: "10px 0 0", fontSize: 14.5, lineHeight: 1.45, fontVariantNumeric: "tabular-nums" }}>
      {/* ⚠️ LA COULEUR NE SUIT QUE LE FORMAT CHIFFRÉ. Le format « mots » montre
          une somme, et la chaleur se calculait sur le sur-100 qu'on n'affiche
          plus : peindre 84 voix en « froid » parce qu'elles valent 35 sur 100
          serait un jugement tiré d'une échelle invisible. */}
      <strong
        style={{
          fontFamily: skin.fontDisplay,
          fontSize: 17,
          color: prog.type === "mots" ? skin.ink : teinteDe(points),
        }}
      >
        {/* Le suffixe reste DANS la phrase, comme sur l'écran du jour : une clé
            « sur 100 » à part figerait son ordre pour les langues à venir.
            ⚠️ LES DEUX CLÉS SONT ÉCRITES EN CLAIR, jamais choisies en variable :
            `t(cle)` échappe au contrôle de parité i18n. */}
        {prog.type === "mots" && sommeMots !== null
          ? t.rich("motsScore", {
              n: entier.format(sommeMots),
              petit: (c) => <span style={{ fontSize: 12.5, fontWeight: 800 }}>{c}</span>,
            })
          : t.rich("points", {
              n: note.format(points),
              petit: (c) => <span style={{ fontSize: 12.5, fontWeight: 800 }}>{c}</span>,
            })}
      </strong>
      {partMieux !== undefined && partMieux !== null ? (
        <span style={{ color: skin.muted }}> · {t("partMieux", { n: partMieux })}</span>
      ) : null}
    </p>
  );

  // LE TABLEAU ARRÊTÉ DE CETTE JOURNÉE-LÀ.
  //
  // ⚠️ IL EST DANS LE RÉSUMÉ ET PAS DANS LE TIROIR, contre la règle de hauteur
  // qui a envoyé le reste du détail derrière un bouton. Deux raisons, et la
  // seconde décide. La première : c'est du contenu qui CHANGE tous les jours,
  // et l'écran range le contenu qui bouge en haut, l'annonce qui se répète en
  // bas. La seconde : demandé explicitement, après deux reproches de terrain
  // sur des blocs « trop discrets » — mettre derrière un tap ce qu'on vient de
  // réclamer de voir serait la troisième fois.
  //
  // ⚠️ CINQ LIGNES, PAS DIX. La base en rend dix ; celle-ci est une carte de
  // RELECTURE posée tout en bas d'un écran d'après-partie qui pesait déjà
  // 2 195 px, et le tableau du JOUR — dix lignes — est six cents pixels plus
  // haut sur la même page. La coupe et le repêchage de ma ligne vivent dans
  // `ListeDuTableau`.
  //
  // ⚠️ ET C'EST LA TROISIÈME LISTE DE NOMS DE L'ÉCRAN (tablée, tableau du jour,
  // celle-ci). Ce qui les sépare n'est pas la forme, c'est le CADRE : cette
  // carte porte un numéro de journée et la phrase « close » juste au-dessus, et
  // sa liste porte l'effectif de CE jour-là — jamais « aujourd'hui », qui serait
  // faux ici. Sans ça, deux listes identiques à six cents pixels d'écart se
  // lisent comme un doublon, exactement ce qui est arrivé au tableau et à la
  // tablée.
  const classement =
    tableau && tableau.lignes.length > 0 ? (
      <div style={{ marginTop: 14 }}>
        <GLabel skin={skin}>{t("derniereClassement")}</GLabel>
        <ListeDuTableau
          skin={skin}
          lignes={tableau.lignes}
          moi={tableau.moi}
          /* ⚠️ LES DEUX CLÉS SONT ÉCRITES EN CLAIR, une par branche : `t(cle)`
             échapperait au contrôle de parité i18n. Et les deux formats ne se
             comptent PAS pareil — une somme de voix d'un côté, une note sur 100
             de l'autre — donc le tableau ne formate rien lui-même. */
          score={(n) =>
            prog.type === "mots"
              ? t("motsScoreCourt", { n: entier.format(n) })
              : t("tableau.scoreNombre", { n: note.format(n) })
          }
          max={5}
          effectif={t("derniereInscrits", { n: tableau.inscrits })}
        />
      </div>
    ) : null;

  // ⚠️ LE DÉTAIL EST DANS UN TIROIR, PLUS DANS LA PAGE — et c'est une mesure
  // d'écran. L'après-partie faisait 2 551 px, trois écrans de téléphone, sept
  // cartes ; celle-ci en pesait 353 pour un résultat qu'on ne relit pas tous les
  // jours. Le résumé (le sujet, le score, la mention « close ») reste à demeure ;
  // la grille arrêtée, la médiane, l'écart et les deux bandes s'ouvrent à la
  // demande.
  //
  // ⚠️ ET C'EST LE JOUEUR QUI L'OUVRE, ce qui n'est pas la même chose qu'une
  // modale qui surgit. `Modale` porte le comportement ; la règle « une fois par
  // aide et par partie » appartient à Cinq sur cinq, dont les aides
  // apparaissaient en silence. Ici rien ne s'ouvre tout seul.
  const tiroir = (sujet: ReactNode, detail: ReactNode) => (
    <div style={{ marginTop: 20 }}>
      <GCard skin={skin} padding={15}>
        {chapeau}
        {sujet}
        {score}
        {arrete}
        {classement}
        <div style={{ marginTop: 12 }}>
          <GBtn skin={skin} variant="ghost" onClick={() => setOuvert(true)}>
            {t("detailBouton")}
          </GBtn>
        </div>
      </GCard>
      {/* ⚠️ LE TIROIR NE REPREND PAS « cette journée est close » : la phrase
          reste dans le RÉSUMÉ, qui est ce que tout le monde voit sans rien
          ouvrir — c'est elle qui répond à « est-ce qu'on est prévenu une fois la
          journée terminée ? ». Le tiroir porte le NUMÉRO, parce qu'il couvre la
          page et doit donc tenir tout seul : il ne peut pas compter sur ce
          qu'il cache. */}
      {ouvert ? (
        <Modale
          skin={skin}
          titre={t("derniereTitre")}
          texte={t("numero", { n: precedente })}
          fermer={() => setOuvert(false)}
          fermerLabel={t("qrFermer")}
        >
          {detail}
        </Modale>
      ) : null}
    </div>
  );

  if (prog.type === "mots") {
    // LA GRILLE ARRÊTÉE. ⚠️ ELLE A CHANGÉ DE MÉTIER LE JOUR OÙ LES PARTS ONT
    // CESSÉ D'ÊTRE SCELLÉES : ce n'est plus ici qu'on APPREND ce que la foule
    // partageait — la grille du jour le dit dès le dépôt — c'est ici qu'on le
    // lit ARRÊTÉ. Le filtre sur `part !== null` reste : la base peut encore ne
    // pas la rendre, et une ligne sans chiffre n'a rien à faire ici.
    const grille = (mots?.grille ?? []).filter((c): c is typeof c & { part: number } => c.part !== null);
    return tiroir(
      <p style={{ margin: "8px 0 0", fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 17 }}>
        <span aria-hidden style={{ marginRight: 6 }}>
          {prog.theme.emoji}
        </span>
        {themeLabel(prog.theme, locale)}
      </p>,
      <>
              <p style={{ margin: "8px 0 0", fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 18 }}>
                <span aria-hidden style={{ marginRight: 6 }}>
                  {prog.theme.emoji}
                </span>
                {themeLabel(prog.theme, locale)}
              </p>
              {grille.length > 0 ? (
                <div style={{ display: "grid", gap: 6, margin: "12px 0 0" }}>
                  {grille.map((c, i) => (
                    <div
                      key={`${c.mot}-${i}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "baseline",
                        opacity: c.joueurs === 1 ? 0.55 : 1,
                      }}
                    >
                      <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 15 }}>{c.mot}</span>
                      {/* Les mêmes chiffres que sur l'écran du jour, arrêtés — et la
                          même règle : un mot que personne d'autre n'a écrit ne
                          rapporte rien, donc il le dit au lieu d'afficher « 1 ». */}
                      <span style={{ display: "flex", gap: 7, alignItems: "baseline", flex: "none" }}>
                        {c.joueurs === 1 ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: skin.muted }}>
                            {t("motsSeul")}
                          </span>
                        ) : (
                          <>
                            {c.joueurs !== null ? (
                              <span
                                style={{
                                  fontFamily: skin.fontDisplay,
                                  fontSize: 13.5,
                                  fontWeight: 800,
                                  fontVariantNumeric: "tabular-nums",
                                  color: teinteDe(c.part),
                                }}
                              >
                                {t("motsJoueurs", { n: c.joueurs })}
                              </span>
                            ) : null}
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: skin.muted,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {t("motsPart", { p: part.format(c.part) })}
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
              {/* LA COURBE DES SCORES, juste sous le chiffre qu'elle situe. ⚠️ ELLE
                  N'EXISTE QUE SUR LA JOURNÉE ARRÊTÉE, et c'est la raison d'être de
                  cet écran : en journée ouverte les sommes gonflent d'heure en
                  heure, donc deux lectures du même dépôt donneraient deux images.
                  Ici la foule est complète et le dessin ne bouge plus.

                  ⚠️ ET SEULEMENT AU-DELÀ DE `COURBE_MIN`, QUI N'EST PAS `assez`. La
                  première version se gardait sur `assez` (cinq votants) tout en
                  écrivant qu'à six votants « un dessin grossier ment » : elle se
                  contredisait elle-même. Un centile grossier reste VRAI ; un
                  histogramme grossier dessine une forme là où il n'y a que du bruit.
                  Ce plancher-là n'est donc pas un plancher sur le résultat du joueur
                  — celui-là est tombé le 22/08 et ne revient pas — c'est un plancher
                  sur ce qu'un DESSIN peut honnêtement porter.

                  ⚠️ Et `seaux.length > 1` écarte le cas dégénéré : quand tout le
                  monde a le même score, la base rend UNE barre, et l'écran
                  dessinerait un bandeau plein largeur sous un axe imprimant deux
                  fois le même nombre. Ça se lit comme une panne, pas comme une
                  information. */}
              {mots?.courbe && mots.votants >= COURBE_MIN && mots.courbe.seaux.length > 1 ? (
                <CourbeDesScores courbe={mots.courbe} votants={mots.votants} />
              ) : null}
              {/* LA FORME DE LA JOURNÉE — le pendant, pour les mots, de la bande de
                  répartition des nombres. Elle vient APRÈS le score et après la
                  grille : le chiffre du joueur d'abord, le paysage ensuite. La
                  courbe distribue des JOUEURS, celle-ci distribue des MOTS. */}
              {mots?.concentration ? <ConcentrationDuJour conc={mots.concentration} /> : null}
      </>,
    );
  }

  const e = nombre;
  // ⚠️ LA MÉDIANE MANQUANTE FAIT TAIRE TOUT LE BLOC. Elle ne devrait jamais
  // manquer ici — la journée précédente est close par construction — mais si les
  // deux horloges divergeaient, mieux vaut ne rien montrer qu'un « résultat de
  // la veille » sans le résultat.
  if (!e || e.mediane === null || e.mienne === null) return null;
  const unite = enLangue(UNITES[prog.question.unite], locale);
  const ecart = e.facteur === null ? null : e.facteur < 10 ? ecartFin.format(e.facteur) : ecartGros.format(e.facteur);

  return tiroir(
    <p style={{ margin: "8px 0 0", fontSize: 13.5, color: skin.muted, lineHeight: 1.4 }}>
      {enLangue(prog.question.texte, locale)}
    </p>,
    <>
            <p style={{ margin: "8px 0 0", fontSize: 13.5, color: skin.muted, lineHeight: 1.4 }}>
              {enLangue(prog.question.texte, locale)}
            </p>
            {/* LA RÉVÉLATION. C'est le seul endroit du jeu où ce nombre s'affiche —
                il porte donc la taille du chiffre qu'on est venu chercher. */}
            <p
              style={{
                fontFamily: skin.fontDisplay,
                fontWeight: 800,
                fontSize: 30,
                lineHeight: 1.1,
                margin: "10px 0 0",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {format.format(e.mediane)}{" "}
              <span style={{ fontSize: 14, fontWeight: 700, color: skin.muted }}>{unite}</span>
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 12.5, color: skin.muted }}>
              {t("precedenteFoule", { n: e.votants })}
            </p>
            {/* ⚠️ LES CHIFFRES PRENNENT LA POLICE DE TITRE, ET C'EST UNE CORRECTION
                VUE À L'ÉCRAN. `Intl` groupe les milliers avec une espace fine
                insécable ; à 13,5 px dans la police de texte elle disparaît, et
                « 900 000 » se lit « 900000 » — un blob de six chiffres qu'on ne
                compare plus à la médiane juste au-dessus. La police de titre en
                gras rouvre l'espace. Même raison que le composant `Ligne` de
                l'écran du jour, qui met déjà toutes ses valeurs en display.
                L'unité, elle, ne se répète pas : elle est écrite deux lignes plus
                haut, sur le même nombre. */}
            <p style={{ margin: "12px 0 0", fontSize: 13.5, color: skin.muted }}>
              {t("mienne")} :{" "}
              <strong
                style={{
                  fontFamily: skin.fontDisplay,
                  fontWeight: 800,
                  fontSize: 15,
                  color: skin.ink,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {format.format(e.mienne)}
              </strong>
              {ecart !== null ? ` · ${t("facteur", { f: ecart })}` : ""}
            </p>
            {/* LA BANDE. Elle vient APRÈS le score : le chiffre du joueur d'abord,
                le paysage ensuite. Elle se tait si la base ne l'a pas rendue — une
                journée trop maigre pour valoir un histogramme, ou une horloge qui
                ne la déclare pas encore close. */}
            {e.repartition ? <RepartitionDuJour rep={e.repartition} votants={e.votants} /> : null}
    </>,
  );
}
