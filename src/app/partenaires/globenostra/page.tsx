import type { Metadata } from "next";
import PlacetMark from "@/components/scrutin/PlacetMark";
import { APP_URL } from "@/lib/voting/aiPrompt";

// Page partenaire GlobéNostra — servie sur placet.app/partenaires/globenostra
// ET sous placet.globenostra.com (rewrite par host du middleware). Code piloté ici.
// ⚠️ LA PALETTE A ÉTÉ CHOISIE LE 31/07/2026 POUR VOISINER AVEC LE SITE DU
// PARTENAIRE — fond clair, cartes douces arrondies, accent sarcelle, soulignés
// colorés ; logo et corail Placet gardés pour l'appel principal. Ce qu'elle
// imitait alors n'est pas vérifiable d'ici : `globenostra.com` et ses
// sous-domaines sont hors de portée du conteneur, le proxy de sortie répond 403
// au CONNECT. Les commentaires de couleur ci-dessous ne décrivent donc PAS l'état
// actuel de leur site : ce sont les intentions du jour où la page a été écrite.
// NEUTRALITÉ : les exemples portent sur des thèmes et des méthodes, jamais sur
// des personnes ou des partis — le contenu de positionnement relève de GlobéNostra.
const BG = "#F1F3F7"; // fond clair GlobéNostra
const CARD = "#FFFFFF";
const EDGE = "#E3E6EE"; // bordures douces
const TITLE = "#1A2233"; // titres quasi noirs
const BODY = "#4A5468"; // texte courant
const MUTEDT = "#7A8399";
const TEAL = "#2A9D8F"; // accent sarcelle
const PURPLE = "#8B6FE8"; // second souligné
const BLUE = "#3D8BFD"; // troisième souligné
const CORAL = "#E23E3B"; // accent Placet
const display = "var(--font-display), 'Bricolage Grotesque', sans-serif";

export const metadata: Metadata = {
  // ⚠️ LE TITRE NE CO-SIGNE PLUS UNE THÈSE, ET C'EST LE POINT DE TOUT CE LOT.
  // « Placet × GlobéNostra — le mode de scrutin façonne le résultat » faisait de
  // cette thèse, par sa seule grammaire, une propriété du couple : ce qui suit le
  // tiret sous un « × » se lit comme le programme des deux. Or elle est celle de
  // PLACET SEUL — l'accueil la porte déjà en propre (« chaque décision a sa
  // méthode ») — et les modes de scrutin ne sont pas le centre de gravité de
  // GlobéNostra, dont le sujet est le positionnement politique.
  //
  // ⚠️ ET LA DESCRIPTION SE CORRIGE AVEC LUI, JAMAIS SANS. Les deux s'affichent
  // ENSEMBLE dans un résultat de recherche comme dans un aperçu de lien partagé,
  // et la page n'a pas d'`openGraph` : ce couple est donc littéralement tout ce
  // qu'un lecteur voit avant d'arriver. Corriger l'un en laissant l'autre poser
  // la même thèse sous la même co-signature ne ferme rien.
  title: "Placet, partenaire de GlobéNostra — essayez les méthodes de vote",
  description:
    "À l'approche de la présidentielle, essayez le jugement majoritaire, Condorcet et le vote par approbation sur des exemples neutres, sans inscription. L'analyse des positionnements, c'est chez GlobéNostra.",
  alternates: { canonical: `${APP_URL}/partenaires/globenostra` },
  robots: { index: true, follow: true },
};

// ⚠️ `inline-block` EST VOULU, ET DEUX AUTRES ÉCRITURES ONT ÉTÉ REGARDÉES AVANT
// DE LE GARDER. En `inline`, le `padding-bottom` ne pousse pas la ligne : la
// bordure du premier fragment BARRE le texte du second. En dégradé de fond, on
// obtient un trait par fragment, dont un coincé ENTRE les deux lignes. Les deux
// sont pires, et ça ne se voit qu'au rendu.
//
// ⚠️ LA CONTREPARTIE : ce span ne doit jamais contenir un texte qui se coupe. En
// `inline-block`, il prend alors toute la largeur et le trait file d'un bord à
// l'autre, lu comme un filet de séparation. C'est pour ça que le h1 ne souligne
// que « Une élection » et pas la proposition entière.
const underline = (color: string) => ({
  display: "inline-block",
  paddingBottom: 7,
  borderBottom: `3px solid ${color}`,
});

const demo = (title: string, desc: string, href: string, emoji: string, color: string) => (
  <a
    key={href}
    href={href}
    style={{
      display: "block",
      textDecoration: "none",
      color: TITLE,
      background: CARD,
      border: `1px solid ${EDGE}`,
      borderRadius: 14,
      padding: "18px 20px",
      boxShadow: "0 2px 10px rgba(26,34,51,0.06)",
    }}
  >
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: `${color}1F`,
        fontSize: 19,
      }}
    >
      {emoji}
    </span>
    <span style={{ display: "block", fontFamily: display, fontWeight: 800, fontSize: 17, marginTop: 12 }}>
      <span style={underline(color)}>{title}</span>
    </span>
    <span style={{ display: "block", fontSize: 13.5, color: BODY, marginTop: 10, lineHeight: 1.55 }}>{desc}</span>
    <span style={{ display: "inline-block", marginTop: 12, fontWeight: 700, fontSize: 13.5, color }}>Essayer →</span>
  </a>
);

export default function GlobenostraPartner() {
  const newUrl = (qs: string) => `${APP_URL}/new?${qs}&source=globenostra`;
  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(680px 420px at 72% 8%, rgba(61,139,253,0.10), transparent 70%), ${BG}`,
        color: BODY,
        fontFamily: "var(--font-body), sans-serif",
      }}
    >
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "36px 22px 90px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <a href={APP_URL} style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: TITLE }}>
            <PlacetMark size={38} />
            <span style={{ fontFamily: display, fontWeight: 800, fontSize: 22 }}>Placet</span>
          </a>
          <span style={{ fontFamily: display, fontWeight: 800, fontSize: 17, color: TEAL }}>× GlobéNostra</span>
        </div>

        {/* QUI FAIT QUOI, AVANT LA THÈSE.
        
            ⚠️ LE h1 EST UN ÉNONCÉ DE THÈSE POSÉ SOUS UN BANDEAU CO-MARQUÉ : sans
            rien entre les deux, il se lit comme la thèse des DEUX. Le partage
            était bien écrit sur cette page — l'encadré de neutralité, la carte du
            Votinator — mais toujours APRÈS, donc jamais pour le lecteur qui
            n'arrive pas jusqu'en bas. Deux phrases plates suffisent, et chaque
            moitié est vérifiable sans sortir du dépôt : `Home.subtitle` pour la
            première, `Home.partnerText` et le sujet du Votinator pour la seconde.
        
            ⚠️ CE N'EST PAS UNE CLAUSE D'EXCLUSIVITÉ : chacune dit une activité,
            pas un périmètre. On ne prétend pas savoir tout ce que fait le
            partenaire — le proxy du conteneur ne laisse pas voir son site. */}
        <p style={{ fontSize: 14, lineHeight: 1.6, color: MUTEDT, margin: "14px 0 0" }}>
          Placet fait voter un groupe et compte les voix. GlobéNostra explore les positionnements politiques.
        </p>

        <h1
          style={{
            fontFamily: display,
            fontWeight: 800,
            fontSize: "clamp(29px,5.2vw,46px)",
            letterSpacing: "-0.02em",
            lineHeight: 1.12,
            // La ligne « qui fait quoi » s'insère au-dessus : sans ce resserrage,
            // elle repousserait le titre d'une hauteur de ligne pleine hors du
            // premier écran.
            margin: "16px 0 0",
            color: TITLE,
          }}
        >
          <span style={underline(TEAL)}>Une élection</span>, c'est un choix — et une méthode.
        </h1>
        <p style={{ fontSize: 16.5, lineHeight: 1.65, maxWidth: "60ch", margin: "20px 0 0" }}>
          Le mode de scrutin façonne le résultat : avec les mêmes votants et les mêmes options, le majoritaire à deux
          tours, le jugement majoritaire ou Condorcet peuvent couronner des gagnants différents. À l'approche de la
          présidentielle, <strong style={{ color: TITLE }}>Placet</strong> vous met ces méthodes entre les mains : les
          trois questions ci-dessous sont nos démonstrations, à essayer pour de vrai, en deux clics, sans
          inscription.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,225px),1fr))", gap: 16, marginTop: 32 }}>
          {demo(
            "Jugement majoritaire",
            "Notez chaque priorité du prochain quinquennat de « À rejeter » à « Excellent » — la mention médiane gagne.",
            newUrl(
              "title=Quelle priorité pour le prochain quinquennat ?&options=💶 Pouvoir d'achat|🌍 Climat|🏥 Santé|🎓 Éducation|🛡️ Sécurité&method=majority_judgment&why=Le jugement majoritaire mesure l'adhésion réelle, pas seulement le premier choix",
            ),
            "⚖️",
            TEAL,
          )}
          {demo(
            "Condorcet",
            "Classez les modes de scrutin eux-mêmes : lequel gagne tous ses duels ?",
            newUrl(
              "title=Quel mode de scrutin préférez-vous ?&options=🥇 Majoritaire à deux tours|⚖️ Jugement majoritaire|✅ Vote par approbation|⚔️ Condorcet&method=condorcet&why=Condorcet désigne l'option qui bat toutes les autres en duel — le vrai consensus",
            ),
            "⚔️",
            PURPLE,
          )}
          {demo(
            "Vote par approbation",
            "Cochez tous les formats de débat qui vous conviennent — le plus approuvé l'emporte.",
            newUrl(
              "title=Quels formats de débat pour la campagne ?&options=🎤 Face-à-face|👥 Débat à plusieurs|❓ Questions citoyennes|📺 Émissions longues&method=approval&why=L'approbation révèle les options qui rassemblent",
            ),
            "✅",
            BLUE,
          )}
        </div>

        <div
          style={{
            fontSize: 13.5,
            lineHeight: 1.6,
            color: BODY,
            margin: "28px 0 0",
            background: CARD,
            border: `1px solid ${EDGE}`,
            borderLeft: `4px solid ${TEAL}`,
            borderRadius: 12,
            padding: "14px 16px",
            boxShadow: "0 2px 10px rgba(26,34,51,0.05)",
          }}
        >
          <strong style={{ color: TITLE }}>Neutralité.</strong> Placet est un outil : il n'exprime aucune préférence
          politique. Les exemples ci-dessus portent sur des thèmes et des méthodes, jamais sur des candidats ou des
          partis. Les contenus d'analyse des positionnements relèvent du projet GlobéNostra.
        </div>

        {/* LE VOTINATOR — le jeu de GlobéNostra, chez eux.
        
            ⚠️ CE N'EST PAS « L'AUTRE MOITIÉ D'UNE MÊME QUESTION », et cette
            formule — la mienne — a dû être retirée de l'écran comme d'ici. Elle
            installait un programme commun en deux moitiés, donc elle faisait des
            modes de scrutin un sujet PARTAGÉ, alors qu'ils sont la thèse de
            Placet seul. Laisser la phrase dans le code après l'avoir retirée de
            l'écran, c'est exactement le mécanisme par lequel une prémisse fausse
            se transmet d'agent en agent comme un fait.
        
            ⚠️ IL EST APRÈS L'ENCADRÉ DE NEUTRALITÉ, ET ÇA N'EST PAS UN DÉTAIL DE
            MISE EN PAGE. Cet encadré dit « les exemples CI-DESSUS portent sur des
            thèmes et des méthodes, jamais sur des candidats ou des partis » : le
            mot « ci-dessus » borne la promesse à NOS trois démonstrations. Poser
            le Votinator au-dessus la ferait couvrir un jeu qui montre, lui, le
            vote de chaque parti — et rendrait la phrase fausse. En dessous, elle
            reste vraie, et sa dernière ligne — « les contenus d'analyse des
            positionnements relèvent du projet GlobéNostra » — devient
            exactement l'introduction de ce bloc. La page avait prévu ce cas.
        
            ⚠️ ET ON NE LE PRÉSENTE JAMAIS COMME LE NÔTRE. C'est leur jeu, sur
            leur domaine, et c'est ce partage qui rend le lien tenable : Placet
            reste l'outil qui n'exprime aucune préférence, GlobéNostra porte
            l'analyse des positions. Le libellé le dit avant de dire quoi que ce
            soit d'autre.
        
            ⚠️ CE BLOC N'A PAS SA PLACE DANS LE CATALOGUE `/games`, et il ne
            faudra pas y revenir par confort. Trois raisons, dont une seule
            suffirait : `GameEntry.slug` est la valeur d'aiguillage de
            `scrutin_game_rooms.game` et toutes les vignettes pointent une
            `route` de notre domaine ; nos jeux déclarent une tranche d'âge
            « enfant » dans la politique de confidentialité ; et un jeu qui fait
            trancher sur des lois votées à l'Assemblée n'a rien à faire entre
            « Un par jour » et « Les enquêtes ». La porte des jeux est
            apolitique par construction. */}
        <div
          style={{
            marginTop: 22,
            background: CARD,
            border: `1px solid ${EDGE}`,
            borderRadius: 14,
            padding: "20px 22px",
            boxShadow: "0 2px 10px rgba(26,34,51,0.06)",
          }}
        >
          <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: TEAL }}>
            Chez GlobéNostra
          </span>
          <span style={{ display: "block", fontFamily: display, fontWeight: 800, fontSize: 20, color: TITLE, marginTop: 9 }}>
            <span style={underline(PURPLE)}>Et vous, comment auriez-vous voté ?</span>
          </span>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, margin: "16px 0 0" }}>
            Le <strong style={{ color: TITLE }}>Votinator</strong> vous soumet dix lois réellement votées à l'Assemblée
            pendant la législature en cours. Pour chacune : un résumé, les arguments pour, les arguments contre — et
            vous tranchez. À la fin, votre série est mise en regard de ce qu'ont voté les partis.
          </p>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: "12px 0 0", color: MUTEDT }}>
            Le Votinator est un jeu de GlobéNostra, servi sur leur domaine.{" "}
            <strong style={{ color: BODY }}>Placet ne fait pas ce travail-là</strong> : il compte des voix, il n'analyse
            pas de positions.
          </p>
          <a
            href="https://votinator.globenostra.com/"
            target="_blank"
            rel="noopener"
            style={{
              display: "inline-block",
              marginTop: 16,
              textDecoration: "none",
              fontFamily: display,
              fontWeight: 700,
              fontSize: 14.5,
              color: "#fff",
              background: PURPLE,
              padding: "11px 20px",
              borderRadius: 999,
              boxShadow: "0 3px 12px rgba(139,111,232,0.30)",
            }}
          >
            Ouvrir le Votinator →
          </a>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 30 }}>
          <a
            href={APP_URL}
            style={{
              textDecoration: "none",
              fontFamily: display,
              fontWeight: 700,
              fontSize: 15,
              background: CORAL,
              color: "#fff",
              padding: "13px 24px",
              borderRadius: 999,
              boxShadow: "0 3px 12px rgba(255,94,91,0.35)",
            }}
          >
            Découvrir Placet →
          </a>
          <a
            href={`${APP_URL}/methodes`}
            style={{
              textDecoration: "none",
              fontFamily: display,
              fontWeight: 700,
              fontSize: 15,
              background: TEAL,
              color: "#fff",
              padding: "13px 24px",
              borderRadius: 999,
              boxShadow: "0 3px 12px rgba(42,157,143,0.30)",
            }}
          >
            Comparer les 15 méthodes
          </a>
        </div>

        <p style={{ fontSize: 13, color: MUTEDT, marginTop: 36 }}>
          <a href="https://www.globenostra.com/applications" style={{ color: MUTEDT }}>
            ← Toutes les applications GlobéNostra
          </a>
        </p>
      </div>
    </div>
  );
}
