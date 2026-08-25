"use client";

// LA JOURNÉE PRÉCÉDENTE DE CINQ SUR CINQ — un bouton, et le classement arrêté.
//
// Demandé : « même chose dans 5 sur 5, un bouton pour avoir les données de la
// journée précédente ». Le jeu n'avait AUCUNE relecture de la veille : ses trois
// modales sont la méthode, l'intro du jour et les pictos, et une partie finie
// disparaissait avec sa journée.
//
// ⚠️ IL NE DEMANDE RIEN À LA BASE POUR SAVOIR QUELLE JOURNÉE MONTRER,
// contrairement à Banalo. Là-bas les réponses vivent en base, donc seule la base
// sait ce que ce joueur a joué (`scrutin_banalo_derniere`). Ici le résumé des
// victoires vit dans le navigateur (`placet.pays.resultats`, la seule mémoire
// longue du jeu) : on y lit la dernière journée gagnée AVANT aujourd'hui, sans
// un aller-retour de plus.
//
// ⚠️ CONSÉQUENCE ASSUMÉE : sur un appareil neuf, ce bloc ne sort pas, même pour
// un joueur connecté dont les parties sont rattachées à son compte. Le rendre
// exact partout demanderait une fonction « dernière journée jouée » côté base,
// c'est-à-dire le chemin de Banalo — pour un bloc de relecture, le prix n'en
// vaut pas la peine tant que personne ne l'a signalé.
//
// ⚠️ IL EST SOUS LE TITRE DE LA PAGE, ET IL TIENT EN UNE LIGNE. Demandé deux
// fois, la seconde en toutes lettres : « l'information de la journée précédente
// est-elle bien en petit à côté du titre de la page ? ». Elle ne l'était pas —
// mesuré, elle était 1 507 px plus bas, soit quatre écrans de téléphone. Je
// l'avais posée dans une carte en comprenant « le titre de la CARTE ». Reprise
// une troisième fois sur « un peu plus visible » : le bon endroit était trouvé,
// mais elle se fondait dans la consigne grise juste au-dessus.
//
// ⚠️ ET IL N'ATTEND PLUS LA VICTOIRE, contrairement au tableau du jour. §16
// range les OFFRES après la révélation — compte, installation, pont vers Placet
// — parce qu'elles DEMANDENT quelque chose. Cette ligne ne demande rien : elle
// RACONTE, comme `SerieDuJour`, dont l'en-tête dit exactement pourquoi ça ne
// consomme aucune place de l'échelle. Et elle ne divulgue rien du jour : un rang
// de la veille ne réduit aucune recherche d'aujourd'hui.
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PAYS_SKIN as skin } from "@/lib/games/skin";
import { GLabel } from "@/components/games/ui";
import Modale from "@/components/games/Modale";
import ListeDuTableau from "@/components/games/ListeDuTableau";
import { monJetonPays } from "@/lib/games/pays/jeton";
import { lisResultats } from "@/lib/games/pays/local";
import { litTableauPays, maPosition, type RangPays } from "@/lib/db/pays";
import type { Tableau } from "@/lib/db/banalo";

/** Cinq lignes, comme chez Banalo : c'est une carte de relecture, pas l'écran du jour. */
const LIGNES = 5;

export default function JourneePrecedente({ jour }: { jour: number }) {
  const t = useTranslations("Pays");
  const [precedente, setPrecedente] = useState<{ jour: number; essais: number } | null>(null);
  const [tableau, setTableau] = useState<Tableau | null>(null);
  const [ouvert, setOuvert] = useState(false);
  /**
   * Ma place CE jour-là, parmi TOUS les joueurs.
   *
   * ⚠️ CE N'EST PAS LE RANG DU TABLEAU, et la différence est celle que le
   * produit refuse d'effacer : le tableau ne classe que les INSCRITS, donc y
   * lire « 1er » quand trente joueurs ont fait mieux serait un mensonge — c'est
   * pour ça qu'il n'imprime aucun numéro. `scrutin_game_pays_position` compte
   * la foule entière, et elle marche AVEC OU SANS COMPTE puisqu'elle prend le
   * jeton.
   */
  const [place, setPlace] = useState<RangPays | null>(null);

  // ⚠️ APRÈS LE MONTAGE. `lisResultats` touche le `localStorage` : le lire au
  // rendu serveur rendrait une liste vide, et l'hydratation la changerait.
  useEffect(() => {
    const passees = lisResultats().filter((r) => r.jour < jour);
    const derniere = passees[passees.length - 1];
    setPrecedente(derniere ? { jour: derniere.jour, essais: derniere.essais } : null);
  }, [jour]);

  useEffect(() => {
    if (!precedente) return;
    const jeton = monJetonPays();
    if (!jeton) return;
    let vivant = true;
    // ⚠️ UN SEUL INSCRIT SUFFIT : la journée est close, donc ce qu'on montre est
    // un relevé et non une récompense. L'écran du jour, lui, garde son plancher
    // de deux.
    void litTableauPays(jeton, precedente.jour, 1).then((tb) => {
      if (vivant) setTableau(tb);
    });
    void maPosition(precedente.jour).then((r) => {
      if (vivant) setPlace(r);
    });
    return () => {
      vivant = false;
    };
  }, [precedente]);

  const essaisEnMots = useMemo(() => (n: number) => t("tableau.essais", { n }), [t]);

  // ⚠️ RIEN À RELIRE, RIEN À MONTRER. Un bloc « vous n'avez pas joué hier » est
  // un reproche adressé à quelqu'un qui vient précisément de revenir.
  if (!precedente) return null;

  return (
    <>
      {/* ⚠️ EN PETIT SOUS LA CONSIGNE, MAIS PAS DANS SA GRISAILLE. Première
          version : 13 px en `muted`, posée à 10 px sous un paragraphe de 15,5 px
          lui aussi en `muted`, au même bord gauche — vu à l'écran, elle se lisait
          comme la QUATRIÈME LIGNE de la consigne, pas comme un objet à elle.
          « Un peu plus visible », donc : un blanc qui la détache, l'encre du
          produit sur la donnée, et l'accent sur le lien. Elle ne doit pour
          autant pas concurrencer le geste du jour — on vient chercher un pays,
          pas relire hier — d'où le petit corps conservé.

          ⚠️ UN FILET AU-DESSUS A ÉTÉ ESSAYÉ ET RETIRÉ : à cette finesse il ne se
          voyait pas, et il coûtait 11 px qui repoussaient la carte. Ce qui a
          rendu la ligne visible n'est pas un ornement, c'est son ENTRÉE. */}
      <p style={{ margin: "15px 0 0", fontSize: 13.5, lineHeight: 1.5, color: skin.ink }}>
        {/* ⚠️ L'EMOJI EST LE MARQUEUR DE LA LIGNE, et il est le MÊME chez Banalo :
            c'est le même objet dans les deux jeux, et deux glyphes différents en
            feraient deux choses. Il est `aria-hidden` — un lecteur d'écran lit
            déjà « votre dernière journée » juste après. */}
        <span aria-hidden style={{ marginRight: 5 }}>
          📅
        </span>
        {/* ⚠️ ELLE S'ANNONCE, ELLE NE COMMENCE PLUS PAR UN NUMÉRO NU. « Journée
            n° 7 » en gris était le premier mot que l'œil rencontrait : une
            étiquette terne, et surtout AMBIGUË — un rang posé sous la consigne
            d'une partie en cours se lit d'abord comme celui d'aujourd'hui, et le
            numéro ne lève cette ambiguïté que pour qui a lu celui de l'en-tête
            (n° 8) juste au-dessus. Le libellé du tiroir dit ce que c'est en
            trois mots, et le numéro n'est pas perdu : le tiroir le porte. */}
        <span style={{ color: skin.muted }}>{t("derniereTitre")}</span>
        {" · "}
        {/* ⚠️ LES DEUX CLÉS SONT ÉCRITES EN CLAIR, une par branche : une clé
            choisie en variable échapperait au contrôle de parité i18n. Et le
            rang ne va jamais sans sa foule — « 3e » ne veut pas dire la même
            chose sur six joueurs et sur trois mille. */}
        <strong style={{ color: skin.ink, fontWeight: 800 }}>
          {place && place.rang !== null
            ? t("dernierePlace", { rang: place.rang, n: place.joueurs })
            : t("tableau.essais", { n: precedente.essais })}
        </strong>
        {/* ⚠️ LE LIEN NE SORT QUE S'IL Y A QUELQUE CHOSE DERRIÈRE : un tiroir
            qui s'ouvre sur une carte vide est pire que pas de tiroir du tout. */}
        {tableau && tableau.lignes.length > 0 ? (
          <>
            {" · "}
            <button
              type="button"
              onClick={() => setOuvert(true)}
              style={{
                border: "none",
                background: "none",
                padding: 0,
                font: "inherit",
                // ⚠️ À L'ACCENT ET EN GRAS : c'est la seule chose actionnable
                // de la ligne, et en `muted` souligné elle avait exactement le
                // poids du numéro de journée qui la précède.
                color: skin.accent,
                fontWeight: 700,
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              {t("derniereBouton")}
            </button>
          </>
        ) : null}
      </p>

      {ouvert && tableau ? (
        <Modale
          skin={skin}
          titre={t("derniereTitre")}
          texte={t("numero", { n: precedente.jour })}
          fermer={() => setOuvert(false)}
          fermerLabel={t("derniereFermer")}
        >
          {/* ⚠️ « CETTE JOURNÉE EST CLOSE » DESCEND ICI. Sur la carte elle
              prenait deux lignes pour une information que le titre porte déjà
              (« votre DERNIÈRE journée ») ; dans le tiroir, elle qualifie le
              classement qu'on est en train de lire. Chez Banalo elle RESTE dans
              le résumé : là-bas c'est elle qui tient lieu de notification, et
              elle doit se lire sans rien ouvrir. */}
          <p style={{ margin: "0 0 12px", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
            {t("derniereClose")}
          </p>
          <GLabel skin={skin}>{t("derniereClassement")}</GLabel>
          <ListeDuTableau
            skin={skin}
            lignes={tableau.lignes}
            moi={tableau.moi}
            score={essaisEnMots}
            max={LIGNES}
            effectif={t("derniereInscrits", { n: tableau.inscrits })}
          />
        </Modale>
      ) : null}
    </>
  );
}
