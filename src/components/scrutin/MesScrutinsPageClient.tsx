"use client";

// Enveloppe cliente de « Mes scrutins ». L'écran attend un contrôleur de création
// dont il n'utilise QU'UNE chose : `go("create")`. Sur une route dédiée, cette
// intention est un lien — on lui passe donc un aiguillage minimal vers /new
// plutôt que d'instancier toute la machine de création pour une seule flèche.
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import MesScrutinsScreen from "./MesScrutinsScreen";
import Nav from "./Nav";

export default function MesScrutinsPageClient() {
  const auth = useAuth();
  const router = useRouter();
  const ctrl = {
    go: (screen: string) => router.push(screen === "create" ? "/new" : "/"),
  } as unknown as ScrutinController;

  return (
    <>
      <Nav />
      <MesScrutinsScreen ctrl={ctrl} auth={auth} />
    </>
  );
}
