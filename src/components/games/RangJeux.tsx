"use client";

// LA PLACE DU JOUEUR, DANS LA BARRE DE PLACET.
//
// ⚠️ C'EST L'IMAGE MIROIR D'UNE RÈGLE DÉJÀ ÉCRITE, ET ELLE MÉRITE D'ÊTRE POSÉE.
// `GameShell` interdit la nav de Placet sur un écran de jeu : « on vient jouer »,
// et greffer quatre sorties au-dessus d'une manche mettrait le seul geste attendu
// en concurrence. Ici c'est l'inverse — un élément de jeu dans la barre du
// produit de vote — et ce qui le rend acceptable est qu'il ne DEMANDE rien : pas
// de bouton, pas d'appel à l'action, une place et une flèche.
//
// ⚠️ SILENCIEUX PAR DÉFAUT, ET C'EST LA CONDITION. Rien pour qui n'a pas de
// compte, rien pour qui n'a pas posé de pseudo, rien pour qui n'est pas encore
// classé. Une barre de navigation est vue sur toutes les pages du produit, y
// compris par des gens qui ne jouent pas : elle ne peut pas se permettre
// d'afficher un espace vide ou un « — » à leur intention.
//
// ⚠️ SUR MOBILE, ELLE EST DANS LE TIROIR ☰, comme le choix de langue et le
// bouton de compte — mesuré à 390 px. C'est la règle de cette barre : seul
// « Créer » est épinglé hors du tiroir, et son commentaire dit pourquoi (la
// promesse des trente secondes). Épingler une place de jeu à côté d'elle la
// mettrait en concurrence avec le seul geste que le produit demande, sur l'écran
// où il y a le moins de place. On suit donc la barre plutôt que de l'excepter.
//
// ⚠️ UNE LECTURE PAR SESSION, PAS UNE PAR PAGE. Le calcul du classement et de
// celui d'il y a une semaine tourne sur deux agrégats ; le déclencher à chaque
// rendu de la barre le ferait tourner sur CHAQUE page de Placet. Le cache est un
// module — il survit aux navigations côté client, il repart à un rechargement
// complet. Même patron que `useIsAdmin`.
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { monPseudo, saison } from "@/lib/db/jeux";

interface Rang {
  place: number;
  /**
   * ⚠️ TOUJOURS NUL DEPUIS LE PASSAGE À LA SAISON, et gardé exprès. La
   * progression hebdomadaire se calculait en reculant la fenêtre glissante de
   * sept jours ; une saison, elle, part de zéro le 1er du mois, donc « ma place
   * il y a une semaine » n'existe pas les sept premiers jours et voudrait dire
   * autre chose ensuite. Le champ reste pour que la pastille sache se taire, et
   * pour que la question se repose quand on saura la calculer honnêtement.
   */
  ecart: number | null;
}

let cache: { userId: string; rang: Rang | null } | null = null;

export default function RangJeux() {
  const t = useTranslations("JeuxQuotidiens");
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [rang, setRang] = useState<Rang | null>(
    () => (uid && cache?.userId === uid ? cache.rang : null),
  );

  useEffect(() => {
    if (!uid) {
      setRang(null);
      return;
    }
    if (cache?.userId === uid) {
      setRang(cache.rang);
      return;
    }
    let vivant = true;
    void (async () => {
      // ⚠️ LE PSEUDO D'ABORD : sans lui on n'est pas classé, et le classement
      // n'a pas besoin d'être calculé pour le savoir.
      const p = await monPseudo();
      if (!p?.pseudo || p.bloque) {
        cache = { userId: uid, rang: null };
        if (vivant) setRang(null);
        return;
      }
      // ⚠️ LA SAISON, PAS LE CUMUL GLISSANT. C'est le classement qui a un début,
      // une fin et des médailles au bout : celui dont la place BOUGE tous les
      // jours, donc le seul dont une pastille de barre vaille la peine.
      //
      // ⚠️ ET ELLE NE DEMANDE PLUS DE NUMÉRO DE JOURNÉE. La saison est datée en
      // base par l'horodatage des résultats ; le client n'a plus à porter deux
      // calendriers d'origines différentes jusqu'ici.
      const c = await saison("tout", null);
      const valeur = c?.moi != null ? { place: c.moi.place, ecart: null } : null;
      cache = { userId: uid, rang: valeur };
      if (vivant) setRang(valeur);
    })();
    return () => {
      vivant = false;
    };
  }, [uid]);

  if (!rang) return null;

  const monte = rang.ecart !== null && rang.ecart > 0;
  const descend = rang.ecart !== null && rang.ecart < 0;
  const phrase = monte
    ? t("navMonte", { place: rang.place, n: rang.ecart! })
    : descend
      ? t("navDescend", { place: rang.place, n: -rang.ecart! })
      : t("navPlace", { place: rang.place });

  return (
    <Link
      href="/games/quotidien"
      title={phrase}
      className="dc-paper"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 38,
        padding: "0 10px",
        borderRadius: 10,
        fontWeight: 700,
        fontSize: 14,
        textDecoration: "none",
        color: "inherit",
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden>📈</span>
      <span aria-hidden style={{ fontVariantNumeric: "tabular-nums" }}>
        {t("navRang", { n: rang.place })}
      </span>
      {/* ⚠️ LA FLÈCHE EST DÉCORATIVE, LA PHRASE EST DANS LE `sr-only`. Un « ▲ 8 »
          seul ne se lit pas à voix haute, et le `title` d'un lien n'est pas
          annoncé partout. */}
      {monte || descend ? (
        <span aria-hidden style={{ fontSize: 12, fontWeight: 800, color: monte ? "#0E7C5A" : "#B3261E" }}>
          {monte ? "▲" : "▼"}
          {Math.abs(rang.ecart!)}
        </span>
      ) : null}
      <span className="sr-only">{phrase}</span>
    </Link>
  );
}
