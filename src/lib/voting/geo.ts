// Localisation d'une option : lien de carte (Google/Apple Maps, OSM…) et
// coordonnées qu'on en extrait. Distinct de `url`, qui reste l'ILLUSTRATION
// (photo, menu, document) — un lieu se situe, une illustration se regarde.

/** Hôtes acceptés comme lien de localisation (aussi l'allowlist anti-SSRF de /api/geo/resolve). */
const MAP_HOSTS = [
  "google.com",
  "www.google.com",
  "maps.google.com",
  "goo.gl",
  "maps.app.goo.gl",
  "openstreetmap.org",
  "www.openstreetmap.org",
  "osm.org",
  "maps.apple.com",
  "waze.com",
  "www.waze.com",
  "ul.waze.com",
  "what3words.com",
  "w3w.co",
];

/** L'hôte est-il un service de cartographie connu ? (sous-domaines google.* inclus) */
export function isMapHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, "");
  if (MAP_HOSTS.includes(host.toLowerCase()) || MAP_HOSTS.includes(h)) return true;
  // google.fr/maps, google.co.uk/maps…
  return /^(maps\.)?google\.[a-z.]{2,7}$/.test(h);
}

/** Le lien pointe-t-il vers une carte ? (sert à trier « illustration » vs « lieu ») */
export function isPlaceUrl(raw: string | undefined): boolean {
  if (!raw) return false;
  const t = raw.trim();
  if (/^geo:-?\d/i.test(t)) return true;
  try {
    const u = new URL(t);
    if (!/^https?:$/.test(u.protocol)) return false;
    if (!isMapHost(u.hostname)) return false;
    // google.com/search n'est pas une carte ; google.com/maps oui.
    if (/^(www\.)?google\.[a-z.]{2,7}$/.test(u.hostname.toLowerCase()) && !/\/maps/.test(u.pathname)) {
      return false;
    }
    if (/^goo\.gl$/i.test(u.hostname) && !/^\/maps/.test(u.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

export interface LatLng {
  lat: number;
  lng: number;
}

const inRange = (lat: number, lng: number): boolean =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/** Arrondi à ~1 m : évite de stocker un bruit de flottant dans le JSON du scrutin. */
const round = (n: number): number => Math.round(n * 1e5) / 1e5;

/**
 * Extrait des coordonnées d'un lien de carte. Couvre les formes courantes :
 *  - Google  …/@48.8584,2.2945,17z…  ·  ?q=48.8584,2.2945  ·  !3d48.8584!4d2.2945  ·  ?ll=
 *  - OSM     #map=17/48.8584/2.2945  ·  ?mlat=48.8584&mlon=2.2945
 *  - Apple   ?ll=48.8584,2.2945  ·  ?coordinate=…
 *  - geo:48.8584,2.2945  ·  « 48.8584, 2.2945 » saisi à la main
 * Renvoie null pour un lien court non résolu (maps.app.goo.gl) — voir /api/geo/resolve.
 */
export function parseLatLng(raw: string | undefined): LatLng | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;

  const tryPair = (a: string, b: string): LatLng | null => {
    const lat = Number(a);
    const lng = Number(b);
    return inRange(lat, lng) ? { lat: round(lat), lng: round(lng) } : null;
  };

  // geo:lat,lng  |  saisie brute « lat, lng »
  const plain = t.match(/^(?:geo:)?\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/i);
  if (plain) return tryPair(plain[1], plain[2]);

  // Google : !3d<lat>!4d<lng> (le plus fiable quand présent — c'est le point exact)
  const bang = t.match(/!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/);
  if (bang) {
    const hit = tryPair(bang[1], bang[2]);
    if (hit) return hit;
  }

  // OSM : #map=z/lat/lng
  const osm = t.match(/[#&]map=\d+(?:\.\d+)?\/(-?\d{1,3}(?:\.\d+)?)\/(-?\d{1,3}(?:\.\d+)?)/);
  if (osm) {
    const hit = tryPair(osm[1], osm[2]);
    if (hit) return hit;
  }

  // Google : /@lat,lng,zoom
  const at = t.match(/@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
  if (at) {
    const hit = tryPair(at[1], at[2]);
    if (hit) return hit;
  }

  try {
    const u = new URL(t);
    // ?q= / ?ll= / ?center= / ?coordinate= / ?daddr= « lat,lng »
    for (const key of ["q", "ll", "center", "coordinate", "daddr", "sll", "query", "destination"]) {
      const v = u.searchParams.get(key);
      const m = v?.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
      if (m) {
        const hit = tryPair(m[1], m[2]);
        if (hit) return hit;
      }
    }
    // OSM : ?mlat=&mlon=
    const mlat = u.searchParams.get("mlat");
    const mlon = u.searchParams.get("mlon");
    if (mlat && mlon) {
      const hit = tryPair(mlat, mlon);
      if (hit) return hit;
    }
  } catch {
    /* pas une URL absolue : les regexes ci-dessus ont déjà tout tenté */
  }
  return null;
}

/**
 * Valeur acceptable pour une LOCALISATION venant d'une source non fiable
 * (paramètre d'URL, API) : soit un lien vers un service de cartographie connu,
 * soit une paire de coordonnées brute. Un lien quelconque est REFUSÉ même s'il
 * contient « @lat,lng » — sinon n'importe quel site emprunterait la crédibilité
 * d'une carte via la puce 📍 et les marqueurs.
 */
export function sanitizePlace(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  if (!t) return undefined;
  if (/^https?:\/\//i.test(t)) return isPlaceUrl(t) ? t.slice(0, 500) : undefined;
  // Pas une URL : seule une paire de coordonnées est admise.
  return parseLatLng(t) ? t.slice(0, 60) : undefined;
}

/** Lien court à résoudre côté serveur pour obtenir les coordonnées ? */
export function isShortMapLink(raw: string | undefined): boolean {
  if (!raw) return false;
  try {
    const u = new URL(raw.trim());
    return /^(maps\.app\.goo\.gl|goo\.gl|ul\.waze\.com|w3w\.co)$/i.test(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Coordonnées d'un lien de localisation : lecture directe si possible, sinon
 * (lien court) résolution par l'API. Jamais bloquant — null si on ne sait pas.
 */
export async function resolvePlace(raw: string | undefined): Promise<LatLng | null> {
  const direct = parseLatLng(raw);
  if (direct) return direct;
  if (!isShortMapLink(raw)) return null;
  try {
    const res = await fetch(`/api/geo/resolve?url=${encodeURIComponent(raw!.trim())}`);
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<LatLng>;
    return inRange(Number(data.lat), Number(data.lng)) ? { lat: Number(data.lat), lng: Number(data.lng) } : null;
  } catch {
    return null;
  }
}

/** Recherche Google Maps par nom — proposé quand aucun lien n'est fourni. */
export function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Lien d'ouverture d'un point (fallback quand on n'a que des coordonnées). */
export function mapsPointUrl(p: LatLng): string {
  return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
}
