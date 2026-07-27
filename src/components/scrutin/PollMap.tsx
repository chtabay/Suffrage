"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Option } from "@/lib/voting/types";
import { mapsPointUrl, optionPlace, resolvePlace } from "@/lib/voting/geo";
import { candColor } from "@/lib/voting/systems";
import { CREAM, FONT_DISPLAY, INK, MUTED, PAPER } from "./theme";

// Carte des options localisées — tuiles OpenStreetMap, sans aucune dépendance :
// projection Web Mercator + grille d'<img>, marqueurs positionnés en absolu.
// (Une lib de carte pèserait ~150 ko pour un usage statique de quelques points.)

const TILE = 256;
const MAX_Z = 18;
// 0 = le monde entier tient dans 256 px : indispensable pour que deux options
// très éloignées (Paris / Tokyo) restent DANS le cadre d'un téléphone.
const MIN_Z = 0;

/** Coordonnées « monde » normalisées [0..1] (Web Mercator). */
function project(lat: number, lng: number): { x: number; y: number } {
  const s = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  return {
    x: (lng + 180) / 360,
    y: 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI),
  };
}

/** Inverse de `project` sur l'axe vertical (pour recentrer une carte externe). */
function unprojectLat(y: number): number {
  return (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;
}

/**
 * Étendue horizontale la plus COURTE couvrant tous les points, méridien 180°
 * compris : on cherche le plus grand « trou » circulaire entre deux points
 * consécutifs, et on garde son complément. Sans cela, Anchorage et Kamtchatka
 * (voisins) s'afficheraient aux deux bords opposés du monde.
 */
function spanX(xs: number[]): { min: number; span: number } {
  const sorted = [...xs].sort((a, b) => a - b);
  let gapStart = sorted[sorted.length - 1];
  let gap = sorted[0] + 1 - gapStart; // trou qui enjambe le méridien
  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i] - sorted[i - 1];
    if (d > gap) {
      gap = d;
      gapStart = sorted[i - 1];
    }
  }
  // La plage utile commence à la fin du plus grand trou et dure (1 - trou).
  return { min: (gapStart + gap) % 1, span: 1 - gap };
}

const isHttp = (u: string | undefined): u is string => !!u && /^https?:\/\//i.test(u);

interface Pin {
  idx: number;
  option: Option;
  x: number;
  y: number;
}

export default function PollMap({
  options,
  width = 640,
  height = 300,
}: {
  options: Option[];
  width?: number;
  height?: number;
}) {
  const t = useTranslations("Vote");
  const [failed, setFailed] = useState(0);
  // La grille de tuiles est calculée pour la largeur RÉELLE du cadre : sinon,
  // sur mobile, les points des bords tomberaient hors du champ visible.
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(width);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const apply = () => setBoxW(Math.max(240, Math.round(el.clientWidth)));
    apply();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Coordonnées trouvées à l'affichage, pour les options qui n'en portent pas :
  // scrutins créés avant la fonctionnalité, ou lieu donné par une ADRESSE (le
  // lien type « maps/search/?query=… » n'a pas de coordonnées à l'intérieur).
  // Résolution en série (politesse envers le géocodeur) et mutualisée par le
  // cache serveur ; rien n'est réécrit dans le scrutin, qui peut être figé.
  const [found, setFound] = useState<Record<number, { lat: number; lng: number }>>({});
  const toResolve = useMemo(
    () =>
      options
        .map((option, idx) => ({ option, idx }))
        .filter((o) => typeof o.option.lat !== "number" && Boolean(optionPlace(o.option)))
        .slice(0, 12),
    [options],
  );
  const resolveKey = toResolve.map((o) => `${o.idx}:${optionPlace(o.option)}`).join("|");
  useEffect(() => {
    if (!toResolve.length) return;
    let alive = true;
    (async () => {
      for (const { option, idx } of toResolve) {
        const geo = await resolvePlace(optionPlace(option));
        if (!alive) return;
        if (geo) setFound((m) => ({ ...m, [idx]: geo }));
      }
    })();
    return () => {
      alive = false;
    };
    // resolveKey décrit exactement le travail à faire (indices + liens).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolveKey]);

  const located = useMemo(
    () =>
      options
        .map((option, idx) => {
          const lat = typeof option.lat === "number" ? option.lat : found[idx]?.lat;
          const lng = typeof option.lng === "number" ? option.lng : found[idx]?.lng;
          return { option: { ...option, lat, lng }, idx };
        })
        .filter(
          (o): o is { option: Option & { lat: number; lng: number }; idx: number } =>
            typeof o.option.lat === "number" && typeof o.option.lng === "number",
        ),
    [options, found],
  );

  const view = useMemo(() => {
    if (!located.length) return null;
    const pts = located.map((o) => project(o.option.lat, o.option.lng));
    const horiz = spanX(pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxY = Math.max(...pts.map((p) => p.y));
    // Zoom le plus serré qui garde tous les points dans le cadre (marge 15 %).
    const sx = Math.max(horiz.span, 1e-6);
    const sy = Math.max(maxY - minY, 1e-6);
    const fit = Math.min(
      Math.log2((boxW * 0.85) / (sx * TILE)),
      Math.log2((height * 0.85) / (sy * TILE)),
    );
    const zoom = Math.max(MIN_Z, Math.min(MAX_Z, located.length === 1 ? 14 : Math.floor(fit)));
    const scale = TILE * 2 ** zoom;
    // Centre : milieu de la plage utile (qui peut enjamber le méridien 180°).
    const centerX = horiz.min + horiz.span / 2;
    const centerY = (minY + maxY) / 2;
    const originX = centerX * scale - boxW / 2;
    const originY = centerY * scale - height / 2;
    const pins: Pin[] = located.map((o, i) => {
      // Ramène le point du côté du centre quand la plage enjambe le méridien.
      let x = pts[i].x;
      if (x - centerX > 0.5) x -= 1;
      else if (centerX - x > 0.5) x += 1;
      return { idx: o.idx, option: o.option, x: x * scale - originX, y: pts[i].y * scale - originY };
    });
    const center = { lat: unprojectLat(centerY), lng: ((centerX % 1) + 1) % 1 * 360 - 180 };
    // Tuiles couvrant le cadre.
    const tiles: { key: string; url: string; left: number; top: number }[] = [];
    const n = 2 ** zoom;
    const firstCol = Math.floor(originX / TILE);
    const lastCol = Math.floor((originX + boxW) / TILE);
    const firstRow = Math.floor(originY / TILE);
    const lastRow = Math.floor((originY + height) / TILE);
    for (let col = firstCol; col <= lastCol; col++) {
      for (let row = firstRow; row <= lastRow; row++) {
        if (row < 0 || row >= n) continue;
        const wrapped = ((col % n) + n) % n; // tour du monde
        tiles.push({
          key: `${zoom}/${col}/${row}`,
          url: `https://tile.openstreetmap.org/${zoom}/${wrapped}/${row}.png`,
          left: col * TILE - originX,
          top: row * TILE - originY,
        });
      }
    }
    return { pins, tiles, zoom, center };
  }, [located, boxW, height]);

  // Nouvelle grille (zoom ou largeur changés) : les échecs précédents ne comptent
  // plus, sinon un redimensionnement pourrait faire disparaître une carte valide.
  const tileKey = view ? `${view.zoom}/${view.tiles.length}` : "";
  useEffect(() => {
    setFailed(0);
  }, [tileKey]);

  if (!view || !located.length) return null;

  // Toutes les tuiles en échec (hors ligne, tuiles bloquées) : la carte n'apporte
  // plus rien, la liste des lieux reste utile.
  const tilesBroken = failed >= view.tiles.length;

  // « Voir en grand » : même cadrage que la vignette (centre de la plage, pas
  // la première option) — sinon les lieux éloignés sortent du champ.
  const osmLink = `https://www.openstreetmap.org/#map=${view.zoom}/${view.center.lat.toFixed(5)}/${view.center.lng.toFixed(5)}`;

  // Lien d'un point : le champ « lieu » peut être une simple paire de coordonnées
  // (saisie proposée par le placeholder) — jamais un href relatif.
  const linkFor = (pin: Pin) =>
    isHttp(optionPlace(pin.option)) ? optionPlace(pin.option)! : mapsPointUrl({ lat: pin.option.lat!, lng: pin.option.lng! });

  return (
    <div
      style={{
        marginTop: 18,
        background: PAPER,
        border: `2.5px solid ${INK}`,
        borderRadius: 16,
        boxShadow: `5px 5px 0 ${INK}`,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", flexWrap: "wrap" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, flex: 1 }}>📍 {t("mapTitle")}</div>
        <a
          href={osmLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, fontWeight: 700, color: MUTED, textDecoration: "underline" }}
        >
          {t("mapOpen")} ↗
        </a>
      </div>

      {!tilesBroken && (
        <div
          ref={boxRef}
          style={{ position: "relative", width: "100%", height, overflow: "hidden", background: "#e8e3d8", borderTop: `2px solid ${INK}`, borderBottom: `2px solid ${INK}` }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, width: boxW, height }}>
            {view.tiles.map((tile) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={tile.key}
                src={tile.url}
                alt=""
                loading="lazy"
                onError={() => setFailed((n) => n + 1)}
                style={{ position: "absolute", left: tile.left, top: tile.top, width: TILE, height: TILE }}
              />
            ))}
            {view.pins.map((pin) => (
              <a
                key={pin.idx}
                href={linkFor(pin)}
                target="_blank"
                rel="noopener noreferrer"
                title={pin.option.name}
                // Sans cela le nom accessible serait le seul numéro (« lien, 3 ») :
                // la légende juste dessous reste l'équivalent lisible.
                aria-label={pin.option.name}
                style={{
                  position: "absolute",
                  left: pin.x,
                  top: pin.y,
                  transform: "translate(-50%, calc(-100% - 6px))",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textDecoration: "none",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    borderRadius: "50% 50% 50% 4px",
                    transform: "rotate(-45deg)",
                    background: candColor(pin.idx),
                    border: `2.5px solid ${INK}`,
                    boxShadow: `1px 1px 0 ${INK}`,
                  }}
                >
                  <span style={{ transform: "rotate(45deg)", fontSize: 13, fontWeight: 800, color: INK, fontFamily: FONT_DISPLAY }}>
                    {pin.idx + 1}
                  </span>
                </span>
              </a>
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              background: "rgba(255,255,255,0.82)",
              fontSize: 10,
              fontWeight: 600,
              color: INK,
              padding: "1px 5px",
            }}
          >
            © OpenStreetMap
          </div>
        </div>
      )}

      {/* Légende : le numéro du marqueur ↔ l'option, et le lien vers la carte externe. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "12px 14px", background: CREAM }}>
        {view.pins.map((pin) => (
          <a
            key={pin.idx}
            href={linkFor(pin)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              border: `2px solid ${INK}`,
              borderRadius: 9,
              padding: "5px 10px",
              background: PAPER,
              textDecoration: "none",
              color: INK,
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 20,
                height: 20,
                borderRadius: 6,
                background: candColor(pin.idx),
                border: `1.5px solid ${INK}`,
                fontFamily: FONT_DISPLAY,
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {pin.idx + 1}
            </span>
            {pin.option.icon} {pin.option.name}
          </a>
        ))}
      </div>
    </div>
  );
}
