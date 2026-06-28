// Marque Placet (bulletin) — carré jaune, bloc encre, 3 barres. Même dessin que
// l'icône PWA/Slack (src/lib/pwaIcon.tsx) pour une identité cohérente partout.
// Présentational pur : utilisable en composant serveur comme client.
const INK = "#16213A";
const YELLOW = "#FFB627";

export default function PlacetMark({ size = 38 }: { size?: number }) {
  const inner = Math.round(size * 0.58);
  const ir = Math.max(3, Math.round(inner * 0.26));
  const barW = Math.round(inner * 0.54);
  const barH = Math.max(2, Math.round(size * 0.08));
  const gap = Math.max(1, Math.round(size * 0.055));
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flex: "none",
        border: `2.5px solid ${INK}`,
        borderRadius: Math.round(size * 0.29),
        background: YELLOW,
        boxShadow: `3px 3px 0 ${INK}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: inner,
          height: inner,
          borderRadius: ir,
          background: INK,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: barW, height: barH, borderRadius: barH, background: YELLOW }} />
        ))}
      </div>
    </div>
  );
}
