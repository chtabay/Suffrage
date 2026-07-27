import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { addressFromMapUrl, isMapHost, isShortMapLink, parseLatLng } from "@/lib/voting/geo";

// Coordonnées d'un lien de carte qui n'en porte pas :
//  · lien COURT (maps.app.goo.gl…) → on suit les redirections ;
//  · lien par ADRESSE (…/maps/search/?api=1&query=30 Cours Vitton, Lyon) → géocodage.
// La seconde forme est celle que produit naturellement une IA : sans elle, la
// plupart des lieux resteraient absents de la carte.
//
// Anti-SSRF : hôtes de cartographie en allowlist, redirections suivies À LA MAIN
// (chaque saut revalidé), 5 sauts max, délai court, et on ne renvoie JAMAIS le
// corps de la réponse — seulement une paire de coordonnées.

export const runtime = "nodejs";

const MAX_HOPS = 5;
// Large : le géocodage peut enchaîner deux appels espacés d'une seconde.
const TIMEOUT_MS = 9000;
// Politique d'usage Nominatim : identifier l'application, et METTRE EN CACHE.
const UA = "PlacetApp/1.0 (https://placet.app; contact@placet.app)";

/** Client de service : le cache est fermé à anon, on passe par les RPC definer. */
function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

const ok = (lat: number, lng: number) => NextResponse.json({ lat, lng });

/**
 * Adresse seule : « Le Berkeley 30 Cours Vitton 69006 Lyon » → « 30 Cours Vitton
 * 69006 Lyon ». Nominatim échoue sur « nom d'établissement + adresse » (contrairement
 * à Google), or c'est exactement ce que produisent les IA — d'où ce repli, qui
 * commence au numéro de rue.
 */
function addressOnly(q: string): string | null {
  const m = q.match(/\b\d{1,4}(?:\s*(?:bis|ter|[a-d]))?\s+\p{L}/iu);
  if (!m || m.index === undefined || m.index === 0) return null;
  const rest = q.slice(m.index).trim();
  return rest.length >= 8 ? rest : null;
}

/** Un appel Nominatim. null = aucun résultat ; undefined = service en échec. */
async function nominatim(q: string, signal: AbortSignal): Promise<LatLngOrNull> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { signal, headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) return undefined;
    const rows = (await res.json()) as { lat?: string; lon?: string }[];
    const first = Array.isArray(rows) ? rows[0] : undefined;
    const lat = Number(first?.lat);
    const lng = Number(first?.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
      ? { lat, lng }
      : null;
  } catch {
    return undefined;
  }
}

type LatLngOrNull = { lat: number; lng: number } | null | undefined;

/** Géocodage d'une adresse, mémorisé (y compris les « introuvable »). */
async function geocode(address: string, signal: AbortSignal): Promise<NextResponse> {
  const supabase = db();
  const { data: cached } = await supabase.rpc("scrutin_geocache_get", { p_q: address });
  if (cached) {
    const hit = cached as { found: boolean; lat: number | null; lng: number | null };
    return hit.found && hit.lat != null && hit.lng != null
      ? ok(hit.lat, hit.lng)
      : NextResponse.json({ error: "adresse introuvable" }, { status: 422 });
  }

  let hit = await nominatim(address, signal);
  if (hit === null) {
    // Deuxième chance sur l'adresse seule — en respectant 1 req/s.
    const fallback = addressOnly(address);
    if (fallback) {
      await new Promise((r) => setTimeout(r, 1100));
      hit = await nominatim(fallback, signal);
    }
  }
  // Service en échec : ne pas mémoriser un « introuvable » qui n'en est pas un.
  if (hit === undefined) return NextResponse.json({ error: "géocodage indisponible" }, { status: 502 });

  await supabase
    .rpc("scrutin_geocache_put", { p_q: address, p_lat: hit?.lat ?? null, p_lng: hit?.lng ?? null })
    .then(
      () => {},
      () => {},
    );
  return hit ? ok(hit.lat, hit.lng) : NextResponse.json({ error: "adresse introuvable" }, { status: 422 });
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url")?.trim() ?? "";
  if (!raw) return NextResponse.json({ error: "url manquante" }, { status: 400 });

  // Déjà exploitable sans appel réseau.
  const direct = parseLatLng(raw);
  if (direct) return ok(direct.lat, direct.lng);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    if (!isShortMapLink(raw)) {
      // Pas un lien court : reste le géocodage de l'adresse qu'il porte.
      const address = addressFromMapUrl(raw);
      if (!address) return NextResponse.json({ error: "lien non résoluble" }, { status: 422 });
      return await geocode(address, controller.signal);
    }

    let current = new URL(raw);
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      if (current.protocol !== "https:" || !isMapHost(current.hostname)) {
        return NextResponse.json({ error: "hôte non autorisé" }, { status: 422 });
      }
      const res = await fetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": UA },
      });
      // Seuls les en-têtes nous intéressent : un corps ni lu ni annulé retiendrait
      // la socket hors du pool à chaque appel de cette route publique.
      const location = res.headers.get("location");
      await res.body?.cancel().catch(() => {});
      if (res.status >= 300 && res.status < 400 && location) {
        const next = new URL(location, current);
        const hit = parseLatLng(next.toString());
        if (hit) return ok(hit.lat, hit.lng);
        current = next;
        continue;
      }
      // Page finale sans coordonnées : elle porte peut-être une adresse.
      const address = addressFromMapUrl(current.toString());
      if (address) return await geocode(address, controller.signal);
      return NextResponse.json({ error: "coordonnées introuvables" }, { status: 422 });
    }
    return NextResponse.json({ error: "trop de redirections" }, { status: 422 });
  } catch {
    return NextResponse.json({ error: "résolution impossible" }, { status: 502 });
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
