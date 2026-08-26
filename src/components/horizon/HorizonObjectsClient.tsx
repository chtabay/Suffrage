"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { Link } from "@/i18n/navigation";
import PlacetMark from "@/components/scrutin/PlacetMark";
import { Card } from "@/components/ui/kit";
import { CORAL, CREAM, FONT_DISPLAY, INK, MUTED, YELLOW } from "@/components/scrutin/theme";
import { encodeHorizonFragment, parseHorizonFragment, type HorizonPayload } from "@/lib/horizon/horizon";

type ProductKind = "shirt" | "mug" | "poster" | "plaque" | "magnet" | "card";

const centered: CSSProperties = { display: "grid", placeItems: "center" };

function MiniQr({ value, size }: { value: string; size: number }) {
  return (
    <div style={{ ...centered, padding: Math.max(4, Math.round(size * .08)), background: "#fff" }}>
      <QRCodeSVG value={value} size={size} level="M" bgColor="#ffffff" fgColor={INK} />
    </div>
  );
}

function ProductVisual({ kind, qr, name }: { kind: ProductKind; qr: string; name: string }) {
  const src = `/horizon/objects/${kind === "card" ? "metal-card" : kind}.webp`;
  const overlayBase: CSSProperties = { position: "absolute", zIndex: 2, display: "grid", placeItems: "center" };
  let overlay: CSSProperties;
  let qrSize: number;

  if (kind === "shirt") {
    overlay = { ...overlayBase, left: "50%", top: "52%", transform: "translate(-50%,-50%)", gap: 4 };
    qrSize = 58;
  } else if (kind === "mug") {
    overlay = { ...overlayBase, left: "41%", top: "53%", transform: "translate(-50%,-50%)" };
    qrSize = 68;
  } else if (kind === "poster") {
    overlay = { ...overlayBase, left: "50%", top: "52%", transform: "translate(-50%,-50%)", gap: 7 };
    qrSize = 78;
  } else if (kind === "plaque") {
    overlay = { ...overlayBase, left: "54%", top: "48%", transform: "translate(-50%,-50%)", gridTemplateColumns: "1fr auto", gap: 10, width: 166 };
    qrSize = 62;
  } else if (kind === "magnet") {
    overlay = { ...overlayBase, left: "50%", top: "51%", transform: "translate(-50%,-50%)", gap: 6 };
    qrSize = 78;
  } else {
    overlay = { ...overlayBase, left: "52%", top: "50%", transform: "translate(-50%,-50%)", gridTemplateColumns: "1fr auto", gap: 10, width: 174 };
    qrSize = 64;
  }

  return (
    <div style={{ ...centered, minHeight: 270, padding: 14, background: CREAM, borderBottom: `2px solid ${INK}`, overflow: "hidden" }}>
      <div style={{ position: "relative", width: 250, height: 250 }}>
        <Image src={src} alt="" fill sizes="250px" style={{ objectFit: "contain" }} />
        <div style={overlay}>
          {(kind === "shirt" || kind === "poster" || kind === "magnet") && (
            <strong style={{ maxWidth: 104, fontFamily: FONT_DISPLAY, fontSize: kind === "shirt" ? 9 : 11, lineHeight: 1.05, textAlign: "center" }}>{name}</strong>
          )}
          {(kind === "plaque" || kind === "card") && (
            <strong style={{ fontFamily: FONT_DISPLAY, fontSize: 11, lineHeight: 1.05 }}>{name}</strong>
          )}
          <MiniQr value={qr} size={qrSize} />
        </div>
      </div>
    </div>
  );
}

export default function HorizonObjectsClient() {
  const t = useTranslations("Horizon");
  const [payload, setPayload] = useState<HorizonPayload | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const read = () => {
      setPayload(parseHorizonFragment(window.location.hash.slice(1)));
      setReady(true);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const fragment = payload ? encodeHorizonFragment(payload) : "";
  const horizonUrl = payload && typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname.replace(/\/objets$/, "")}#${fragment}`
    : "";
  const productTitle = payload ? (payload.title ?? t("defaultTitle", { name: payload.firstName })) : "";
  // Clés littérales : le contrôle de parité i18n doit pouvoir voir chaque texte.
  const products: Array<{ kind: ProductKind; title: string; text: string }> = [
    { kind: "shirt", title: t("objectsShirtTitle"), text: t("objectsShirtText") },
    { kind: "mug", title: t("objectsMugTitle"), text: t("objectsMugText") },
    { kind: "poster", title: t("objectsPosterTitle"), text: t("objectsPosterText") },
    { kind: "plaque", title: t("objectsPlaqueTitle"), text: t("objectsPlaqueText") },
    { kind: "magnet", title: t("objectsMagnetTitle"), text: t("objectsMagnetText") },
    { kind: "card", title: t("objectsMetalCardTitle"), text: t("objectsMetalCardText") },
  ];

  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(251,246,236,.94)", borderBottom: `2px solid ${INK}`, backdropFilter: "blur(8px)" }}>
        <div className="pad" style={{ maxWidth: 1040, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18 }}>
          <Link href="/" aria-label={t("backHome")} style={{ display: "inline-flex", alignItems: "center", gap: 11, color: INK, textDecoration: "none" }}>
            <PlacetMark size={36} /><strong style={{ fontFamily: FONT_DISPLAY, fontSize: 22, letterSpacing: "-.04em" }}>Placet</strong>
          </Link>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".09em", textTransform: "uppercase" }}>{t("objectsEyebrow")}</span>
        </div>
      </header>

      <main className="pad" style={{ maxWidth: 1040, margin: "0 auto", padding: "54px 24px 84px" }}>
        {!ready ? <Card><p style={{ margin: 0 }}>{t("loading")}</p></Card> : !payload ? (
          <Card accent={CORAL} padding="clamp(22px,5vw,34px)">
            <h1 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 34 }}>{t("objectsInvalidTitle")}</h1>
            <p style={{ margin: "10px 0 22px", color: MUTED }}>{t("objectsInvalidText")}</p>
            <Link href="/horizon" style={{ color: INK, fontWeight: 800, textUnderlineOffset: 3 }}>{t("objectsCreate")}</Link>
          </Card>
        ) : (
          <>
            <div style={{ maxWidth: 780, marginBottom: 34 }}>
              <span style={{ display: "inline-block", padding: "6px 10px", border: `2px solid ${INK}`, borderRadius: 999, background: YELLOW, fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>{t("objectsBadge")}</span>
              <h1 style={{ margin: "18px 0 12px", fontFamily: FONT_DISPLAY, fontSize: "clamp(42px,8vw,70px)", lineHeight: .96, letterSpacing: "-.055em" }}>{t("objectsTitle")}</h1>
              <p style={{ margin: 0, color: MUTED, fontSize: 17, lineHeight: 1.6 }}>{t("objectsIntro", { name: payload.firstName })}</p>
            </div>

            <div className="horizon-products-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 24 }}>
              {products.map((product) => (
                <Card key={product.kind} padding={0} accent={product.kind === "poster" || product.kind === "magnet" ? YELLOW : undefined} style={{ overflow: "hidden" }}>
                  <ProductVisual kind={product.kind} qr={horizonUrl} name={productTitle} />
                  <div style={{ padding: "20px 22px 22px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                      <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 23 }}>{product.title}</h2>
                      <span style={{ color: MUTED, fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>{t("objectsMock")}</span>
                    </div>
                    <p style={{ margin: "8px 0 0", color: MUTED, fontSize: 14, lineHeight: 1.55 }}>{product.text}</p>
                  </div>
                </Card>
              ))}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center", marginTop: 34 }}>
              <Link href={`/horizon#${fragment}`} style={{ display: "inline-flex", padding: "11px 18px", border: `2.5px solid ${INK}`, borderRadius: 11, background: INK, color: "#fff", fontFamily: FONT_DISPLAY, fontWeight: 700, textDecoration: "none", boxShadow: `4px 4px 0 ${CORAL}` }}>{t("objectsBack")}</Link>
              <p style={{ margin: 0, color: MUTED, fontSize: 13 }}>{t("objectsFootnote")}</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
