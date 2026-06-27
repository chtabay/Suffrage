import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Placet pour Slack — créez des votes dans vos canaux",
  description:
    "Ajoutez Placet à votre espace Slack : /scrutin construit un vote collaboratif dans le canal, on vote sur le web, le résultat revient automatiquement dans Slack.",
};

const INK = "#16213A";
const CREAM = "#FBF6EC";
const MUTED = "#5b6379";
const display = "var(--font-display), 'Bricolage Grotesque', sans-serif";

const card = {
  background: "#fff",
  border: `2.5px solid ${INK}`,
  borderRadius: 16,
  padding: "22px 24px",
  boxShadow: `6px 6px 0 ${INK}`,
} as const;

const STEPS: [string, string][] = [
  ["1. /scrutin", "Tapez « /scrutin Où déjeuner ? » (ou « /scrutin dates … » pour des créneaux) dans n'importe quel canal."],
  ["2. À plusieurs", "Tout le monde ajoute des options et choisit la méthode, directement dans le message."],
  ["3. On vote", "Au lancement, le canal reçoit le lien : chacun vote sur le web, sans créer de compte."],
  ["4. Résultat", "À la clôture (bouton ou échéance), le dépouillement et le gagnant sont postés dans le canal."],
];

export default function SlackInstallPage() {
  const clientId = process.env.SLACK_CLIENT_ID ?? "";
  const scope = "commands,chat:write,chat:write.public";
  const redirect = "https://placet.app/api/slack/oauth/callback";
  const installUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${encodeURIComponent(redirect)}`;

  return (
    <div style={{ minHeight: "100vh", background: CREAM }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "56px 24px 90px" }}>
        <Link href="/" style={{ textDecoration: "none", color: INK, fontFamily: display, fontWeight: 800, fontSize: 22 }}>
          🗳️ Placet
        </Link>

        <h1 style={{ fontFamily: display, fontWeight: 800, fontSize: "clamp(28px,5vw,42px)", letterSpacing: "-0.03em", marginTop: 22 }}>
          Des votes de groupe, dans Slack
        </h1>
        <p style={{ fontSize: 17, color: "#3a4258", lineHeight: 1.55, marginTop: 12, maxWidth: "54ch" }}>
          Ajoutez <strong>Placet</strong> à votre espace Slack. Une commande <code>/scrutin</code> construit le vote
          avec votre équipe ; le vote se déroule sur le web (avec de vraies méthodes : approbation, jugement
          majoritaire, Condorcet…) et le résultat revient dans le canal.
        </p>

        <div style={{ marginTop: 26 }}>
          {clientId ? (
            <a href={installUrl} aria-label="Ajouter Placet à Slack">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Add to Slack"
                height="48"
                width="172"
                src="https://platform.slack-edge.com/img/add_to_slack.png"
                srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x"
              />
            </a>
          ) : (
            <p style={{ color: "#FF5E5B", fontWeight: 700 }}>Installation indisponible (configuration en cours).</p>
          )}
        </div>

        <div style={{ ...card, marginTop: 30 }}>
          {STEPS.map(([t, d], i) => (
            <div key={t} style={{ display: "flex", gap: 14, padding: i ? "14px 0 0" : 0 }}>
              <div style={{ fontFamily: display, fontWeight: 800, fontSize: 15, color: INK, minWidth: 92 }}>{t}</div>
              <div style={{ fontSize: 14.5, color: "#2c3447", lineHeight: 1.5 }}>{d}</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.55, marginTop: 22 }}>
          Placet demande les permissions minimales (<code>commands</code>, <code>chat:write</code>) pour poster et
          mettre à jour les messages de vote. Les bulletins restent sur le web ; aucun votant n&apos;a besoin de
          compte. Tapez <code>/scrutin aide</code> dans Slack à tout moment.
        </p>
      </div>
    </div>
  );
}
