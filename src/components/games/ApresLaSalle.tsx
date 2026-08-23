"use client";

// LA FIN D'UNE PARTIE DE SALLE — fermer le cul-de-sac, sans voler la soirée.
//
// ⚠️ CE QU'UN NON-HÔTE VOYAIT À LA FIN D'UNE PARTIE : le podium, puis le pied de
// page en 12,5 px. Rien d'autre. `hostBar` rend `null` pour lui, et le bouton
// « Rejoindre la nouvelle partie » n'existe que si l'hôte a DÉJÀ relancé — ce
// qui, une soirée finie, n'arrive jamais. Sur les échecs, personne n'avait
// d'action, l'hôte compris. `GameShell` écrivait pourtant la règle dès le
// premier jour : « MAIS PAS UN CUL-DE-SAC ».
//
// ⚠️ ET LE BLOC NE PREND JAMAIS L'ACCENT. Les gens sont encore dans la même
// pièce : l'action de la soirée est de rejouer ENSEMBLE, et c'est elle qui doit
// rester la plus forte de l'écran. Ce bloc se pose en dessous, en cadre
// pointillé — la matière que le produit réserve déjà à ses offres discrètes
// (`InstallJeu`, `PontPlacet`). Un jeu solo servi en gros sous un podium
// disperserait une table qui vient de jouer.
//
// ⚠️ IL DIT D'ABORD CE QUI SE PASSE DANS LA SALLE, ENSUITE CE QU'ON PEUT FAIRE
// SEUL. Ce sont deux questions, et la première a priorité : une absence sans un
// mot se lit comme une panne, et le joueur part chercher ailleurs. Banalo en
// groupe avait déjà sa phrase ; Alibi avait la sienne TRADUITE EN QUATRE LANGUES
// ET JAMAIS APPELÉE, Rôdeurs, le Fantôme et les échecs n'en avaient aucune. Elle
// vit maintenant ici, en un seul exemplaire, parce que la situation est
// identique aux quatre endroits.
//
// ⚠️ ET LE JEU PROPOSÉ CONTINUE CELUI QU'ON VIENT DE FINIR, il n'est pas tiré au
// sort. On sort de Banalo en groupe → Banalo du jour, c'est-à-dire le MÊME jeu,
// seul, tous les jours. On sort d'une enquête ou d'une partie d'échecs → Cinq
// sur cinq, la déduction. La correspondance se lit sur la `famille` du
// catalogue, qui existe déjà et qui range par occasion : on ne pose pas une
// deuxième table de vérité à côté.
//
// ⚠️ CE BLOC N'EST PAS INSTRUMENTÉ, ET C'EST UN CHOIX. `PontPlacet` compte ses
// visites parce qu'il traverse l'entonnoir de Placet, qui existe déjà ; une
// navigation d'un jeu vers un autre n'a aucun compteur, et en fabriquer un pour
// douze joueurs coûterait plus que le bloc. À rouvrir le jour où la porte voit
// passer du monde.
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { gameBySlug } from "@/lib/games/catalog";
import type { GameSkin } from "@/lib/games/skin";

/** Le jeu quotidien qui prolonge une famille de salle. */
function compagnonDe(slug: string): "banalo-jour" | "pays" {
  // « accord » → le même jeu, seul. Le reste (enquêtes, stratégie) → la
  // déduction. Un jeu quotidien n'a pas de salle, donc n'arrive jamais ici.
  return gameBySlug(slug)?.famille === "accord" ? "banalo-jour" : "pays";
}

export default function ApresLaSalle({
  skin,
  jeu,
  attenteHote = false,
}: {
  skin: GameSkin;
  /** Le slug du jeu de SALLE qu'on vient de finir. */
  jeu: string;
  /**
   * Ce joueur n'a aucune action et l'hôte peut encore relancer — c'est-à-dire
   * qu'il n'est pas hôte et qu'aucune salle neuve n'est ouverte.
   */
  attenteHote?: boolean;
}) {
  const t = useTranslations("Games");
  const compagnon = compagnonDe(jeu);
  const quotidien = gameBySlug(compagnon);

  return (
    <>
      {/* ⚠️ LA PHRASE D'ATTENTE EST DEHORS DU CADRE, ET C'EST UNE CORRECTION
          D'ÉCRAN. Posée dedans, elle prenait la matière que le produit réserve à
          ses offres discrètes — donc elle se lisait comme le TITRE de l'offre
          qui suit, alors qu'elle parle de la SALLE. Elle occupe maintenant
          exactement la place où le bouton « Rejouer » se trouve pour l'hôte, et
          elle porte la mise en forme que Banalo en groupe lui donne déjà : même
          situation, même présentation, sur les cinq jeux.

          ⚠️ `role="status"` : elle apparaît quand la partie se termine, sans que
          le joueur ait rien fait. Un lecteur d'écran doit l'annoncer, et sans
          couper ce qu'il est en train de lire. */}
      {attenteHote ? (
        <div role="status" style={{ fontSize: 13.5, color: skin.muted, fontWeight: 600, textAlign: "center" }}>
          {t("apresSalleAttente")}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 4,
          padding: 14,
          border: `2px dashed ${skin.ink}33`,
          borderRadius: skin.radius,
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
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
            {t("apresSalleLabel")}
          </div>
          {/* Les deux clés sont écrites EN CLAIR de part et d'autre du ternaire :
              une clé choisie en variable échapperait au contrôle de parité. */}
          <p style={{ margin: 0, fontSize: 13.5, color: skin.muted, lineHeight: 1.45 }}>
            {compagnon === "banalo-jour" ? t("apresSalleBanalo") : t("apresSallePays")}
          </p>
        </div>

        {/* Un lien, mais une CIBLE DE DOIGT : 44 px de haut, comme partout où ce
            produit se tape sur un téléphone. Un lien de 13,5 px sous un podium
            serait une sortie qu'on rate deux fois sur trois. */}
        <Link
          href={compagnon === "banalo-jour" ? "/games/banalo-jour" : "/games/pays"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minHeight: 44,
            padding: "0 15px",
            justifySelf: "start",
            textDecoration: "none",
            fontFamily: skin.fontDisplay,
            fontWeight: 800,
            fontSize: 14.5,
            color: skin.ink,
            background: skin.paper,
            border: `${skin.border}px solid ${skin.ink}`,
            borderRadius: skin.radius - 4,
          }}
        >
          {/* L'emoji vient du CATALOGUE, jamais d'une seconde copie : c'est celui
              que le joueur a déjà vu sur la porte et sur l'accueil, et c'est à ça
              qu'il reconnaît le jeu. */}
          <span aria-hidden style={{ fontSize: 17 }}>
            {quotidien?.emoji}
          </span>
          {compagnon === "banalo-jour"
            ? t("apresSalleCta", { jeu: t("banalo-jour.name") })
            : t("apresSalleCta", { jeu: t("pays.name") })}
        </Link>
      </div>
    </>
  );
}
