"use client";

// La vue du connecté : ce qui m'attend, ce que j'ai ouvert, mon historique.
//
// CE QUE CETTE PAGE N'EST PAS. Une place de marché façon Polymarket. Un marché a
// un prix et un volume — des nombres continus, comparables, qui bougent. Un
// scrutin n'a ni l'un ni l'autre avant sa clôture, et la plupart sont
// volontairement secrets : une grille de cartes « vivantes » afficherait des
// cartes mortes. Ce qui rend une ligne intéressante ici, c'est le temps qui
// reste et « ai-je répondu ». D'où une FILE D'ATTENTE, plus proche d'une boîte
// de réception, et l'ordre des sections : l'actionnable d'abord.
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { getMyFeed, type MyFeed } from "@/lib/db/participation";
import { OrgShell } from "./SpacesHome";
import { CORAL, CREAM, FONT_DISPLAY, GREENTXT, INK, MUTED, SUBINK } from "./theme";

const card = {
  background: "#fff",
  border: `2.5px solid ${INK}`,
  borderRadius: 18,
  padding: "20px 22px",
  boxShadow: `5px 5px 0 ${INK}`,
} as const;

/** Combien de temps reste-t-il — la seule vraie urgence d'un scrutin. */
function remaining(closesAt: string | null, t: (k: string, v?: Record<string, number>) => string): string | null {
  if (!closesAt) return null;
  const ms = new Date(closesAt).getTime() - Date.now();
  if (ms <= 0) return t("closingPast");
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return t("closingMinutes", { n: Math.max(1, Math.floor(ms / 60_000)) });
  if (h < 48) return t("closingHours", { n: h });
  return t("closingDays", { n: Math.floor(h / 24) });
}

export default function MyFeedScreen() {
  const t = useTranslations("Feed");
  const locale = useLocale();
  const { user, loading } = useAuth();
  const [feed, setFeed] = useState<MyFeed | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setFeed(await getMyFeed());
    } catch {
      setFeed({ status: "anonymous" });
    }
  }, [user]);
  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <OrgShell><div style={{ ...card, color: MUTED }}>{t("loading")}</div></OrgShell>;
  if (!user) return <OrgShell><div style={card}>{t("signInPrompt")}</div></OrgShell>;

  const base = locale === "fr" ? "" : `/${locale}`;
  const todo = feed?.todo ?? [];
  const answered = feed?.answered ?? [];
  const publicVotes = feed?.publicVotes ?? [];
  const vide = !todo.length && !answered.length && !publicVotes.length;

  const ligne = (key: string, href: string, titre: string, sous: React.ReactNode, accent = false) => (
    <a
      key={key}
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        background: accent ? CREAM : "#fff",
        border: `2px solid ${accent ? INK : "#e3e3e3"}`,
        borderRadius: 12,
        padding: "12px 14px",
        textDecoration: "none",
        color: INK,
      }}
    >
      <span style={{ fontWeight: 800, fontSize: 15, flex: 1, minWidth: 0 }}>{titre}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: SUBINK, textAlign: "right", flex: "none" }}>{sous}</span>
    </a>
  );

  return (
    <OrgShell>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: "clamp(26px,5vw,36px)", letterSpacing: "-0.03em", margin: 0 }}>
        {t("title")}
      </h1>
      <p style={{ fontSize: 14.5, color: SUBINK, lineHeight: 1.5, marginTop: 8, maxWidth: "62ch" }}>{t("subtitle")}</p>

      {/* ---- CE QUI M'ATTEND. Accentué, en tête : c'est la seule section où il y
           a quelque chose à faire. Tout le reste est de la consultation. ---- */}
      {todo.length > 0 && (
        <div style={{ ...card, marginTop: 18, borderColor: CORAL, boxShadow: `5px 5px 0 ${CORAL}` }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19 }}>
            {t("todoTitle", { count: todo.length })}
          </div>
          <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
            {todo.map((c) =>
              ligne(
                c.token,
                `${base}/e/${c.token}`,
                c.title,
                <>
                  {c.circle}
                  {remaining(c.closes_at, t) ? ` · ${remaining(c.closes_at, t)}` : ""}
                  {c.secret_ballot ? ` · ${t("sealed")}` : ""}
                </>,
                true,
              ),
            )}
          </div>
        </div>
      )}

      {answered.length > 0 && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17 }}>{t("answeredTitle")}</div>
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 3 }}>{t("answeredHint")}</div>
          <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
            {answered.map((c) =>
              ligne(c.token, `${base}/e/${c.token}`, c.title, (
                <span style={{ color: GREENTXT }}>
                  {c.circle} · {t("done")}
                </span>
              )),
            )}
          </div>
        </div>
      )}

      {/* Mes votes HORS cercle (publics ou par lien) — des participations, donc
          leur place est ici. La mémoire vient du registre en base : elle survit
          au changement d'appareil, contrairement au localStorage qu'elle relaie. */}
      {publicVotes.length > 0 && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17 }}>{t("publicVotesTitle")}</div>
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 3 }}>{t("publicVotesHint")}</div>
          <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
            {publicVotes.slice(0, 20).map((v) =>
              ligne(
                v.token,
                `${base}/v/${v.token}`,
                v.question,
                <>{t("votedOn", { date: new Date(v.marked_on).toLocaleDateString(locale) })}</>,
              ),
            )}
          </div>
        </div>
      )}

      {/* Ni « ce que j'ai ouvert » ni « historique » ici : « Mes consultations »
          le fait déjà, et le fait bien. Deux listes des mêmes scrutins sur deux
          pages finiraient par diverger. Cette page ne montre que ce qui m'est
          ADRESSÉ — créer et être consulté sont deux rôles distincts. */}

      {vide && feed && (
        <div style={{ ...card, marginTop: 18, color: SUBINK, lineHeight: 1.55 }}>{t("empty")}</div>
      )}

      {/* Le feed public reste une page à part : on y va pour découvrir, pas pour
          répondre à ce qui nous est adressé. Deux intentions, deux endroits. */}
      <div style={{ marginTop: 18, display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Link href="/explorer" style={{ fontWeight: 700, fontSize: 14, color: SUBINK }}>
          {t("goExplore")} →
        </Link>
        <Link href="/espaces" style={{ fontWeight: 700, fontSize: 14, color: SUBINK }}>
          {t("goSpaces")} →
        </Link>
      </div>
    </OrgShell>
  );
}
