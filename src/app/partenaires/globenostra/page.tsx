import type { Metadata } from "next";
import PlacetMark from "@/components/scrutin/PlacetMark";
import { APP_URL } from "@/lib/voting/aiPrompt";

// Page partenaire Globenostra — servie aussi sous placet.globenostra.com via le
// rewrite par host du middleware. Code et contenu pilotés ici (notre repo).
// Français en dur : l'audience (présidentielle française) est francophone.
// NEUTRALITÉ : les exemples portent sur des thèmes et des méthodes, jamais sur
// des personnes ou des partis — le contenu de positionnement relève de Globenostra.
const INK = "#16213A";
const CREAM = "#FBF6EC";
const CORAL = "#FF5E5B";
const display = "var(--font-display), 'Bricolage Grotesque', sans-serif";

export const metadata: Metadata = {
  title: "Placet × Globenostra — le mode de scrutin façonne le résultat",
  description:
    "À l'approche de la présidentielle, explorez comment la méthode de vote change le résultat : jugement majoritaire, Condorcet, approbation… Essayez sur des exemples neutres, sans inscription.",
  alternates: { canonical: `${APP_URL}/partenaires/globenostra` },
  robots: { index: true, follow: true },
};

const demo = (title: string, desc: string, href: string, emoji: string, color: string) => (
  <a
    key={href}
    href={href}
    style={{
      display: "block",
      textDecoration: "none",
      color: INK,
      background: "#fff",
      border: `2.5px solid ${INK}`,
      borderRadius: 16,
      padding: "16px 18px",
      boxShadow: `4px 4px 0 ${color}`,
    }}
  >
    <span style={{ fontSize: 22 }}>{emoji}</span>
    <span style={{ display: "block", fontFamily: display, fontWeight: 800, fontSize: 17, marginTop: 8 }}>{title}</span>
    <span style={{ display: "block", fontSize: 13.5, color: "#5a6178", marginTop: 5, lineHeight: 1.5 }}>{desc}</span>
    <span style={{ display: "inline-block", marginTop: 10, fontWeight: 700, fontSize: 13.5, color: CORAL }}>Essayer →</span>
  </a>
);

export default function GlobenostraPartner() {
  const newUrl = (qs: string) => `${APP_URL}/new?${qs}&source=globenostra`;
  return (
    <div style={{ minHeight: "100vh", background: CREAM, color: INK, fontFamily: "var(--font-body), sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 22px 90px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <a href={APP_URL} style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: INK }}>
            <PlacetMark size={36} />
            <span style={{ fontFamily: display, fontWeight: 800, fontSize: 21 }}>Placet</span>
          </a>
          <span style={{ fontFamily: display, fontWeight: 800, fontSize: 18, color: "#5a6178" }}>× Globenostra</span>
        </div>

        <h1 style={{ fontFamily: display, fontWeight: 800, fontSize: "clamp(30px,5.5vw,48px)", letterSpacing: "-0.03em", lineHeight: 1.05, margin: "30px 0 0" }}>
          Une élection, c'est un choix — <span style={{ color: CORAL }}>et une méthode.</span>
        </h1>
        <p style={{ fontSize: 17.5, lineHeight: 1.6, color: "#3d4356", maxWidth: "58ch", margin: "18px 0 0" }}>
          Le mode de scrutin façonne le résultat : avec les mêmes votants et les mêmes options, le majoritaire à deux
          tours, le jugement majoritaire ou Condorcet peuvent couronner des gagnants différents. À l'approche de la
          présidentielle, Placet vous met ces méthodes entre les mains — pour de vrai, en deux clics, sans inscription.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 14, marginTop: 30 }}>
          {demo(
            "Jugement majoritaire",
            "Notez chaque priorité du prochain quinquennat de « À rejeter » à « Excellent » — la mention médiane gagne.",
            newUrl(
              "title=Quelle priorité pour le prochain quinquennat ?&options=💶 Pouvoir d'achat|🌍 Climat|🏥 Santé|🎓 Éducation|🛡️ Sécurité&method=majority_judgment&why=Le jugement majoritaire mesure l'adhésion réelle, pas seulement le premier choix",
            ),
            "⚖️",
            "#17B8A6",
          )}
          {demo(
            "Condorcet",
            "Classez les modes de scrutin eux-mêmes : lequel gagne tous ses duels ?",
            newUrl(
              "title=Quel mode de scrutin préférez-vous ?&options=🥇 Majoritaire à deux tours|⚖️ Jugement majoritaire|✅ Vote par approbation|⚔️ Condorcet&method=condorcet&why=Condorcet désigne l'option qui bat toutes les autres en duel — le vrai consensus",
            ),
            "⚔️",
            "#9B5BD6",
          )}
          {demo(
            "Vote par approbation",
            "Cochez tous les formats de débat qui vous conviennent — le plus approuvé l'emporte.",
            newUrl(
              "title=Quels formats de débat pour la campagne ?&options=🎤 Face-à-face|👥 Débat à plusieurs|❓ Questions citoyennes|📺 Émissions longues&method=approval&why=L'approbation révèle les options qui rassemblent",
            ),
            "✅",
            "#2E8BFF",
          )}
        </div>

        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#5a6178", margin: "26px 0 0", borderLeft: `3px solid ${INK}`, paddingLeft: 12 }}>
          <strong style={{ color: INK }}>Neutralité.</strong> Placet est un outil : il n'exprime aucune préférence
          politique. Les exemples ci-dessus portent sur des thèmes et des méthodes, jamais sur des candidats ou des
          partis. Les contenus d'analyse des positionnements relèvent du projet Globenostra.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 30 }}>
          <a
            href={APP_URL}
            style={{ textDecoration: "none", fontFamily: display, fontWeight: 700, fontSize: 15.5, border: `2.5px solid ${INK}`, background: CORAL, color: "#fff", padding: "13px 22px", borderRadius: 12 }}
          >
            Découvrir Placet →
          </a>
          <a
            href={`${APP_URL}/methodes`}
            style={{ textDecoration: "none", fontFamily: display, fontWeight: 700, fontSize: 15.5, border: `2.5px solid ${INK}`, background: "#fff", color: INK, padding: "13px 22px", borderRadius: 12 }}
          >
            Comparer les 15 méthodes
          </a>
        </div>
      </div>
    </div>
  );
}
