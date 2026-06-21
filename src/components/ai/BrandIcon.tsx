import { BRAND_ASSETS } from "@/lib/ai/assistants";
import { INK } from "@/components/scrutin/theme";

/** Vrai a un logo officiel dans public/brands/ (sinon l'appelant affiche la pastille). */
export function hasBrandIcon(key: string) {
  return key in BRAND_ASSETS;
}

// Disque néo-brutaliste contenant le logo officiel : fond blanc, ou noir pour un
// logo blanc-sur-noir. `ring` = bordure + ombre portée (rail) ; sinon léger (bloc IA).
export default function BrandIcon({
  brandKey,
  size,
  ring = false,
}: {
  brandKey: string;
  size: number;
  ring?: boolean;
}) {
  const asset = BRAND_ASSETS[brandKey];
  if (!asset) return null;
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: asset.dark ? "#000" : "#fff",
        border: `${ring ? 2.5 : 1.5}px solid ${INK}`,
        boxShadow: ring ? `2px 2px 0 ${INK}` : "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flex: "none",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/brands/${asset.file}`}
        alt=""
        aria-hidden
        style={{ width: "76%", height: "76%", objectFit: "contain", display: "block" }}
      />
    </span>
  );
}
