import type { Metadata } from "next";
import PublicVote from "@/components/scrutin/PublicVote";
import { getPollMeta } from "@/lib/db/pollMeta";
import { describeRecipe } from "@/lib/voting/engine";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const meta = await getPollMeta(token);
  if (!meta) return { title: "Scrutin — vote" };
  const method = describeRecipe(meta.recipe).name;
  const title = `Vote : ${meta.question}`;
  const description = meta.description?.trim()
    ? meta.description.trim().slice(0, 200)
    : `Votez en ligne — méthode « ${method} ». Résultat calculé pour de vrai.`;
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
