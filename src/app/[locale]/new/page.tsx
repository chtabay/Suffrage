import ScrutinApp from "@/components/scrutin/ScrutinApp";
import { parseDraft } from "@/lib/voting/draft";

// /new?title=…&options=A|B|C&method=majority_judgment&deadline=2026-07-01T18:00
// Ouvre l'écran de création pré-rempli (brouillon). L'utilisateur valide avant de lancer.
export default async function NewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const draft = parseDraft(sp, locale);
  return <ScrutinApp draft={draft} />;
}
