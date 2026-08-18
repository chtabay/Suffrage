"use client";

// LA PORTE « JOUER » — une page de Placet, mais qui présente des LIEUX.
//
// Ce n'est PAS une page de fonctionnalités. On n'y explique pas Condorcet, on
// n'y vante pas le moteur de vote, on n'y demande pas de compte : on y choisit un
// jeu, ou on tape un code parce que quelqu'un vient de le lire à voix haute.
// C'est pour cette dernière raison que le champ de code est EN HAUT et non en
// bas — l'arrivant d'un salon a déjà son code, il n'a rien à choisir.
//
// Elle garde la nav de Placet, elle : c'est bien Placet qui fait découvrir les
// jeux. Ce sont les pages de jeu qui la déposent.
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import Nav from "@/components/scrutin/Nav";
import { FAMILLES, gamesParFamille, roomPath } from "@/lib/games/catalog";
import { getRoom } from "@/lib/games/room";
import { PLACET_GAMES_SKIN as skin } from "@/lib/games/skin";
import { GBtn, GCard, GLabel } from "./ui";

export default function GamesHome() {
  const t = useTranslations("Games");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Le code ne dit pas à quel jeu il appartient : c'est la salle qui le dit. Un
  // aller-retour, puis on envoie au bon endroit — sans page de redirection
  // intermédiaire, qui coûterait un écran blanc sur le chemin critique.
  const join = async () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4 || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const a = await getRoom(c);
      if (a.status === "not_found") setErr(t("joinError"));
      else router.push(roomPath(a.game, a.code));
    } catch {
      setErr(t("joinError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Nav />
      <div className="pad" style={{ maxWidth: 900, margin: "0 auto", padding: "26px 24px 80px" }}>
        <h1
          style={{
            fontFamily: skin.fontDisplay,
            fontWeight: 800,
            fontSize: "clamp(34px,8vw,58px)",
            lineHeight: 1.0,
            letterSpacing: "-0.035em",
            margin: 0,
          }}
        >
          {t("title")}
        </h1>
        <p style={{ fontSize: "clamp(16px,2.1vw,19px)", lineHeight: 1.5, color: skin.muted, maxWidth: "44ch", margin: "14px 0 0" }}>
          {t("subtitle")}
        </p>

        {/* Le code d'abord : c'est le geste de celui qui vient d'être invité. */}
        <GCard skin={skin} accent={skin.accent2} padding={14} style={{ marginTop: 22 }}>
          <GLabel skin={skin}>{t("joinTitle")}</GLabel>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === "Enter") void join();
              }}
              placeholder={t("joinPlaceholder")}
              aria-label={t("joinTitle")}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily: skin.fontDisplay,
                fontWeight: 800,
                fontSize: 20,
                letterSpacing: "0.12em",
                padding: "12px 14px",
                border: `3px solid ${skin.ink}`,
                borderRadius: 12,
                background: "#fff",
                color: skin.ink,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <GBtn skin={skin} onClick={join} disabled={code.trim().length < 4 || busy}>
              {busy ? "…" : t("joinCta")}
            </GBtn>
          </div>
          {err && (
            <div role="alert" style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: "#C62828" }}>
              {err}
            </div>
          )}
        </GCard>

        {/* LES JEUX, RANGÉS PAR FAMILLE.
            
            Une grille à plat de cinq vignettes hautes demandait de tout lire pour
            choisir. Le rayon répond d'abord à la question qu'on se pose vraiment
            — « qu'est-ce qui est possible ce soir ? » — et la vignette, réduite à
            un nom, une phrase et deux pastilles, se scanne au lieu de se lire.
            
            ⚠️ LES LIBELLÉS DE FAMILLE SONT ÉCRITS EN CLAIR. Le contrôle de parité
            ne voit pas les clés passées en variable : une famille sans libellé
            s'afficherait « Games.familles.enquete.nom » en toutes lettres, et
            rien ne l'aurait signalé avant l'écran. */}
        {FAMILLES.map((cle) => {
          const jeux = gamesParFamille(cle);
          if (!jeux.length) return null;
          const libelle = {
            quotidien: { nom: t("familles.quotidien.nom"), pitch: t("familles.quotidien.pitch") },
            accord: { nom: t("familles.accord.nom"), pitch: t("familles.accord.pitch") },
            enquete: { nom: t("familles.enquete.nom"), pitch: t("familles.enquete.pitch") },
          }[cle];
          return (
            <section key={cle} style={{ marginTop: 30 }}>
              <h2
                style={{
                  fontFamily: skin.fontDisplay,
                  fontWeight: 800,
                  fontSize: "clamp(19px,3.4vw,24px)",
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                {libelle.nom}
              </h2>
              <p style={{ margin: "3px 0 0", fontSize: 14, color: skin.muted, maxWidth: "56ch" }}>{libelle.pitch}</p>

              <div
                // ⚠️ FLEX ET NON GRILLE, à cause des familles à un seul jeu. Avec
                // `auto-fit` + `1fr`, une vignette seule s'étire sur toute la
                // largeur : mille pixels de carte pour quarante de contenu, et
                // « Un par jour » avait l'air d'une bannière. Le plafond rend la
                // vignette solitaire de la même taille que ses voisines.
                style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}
              >
                {jeux.map((g) => {
                  const live = g.status === "live";
                  const chips = [
                    // Le seul jeu SOLO du catalogue casse le gabarit : « 1
                    // joueurs » est faux, et un pluriel ICU ne s'applique pas à
                    // « 3–12 », qui est une chaîne, pas un nombre.
                    g.bestWith === "1" ? t("solo") : t("players", { n: g.bestWith }),
                    t("minutes", { n: g.minutes }),
                    ...(g.prepare ? [t("prepare")] : []),
                    ...(live ? [] : [t("soon")]),
                  ];
                  const corps = (
                    <>
                      <span
                        aria-hidden
                        style={{
                          width: 40,
                          height: 40,
                          flex: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 21,
                          borderRadius: 11,
                          border: `2.5px solid ${skin.ink}`,
                          background: live ? g.skin.accent2 : "#fff",
                        }}
                      >
                        {g.emoji}
                      </span>
                      <span style={{ minWidth: 0, flex: "1 1 auto" }}>
                        <span
                          style={{
                            display: "block",
                            fontFamily: skin.fontDisplay,
                            fontWeight: 800,
                            fontSize: 18.5,
                            letterSpacing: "-0.02em",
                            lineHeight: 1.15,
                          }}
                        >
                          {t(`${g.slug}.name`)}
                        </span>
                        <span style={{ display: "block", fontSize: 13, color: skin.muted, lineHeight: 1.35, marginTop: 2 }}>
                          {t(`${g.slug}.tagline`)}
                        </span>
                        <span style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 7 }}>
                          {chips.map((chip) => (
                            <span
                              key={chip}
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                padding: "2px 8px",
                                borderRadius: 999,
                                border: `2px solid ${skin.ink}22`,
                                color: skin.muted,
                              }}
                            >
                              {chip}
                            </span>
                          ))}
                        </span>
                      </span>
                    </>
                  );
                  const boite = {
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 11,
                    background: "#fff",
                    border: `2.5px solid ${skin.ink}`,
                    borderRadius: 14,
                    padding: 12,
                    flex: "1 1 272px",
                    maxWidth: 430,
                    boxSizing: "border-box",
                    textDecoration: "none",
                    color: skin.ink,
                    boxShadow: `4px 4px 0 ${live ? g.skin.accent : `${skin.ink}55`}`,
                    opacity: live ? 1 : 0.72,
                  } as const;
                  // Toute la vignette est le lien : avec une carte de cette
                  // taille, un bouton « Jouer » séparé prendrait plus de place
                  // que ce qu'il annonce.
                  return live ? (
                    <Link key={g.slug} href={g.route} className="dc-lift" style={boite}>
                      {corps}
                    </Link>
                  ) : (
                    <div key={g.slug} style={boite} aria-disabled="true">
                      {corps}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* La réciprocité, dans le sens jeux → Placet. Discrète : on est venu jouer. */}
        <div
          style={{
            marginTop: 40,
            paddingTop: 20,
            borderTop: `2px dashed ${skin.ink}`,
            fontSize: 14,
            lineHeight: 1.55,
            color: skin.muted,
            maxWidth: "56ch",
          }}
        >
          <strong style={{ color: skin.ink }}>{t("engineTitle")}</strong> {t("engineText")}{" "}
          <Link href="/" style={{ color: skin.ink, fontWeight: 700 }}>
            {t("engineCta")}
          </Link>
        </div>
      </div>
    </>
  );
}
