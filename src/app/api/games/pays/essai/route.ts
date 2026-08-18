import { NextResponse } from "next/server";
import { enLangue } from "@/content/pays/criteres";
import { PAYS_PAR_ID } from "@/content/pays/referentiel";
import { journeeDe, numeroDuJour } from "@/lib/games/pays/journee";
import { journalise } from "@/lib/games/pays/journal";
import { NB_CRITERES, scoreDe, scoresDeTous } from "@/lib/games/pays/moteur";
import type { ReponseEssai } from "@/lib/games/pays/types";

// UN ESSAI. Le navigateur envoie un pays, le serveur renvoie un entier.
//
// ⚠️ C'EST ICI QUE VIT LE SECRET, ET NULLE PART AILLEURS. Le calcul aurait pu se
// faire dans le navigateur : il aurait fallu y livrer les cinq critères, donc la
// réponse, dans le bundle de la page. La spec (§15) demande d'éviter les
// spoilers accidentels et triviaux — l'onglet « Sources » d'un navigateur en est
// un. Un aller-retour par essai est le prix, et il est modeste : le joueur en
// fait dix ou vingt, pas mille.
//
// Ce qu'on ne prétend PAS faire : empêcher quelqu'un de poster les 193 pays pour
// trouver le 5/5 sans jouer. La spec le dit (§15) — l'objectif n'est pas un
// anti-triche militaire. Qui veut se gâcher le jeu y arrivera toujours.

export const runtime = "nodejs";
/** Rien à mettre en cache : chaque essai est une question différente. */
export const dynamic = "force-dynamic";

const refus = (quoi: string, code = 400) => NextResponse.json({ erreur: quoi }, { status: code });

export async function POST(req: Request) {
  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return refus("corps illisible");
  }
  const { jour, pays, locale, partie } = (corps ?? {}) as Record<string, unknown>;

  if (typeof pays !== "string" || !PAYS_PAR_ID[pays]) return refus("pays inconnu");
  if (typeof jour !== "number" || !Number.isInteger(jour) || jour < 1) return refus("journée invalide");

  // ⚠️ ON ACCEPTE UNE JOURNÉE PASSÉE, JAMAIS UNE FUTURE.
  //
  //  · passée : c'est le cas de la partie commencée à 23 h 58 et finie à 0 h 03
  //    (§14). Renvoyer le score du NOUVEAU jour à un joueur qui regarde encore la
  //    carte d'hier lui ferait des scores incohérents sans rien lui dire ; c'est
  //    aussi ce qui rendra les archives possibles sans changer ce contrat.
  //  · future : ce serait offrir le puzzle de demain à qui sait taper un nombre.
  const aujourdHui = numeroDuJour();
  if (jour > aujourdHui) return refus("journée à venir", 403);

  const { criteres } = journeeDe(jour);
  const score = scoreDe(PAYS_PAR_ID[pays], criteres);
  // La victoire se lit sur le SCORE, pas sur une comparaison avec la réponse
  // stockée : c'est la règle telle qu'elle est dite au joueur (« un seul pays
  // peut faire 5/5 »), et l'unicité de ce 5/5 est ce que le test garantit.
  const gagne = score === NB_CRITERES;

  const lang = typeof locale === "string" && ["fr", "en", "es", "pcm"].includes(locale) ? locale : "fr";
  const partieId = typeof partie === "string" && /^[a-z0-9]{6,24}$/.test(partie) ? partie : "?";

  journalise("essai", { jour, pays, score, partie: partieId });

  const reponse: ReponseEssai = { score };

  if (gagne) {
    // La révélation ne part QU'ICI, et seulement pour le pays qui vaut 5/5.
    reponse.revelation = {
      criteres: criteres.map((c) => ({
        libelle: enLangue(c.libelle, lang),
        eclairage: c.eclairage ? enLangue(c.eclairage, lang) : undefined,
        source: c.source,
      })),
      scores: scoresDeTous(criteres),
    };
    journalise("victoire", { jour, pays, partie: partieId });
  }

  return NextResponse.json(reponse);
}
