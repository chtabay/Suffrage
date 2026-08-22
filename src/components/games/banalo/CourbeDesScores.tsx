"use client";

// LA COURBE DES SCORES — où se posent les JOUEURS, et où l'on est dedans.
//
// La question vient d'un joueur, telle quelle : « comment on sait si on est bien
// placés ? ». L'écran répondait déjà par un centile et un rang.
//
// ⚠️ ET POURTANT CE N'EST PAS UN DOUBLON, C'EST MESURÉ. Un centile est un RANG,
// donc uniforme par construction : il ne peut PAS dire si la foule s'est serrée
// ou éparpillée. Simulé à 3 000 joueurs sur deux journées de nature opposée, la
// distribution des scores prend deux formes INVERSES — bosse en haut sur un
// thème serré (0/0/1/3/5/13/18/25/22/13 % des joueurs), bosse en bas sur un
// thème ouvert (11/19/18/13/14/11/8/3/1/0 %). Deux joueurs au 50e centile de ces
// deux journées ne sont pas du tout dans la même situation. C'est cette densité
// que la courbe ajoute, et elle seule.
//
// ⚠️ ELLE NE SORT QUE SUR LA JOURNÉE ARRÊTÉE (`JourneePrecedente`), et pas sur
// l'écran du jour. Trois raisons, dans l'ordre de force : en journée ouverte les
// sommes gonflent toute la journée, donc deux lectures du même dépôt donnent
// deux images ; l'écran du jour porte déjà sept blocs et le huitième repousserait
// la seule offre de l'après-partie ; et sur une foule de six votants — mesuré, la
// journée 2 — un histogramme ne serait pas grossier mais TROMPEUR, il dessinerait
// une forme là où il n'y a rien. Un chiffre grossier reste vrai ; un dessin
// grossier ment.
//
// ⚠️ ET ELLE N'EXISTE PAS POUR LE FORMAT CHIFFRÉ, par démonstration et non par
// oubli : là-bas `score = 100 − 100·log₁₀(facteur)` et le facteur est le rapport
// à la médiane, donc l'histogramme des scores est celui des RÉPONSES replié
// autour de la médiane. `RepartitionDuJour` montre déjà la version dépliée, avec
// un axe portant de vrais nombres et deux repères — dont l'un dégénérerait ici,
// la médiane valant 100 par construction.
import { useTranslations } from "next-intl";
import { UNANIMO_SKIN as skin } from "@/lib/games/skin";
import type { Courbe } from "@/lib/db/banalo";

// Alignée sur la bande de concentration (64) : trois bandes à trois hauteurs
// voisines, l'écart était trop faible pour vouloir dire quelque chose et trop
// grand pour être un hasard.
const HAUTEUR = 64;

export default function CourbeDesScores({ courbe, votants }: { courbe: Courbe; votants: number }) {
  const t = useTranslations("BanaloJour");
  const max = Math.max(1, ...courbe.seaux);

  return (
    <div style={{ marginTop: 14 }}>
      <p
        style={{
          fontFamily: skin.fontDisplay,
          fontWeight: 800,
          fontSize: 12,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: skin.muted,
          margin: "0 0 8px",
        }}
      >
        {t("courbeTitre")}
      </p>

      <div
        role="img"
        aria-label={t("courbeAlt", { n: votants })}
        style={{ display: "flex", alignItems: "flex-end", gap: 3, height: HAUTEUR }}
      >
        {courbe.seaux.map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              // ⚠️ PLANCHER DE 3 px SUR LES BARRES NON VIDES, ZÉRO SUR LES VIDES.
              // Repris tel quel de `RepartitionDuJour` : une barre d'un joueur
              // sur trois mille tombe sous le pixel et disparaît, et la bande
              // dirait alors « personne n'a fait ce score », ce qui est faux. Un
              // seau VIDE, lui, reste à zéro — c'est un vrai creux.
              height: v === 0 ? 0 : Math.max(3, Math.round((HAUTEUR * v) / max)),
              borderRadius: 3,
              // ⚠️ LE REPÈRE EST UNE BARRE PLEINE, JAMAIS UN CADRE — même leçon
              // que la bande des nombres : un contour sur la plus haute barre
              // fait un trou rectangulaire, et l'œil lit « il manque quelque
              // chose » au lieu de « c'est vous ».
              // ⚠️ L'ACCENT, PAS L'ENCRE — vu à l'écran. Dans la MÊME carte, la
              // bande de concentration peint déjà les mots du joueur en accent
              // violet ; un repère à l'encre juste au-dessus apprenait au
              // lecteur une clé que la bande suivante contredisait aussitôt.
              // (`RepartitionDuJour` garde encre = vous / accent = la foule :
              // elle sert le format chiffré et ne partage jamais un écran avec
              // celle-ci.)
              background: i === courbe.mien ? skin.accent : `${skin.ink}2E`,
            }}
          />
        ))}
      </div>

      {/* L'AXE. Deux nombres suffisent : le pire et le meilleur score du jour.
          Sans eux la bande est jolie et muette — on voit une forme, on ne sait
          pas de quels nombres elle parle. Les bords s'accrochent au bord, sinon
          ils se font couper (vu à l'écran sur la bande des nombres). */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
          paddingTop: 4,
          borderTop: `1.5px solid ${skin.ink}33`,
          fontSize: 10.5,
          fontWeight: 700,
          color: skin.muted,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span>{t("motsScoreCourt", { n: courbe.bas })}</span>
        <span>{t("motsScoreCourt", { n: courbe.haut })}</span>
      </div>

      {/* LA LÉGENDE. ⚠️ PAS DÉCORATIVE : sans elle la couleur porte seule
          l'information, et c'est la règle que la chaleur du score s'impose déjà
          (`chaleur.ts`). Une seule clé ici, écrite EN CLAIR. */}
      <p style={{ display: "flex", alignItems: "center", gap: 6, margin: "8px 0 0", fontSize: 12, color: skin.muted }}>
        <span aria-hidden style={{ width: 11, height: 11, borderRadius: 3, background: skin.accent, flex: "none" }} />
        {t("courbeVous")}
      </p>

      {/* ⚠️ LA PHRASE QUI PORTE L'ÉCHELLE, comme la couverture sous la bande de
          concentration. Sans elle, cinq barres donnent exactement la même image
          à onze joueurs et à trois mille — or c'est la DENSITÉ qu'on est venu
          montrer, et une densité sans son effectif n'est pas une densité. */}
      <p style={{ margin: "4px 0 0", fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
        {t("courbeFoule", { n: votants })}
      </p>
    </div>
  );
}
