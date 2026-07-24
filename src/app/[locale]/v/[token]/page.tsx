import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PublicVote from "@/components/scrutin/PublicVote";
import { getPollShareInfo } from "@/lib/db/pollMeta";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}): Promise<Metadata> {
  const { locale, token } = await params;
  const t = await getTranslations({ locale, namespace: "Share" });
  const info = await getPollShareInfo(token);
  // Introuvable : pas d'indexation d'une page vide.
  if (!info) return { title: t("fallbackTitle"), robots: { index: false, follow: true } };
  const tm = await getTranslations({ locale, namespace: "Methods" });
  const ta = await getTranslations({ locale, namespace: "Assign" });
  const method = info.assignKey ? ta(`methods.${info.assignKey}.name`) : tm(`${info.methodKey}.name`);
  const title =
    info.phase === "closed"
      ? t("titleClosed", { question: info.question })
      : t("titleOpen", { question: info.question });
  let description: string;
  if (info.phase === "closed") {
    description = info.winner
      ? t("descWinner", { winner: `${info.winner.icon} ${info.winner.name}`, method, count: info.ballotCount })
      : t("descClosed", { method, count: info.ballotCount });
  } else if (info.description?.trim()) {
    description = info.description.trim().slice(0, 200);
  } else {
    description = t("descOpen", { method, count: info.options.length });
  }
  return {
    title,
    description,
    // Seuls les scrutins PUBLIÉS sont indexables ; un lien privé partagé
    // (WhatsApp, mail…) ne doit jamais finir dans Google.
    robots: { index: info.visibility === "public", follow: true },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Placet",
      url: `/v/${token}`,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function VotePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ k?: string; u?: string }>;
}) {
  const { token } = await params;
  const { k, u } = await searchParams;
  return <PublicVote token={token} adminKey={k ?? null} voterToken={u ?? null} />;
}
