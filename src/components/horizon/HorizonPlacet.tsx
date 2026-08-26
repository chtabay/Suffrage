"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/kit";
import { FONT_DISPLAY, INK, MUTED } from "@/components/scrutin/theme";
import { cardIsOpen, getPublicPolls, type PublicPollCard } from "@/lib/db/publicFeed";

export default function HorizonPlacet() {
  const t = useTranslations("Horizon");
  const [poll, setPoll] = useState<PublicPollCard | null>(null);

  useEffect(() => {
    let alive = true;
    void getPublicPolls(8)
      .then((polls) => {
        if (alive) setPoll(polls.find((item) => cardIsOpen(item)) ?? null);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!poll) return null;
  return (
    <section aria-labelledby="today-placet-title" style={{ marginTop: 42 }}>
      <h2 id="today-placet-title" style={{ margin: "0 0 14px", fontFamily: FONT_DISPLAY, fontSize: 25 }}>{t("placetToday")}</h2>
      <Card padding="20px 22px">
        <p style={{ margin: 0, color: MUTED, fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>Placet</p>
        <p style={{ margin: "9px 0 16px", fontFamily: FONT_DISPLAY, fontSize: 21, lineHeight: 1.25 }}>{poll.question}</p>
        <Link href={`/v/${poll.token}?s=horizon`} style={{ color: INK, fontWeight: 800, textUnderlineOffset: 3 }}>{t("placetVote")}</Link>
      </Card>
    </section>
  );
}
