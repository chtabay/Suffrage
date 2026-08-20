"use client";

// L'ÉCRAN DE BANALO DU JOUR — une question, un nombre, et c'est tout.
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
import GameShell from "@/components/games/GameShell";
import { GBtn, GCard, GLabel } from "@/components/games/ui";
import { UNITES, enLangue, questionDe } from "@/content/banalo/questions";
import { finDeJournee } from "@/lib/games/banalo/jour";
import { monJeton } from "@/lib/games/banalo/jeton";
import { nombreDe } from "@/lib/games/banalo/saisie";
import { motDe, teinteDe } from "@/lib/games/banalo/chaleur";
import { etat as litEtat, repond, type EtatBanalo } from "@/lib/db/banalo";

/**
 * ⚠️ `Intl` NE CONNAÎT PAS `pcm`. Lui passer la locale telle quelle rendrait un
 * `RangeError` sur certains moteurs et, au mieux, un format inattendu. Le pidgin
 * s'écrit avec les conventions anglaises.
 */
const bcp = (locale: string) => (locale === "pcm" ? "en" : locale);

export default function BanaloDuJour({ jour }: { jour: number }) {
  const t = useTranslations("BanaloJour");
  const locale = useLocale();
  const question = questionDe(jour);

  const [jeu, setJeu] = useState<EtatBanalo | null>(null);
  const [panne, setPanne] = useState(false);
  const [pret, setPret] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [copie, setCopie] = useState(false);

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

  // L'heure de la prochaine question, dans le fuseau du LECTEUR.
  //
  // ⚠️ « 11 H 30 » EST UNE HEURE DE PARIS, ET L'ÉCRIRE TEL QUEL SERAIT FAUX
  // PARTOUT AILLEURS : c'est 10 h 30 à Lagos l'été et 5 h 30 à New York. On
  // formate donc l'instant réel, et chacun lit son heure.
  const [prochaine, setProchaine] = useState("");
  useEffect(() => {
    setProchaine(
      new Intl.DateTimeFormat(bcp(locale), { hour: "2-digit", minute: "2-digit" }).format(
        new Date(finDeJournee()),
      ),
    );
  }, [locale]);

  const partage = useCallback(async () => {
    if (!jeu?.assez || jeu.points === null) return;
    const lignes = [
      t("partageTitre", { n: jour, points: note.format(jeu.points) }),
      jeu.partMieux !== null ? t("partMieux", { n: jeu.partMieux }) : "",
      typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "",
    ].filter(Boolean);
    const texte = lignes.join("\n");
    try {
      // `navigator.share` d'abord : sur téléphone il ouvre la feuille de partage
      // du système, qui est le geste attendu. Le presse-papier est le repli.
      if (typeof navigator !== "undefined" && navigator.share) await navigator.share({ text: texte });
      else {
        await navigator.clipboard.writeText(texte);
        setCopie(true);
        window.setTimeout(() => setCopie(false), 2000);
      }
    } catch {
      // Partage refusé par l'utilisateur : rien à dire.
    }
  }, [jeu, jour, t, note]);

  return (
    <GameShell
      skin={skin}
      title={t("name")}
      emoji="🔢"
      backLabel={t("back")}
      poweredBy={t("poweredBy")}
      aside={
        <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 14, color: skin.muted }}>
          {t("numero", { n: jour })}
        </span>
      }
    >
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
          </GCard>
        </div>
      ) : null}

      {pret && jeu?.repondu && !jeu.assez ? (
        <div style={{ marginTop: 18 }}>
          <GCard skin={skin} padding={18}>
            <GLabel skin={skin}>{t("deposeTitre")}</GLabel>
            <p
              style={{
                fontFamily: skin.fontDisplay,
                fontWeight: 800,
                fontSize: 30,
                margin: "6px 0 0",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {jeu.mienne !== null ? chiffre(jeu.mienne) : "—"}{" "}
              <span style={{ fontSize: 15, fontWeight: 700, color: skin.muted }}>{unite}</span>
            </p>
            {/* Le régime du milieu : la réponse est prise, mais la foule est
                trop mince pour que la médiane veuille dire quoi que ce soit.
                Avec une seule réponse, la médiane EST la réponse, et le premier
                joueur du jour marquerait 10 sur 10 pour avoir écrit n'importe
                quoi. On le dit plutôt que d'inventer une note. */}
            <p style={{ margin: "12px 0 0", fontSize: 14, color: skin.muted, lineHeight: 1.45 }}>
              {t("attente", { n: jeu.votants })}
            </p>
          </GCard>
        </div>
      ) : null}

      {pret && jeu?.assez && jeu.points !== null ? (
        <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
          <GCard skin={skin} accent={skin.accent} padding={20}>
            <GLabel skin={skin}>{t("scoreTitre")}</GLabel>
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
              {t("points", { n: note.format(jeu.points) })}
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

          <GCard skin={skin} padding={18}>
            <div style={{ display: "grid", gap: 10 }}>
              <Ligne
                libelle={t("mienne")}
                valeur={`${jeu.mienne !== null ? chiffre(jeu.mienne) : "—"} ${unite}`}
              />
              <Ligne
                libelle={t("mediane")}
                valeur={`${jeu.mediane !== null ? chiffre(jeu.mediane) : "—"} ${unite}`}
                fort
              />
              {jeu.facteur !== null ? (
                <Ligne
                  libelle={t("ecart")}
                  valeur={t("facteur", { f: ecart(jeu.facteur) })}
                />
              ) : null}
              {/* ⚠️ LA RÈGLE EST ÉCRITE SOUS L'ÉCART, ET ELLE MANQUAIT. L'écran
                  montrait « 8,75 sur 10 » et « ×1,33 » dans deux cartes, sans
                  jamais dire comment on passe de l'un à l'autre : deux chiffres
                  sans lien. Le barème a été fait énonçable en une ligne pour
                  qu'il soit vérifiable de tête — encore faut-il que la ligne
                  soit là. */}
              <p style={{ margin: 0, fontSize: 12, color: skin.muted, lineHeight: 1.4 }}>{t("bareme")}</p>
              <Ligne libelle={t("votants")} valeur={chiffre(jeu.votants)} />
            </div>
            {/* La phrase qui empêche le malentendu. Elle n'est pas décorative :
                sans elle, la « médiane » se lit comme « la bonne réponse ». */}
            <p style={{ margin: "14px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
              {t("pasDeVerite")}
            </p>
          </GCard>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <GBtn skin={skin} variant="accent" onClick={() => void partage()}>
              {copie ? t("copie") : t("partager")}
            </GBtn>
          </div>
        </div>
      ) : null}

      {panne ? (
        <p style={{ marginTop: 18, fontSize: 14, color: skin.ink, fontWeight: 700 }}>{t("panne")}</p>
      ) : null}

      {prochaine ? (
        <p style={{ marginTop: 22, fontSize: 13, color: skin.muted }}>{t("demain", { heure: prochaine })}</p>
      ) : null}
    </GameShell>
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
