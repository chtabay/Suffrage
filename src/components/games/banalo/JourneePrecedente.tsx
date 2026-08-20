"use client";

// LA JOURNÉE PRÉCÉDENTE — et c'est la SEULE place où la médiane se montre.
//
// ⚠️ SANS CE BLOC, LE SCELLEMENT NE RÉVÈLE RIEN. `scrutin_banalo_etat` cache la
// médiane et l'écart tant que la journée est ouverte, et les rend à la clôture.
// Mais à la clôture, la page bascule sur la journée suivante : l'écran qui
// aurait pu les afficher n'existe plus. Le joueur ne voyait donc jamais la
// réponse de la foule, sur aucune journée — la récompense promise par la
// charnière de 11 h 30 (« le résultat clos de la veille est prêt exactement
// quand la nouvelle s'ouvre », en tête de `jour.ts`) n'était pas tenue.
//
// ⚠️ IL NE REGARDE QUE LA JOURNÉE `jour − 1`, JAMAIS AUJOURD'HUI. C'est ce qui
// fait qu'il ne peut rien divulguer : la médiane qu'il montre est celle d'une
// question déjà close, qui n'est plus jouable. Et il garde la ceinture avec les
// bretelles — si la base refusait de rendre la médiane (journée pas encore
// close de son point de vue), le bloc ne s'affiche pas du tout plutôt que de
// montrer un résultat amputé.
//
// ⚠️ ET LE TITRE NE DIT PAS « HIER ». La journée n° N s'ouvre à 11 h 30 et se
// ferme à 11 h 30 le lendemain : à 11 h 00, la journée précédente a commencé
// AVANT-HIER. « Hier » serait donc faux la moitié de la matinée, et c'est
// exactement le piège que l'en-tête de `jour.ts` interdit — on nomme la
// journée par son numéro, jamais par une date.
//
// ⚠️ IL SE TAIT AUSSI QUAND ON N'A PAS JOUÉ LA VEILLE. Un bloc « vous n'avez pas
// joué » n'apporte rien : c'est un reproche à quelqu'un qui vient justement de
// revenir. Le silence est le bon défaut ; la série, elle, est déjà comptée
// ailleurs (`scrutin_banalo_serie`).
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { UNANIMO_SKIN as skin } from "@/lib/games/skin";
import { GCard, GLabel } from "@/components/games/ui";
import { UNITES, enLangue } from "@/content/banalo/questions";
import { cleTheme } from "@/content/banalo/mots";
import { themeLabel } from "@/lib/games/banalo/themes";
import { programmeDe } from "@/lib/games/banalo/programme";
import { monJeton } from "@/lib/games/banalo/jeton";
import { teinteDe } from "@/lib/games/banalo/chaleur";
import { etat as litEtat, etatMots, type EtatBanalo, type EtatMots } from "@/lib/db/banalo";

/** `Intl` ne connaît pas `pcm` : le pidgin s'écrit aux conventions anglaises. */
const bcp = (locale: string) => (locale === "pcm" ? "en" : locale);

export default function JourneePrecedente({ jour }: { jour: number }) {
  const t = useTranslations("BanaloJour");
  const locale = useLocale();
  const precedente = jour - 1;

  // ⚠️ MÉMORISÉ, parce que `programmeDe` rend un objet neuf à chaque rendu et
  // qu'il sert de dépendance à l'effet : sans ça, l'effet rappellerait la base
  // à chaque rendu du parent.
  const prog = useMemo(() => (precedente >= 1 ? programmeDe(precedente) : null), [precedente]);

  const [nombre, setNombre] = useState<EtatBanalo | null>(null);
  const [mots, setMots] = useState<EtatMots | null>(null);

  // Le jeton ne se lit qu'après le montage — même leçon qu'ailleurs : le lire au
  // rendu en créerait un nouveau côté serveur, et l'hydratation le changerait.
  useEffect(() => {
    if (!prog) return;
    let vivant = true;
    const jeton = monJeton();
    if (!jeton) return;
    if (prog.type === "mots") {
      void etatMots(jeton, precedente, locale, cleTheme(prog.theme)).then((e) => {
        if (vivant) setMots(e);
      });
    } else {
      void litEtat(jeton, precedente, locale).then((e) => {
        if (vivant) setNombre(e);
      });
    }
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
  // Le score garde sa décimale, « 100,0 » compris : c'est elle qui décide du rang.
  const note = useMemo(
    () => new Intl.NumberFormat(bcp(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    [locale],
  );

  if (!prog) return null;

  const points = prog.type === "mots" ? mots?.points : nombre?.points;
  const partMieux = prog.type === "mots" ? mots?.partMieux : nombre?.partMieux;
  // Rien à raconter tant que la journée précédente n'a pas été jouée ET dépouillée.
  // Sous le plancher de cinq votants elle n'a jamais eu de note et n'en aura
  // plus jamais : on n'a rien à en dire non plus.
  if (points === undefined || points === null) return null;

  const chapeau = (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
      <GLabel skin={skin}>{t("precedenteTitre")}</GLabel>
      <span style={{ fontSize: 12, fontWeight: 700, color: skin.muted }}>{t("numero", { n: precedente })}</span>
    </div>
  );

  const score = (
    <p style={{ margin: "10px 0 0", fontSize: 14.5, lineHeight: 1.45, fontVariantNumeric: "tabular-nums" }}>
      <strong style={{ fontFamily: skin.fontDisplay, fontSize: 17, color: teinteDe(points) }}>
        {/* Le suffixe reste DANS la phrase, comme sur l'écran du jour : une clé
            « sur 100 » à part figerait son ordre pour les langues à venir. */}
        {t.rich("points", {
          n: note.format(points),
          petit: (c) => <span style={{ fontSize: 12.5, fontWeight: 800 }}>{c}</span>,
        })}
      </strong>
      {partMieux !== undefined && partMieux !== null ? (
        <span style={{ color: skin.muted }}> · {t("partMieux", { n: partMieux })}</span>
      ) : null}
    </p>
  );

  if (prog.type === "mots") {
    return (
      <div style={{ marginTop: 20 }}>
        <GCard skin={skin} padding={18}>
          {chapeau}
          <p style={{ margin: "8px 0 0", fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 18 }}>
            <span aria-hidden style={{ marginRight: 6 }}>
              {prog.theme.emoji}
            </span>
            {themeLabel(prog.theme, locale)}
          </p>
          {score}
        </GCard>
      </div>
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

  return (
    <div style={{ marginTop: 20 }}>
      <GCard skin={skin} padding={18}>
        {chapeau}
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
        {score}
      </GCard>
    </div>
  );
}
