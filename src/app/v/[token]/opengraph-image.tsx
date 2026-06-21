import { ImageResponse } from "next/og";
import { getPollMeta } from "@/lib/db/pollMeta";
import { describeRecipe } from "@/lib/voting/engine";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Vote Scrutin";

export default async function OgImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const meta = await getPollMeta(token);
  const question = (meta?.question ?? "Votez vraiment comme il faut").slice(0, 120);
  const method = meta ? describeRecipe(meta.recipe).name : "Scrutin";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#FBF6EC",
          padding: 80,
          border: "24px solid #16213A",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
          <div style={{ width: 70, height: 70, background: "#FFB627", borderRadius: 18, border: "5px solid #16213A" }} />
          <div style={{ fontSize: 40, fontWeight: 800, color: "#16213A" }}>Scrutin</div>
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, color: "#16213A", lineHeight: 1.06 }}>{question}</div>
        <div style={{ display: "flex", marginTop: 36 }}>
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: "#fff",
              background: "#FF5E5B",
              border: "4px solid #16213A",
              borderRadius: 40,
              padding: "12px 28px",
            }}
          >
            {method}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
