import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { getPollShareInfo } from "@/lib/db/pollMeta";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Placet";

const INK = "#16213A";
const CREAM = "#FBF6EC";
const CORAL = "#FF5E5B";
const YELLOW = "#FFB627";

export default async function OgImage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  const info = await getPollShareInfo(token);
  const t = await getTranslations({ locale, namespace: "Share" });
  const tm = await getTranslations({ locale, namespace: "Methods" });

  const question = (info?.question ?? t("fallbackQuestion")).slice(0, 90);
  const phase = info?.phase ?? "open";
  const method = info ? tm(`${info.methodKey}.name`) : t("methodFallback");
  const methodColor = info?.methodColor ?? CORAL;
  const optionCount = info?.options.length ?? 0;
  const ballotCount = info?.ballotCount ?? 0;
  const winner = info?.winner ?? null;

  const status =
    phase === "closed"
      ? { label: t("statusClosed"), bg: INK, fg: "#fff" }
      : phase === "scheduled"
        ? { label: t("statusScheduled"), bg: YELLOW, fg: INK }
        : { label: t("statusOpen"), bg: "#DEF3CE", fg: INK };

  const footer =
    phase === "closed"
      ? `${t("options", { count: optionCount })} · ${t("votes", { count: ballotCount })}`
      : t("options", { count: optionCount });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: CREAM,
          padding: 70,
          border: `24px solid ${INK}`,
        }}
      >
        {/* en-tête : logo + statut */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 64, height: 64, background: YELLOW, borderRadius: 16, border: `5px solid ${INK}` }} />
            <div style={{ display: "flex", fontSize: 38, fontWeight: 800, color: INK }}>Placet</div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 800,
              color: status.fg,
              background: status.bg,
              border: `4px solid ${INK}`,
              borderRadius: 40,
              padding: "8px 24px",
            }}
          >
            {status.label}
          </div>
        </div>

        {/* corps */}
        {winner ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 38 }}>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#5b6379" }}>{question}</div>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 800, color: CORAL, marginTop: 16 }}>{t("winner")}</div>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: INK, lineHeight: 1.05, marginTop: 6 }}>
              {`${winner.icon} ${winner.name}`.slice(0, 42)}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 66, fontWeight: 800, color: INK, lineHeight: 1.08, marginTop: 38 }}>
            {question}
          </div>
        )}

        {/* pied : méthode + compteurs */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: "auto" }}>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 700,
              color: "#fff",
              background: methodColor,
              border: `4px solid ${INK}`,
              borderRadius: 40,
              padding: "10px 26px",
            }}
          >
            {method}
          </div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: INK }}>{footer}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
