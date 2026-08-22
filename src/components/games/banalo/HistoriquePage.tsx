"use client";

// LE CADRE DE « MES JOURNÉES ». Séparé de `MonHistorique` parce que `GameShell`
// est un composant client et que la page, elle, est rendue côté serveur : c'est
// la même découpe que `BanaloDuJour`.
import { useTranslations } from "next-intl";
import GameShell from "@/components/games/GameShell";
import { UNANIMO_SKIN as skin } from "@/lib/games/skin";
import MonHistorique from "./MonHistorique";

export default function HistoriquePage({ jour }: { jour: number }) {
  const t = useTranslations("BanaloJour");
  return (
    <GameShell
      skin={skin}
      title={t("name")}
      emoji="📅"
      backLabel={t("back")}
      poweredBy={t("poweredBy")}
      aside={
        <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 14, color: skin.muted }}>
          {t("historique.titre")}
        </span>
      }
    >
      <MonHistorique jour={jour} />
    </GameShell>
  );
}
