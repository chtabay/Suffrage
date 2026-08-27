export const HORIZON_ORDER_VARIANTS = {
  shirt: ["cream", "navy"],
  mug: ["cream", "navy"],
  poster: ["cream", "coral"],
  plaque: ["brass", "navy"],
  magnet: ["yellow"],
  card: ["navy"],
} as const;

export type HorizonOrderProduct = keyof typeof HORIZON_ORDER_VARIANTS;

export interface HorizonOrderInput {
  product: string;
  variant: string;
  quantity: number;
  option?: string;
  name: string;
  email: string;
  country: string;
  note?: string;
  horizonUrl: string;
  locale: string;
  website?: string;
}

export interface ValidHorizonOrder {
  product: HorizonOrderProduct;
  variant: string;
  quantity: number;
  option: string;
  name: string;
  email: string;
  country: string;
  note: string;
  horizonUrl: string;
  locale: "fr" | "en" | "es" | "pcm";
}

export type HorizonOrderValidation =
  | { ok: true; value: ValidHorizonOrder }
  | { ok: false; error: "invalid" };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SHIRT_SIZES = new Set(["XS", "S", "M", "L", "XL", "XXL"]);
const POSTER_FORMATS = new Set(["A3", "A2"]);

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validHorizonUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const trustedHost = url.hostname === "placet.app" || url.hostname.endsWith(".vercel.app");
    return url.protocol === "https:" && trustedHost && /\/horizon$/.test(url.pathname) && url.hash.startsWith("#v=1&");
  } catch {
    return false;
  }
}

export function validateHorizonOrder(input: unknown): HorizonOrderValidation {
  if (!input || typeof input !== "object") return { ok: false, error: "invalid" };
  const raw = input as Partial<HorizonOrderInput>;
  const product = clean(raw.product, 20) as HorizonOrderProduct;
  const variants = HORIZON_ORDER_VARIANTS[product] as readonly string[] | undefined;
  const variant = clean(raw.variant, 20);
  const quantity = Number(raw.quantity);
  const option = clean(raw.option, 12);
  const name = clean(raw.name, 80);
  const email = clean(raw.email, 160).toLowerCase();
  const country = clean(raw.country, 80);
  const note = clean(raw.note, 500);
  const horizonUrl = clean(raw.horizonUrl, 1600);
  const locale = clean(raw.locale, 3);

  if (!variants?.includes(variant)) return { ok: false, error: "invalid" };
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) return { ok: false, error: "invalid" };
  if (name.length < 2 || !EMAIL.test(email) || country.length < 2) return { ok: false, error: "invalid" };
  if (!validHorizonUrl(horizonUrl)) return { ok: false, error: "invalid" };
  if (product === "shirt" && !SHIRT_SIZES.has(option)) return { ok: false, error: "invalid" };
  if (product === "poster" && !POSTER_FORMATS.has(option)) return { ok: false, error: "invalid" };
  if (product !== "shirt" && product !== "poster" && option) return { ok: false, error: "invalid" };
  if (locale !== "fr" && locale !== "en" && locale !== "es" && locale !== "pcm") return { ok: false, error: "invalid" };

  return { ok: true, value: { product, variant, quantity, option, name, email, country, note, horizonUrl, locale } };
}
