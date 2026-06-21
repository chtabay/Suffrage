import PublicVote from "@/components/scrutin/PublicVote";

export default async function VotePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { token } = await params;
  const { k } = await searchParams;
  return <PublicVote token={token} adminKey={k ?? null} />;
}
