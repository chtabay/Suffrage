"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Option } from "@/lib/voting/types";
import { isPlaceUrl, mapsSearchUrl, resolvePlace } from "@/lib/voting/geo";
import { CREAM, FONT_BODY, GREENTXT, INK, MUTED, REDTXT } from "./theme";

const isImageUrl = (u: string) => /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(u);
const isHttpUrl = (u: string) => /^https?:\/\//i.test(u);

// Aperçu d'une illustration : vignette si l'image charge, avertissement sinon —
// pour valider le lien AVANT de lancer le vote.
function ImgPreview({ url, notFoundLabel }: { url: string; notFoundLabel: string }) {
  const [err, setErr] = useState(false);
  if (err) return <div style={{ fontSize: 12, fontWeight: 700, color: REDTXT }}>{notFoundLabel}</div>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      onError={() => setErr(true)}
      style={{ width: 56, height: 56, objectFit: "cover", border: `2px solid ${INK}`, borderRadius: 8, alignSelf: "flex-start" }}
    />
  );
}

const field = {
  fontFamily: FONT_BODY,
  fontSize: 13,
  fontWeight: 500,
  padding: "8px 11px",
  border: `2px solid ${INK}`,
  borderRadius: 9,
  background: CREAM,
  outline: "none",
  boxSizing: "border-box",
  width: "100%",
} as const;

const label = { fontWeight: 700, fontSize: 11.5, color: MUTED, marginBottom: 4 } as const;

/**
 * Détails facultatifs d'une option, à la création : illustration, LOCALISATION
 * et commentaire — les mêmes informations qu'un votant peut joindre pendant la
 * phase de propositions. Un lien de carte collé dans « illustration » bascule
 * tout seul en localisation : c'est la confusion la plus probable.
 */
export default function OptionDetails({
  opt,
  index,
  onUrl,
  onPlace,
  onNote,
  onGeo,
}: {
  opt: Option;
  index: number;
  onUrl: (i: number, v: string) => void;
  onPlace: (i: number, v: string) => void;
  onNote: (i: number, v: string) => void;
  onGeo: (i: number, place: string, lat?: number, lng?: number) => void;
}) {
  const t = useTranslations("Create");
  const place = opt.place ?? "";
  const located = typeof opt.lat === "number" && typeof opt.lng === "number";
  const [resolving, setResolving] = useState(false);
  const [moved, setMoved] = useState(false);
  const placeRef = useRef<HTMLInputElement>(null);

  // Nom accessible : le libellé du champ ET l'option concernée (jusqu'à 8 options
  // ⇒ 24 champs, autrement indiscernables au lecteur d'écran).
  const fieldLabel = (base: string) => `${base} — ${opt.name.trim() || `#${index + 1}`}`;

  // Un lien de carte saisi dans « illustration » appartient à la localisation :
  // on le déplace, on suit avec le focus, et on l'ANNONCE (role=status).
  const moveToPlace = (value: string) => {
    onUrl(index, "");
    onPlace(index, value);
    setMoved(true);
    requestAnimationFrame(() => placeRef.current?.focus());
  };

  // Coordonnées du lien de localisation : lecture directe, ou résolution du lien
  // court côté serveur. Sans coordonnées, le lieu reste cliquable mais la carte
  // ne peut pas le situer — on le dit clairement.
  useEffect(() => {
    if (!place || located) return;
    let alive = true;
    setResolving(true);
    resolvePlace(place)
      .then((geo) => {
        if (!alive) return;
        if (geo) onGeo(index, place, geo.lat, geo.lng);
      })
      .finally(() => {
        if (alive) setResolving(false);
      });
    return () => {
      alive = false;
    };
  }, [place, located, index, onGeo]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 10, border: `2px dashed ${INK}`, borderRadius: 10 }}>
      {/* Illustration */}
      <div>
        <div style={label}>🔗 {t("detailUrlLabel")}</div>
        <input
          value={opt.url ?? ""}
          onChange={(e) => onUrl(index, e.target.value)}
          // Le reclassement se fait sur COLLER et sur SORTIE de champ, jamais à la
          // frappe : sinon « https://…/maps » basculerait dès le mot « maps » et
          // couperait en deux un lien saisi au clavier.
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text");
            if (isPlaceUrl(pasted) && !opt.url) {
              e.preventDefault();
              moveToPlace(pasted);
            }
          }}
          onBlur={(e) => {
            if (isPlaceUrl(e.target.value)) moveToPlace(e.target.value);
          }}
          placeholder={t("urlPlaceholder")}
          aria-label={fieldLabel(t("detailUrlLabel"))}
          style={field}
        />
        {opt.url && isHttpUrl(opt.url) && (
          <div style={{ marginTop: 6 }}>
            {isImageUrl(opt.url) ? (
              <ImgPreview key={opt.url} url={opt.url} notFoundLabel={t("imageNotFound")} />
            ) : (
              <a
                href={opt.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: INK,
                  textDecoration: "none",
                  border: `2px solid ${INK}`,
                  borderRadius: 8,
                  padding: "5px 10px",
                }}
              >
                {t("linkAddedTest")}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Localisation */}
      <div>
        <div style={label}>📍 {t("detailPlaceLabel")}</div>
        <input
          ref={placeRef}
          value={place}
          onChange={(e) => {
            setMoved(false);
            onPlace(index, e.target.value);
          }}
          placeholder={t("placePlaceholder")}
          aria-label={fieldLabel(t("detailPlaceLabel"))}
          style={field}
        />
        {/* Le déplacement automatique doit être PERCEPTIBLE, y compris au lecteur d'écran. */}
        {moved && (
          <div role="status" style={{ marginTop: 5, fontSize: 12, fontWeight: 700, color: GREENTXT }}>
            ↪ {t("placeMoved")}
          </div>
        )}
        <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {place ? (
            located ? (
              <span style={{ fontSize: 12, fontWeight: 700, color: GREENTXT }}>✓ {t("placeLocated")}</span>
            ) : resolving ? (
              <span style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>{t("placeResolving")}</span>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>{t("placeNotLocated")}</span>
            )
          ) : (
            <span style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>{t("placeHint")}</span>
          )}
          {opt.name.trim() && (
            <a
              href={mapsSearchUrl(opt.name.trim())}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, fontWeight: 700, color: INK, textDecoration: "underline" }}
            >
              {t("placeSearch")} ↗
            </a>
          )}
        </div>
      </div>

      {/* Commentaire */}
      <div>
        <div style={label}>💬 {t("detailNoteLabel")}</div>
        <input
          value={opt.note ?? ""}
          onChange={(e) => onNote(index, e.target.value.slice(0, 200))}
          placeholder={t("notePlaceholder")}
          aria-label={fieldLabel(t("detailNoteLabel"))}
          style={field}
        />
      </div>
    </div>
  );
}
