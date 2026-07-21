"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getMyBrand, upsertMyBrand } from "@/lib/db/brand";
import PlacetMark from "./PlacetMark";
import { CREAM, FONT_BODY, FONT_DISPLAY, INK, MUTED } from "./theme";

const field = {
  fontFamily: FONT_BODY,
  fontSize: 14,
  fontWeight: 600,
  padding: "10px 12px",
  border: `2px solid ${INK}`,
  borderRadius: 10,
  background: CREAM,
  outline: "none",
  boxSizing: "border-box",
  width: "100%",
} as const;

// Aperçu de l'en-tête brandé — reproduit exactement ce que verront les votants.
function HeaderPreview({ name, logoUrl, accent, poweredBy }: { name: string; logoUrl: string; accent: string; poweredBy: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [logoUrl]);
  const branded = Boolean(logoUrl || name);
  return (
    <div style={{ border: `2.5px solid ${INK}`, borderRadius: 12, overflow: "hidden", background: "rgba(251,246,236,0.9)" }}>
      {branded && accent && <div style={{ height: 5, background: accent }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", flexWrap: "wrap" }}>
        {branded ? (
          <>
            {logoUrl && !broken ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={name} onError={() => setBroken(true)} style={{ height: 30, maxWidth: 170, objectFit: "contain", display: "block" }} />
            ) : name ? (
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18, color: INK }}>{name}</div>
            ) : null}
            <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, color: MUTED, fontSize: 12, fontWeight: 700 }}>
              {poweredBy} <PlacetMark size={18} />
            </span>
          </>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <PlacetMark size={30} />
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>Placet</span>
          </span>
        )}
      </div>
    </div>
  );
}

export default function BrandSettings() {
  const t = useTranslations("MyPolls");
  const tv = useTranslations("Vote");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [url, setUrl] = useState("");
  const [accent, setAccent] = useState("#2A9D8F");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getMyBrand()
      .then((b) => {
        if (!b) return;
        setName(b.name ?? "");
        setLogoUrl(b.logoUrl ?? "");
        setUrl(b.url ?? "");
        if (b.accent) setAccent(b.accent);
        if (b.name || b.logoUrl) setOpen(true);
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await upsertMyBrand({ name, logoUrl, accent, url });
      setSaved(true);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: 14 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 13.5,
          cursor: "pointer",
          border: `2px solid ${INK}`,
          background: open ? INK : "transparent",
          color: open ? "#fff" : INK,
          padding: "8px 16px",
          borderRadius: 20,
        }}
      >
        {t("brandToggle")} {open ? "▴" : "▸"}
      </button>
      {open && (
        <div
          style={{
            marginTop: 12,
            background: "#fff",
            border: `2.5px solid ${INK}`,
            borderRadius: 16,
            padding: 18,
            boxShadow: `4px 4px 0 ${INK}`,
          }}
        >
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17 }}>{t("brandTitle")}</div>
          <div style={{ fontSize: 12.5, color: MUTED, fontWeight: 600, marginTop: 4, lineHeight: 1.45 }}>{t("brandSubtitle")}</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            <label style={{ fontWeight: 700, fontSize: 12.5, color: INK }}>{t("brandName")}</label>
            <input value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} maxLength={60} style={field} />

            <label style={{ fontWeight: 700, fontSize: 12.5, color: INK, marginTop: 4 }}>{t("brandLogo")}</label>
            <input
              value={logoUrl}
              onChange={(e) => { setLogoUrl(e.target.value); setSaved(false); }}
              placeholder="https://…/logo.svg"
              style={field}
            />
            <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.4 }}>{t("brandLogoHint")}</div>

            <label style={{ fontWeight: 700, fontSize: 12.5, color: INK, marginTop: 4 }}>{t("brandUrl")}</label>
            <input
              value={url}
              onChange={(e) => { setUrl(e.target.value); setSaved(false); }}
              placeholder="https://votre-site.com"
              style={field}
            />

            <label style={{ fontWeight: 700, fontSize: 12.5, color: INK, marginTop: 4 }}>{t("brandAccent")}</label>
            <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
              <input
                type="color"
                value={accent}
                onChange={(e) => { setAccent(e.target.value); setSaved(false); }}
                style={{ width: 46, height: 38, border: `2px solid ${INK}`, borderRadius: 9, background: "#fff", cursor: "pointer", padding: 2 }}
              />
              <input
                value={accent}
                onChange={(e) => { setAccent(e.target.value); setSaved(false); }}
                maxLength={9}
                style={{ ...field, width: 120, fontFamily: FONT_BODY }}
              />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: MUTED, marginBottom: 7 }}>{t("brandPreview")}</div>
            <HeaderPreview name={name} logoUrl={logoUrl} accent={accent} poweredBy={tv("poweredBy")} />
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="dc-lift"
            style={{
              marginTop: 16,
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 14,
              cursor: saving ? "default" : "pointer",
              border: `2.5px solid ${INK}`,
              background: saved ? "#1f8a4c" : INK,
              color: "#fff",
              padding: "11px 18px",
              borderRadius: 11,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? t("brandSaving") : saved ? t("brandSaved") : t("brandSave")}
          </button>
        </div>
      )}
    </div>
  );
}
