import { NextResponse } from "next/server";
import { isMapHost, isShortMapLink, parseLatLng } from "@/lib/voting/geo";

// Résolution d'un lien de carte COURT (maps.app.goo.gl…) en coordonnées.
// Les liens partagés depuis un téléphone sont presque toujours courts : sans
// cette résolution, aucun marqueur ne pourrait être placé sur la carte.
//
// Anti-SSRF : hôtes de cartographie en allowlist, redirections suivies À LA MAIN
// (chaque saut est revalidé), 5 sauts max, délai court, et on ne renvoie JAMAIS
// le corps de la réponse — seulement une paire de coordonnées.

export const runtime = "nodejs";

const MAX_HOPS = 5;
const TIMEOUT_MS = 4000;

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url")?.trim() ?? "";
  if (!raw) return NextResponse.json({ error: "url manquante" }, { status: 400 });

  // Déjà exploitable sans appel réseau.
  const direct = parseLatLng(raw);
  if (direct) return NextResponse.json(direct);
  if (!isShortMapLink(raw)) return NextResponse.json({ error: "lien non résoluble" }, { status: 422 });

  let current: URL;
  try {
    current = new URL(raw);
  } catch {
    return NextResponse.json({ error: "url invalide" }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      if (current.protocol !== "https:" || !isMapHost(current.hostname)) {
        return NextResponse.json({ error: "hôte non autorisé" }, { status: 422 });
      }
      const res = await fetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "PlacetBot/1.0 (+https://placet.app)" },
      });
      // Seuls les en-têtes nous intéressent : un corps ni lu ni annulé retiendrait
      // la socket hors du pool à chaque appel de cette route publique.
      const location = res.headers.get("location");
      await res.body?.cancel().catch(() => {});
      if (res.status >= 300 && res.status < 400 && location) {
        const next = new URL(location, current);
        const hit = parseLatLng(next.toString());
        if (hit) return NextResponse.json(hit);
        current = next;
        continue;
      }
      // Page finale : les coordonnées sont dans l'URL atteinte, sinon on abandonne.
      const hit = parseLatLng(current.toString());
      return hit ? NextResponse.json(hit) : NextResponse.json({ error: "coordonnées introuvables" }, { status: 422 });
    }
    return NextResponse.json({ error: "trop de redirections" }, { status: 422 });
  } catch {
    return NextResponse.json({ error: "résolution impossible" }, { status: 502 });
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
