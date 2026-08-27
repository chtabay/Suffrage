export const HORIZON_ORDER_VARIANTS = {
  shirt: ["cream", "navy"],
  mug: ["cream", "navy"],
  poster: ["cream", "coral"],
  plaque: ["brass", "navy"],
  magnet: ["yellow"],
  card: ["navy"],
} as const;

export type HorizonOrderProduct = keyof typeof HORIZON_ORDER_VARIANTS;

export const HORIZON_ORDER_PRICES_CENTS: Record<HorizonOrderProduct, Readonly<Record<string, number>>> = {
  shirt: { default: 3900 },
  mug: { default: 2400 },
  poster: { A3: 5900, A2: 7900 },
  plaque: { default: 7900 },
  magnet: { default: 1200 },
  card: { default: 2900 },
};

export function getHorizonOrderUnitPriceCents(product: HorizonOrderProduct, option = ""): number | null {
  const prices = HORIZON_ORDER_PRICES_CENTS[product];
  const priceKey = product === "poster" ? option : "default";
  return prices[priceKey] ?? null;
}

export interface HorizonAddressSuggestion {
  fulltext: string;
  street?: string;
  zipcode?: string;
  city?: string;
}

export function isFrenchDeliveryCountry(country: string): boolean {
  const normalized = country.trim().toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return ["france", "francia", "republique francaise"].includes(normalized);
}

export function parseHorizonAddressSuggestions(input: unknown): HorizonAddressSuggestion[] {
  if (!input || typeof input !== "object") return [];
  const results = (input as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];
  const seen = new Set<string>();
  const parsed: HorizonAddressSuggestion[] = [];
  for (const item of results) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Partial<HorizonAddressSuggestion>;
    const fulltext = typeof raw.fulltext === "string" ? raw.fulltext.trim().slice(0, 240) : "";
    if (!fulltext || seen.has(fulltext)) continue;
    seen.add(fulltext);
    parsed.push({
      fulltext,
      street: typeof raw.street === "string" ? raw.street.slice(0, 160) : undefined,
      zipcode: typeof raw.zipcode === "string" ? raw.zipcode.slice(0, 16) : undefined,
      city: typeof raw.city === "string" ? raw.city.slice(0, 120) : undefined,
    });
    if (parsed.length === 6) break;
  }
  return parsed;
}

export interface HorizonOrderInput {
  product: string;
  variant: string;
  quantity: number;
  option?: string;
  name: string;
  email: string;
  address: string;
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
  address: string;
  country: string;
  note: string;
  horizonUrl: string;
  locale: "fr" | "en" | "es" | "pcm";
  unitPriceCents: number;
  totalPriceCents: number;
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
  const address = clean(raw.address, 240);
  const country = clean(raw.country, 80);
  const note = clean(raw.note, 500);
  const horizonUrl = clean(raw.horizonUrl, 1600);
  const locale = clean(raw.locale, 3);

  if (!variants?.includes(variant)) return { ok: false, error: "invalid" };
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) return { ok: false, error: "invalid" };
  if (name.length < 2 || !EMAIL.test(email) || address.length < 8 || country.length < 2) return { ok: false, error: "invalid" };
  if (!validHorizonUrl(horizonUrl)) return { ok: false, error: "invalid" };
  if (product === "shirt" && !SHIRT_SIZES.has(option)) return { ok: false, error: "invalid" };
  if (product === "poster" && !POSTER_FORMATS.has(option)) return { ok: false, error: "invalid" };
  if (product !== "shirt" && product !== "poster" && option) return { ok: false, error: "invalid" };
  if (locale !== "fr" && locale !== "en" && locale !== "es" && locale !== "pcm") return { ok: false, error: "invalid" };
  const unitPriceCents = getHorizonOrderUnitPriceCents(product, option);
  if (unitPriceCents === null) return { ok: false, error: "invalid" };

  return { ok: true, value: { product, variant, quantity, option, name, email, address, country, note, horizonUrl, locale, unitPriceCents, totalPriceCents: unitPriceCents * quantity } };
}
