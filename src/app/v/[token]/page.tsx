import type { Metadata } from "next";
import PublicVote from "@/components/scrutin/PublicVote";
import { getPollShareInfo } from "@/lib/db/pollMeta";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const info = await getPollShareInfo(token);
  if (!info) return { title: "Scrutin — vote" };
  const plural = info.ballotCount > 1 ? "s" : "";
  const title = info.phase === "closed" ? `Résultat : ${info.question}` : `Vote : ${info.question}`;
  let description: string;
  if (info.phase === "closed") {
    description = info.winner
      ? `${info.winner.icon} ${info.winner.name} l'emporte — ${info.methodName}, ${info.ballotCount} vote${plural}.`
      : `Vote clos — ${info.methodName}, ${info.ballotCount} vote${plural}.`;
  } else if (info.description?.trim()) {
    description = info.description.trim().slice(0, 200);
  } else {
    description = `Votez en ligne — méthode « ${info.methodName} », ${info.options.length} options.`;
  }
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Scrutin",
      url: `/v/${token}`,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function VotePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ k?: string; u?: string }>;
}) {
  const { token } = await params;
  const { k, u } = await searchParams;
  return <PublicVote token={token} adminKey={k ?? null} voterToken={u ?? null} />;
}
