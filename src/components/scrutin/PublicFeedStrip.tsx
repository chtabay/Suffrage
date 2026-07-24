"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { intlLocale } from "@/i18n/locales";
import { cardIsOpen, getPublicPolls, type PublicPollCard } from "@/lib/db/publicFeed";
import { FONT_DISPLAY, GREEN, INK, MUTED, PAPER, lift } from "./theme";

/**
 * Bande « en ce moment sur Placet » de la landing : mini-cartes des derniers
 * scrutins publics. RIEN n'est rendu sous 3 entrées — un feed clairsemé
 * desservirait la landing plus qu'il ne l'habille.
 */
export default function PublicFeedStrip() {
  const t = useTranslations("Explore");
  const locale = useLocale();
  const [polls, setPolls] = useState<PublicPollCard[]>([]);

  useEffect(() => {
    let alive = true;
    getPublicPolls(6)
      .then((rows) => {
        if (alive) setPolls(rows);
      })
      .catch(() => {
        /* feed indisponible : la landing reste intacte */
      });
    return () => {
      alive = false;
    };
  }, []);

  if (polls.length < 3) return null;

  const fmt = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short" });

  return (
    <div style={{ marginTop: 40, paddingTop: 22, borderTop: `2px dashed ${INK}` }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19, color: INK }}>{t("stripTitle")}</div>
        <Link
          href="/explorer"
          style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 13.5, color: INK, textDecoration: "none", borderBottom: `2px solid ${INK}` }}
        >
          {t("seeAll")} →
        </Link>
      </div>
      {/* Débordement mobile : le scroll horizontal vit DANS la bande, jamais sur la page. */}
      <div style={{ overflowX: "auto", margin: "14px -4px 0", padding: "4px 4px 10px" }}>
        <div style={{ display: "flex", gap: 12, width: "max-content" }}>
          {polls.map((p) => {
            const open = cardIsOpen(p);
            return (
              <Link
                key={p.token}
                href={`/v/${p.token}`}
                className="dc-lift"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  width: 230,
                  flex: "none",
                  textDecoration: "none",
                  color: INK,
                  background: PAPER,
                  border: `2px solid ${INK}`,
                  borderRadius: 13,
                  padding: "12px 14px",
                  ...lift(`3px 3px 0 ${open ? GREEN : INK}`, `5px 5px 0 ${open ? GREEN : INK}`),
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      background: open ? GREEN : INK,
                      color: "#fff",
                      border: `2px solid ${INK}`,
                      borderRadius: 20,
                      padding: "2px 8px",
                      fontWeight: 700,
                      fontSize: 10.5,
                    }}
                  >
                    {open ? t("openBadge") : t("closedBadge")}
                  </span>
                  <span style={{ fontSize: 11.5, color: MUTED, fontWeight: 600 }}>{fmt.format(new Date(p.published_at))}</span>
                </div>
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 800,
                    fontSize: 14.5,
                    lineHeight: 1.25,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {p.question}
                </div>
                <div style={{ marginTop: "auto", fontSize: 11.5, color: MUTED, fontWeight: 600 }}>
                  🗳 {t("ballots", { count: p.ballot_count })}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
