import ScrutinApp from "@/components/scrutin/ScrutinApp";
import { parseDraft } from "@/lib/voting/draft";

// /new?title=…&options=A|B|C&method=majority_judgment&deadline=2026-07-01T18:00
// Ouvre l'écran de création pré-rempli (brouillon). L'utilisateur valide avant de lancer.
export default async function NewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const draft = parseDraft(params);
  return <ScrutinApp draft={draft} />;
}
