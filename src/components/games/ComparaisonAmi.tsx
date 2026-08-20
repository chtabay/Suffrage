"use client";

// « VOTRE AMI / VOUS » — la couche sociale, sans construire de réseau.
//
// Voir `src/lib/games/comparaison.ts` pour pourquoi ça n'est pas un système
// d'amis. Ici, seulement les trois règles d'affichage :
//
// ⚠️ 1. RIEN AVANT D'AVOIR JOUÉ. Le composant n'est monté que par les écrans de
//    résultat, et il exige `mien`. Montrer le score d'un ami à quelqu'un qui n'a
//    pas encore répondu ne divulgue rien — le score est relatif à la foule, pas
//    à une réponse — mais ça ancre, et ça met une pression que le jeu ne
//    demande pas. Une chose à la fois : d'abord jouer.
//
// ⚠️ 2. JAMAIS UNE AUTRE JOURNÉE QUE CELLE EN COURS. Un lien ouvert le
//    lendemain porte une journée close : comparer un score d'hier avec celui
//    d'aujourd'hui n'aurait aucun sens, et laisser passer serait pire que ne
//    rien montrer. On le dit, et on invite à jouer la journée du jour.
//
// ⚠️ 3. PAS DE NOM, ET C'EST LE POINT. « Votre ami » plutôt qu'un pseudo : ça
//    évite l'identité publique, donc la modération, donc l'usurpation. Le fil de
//    conversation où le lien a circulé dit déjà de qui il s'agit — mieux que
//    n'importe quel pseudo qu'on aurait stocké.
import type { GameSkin } from "@/lib/games/skin";

export default function ComparaisonAmi({
  skin,
  mien,
  sien,
  memeJournee,
  textes,
}: {
  skin: GameSkin;
  /** Mon résultat, déjà formaté dans la langue de l'écran. */
  mien: string;
  /** Celui de l'ami, déjà formaté. */
  sien: string;
  /** Le lien porte-t-il bien la journée en cours ? */
  memeJournee: boolean;
  textes: { titre: string; moi: string; ami: string; passee: string };
}) {
  if (!memeJournee) {
    return (
      <p style={{ marginTop: 4, fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
        {textes.passee}
      </p>
    );
  }

  const ligne = (libelle: string, valeur: string, fort: boolean) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
      <span style={{ fontSize: 13.5, color: fort ? skin.ink : skin.muted, fontWeight: fort ? 700 : 600 }}>
        {libelle}
      </span>
      <span
        style={{
          fontFamily: skin.fontDisplay,
          fontWeight: 800,
          fontSize: fort ? 18 : 16,
          fontVariantNumeric: "tabular-nums",
          color: fort ? skin.ink : skin.muted,
        }}
      >
        {valeur}
      </span>
    </div>
  );

  return (
    <div
      style={{
        marginTop: 4,
        padding: 14,
        border: `2px dashed ${skin.ink}33`,
        borderRadius: skin.radius,
        display: "grid",
        gap: 8,
      }}
    >
      <div
        style={{
          fontFamily: skin.fontDisplay,
          fontWeight: 800,
          fontSize: 12,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: skin.muted,
        }}
      >
        {textes.titre}
      </div>
      {/* L'ami d'abord, moi ensuite : on lit sa propre ligne en dernier, et
          c'est celle qui reste. Aucun ordre de classement — les deux lignes ne
          sont pas triées par score, elles sont toujours dans cet ordre-là. */}
      {ligne(textes.ami, sien, false)}
      {ligne(textes.moi, mien, true)}
    </div>
  );
}
