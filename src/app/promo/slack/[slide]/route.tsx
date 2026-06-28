import { ImageResponse } from "next/og";

// Visuels promo pour la vitrine Slack (App Images, 1600×1000). En anglais (langue
// de la fiche). Téléchargeables : /promo/slack/hero · /flow · /methods.
const W = 1600;
const H = 1000;
const INK = "#16213A";
const YELLOW = "#FFB627";
const CREAM = "#FBF6EC";
const MUTE = "#aeb6c6";

function Logo() {
  return (
    <div
      style={{
        display: "flex",
        width: 132,
        height: 132,
        background: YELLOW,
        borderRadius: 30,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 80,
          height: 80,
          background: INK,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: 42, height: 9, background: YELLOW, borderRadius: 4, margin: 3 }} />
        <div style={{ width: 42, height: 9, background: YELLOW, borderRadius: 4, margin: 3 }} />
        <div style={{ width: 42, height: 9, background: YELLOW, borderRadius: 4, margin: 3 }} />
      </div>
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginTop: 44 }}>
      <div
        style={{
          display: "flex",
          width: 76,
          height: 76,
          borderRadius: 38,
          background: YELLOW,
          alignItems: "center",
          justifyContent: "center",
          fontSize: 42,
          fontWeight: 800,
          color: INK,
        }}
      >
        {n}
      </div>
      <div style={{ display: "flex", fontSize: 46, color: INK, marginLeft: 40 }}>{text}</div>
    </div>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <div
      style={{
        display: "flex",
        border: `3px solid ${YELLOW}`,
        borderRadius: 60,
        padding: "16px 34px",
        margin: "0 22px 26px 0",
        fontSize: 38,
        color: YELLOW,
      }}
    >
      {text}
    </div>
  );
}

const frame = (bg: string) =>
  ({
    width: W,
    height: H,
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center" as const,
    background: bg,
    padding: "0 120px",
  });

function hero() {
  return (
    <div style={frame(INK)}>
      <Logo />
      <div style={{ display: "flex", fontSize: 98, fontWeight: 800, color: CREAM, marginTop: 50, lineHeight: 1.05 }}>
        Real votes, right in Slack.
      </div>
      <div style={{ display: "flex", fontSize: 40, color: MUTE, marginTop: 30 }}>
        No more show-of-hands polls. Pick a real method, vote, get the result in the channel.
      </div>
      <div style={{ display: "flex", fontSize: 34, color: YELLOW, fontWeight: 700, marginTop: 60 }}>placet.app</div>
    </div>
  );
}

function flow() {
  return (
    <div style={frame(CREAM)}>
      <div style={{ display: "flex", fontSize: 76, fontWeight: 800, color: INK }}>How it works</div>
      <Step n={1} text="/placet — ask the question" />
      <Step n={2} text="Everyone votes on the web — no account needed" />
      <Step n={3} text="The result comes back to the channel" />
    </div>
  );
}

function methods() {
  return (
    <div style={frame(INK)}>
      <div style={{ display: "flex", fontSize: 76, fontWeight: 800, color: CREAM }}>{'More than a "+1"'}</div>
      <div style={{ display: "flex", fontSize: 40, color: MUTE, marginTop: 26 }}>
        Pick the voting rule that fits your decision.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", marginTop: 56, maxWidth: 1360 }}>
        <Chip text="Approval voting" />
        <Chip text="Majority judgment" />
        <Chip text="Condorcet" />
        <Chip text="Two-round runoff" />
        <Chip text="Borda count" />
      </div>
    </div>
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ slide: string }> }) {
  const { slide } = await params;
  const content = slide === "flow" ? flow() : slide === "methods" ? methods() : hero();
  return new ImageResponse(content, { width: W, height: H });
}
