import PublicVote from "@/components/scrutin/PublicVote";

export default async function VotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicVote token={token} />;
}
