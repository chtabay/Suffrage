import type { Metadata } from "next";
import PlacetMark from "@/components/scrutin/PlacetMark";
import { APP_URL } from "@/lib/voting/aiPrompt";

// Page partenaire GlobéNostra — servie sur placet.app/partenaires/globenostra
// ET sous placet.globenostra.com (rewrite par host du middleware). Code piloté ici.
// DA alignée sur le SITE GlobéNostra (fond clair, cartes douces arrondies, accent
// sarcelle, soulignés colorés par rubrique — violet/sarcelle/bleu), logo et corail
// Placet conservés pour le CTA principal.
// NEUTRALITÉ : les exemples portent sur des thèmes et des méthodes, jamais sur
// des personnes ou des partis — le contenu de positionnement relève de GlobéNostra.
const BG = "#F1F3F7"; // fond clair GlobéNostra
const CARD = "#FFFFFF";
const EDGE = "#E3E6EE"; // bordures douces
const TITLE = "#1A2233"; // titres quasi noirs
const BODY = "#4A5468"; // texte courant
const MUTEDT = "#7A8399";
const TEAL = "#2A9D8F"; // accent sarcelle (bouton Login GlobéNostra)
const PURPLE = "#8B6FE8"; // souligné « Art »
const BLUE = "#3D8BFD"; // souligné « Science »
const CORAL = "#E23E3B"; // accent Placet
const display = "var(--font-display), 'Bricolage Grotesque', sans-serif";

export const metadata: Metadata = {
  title: "Placet × GlobéNostra — le mode de scrutin façonne le résultat",
  description:
    "À l'approche de la présidentielle, explorez comment la méthode de vote change le résultat : jugement majoritaire, Condorcet, approbation… Essayez sur des exemples neutres, sans inscription.",
  alternates: { canonical: `${APP_URL}/partenaires/globenostra` },
  robots: { index: true, follow: true },
};

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

        <h1
          style={{
            fontFamily: display,
            fontWeight: 800,
            fontSize: "clamp(29px,5.2vw,46px)",
            letterSpacing: "-0.02em",
            lineHeight: 1.12,
            margin: "30px 0 0",
            color: TITLE,
          }}
        >
          <span style={underline(TEAL)}>Une élection, c'est un choix</span> — et une méthode.
        </h1>
        <p style={{ fontSize: 16.5, lineHeight: 1.65, maxWidth: "60ch", margin: "20px 0 0" }}>
          Le mode de scrutin façonne le résultat : avec les mêmes votants et les mêmes options, le majoritaire à deux
          tours, le jugement majoritaire ou Condorcet peuvent couronner des gagnants différents. À l'approche de la
          présidentielle, <strong style={{ color: TITLE }}>Placet</strong> vous met ces méthodes entre les mains — pour
          de vrai, en deux clics, sans inscription.
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
