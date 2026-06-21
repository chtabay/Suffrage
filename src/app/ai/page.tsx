import Link from "next/link";
import type { Metadata } from "next";
import { publicMethodCatalog } from "@/lib/voting/methods";

export const metadata: Metadata = {
  title: "Suffrage pour les IA — générer un lien de vote",
  description:
    "Comment un assistant IA (ou un humain) génère une URL Suffrage qui ouvre un brouillon de scrutin pré-rempli : format, méthodes disponibles, exemples.",
};

const INK = "#16213A";
const CREAM = "#FBF6EC";
const MUTED = "#5b6379";
const CORAL = "#FF5E5B";
const display = "var(--font-display), 'Bricolage Grotesque', sans-serif";
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

const card = {
  background: "#fff",
  border: `2.5px solid ${INK}`,
  borderRadius: 16,
  padding: "18px 20px",
  boxShadow: `5px 5px 0 ${INK}`,
} as const;

const code = {
  fontFamily: mono,
  fontSize: 13,
  background: CREAM,
  border: `2px solid ${INK}`,
  borderRadius: 9,
  padding: "10px 12px",
  display: "block",
  overflowX: "auto" as const,
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-all" as const,
};

export default function AiDocPage() {
  const methods = publicMethodCatalog();
  return (
    <div style={{ minHeight: "100vh" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(6px)",
          background: "rgba(251,246,236,0.82)",
          borderBottom: `2.5px solid ${INK}`,
        }}
      >
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "14px 24px" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 11, textDecoration: "none", color: INK }}>
            <span
              style={{
                width: 38,
                height: 38,
                border: `2.5px solid ${INK}`,
                borderRadius: 11,
                background: "#FFB627",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                boxShadow: `3px 3px 0 ${INK}`,
              }}
            >
              🗳️
            </span>
            <span style={{ fontFamily: display, fontWeight: 800, fontSize: 21, letterSpacing: "-0.02em" }}>Scrutin</span>
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px 90px" }}>
        <h1 style={{ fontFamily: display, fontWeight: 800, fontSize: "clamp(30px,5vw,46px)", letterSpacing: "-0.03em", margin: 0 }}>
          Suffrage pour les assistants IA
        </h1>
        <p style={{ fontSize: 17, color: "#3a4258", lineHeight: 1.55, marginTop: 14, maxWidth: "62ch" }}>
          Suffrage transforme une décision de groupe en vote structuré. Tu peux générer un lien qui
          ouvre un <strong>brouillon pré-rempli</strong> : l&apos;utilisateur le relit, l&apos;ajuste,
          puis lance. Aucune authentification n&apos;est requise pour produire ce lien.
        </p>

        <h2 style={{ fontFamily: display, fontWeight: 800, fontSize: 24, marginTop: 34 }}>Format du lien</h2>
        <div style={{ ...card, marginTop: 12 }}>
          <code style={code}>
            https://suffrage.vercel.app/new?title=...&amp;description=...&amp;options=A|B|C&amp;media=urlA||urlC&amp;method=...&amp;deadline=...&amp;source=...&amp;why=...
          </code>
          <ul style={{ margin: "14px 0 0", paddingLeft: 18, fontSize: 14.5, lineHeight: 1.6, color: "#2c3447" }}>
            <li><b>title</b> — la question posée.</li>
            <li><b>description</b> — contexte facultatif (lieu, budget, échéance…), affiché sous la question et dans l&apos;aperçu de partage.</li>
            <li><b>options</b> — 2 à 8 options séparées par <code style={{ fontFamily: mono }}>|</code> (ex. <code style={{ fontFamily: mono }}>Italien|Japonais|Indien</code>).</li>
            <li><b>media</b> — facultatif : une URL http(s) d&apos;illustration par option (image, vidéo, doc), <b>dans le même ordre</b> que <code style={{ fontFamily: mono }}>options</code>, séparées par <code style={{ fontFamily: mono }}>|</code> (laisse vide une option sans illustration).</li>
            <li><b>method</b> — une clé du tableau ci-dessous (défaut : <code style={{ fontFamily: mono }}>simple_vote</code>).</li>
            <li><b>deadline</b> — date ISO 8601, ex. <code style={{ fontFamily: mono }}>2026-07-01T20:00</code> (optionnel, défaut : +7 jours).</li>
            <li><b>source</b> — ton nom (<code style={{ fontFamily: mono }}>claude</code>, <code style={{ fontFamily: mono }}>chatgpt</code>, <code style={{ fontFamily: mono }}>gemini</code>…) : affiché « Préparé avec … ».</li>
            <li><b>why</b> — justification (surtout du choix de méthode) : montrée à l&apos;utilisateur pour la confiance.</li>
          </ul>
          <p style={{ fontSize: 13.5, color: CORAL, fontWeight: 700, marginTop: 12, marginBottom: 0 }}>
            ⚠️ N&apos;inclus aucune donnée sensible dans l&apos;URL (e-mails, liste d&apos;invités, identifiants, tokens).
          </p>
        </div>

        <h2 style={{ fontFamily: display, fontWeight: 800, fontSize: 24, marginTop: 34 }}>Méthodes disponibles</h2>
        <div style={{ ...card, marginTop: 12, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: CREAM, borderBottom: `2.5px solid ${INK}` }}>
                <th style={{ textAlign: "left", padding: "11px 14px", fontFamily: mono }}>method</th>
                <th style={{ textAlign: "left", padding: "11px 14px" }}>Méthode</th>
                <th style={{ textAlign: "left", padding: "11px 14px" }}>Quand l&apos;utiliser</th>
              </tr>
            </thead>
            <tbody>
              {methods.map((m) => (
                <tr key={m.key} style={{ borderBottom: `1.5px solid #E4DBC6` }}>
                  <td style={{ padding: "11px 14px", fontFamily: mono, fontWeight: 700, whiteSpace: "nowrap" }}>{m.key}</td>
                  <td style={{ padding: "11px 14px", fontWeight: 700, whiteSpace: "nowrap" }}>
                    {m.icon} {m.label}
                  </td>
                  <td style={{ padding: "11px 14px", color: "#2c3447" }}>{m.whenToUse}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={{ fontFamily: display, fontWeight: 800, fontSize: 24, marginTop: 34 }}>Exemples</h2>
        <div style={{ ...card, marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <code style={code}>
            https://suffrage.vercel.app/new?title=Resto%20ce%20soir&amp;options=Italien|Japonais|Indien&amp;method=majority_judgment&amp;source=claude&amp;why=Plusieurs%20options%2C%20on%20cherche%20un%20consensus
          </code>
          <code style={code}>
            https://suffrage.vercel.app/new?title=Date%20du%20s%C3%A9minaire&amp;options=Juin|Septembre|Octobre&amp;method=two_round
          </code>
        </div>

        <h2 style={{ fontFamily: display, fontWeight: 800, fontSize: 24, marginTop: 34 }}>API (agents)</h2>
        <div style={{ ...card, marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 14.5, color: "#2c3447", lineHeight: 1.55 }}>
            Si tu peux faire des requêtes HTTP, POST un brouillon structuré et reçois une URL prête à
            ouvrir (aucune authentification) :
          </p>
          <code style={code}>{`POST https://suffrage.vercel.app/api/poll-drafts
Content-Type: application/json

{
  "title": "On part où ce week-end ?",
  "description": "Budget 80 €/pers, départ vendredi soir.",
  "options": ["La montagne", "Le bord de mer", "La campagne"],
  "media": ["https://exemple.com/montagne.jpg", "", "https://exemple.com/campagne.jpg"],
  "method": "majority_judgment",
  "source": "mon-agent",
  "why": "Plusieurs options, un consensus est recherché"
}`}</code>
          <code style={code}>{`{ "draft_url": "https://suffrage.vercel.app/new?title=..." }`}</code>
        </div>

        <p style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.55, marginTop: 28 }}>
          Pour un scrutin fermé (liste de votants, accès restreint), passe par l&apos;interface :
          ces réglages ne se configurent pas par URL.
        </p>
      </div>
    </div>
  );
}
