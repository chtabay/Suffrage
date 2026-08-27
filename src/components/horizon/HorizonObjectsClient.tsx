"use client";

import type { CSSProperties, FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { submitHorizonOrder } from "@/app/[locale]/horizon/objets/actions";
import PlacetMark from "@/components/scrutin/PlacetMark";
import { Btn, Card } from "@/components/ui/kit";
import { CORAL, CREAM, FONT_DISPLAY, INK, MUTED, YELLOW } from "@/components/scrutin/theme";
import { encodeHorizonFragment, parseHorizonFragment, type HorizonPayload } from "@/lib/horizon/horizon";
import { getHorizonOrderUnitPriceCents, isFrenchDeliveryCountry, parseHorizonAddressSuggestions, type HorizonAddressSuggestion, type HorizonOrderProduct } from "@/lib/horizon/order";

type OptionKind = "size" | "format" | null;
type Variant = { id: string; label: string; src: string; color: string };
type Product = { kind: HorizonOrderProduct; title: string; text: string; optionKind: OptionKind; variants: Variant[] };

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 44,
  padding: "10px 12px",
  border: `2px solid ${INK}`,
  borderRadius: 9,
  background: "#fff",
  color: INK,
  font: "inherit",
  boxSizing: "border-box",
};

function ProductVisual({ product, variant, onOrder }: { product: Product; variant: Variant; onOrder: () => void }) {
  const t = useTranslations("Horizon");
  return (
    <button
      type="button"
      onClick={onOrder}
      aria-label={t("objectsOrderOpen", { product: product.title })}
      className="dc-lift"
      style={{ position: "relative", display: "block", width: "100%", padding: 0, border: 0, borderBottom: `2px solid ${INK}`, background: CREAM, cursor: "pointer", overflow: "hidden" }}
    >
      <span style={{ display: "block", position: "relative", width: "100%", aspectRatio: "1 / 1" }}>
        <Image src={variant.src} alt={t("objectsImageAlt", { product: product.title, variant: variant.label })} fill sizes="(max-width:600px) 100vw, 500px" style={{ objectFit: "cover" }} />
      </span>
      <span style={{ position: "absolute", right: 14, bottom: 14, padding: "8px 12px", border: `2px solid ${INK}`, borderRadius: 999, background: YELLOW, color: INK, fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 800, boxShadow: `3px 3px 0 ${INK}` }}>
        {t("objectsOrder")}
      </span>
    </button>
  );
}

function AddressField({ address, country, onChange }: { address: string; country: string; onChange: (value: string) => void }) {
  const t = useTranslations("Horizon");
  const [suggestions, setSuggestions] = useState<HorizonAddressSuggestion[]>([]);
  const [active, setActive] = useState(-1);
  const selected = useRef("");
  const inputId = "horizon-order-address";
  const listId = "horizon-address-suggestions";
  const france = isFrenchDeliveryCountry(country);

  useEffect(() => {
    const query = address.trim();
    if (!france || query.length < 3 || query === selected.current) {
      setSuggestions([]);
      setActive(-1);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ text: query, type: "StreetAddress", maximumResponses: "6" });
        const response = await fetch(`https://data.geopf.fr/geocodage/completion/?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error("address lookup failed");
        const next = parseHorizonAddressSuggestions(await response.json());
        setSuggestions(next);
        setActive(-1);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setSuggestions([]);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [address, france]);

  const choose = (item: HorizonAddressSuggestion) => {
    selected.current = item.fulltext;
    onChange(item.fulltext);
    setSuggestions([]);
    setActive(-1);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (current - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      choose(suggestions[active]);
    } else if (event.key === "Escape") {
      setSuggestions([]);
      setActive(-1);
    }
  };

  return (
    <div style={{ position: "relative", display: "grid", gridColumn: "1 / -1", gap: 6 }}>
      <label htmlFor={inputId} style={{ fontWeight: 800 }}>{t("objectsOrderAddress")}</label>
      <input
        id={inputId}
        name="address"
        required
        value={address}
        maxLength={240}
        autoComplete="street-address"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={suggestions.length > 0}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(event) => { selected.current = ""; onChange(event.target.value); }}
        onKeyDown={onKeyDown}
        style={inputStyle}
      />
      {suggestions.length > 0 && (
        <span id={listId} role="listbox" style={{ position: "absolute", zIndex: 5, top: 74, left: 0, right: 0, display: "grid", padding: 5, border: `2px solid ${INK}`, borderRadius: 10, background: "#fff", boxShadow: `5px 5px 0 ${INK}` }}>
          {suggestions.map((item, index) => (
            <button
              key={`${item.fulltext}-${index}`}
              id={`${listId}-${index}`}
              type="button"
              role="option"
              aria-selected={active === index}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(item)}
              style={{ padding: "10px 11px", border: 0, borderRadius: 7, background: active === index ? YELLOW : "transparent", color: INK, font: "inherit", fontWeight: 700, textAlign: "left", cursor: "pointer" }}
            >
              {item.fulltext}
            </button>
          ))}
        </span>
      )}
      <small style={{ color: MUTED, fontSize: 12, fontWeight: 500, lineHeight: 1.4 }}>{france ? t("objectsOrderAddressHint") : t("objectsOrderAddressManual")}</small>
    </div>
  );
}

function OrderDialog({ product, initialVariant, horizonUrl, onClose }: { product: Product; initialVariant: Variant; horizonUrl: string; onClose: () => void }) {
  const t = useTranslations("Horizon");
  const locale = useLocale();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [variantId, setVariantId] = useState(initialVariant.id);
  const [quantity, setQuantity] = useState(1);
  const [option, setOption] = useState(product.optionKind === "size" ? "M" : product.optionKind === "format" ? "A3" : "");
  const [step, setStep] = useState<1 | 2>(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [country, setCountry] = useState(t("objectsOrderCountryDefault"));
  const [address, setAddress] = useState("");
  const variant = product.variants.find((item) => item.id === variantId) ?? initialVariant;
  const unitPriceCents = getHorizonOrderUnitPriceCents(product.kind, option) ?? 0;
  const price = (cents: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    const result = await submitHorizonOrder({
      product: product.kind,
      variant: variant.id,
      quantity,
      option,
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      address,
      country: String(form.get("country") ?? ""),
      note: String(form.get("note") ?? ""),
      horizonUrl,
      locale,
      website: String(form.get("website") ?? ""),
    });
    setPending(false);
    if (result.ok) setReference(result.reference);
    else setError(t(result.error === "invalid" ? "objectsOrderInvalid" : result.error === "unavailable" ? "objectsOrderUnavailable" : "objectsOrderError"));
  }

  return (
    <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", padding: 16, background: "rgba(22,33,58,.72)", backdropFilter: "blur(5px)" }}>
      <div role="dialog" aria-modal="true" aria-labelledby="order-title" style={{ width: "min(720px,100%)", maxHeight: "calc(100vh - 32px)", overflowY: "auto", border: `3px solid ${INK}`, borderRadius: 20, background: CREAM, boxShadow: `9px 9px 0 ${CORAL}` }}>
        <div style={{ position: "sticky", top: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 18px", borderBottom: `2px solid ${INK}`, background: CREAM }}>
          <h2 id="order-title" style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 27 }}>{t("objectsOrderTitle", { product: product.title })}</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t("close")} style={{ width: 38, height: 38, border: `2px solid ${INK}`, borderRadius: 10, background: "#fff", color: INK, fontSize: 21, fontWeight: 900, cursor: "pointer" }}>×</button>
        </div>

        {reference ? (
          <div style={{ padding: "34px 24px 38px", textAlign: "center" }}>
            <span style={{ display: "inline-block", padding: "7px 11px", border: `2px solid ${INK}`, borderRadius: 999, background: YELLOW, fontWeight: 900 }}>{reference}</span>
            <h3 style={{ margin: "20px 0 8px", fontFamily: FONT_DISPLAY, fontSize: 34 }}>{t("objectsOrderSuccessTitle")}</h3>
            <p style={{ maxWidth: 480, margin: "0 auto 24px", color: MUTED, lineHeight: 1.6 }}>{t("objectsOrderSuccessText")}</p>
            <Btn onClick={onClose} variant="primary">{t("close")}</Btn>
          </div>
        ) : step === 1 ? (
          <div style={{ padding: 22 }}>
            <div className="horizon-order-grid" style={{ display: "grid", gridTemplateColumns: "190px minmax(0,1fr)", gap: 22, alignItems: "start" }}>
              <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", border: `2px solid ${INK}`, borderRadius: 12, overflow: "hidden", background: YELLOW }}>
                <Image src={variant.src} alt="" fill sizes="190px" loading="eager" style={{ objectFit: "cover" }} />
              </div>
              <div style={{ display: "grid", gap: 15 }}>
                <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>
                  {t("objectsOrderVariant")}
                  <select value={variantId} onChange={(event) => setVariantId(event.target.value)} style={inputStyle}>{product.variants.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
                </label>
                {product.optionKind === "size" && <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>{t("objectsOrderSize")}<select value={option} onChange={(event) => setOption(event.target.value)} style={inputStyle}>{["XS", "S", "M", "L", "XL", "XXL"].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>}
                {product.optionKind === "format" && <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>{t("objectsOrderFormat")}<select value={option} onChange={(event) => setOption(event.target.value)} style={inputStyle}><option value="A3">A3</option><option value="A2">A2</option></select></label>}
                <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>{t("objectsOrderQuantity")}<input type="number" min={1} max={10} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} style={inputStyle} /></label>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 18, marginTop: 22, padding: "15px 17px", border: `2px solid ${INK}`, borderRadius: 11, background: "#fff" }}>
              <strong>{t("objectsOrderTotal")}</strong>
              <strong style={{ fontFamily: FONT_DISPLAY, fontSize: 28 }}>{price(unitPriceCents * quantity)}</strong>
            </div>
            <p style={{ margin: "9px 2px 0", color: MUTED, fontSize: 12.5 }}>{t("objectsPriceShipping")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}><Btn type="button" variant="primary" onClick={() => setStep(2)}>{t("objectsOrderContinue")}</Btn><Btn type="button" onClick={onClose} variant="cream">{t("close")}</Btn></div>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 18, marginBottom: 20, padding: "13px 15px", border: `2px solid ${INK}`, borderRadius: 11, background: "#fff" }}>
              <span style={{ fontWeight: 800 }}>{product.title} · {variant.label}{option ? ` · ${option}` : ""} · × {quantity}</span>
              <strong style={{ flexShrink: 0, fontFamily: FONT_DISPLAY, fontSize: 22 }}>{price(unitPriceCents * quantity)}</strong>
            </div>
            <div className="horizon-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 15, marginTop: 20 }}>
              <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>{t("objectsOrderName")}<input name="name" required maxLength={80} autoComplete="name" style={inputStyle} /></label>
              <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>{t("objectsOrderEmail")}<input name="email" type="email" required maxLength={160} autoComplete="email" style={inputStyle} /></label>
              <AddressField address={address} country={country} onChange={setAddress} />
              <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>{t("objectsOrderCountry")}<input name="country" required value={country} maxLength={80} autoComplete="country-name" onChange={(event) => setCountry(event.target.value)} style={inputStyle} /></label>
              <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>{t("objectsOrderNote")}<input name="note" maxLength={500} style={inputStyle} /></label>
            </div>
            <label aria-hidden="true" style={{ position: "absolute", left: -10000, width: 1, height: 1, overflow: "hidden" }}>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
            <p style={{ margin: "18px 0 0", color: MUTED, fontSize: 13.5, lineHeight: 1.55 }}>{t("objectsOrderPrivacy")}</p>
            {error && <p role="alert" style={{ margin: "12px 0 0", color: CORAL, fontWeight: 800 }}>{error}</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}><Btn type="submit" variant="primary" disabled={pending}>{pending ? t("objectsOrderSending") : t("objectsOrderSend")}</Btn><Btn type="button" onClick={() => setStep(1)} variant="cream">{t("objectsOrderBack")}</Btn></div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function HorizonObjectsClient() {
  const t = useTranslations("Horizon");
  const locale = useLocale();
  const [payload, setPayload] = useState<HorizonPayload | null>(null);
  const [ready, setReady] = useState(false);
  const [variantByProduct, setVariantByProduct] = useState<Record<HorizonOrderProduct, string>>({ shirt: "cream", mug: "cream", poster: "cream", plaque: "brass", magnet: "yellow", card: "navy" });
  const [orderProduct, setOrderProduct] = useState<Product | null>(null);
  const closeOrder = useCallback(() => setOrderProduct(null), []);
  const price = (cents: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100);

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
  const horizonUrl = payload && typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname.replace(/\/objets$/, "")}#${fragment}` : "";
  // Clés littérales : le contrôle de parité i18n doit pouvoir voir chaque texte.
  const products: Product[] = [
    { kind: "shirt", title: t("objectsShirtTitle"), text: t("objectsShirtText"), optionKind: "size", variants: [
      { id: "cream", label: t("objectsVariantCream"), src: "/horizon/objects/shirt-cream-v2.webp", color: "#F7EEDC" },
      { id: "navy", label: t("objectsVariantNavy"), src: "/horizon/objects/shirt-navy-v2.webp", color: INK },
    ] },
    { kind: "mug", title: t("objectsMugTitle"), text: t("objectsMugText"), optionKind: null, variants: [
      { id: "cream", label: t("objectsVariantCream"), src: "/horizon/objects/mug-cream.webp", color: "#F7EEDC" },
      { id: "navy", label: t("objectsVariantNavy"), src: "/horizon/objects/mug-navy.webp", color: INK },
    ] },
    { kind: "poster", title: t("objectsPosterTitle"), text: t("objectsPosterText"), optionKind: "format", variants: [
      { id: "cream", label: t("objectsVariantCream"), src: "/horizon/objects/poster-cream.webp", color: "#F7EEDC" },
      { id: "coral", label: t("objectsVariantCoral"), src: "/horizon/objects/poster-coral.webp", color: CORAL },
    ] },
    { kind: "plaque", title: t("objectsPlaqueTitle"), text: t("objectsPlaqueText"), optionKind: null, variants: [
      { id: "brass", label: t("objectsVariantBrass"), src: "/horizon/objects/plaque-brass.webp", color: "#C79A45" },
      { id: "navy", label: t("objectsVariantNavy"), src: "/horizon/objects/plaque-navy.webp", color: INK },
    ] },
    { kind: "magnet", title: t("objectsMagnetTitle"), text: t("objectsMagnetText"), optionKind: null, variants: [
      { id: "yellow", label: t("objectsVariantYellow"), src: "/horizon/objects/magnet-yellow.webp", color: YELLOW },
    ] },
    { kind: "card", title: t("objectsMetalCardTitle"), text: t("objectsMetalCardText"), optionKind: null, variants: [
      { id: "navy", label: t("objectsVariantNavy"), src: "/horizon/objects/metal-card-navy.webp", color: INK },
    ] },
  ];

  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(251,246,236,.94)", borderBottom: `2px solid ${INK}`, backdropFilter: "blur(8px)" }}>
        <div className="pad" style={{ maxWidth: 1040, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18 }}>
          <Link href="/" aria-label={t("backHome")} style={{ display: "inline-flex", alignItems: "center", gap: 11, color: INK, textDecoration: "none" }}><PlacetMark size={36} /><strong style={{ fontFamily: FONT_DISPLAY, fontSize: 22, letterSpacing: "-.04em" }}>Placet</strong></Link>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".09em", textTransform: "uppercase" }}>{t("objectsEyebrow")}</span>
        </div>
      </header>

      <main className="pad" style={{ maxWidth: 1040, margin: "0 auto", padding: "54px 24px 84px" }}>
        {!ready ? <Card><p style={{ margin: 0 }}>{t("loading")}</p></Card> : !payload ? (
          <Card accent={CORAL} padding="clamp(22px,5vw,34px)"><h1 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 34 }}>{t("objectsInvalidTitle")}</h1><p style={{ margin: "10px 0 22px", color: MUTED }}>{t("objectsInvalidText")}</p><Link href="/horizon" style={{ color: INK, fontWeight: 800, textUnderlineOffset: 3 }}>{t("objectsCreate")}</Link></Card>
        ) : (
          <>
            <div style={{ maxWidth: 780, marginBottom: 34 }}>
              <span style={{ display: "inline-block", padding: "6px 10px", border: `2px solid ${INK}`, borderRadius: 999, background: YELLOW, fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>{t("objectsBadge")}</span>
              <h1 style={{ margin: "18px 0 12px", fontFamily: FONT_DISPLAY, fontSize: "clamp(42px,8vw,70px)", lineHeight: .96, letterSpacing: "-.055em" }}>{t("objectsTitle")}</h1>
              <p style={{ margin: 0, color: MUTED, fontSize: 17, lineHeight: 1.6 }}>{t("objectsIntro")}</p>
            </div>

            <div className="horizon-products-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 24 }}>
              {products.map((product) => {
                const variant = product.variants.find((item) => item.id === variantByProduct[product.kind]) ?? product.variants[0];
                return (
                  <Card key={product.kind} padding={0} accent={product.kind === "poster" || product.kind === "magnet" ? YELLOW : undefined} style={{ overflow: "hidden" }}>
                    <ProductVisual product={product} variant={variant} onOrder={() => setOrderProduct(product)} />
                    <div style={{ padding: "20px 22px 22px" }}>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}><h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 23 }}>{product.title}</h2><span style={{ color: INK, fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 800 }}>{product.kind === "poster" ? t("objectsPriceFrom", { price: price(getHorizonOrderUnitPriceCents(product.kind, "A3") ?? 0) }) : price(getHorizonOrderUnitPriceCents(product.kind) ?? 0)}</span></div>
                      <p style={{ margin: "8px 0 14px", color: MUTED, fontSize: 14, lineHeight: 1.55 }}>{product.text}</p>
                      {product.variants.length > 1 && <div role="group" aria-label={t("objectsVariants")} style={{ display: "flex", gap: 9 }}>{product.variants.map((item) => <button key={item.id} type="button" aria-label={item.label} aria-pressed={variant.id === item.id} onClick={() => setVariantByProduct((current) => ({ ...current, [product.kind]: item.id }))} title={item.label} style={{ width: 28, height: 28, border: `2px solid ${INK}`, borderRadius: 999, background: item.color, cursor: "pointer", boxShadow: variant.id === item.id ? `0 0 0 3px ${CREAM}, 0 0 0 5px ${INK}` : "none" }} />)}</div>}
                    </div>
                  </Card>
                );
              })}
            </div>

            <p style={{ margin: "18px 0 0", color: MUTED, fontSize: 13 }}>{t("objectsPriceShipping")}</p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center", marginTop: 34 }}><Link href={`/horizon#${fragment}`} style={{ display: "inline-flex", padding: "11px 18px", border: `2.5px solid ${INK}`, borderRadius: 11, background: INK, color: "#fff", fontFamily: FONT_DISPLAY, fontWeight: 700, textDecoration: "none", boxShadow: `4px 4px 0 ${CORAL}` }}>{t("objectsBack")}</Link><p style={{ margin: 0, color: MUTED, fontSize: 13 }}>{t("objectsFootnote")}</p></div>
          </>
        )}
      </main>

      {orderProduct && horizonUrl && <OrderDialog product={orderProduct} initialVariant={orderProduct.variants.find((item) => item.id === variantByProduct[orderProduct.kind]) ?? orderProduct.variants[0]} horizonUrl={horizonUrl} onClose={closeOrder} />}
    </div>
  );
}
