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
import { GAMES, roomPath } from "@/lib/games/catalog";
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

        <div
          style={{
            marginTop: 26,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
            gap: 16,
          }}
        >
          {GAMES.map((g) => {
            const live = g.status === "live";
            const body = (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 52,
                      height: 52,
                      flex: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 27,
                      borderRadius: 14,
                      border: `2.5px solid ${skin.ink}`,
                      background: live ? g.skin.accent2 : "#fff",
                    }}
                  >
                    {g.emoji}
                  </span>
                  <span>
                    <span
                      style={{
                        display: "block",
                        fontFamily: skin.fontDisplay,
                        fontWeight: 800,
                        fontSize: 23,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {t(`${g.slug}.name`)}
                    </span>
                    <span style={{ display: "block", fontSize: 13, color: skin.muted, fontWeight: 700 }}>
                      {t(`${g.slug}.tagline`)}
                    </span>
                  </span>
                </div>
                <p style={{ fontSize: 14.5, lineHeight: 1.5, color: skin.muted, margin: "12px 0 0" }}>
                  {t(`${g.slug}.desc`)}
                </p>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 12 }}>
                  {[t("players", { n: g.bestWith }), t("minutes", { n: g.minutes })].map((chip) => (
                    <span
                      key={chip}
                      style={{
                        fontSize: 11.5,
                        fontWeight: 800,
                        padding: "3px 9px",
                        borderRadius: 999,
                        border: `2px solid ${skin.ink}`,
                        background: "#fff",
                      }}
                    >
                      {chip}
                    </span>
                  ))}
                  {!live && (
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 800,
                        padding: "3px 9px",
                        borderRadius: 999,
                        border: `2px solid ${skin.ink}`,
                        background: skin.accent2,
                      }}
                    >
                      {t("soon")}
                    </span>
                  )}
                </div>
                {live && (
                  <div
                    className="dc-lift"
                    style={{
                      marginTop: 14,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      fontFamily: skin.fontDisplay,
                      fontWeight: 800,
                      fontSize: 16,
                      padding: "12px 20px",
                      borderRadius: 12,
                      border: `2.5px solid ${skin.ink}`,
                      background: g.skin.accent,
                      color: "#fff",
                      boxShadow: `4px 4px 0 ${skin.ink}`,
                    }}
                  >
                    ▶ {t("play")}
                  </div>
                )}
              </>
            );
            const box = {
              display: "block",
              background: "#fff",
              border: `2.5px solid ${skin.ink}`,
              borderRadius: 18,
              padding: 18,
              textDecoration: "none",
              color: skin.ink,
              boxShadow: `5px 5px 0 ${live ? g.skin.accent : `${skin.ink}55`}`,
              opacity: live ? 1 : 0.72,
            } as const;
            return live ? (
              <Link key={g.slug} href={g.route} style={box}>
                {body}
              </Link>
            ) : (
              <div key={g.slug} style={box} aria-disabled="true">
                {body}
              </div>
            );
          })}
        </div>

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
