"use client";

import { useTranslations } from "next-intl";
import { SYSTEMS, SYSTEM_ORDER } from "@/lib/voting/systems";
import { ASSIGN_METHODS, ASSIGN_METHOD_KEYS, type AssignMethodKey } from "@/lib/assign/methods";
import type { ScrutinController } from "@/lib/voting/useScrutin";
import { Btn } from "@/components/ui/kit";
import { Link } from "@/i18n/navigation";
import { systemToPublicMethod } from "@/lib/voting/methods";
import { FONT_DISPLAY, GREENTXT, INK, REDTXT, SUBINK } from "./theme";

/**
 * Petit lien vers la fiche approfondie (/methodes/<clé>) : la galerie sert à
 * CHOISIR, la fiche à COMPRENDRE. Un vrai <a href>, donc suivi par les moteurs.
 */
function DeepLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        textAlign: "center",
        marginTop: 9,
        fontSize: 12.5,
        fontWeight: 700,
        color: SUBINK,
        textDecoration: "underline",
      }}
    >
      {label} →
    </Link>
  );
}

export default function GalleryScreen({ ctrl }: { ctrl: ScrutinController }) {
  const { selectSystemRecipe, setOptionKind, setAssignMethod, go } = ctrl;
  const t = useTranslations("Gallery");
  const tm = useTranslations("Methods");
  const ta = useTranslations("Assign");
  const td = useTranslations("Deep");
  const startAssign = (key: AssignMethodKey) => {
    setOptionKind("assign");
    setAssignMethod(key);
    go("create");
  };
  return (
    <div className="pad" style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 90px" }}>
      <h1
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: "clamp(32px,5vw,52px)",
          letterSpacing: "-0.03em",
          margin: 0,
        }}
      >
        {t("title")}
      </h1>
      <p style={{ fontSize: 18, color: SUBINK, maxWidth: "60ch", margin: "14px 0 0", lineHeight: 1.5 }}>
        {t("subtitle")}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,290px),1fr))",
          gap: 20,
          marginTop: 32,
        }}
      >
        {SYSTEM_ORDER.map((key) => {
          const sys = SYSTEMS[key];
          return (
            <div
              key={key}
              style={{
                background: "#fff",
                border: `2.5px solid ${INK}`,
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: `5px 5px 0 ${sys.color}`,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  background: sys.color,
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  borderBottom: `2.5px solid ${INK}`,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 13,
                    border: `2.5px solid ${INK}`,
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 25,
                  }}
                >
                  {sys.icon}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 800,
                      fontSize: 20,
                      color: "#fff",
                      lineHeight: 1.05,
                      textShadow: "1.5px 1.5px 0 rgba(0,0,0,0.25)",
                    }}
                  >
                    {tm(`${key}.name`)}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.92)", marginTop: 2 }}>
                    {tm(`family.${key}`)}
                  </div>
                </div>
              </div>
              <div style={{ padding: "18px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 14.5, lineHeight: 1.5, color: "#2c3447" }}>{tm(`${key}.how`)}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 12,
                        color: GREENTXT,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        marginBottom: 7,
                      }}
                    >
                      {t("pros")}
                    </div>
                    {(tm.raw(`${key}.pros`) as string[]).map((p, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 12.8,
                          lineHeight: 1.4,
                          color: "#2c3447",
                          marginBottom: 6,
                          paddingLeft: 13,
                          position: "relative",
                        }}
                      >
                        <span style={{ position: "absolute", left: 0, color: GREENTXT }}>+</span>
                        {p}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 12,
                        color: REDTXT,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        marginBottom: 7,
                      }}
                    >
                      {t("cons")}
                    </div>
                    {(tm.raw(`${key}.cons`) as string[]).map((c, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 12.8,
                          lineHeight: 1.4,
                          color: "#2c3447",
                          marginBottom: 6,
                          paddingLeft: 13,
                          position: "relative",
                        }}
                      >
                        <span style={{ position: "absolute", left: 0, color: REDTXT }}>−</span>
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
                <Btn
                  variant="primary"
                  flat
                  className="dc-bright"
                  onClick={() => selectSystemRecipe(key)}
                  style={{ marginTop: 18, width: "100%", padding: 11, background: sys.color }}
                >
                  {t("launchWithMethod")}
                </Btn>
                <DeepLink href={`/methodes/${systemToPublicMethod(key) ?? key}`} label={td("learnMore")} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Second pilier : les méthodes d'affectation — même pédagogie des biais. */}
      <h2
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: "clamp(26px,4vw,38px)",
          letterSpacing: "-0.03em",
          margin: "56px 0 0",
        }}
      >
        🧩 {t("assignTitle")}
      </h2>
      <p style={{ fontSize: 17, color: SUBINK, maxWidth: "60ch", margin: "12px 0 0", lineHeight: 1.5 }}>
        {ta("methodSubtitle")}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,290px),1fr))",
          gap: 20,
          marginTop: 28,
        }}
      >
        {ASSIGN_METHOD_KEYS.map((key) => {
          const def = ASSIGN_METHODS[key];
          return (
            <div
              key={key}
              style={{
                background: "#fff",
                border: `2.5px solid ${INK}`,
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: `5px 5px 0 ${def.color}`,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  background: def.color,
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  borderBottom: `2.5px solid ${INK}`,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 13,
                    border: `2.5px solid ${INK}`,
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 25,
                  }}
                >
                  {def.icon}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 800,
                      fontSize: 20,
                      color: "#fff",
                      lineHeight: 1.05,
                      textShadow: "1.5px 1.5px 0 rgba(0,0,0,0.25)",
                    }}
                  >
                    {ta(`methods.${key}.name`)}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.92)", marginTop: 2 }}>
                    {ta(`methods.${key}.tagline`)}
                  </div>
                </div>
              </div>
              <div style={{ padding: "18px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 14.5, lineHeight: 1.5, color: "#2c3447" }}>{ta(`methods.${key}.how`)}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: GREENTXT, marginBottom: 7 }}>{t("pros")}</div>
                    {(ta.raw(`methods.${key}.pros`) as string[]).map((p, i) => (
                      <div key={i} style={{ fontSize: 12.8, lineHeight: 1.4, color: "#2c3447", marginBottom: 6, paddingLeft: 13, position: "relative" }}>
                        <span style={{ position: "absolute", left: 0, color: GREENTXT }}>+</span>
                        {p}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: REDTXT, marginBottom: 7 }}>{t("cons")}</div>
                    {(ta.raw(`methods.${key}.cons`) as string[]).map((c, i) => (
                      <div key={i} style={{ fontSize: 12.8, lineHeight: 1.4, color: "#2c3447", marginBottom: 6, paddingLeft: 13, position: "relative" }}>
                        <span style={{ position: "absolute", left: 0, color: REDTXT }}>−</span>
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
                <Btn
                  variant="primary"
                  flat
                  className="dc-bright"
                  onClick={() => startAssign(key)}
                  style={{ marginTop: "auto", width: "100%", padding: 11, background: def.color }}
                >
                  {t("launchAssign")}
                </Btn>
                <DeepLink href={`/methodes/${key}`} label={td("learnMore")} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
