import { ImageResponse } from "next/og";

// Icône PWA générée (sans police : uniquement des formes, fiable avec Satori).
// Boîte de scrutin stylisée : carré jaune, bloc encre, 3 barres (bulletin).
export function renderIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFB627",
        }}
      >
        <div
          style={{
            width: "62%",
            height: "62%",
            background: "#16213A",
            borderRadius: size * 0.16,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: "52%",
                height: size * 0.07,
                background: "#FFB627",
                borderRadius: size * 0.04,
                margin: size * 0.025,
              }}
            />
          ))}
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
