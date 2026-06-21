"use client";

import type { ScrutinController } from "@/lib/voting/useScrutin";
import { CREAM, FONT_BODY, FONT_DISPLAY, INK, MUTED, REDTXT } from "./theme";

const cardStyle = {
  background: "#fff",
  border: `2.5px solid ${INK}`,
  borderRadius: 18,
  padding: 20,
  boxShadow: `5px 5px 0 ${INK}`,
} as const;

const inputStyle = {
  fontFamily: FONT_BODY,
  fontWeight: 600,
  border: `2px solid ${INK}`,
  borderRadius: 9,
  background: CREAM,
  outline: "none",
} as const;

export default function AccessCard({ ctrl }: { ctrl: ScrutinController }) {
  const { state, setAccess, toggleHideResults, setVoterNames, setDistrictField, addDistrict, removeDistrict } = ctrl;
  const isGE = state.recipe.suffrage === "indirect";

  const chip = (active: boolean, label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      style={{
        fontFamily: FONT_BODY,
        fontWeight: 600,
        fontSize: 13,
        cursor: "pointer",
        border: `2px solid ${INK}`,
        padding: "8px 13px",
        borderRadius: 9,
        background: active ? INK : CREAM,
        color: active ? "#fff" : INK,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={cardStyle}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>Accès &amp; corps électoral</div>

      {/* résultats cachés */}
      <button
        onClick={toggleHideResults}
        style={{
          marginTop: 14,
          width: "100%",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          border: `2px solid ${INK}`,
          borderRadius: 10,
          background: state.hideResults ? INK : CREAM,
          color: state.hideResults ? "#fff" : INK,
          padding: "10px 13px",
          fontWeight: 700,
          fontSize: 13.5,
        }}
      >
        <span
          style={{
            width: 20,
            height: 20,
            flex: "none",
            borderRadius: 6,
            border: `2px solid ${state.hideResults ? "#fff" : INK}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
          }}
        >
          {state.hideResults ? "✓" : ""}
        </span>
        Cacher les résultats jusqu'à la clôture
      </button>

      {/* mode d'accès */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>Qui peut voter ?</div>
        <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 9, lineHeight: 1.35 }}>
          Ouvert à tous via le lien, ou réservé à une liste de votants nominatifs.
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {chip(state.access === "open", "Ouvert (lien public)", () => setAccess("open"))}
          {chip(state.access === "invite", "Sur invitation", () => setAccess("invite"))}
        </div>
      </div>

      {/* corps électoral */}
      {state.access === "invite" && !isGE && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>Liste des votants</div>
          <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 9, lineHeight: 1.35 }}>
            Un nom par ligne. Chacun recevra un lien unique (1 vote par personne).
          </div>
          <textarea
            value={state.voterNames}
            onChange={(e) => setVoterNames(e.target.value)}
            placeholder={"Alice\nBob\nCharlie"}
            rows={5}
            style={{ ...inputStyle, width: "100%", fontSize: 14, padding: "10px 12px", resize: "vertical" }}
          />
        </div>
      )}

      {state.access === "invite" && isGE && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>Circonscriptions</div>
          <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 11, lineHeight: 1.35 }}>
            Chaque circonscription a un nombre de grands électeurs et sa liste de votants (un nom par
            ligne).
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {state.districts.map((d, i) => (
              <div key={i} style={{ border: `2px solid ${INK}`, borderRadius: 12, padding: 12, background: "#fff" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={d.name}
                    onChange={(e) => setDistrictField(i, "name", e.target.value)}
                    placeholder="Nom"
                    style={{ ...inputStyle, flex: 1, fontSize: 14, padding: "8px 11px" }}
                  />
                  <input
                    type="number"
                    min={0}
                    value={d.electors}
                    onChange={(e) => setDistrictField(i, "electors", Number(e.target.value))}
                    title="Grands électeurs"
                    style={{ ...inputStyle, width: 70, fontSize: 14, padding: "8px 9px" }}
                  />
                  <span style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>él.</span>
                  <button
                    onClick={() => removeDistrict(i)}
                    title="Retirer"
                    style={{
                      width: 34,
                      height: 34,
                      flex: "none",
                      border: `2px solid ${INK}`,
                      background: "#fff",
                      borderRadius: 9,
                      cursor: "pointer",
                      fontSize: 16,
                      color: REDTXT,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
                <textarea
                  value={d.voterNames}
                  onChange={(e) => setDistrictField(i, "voterNames", e.target.value)}
                  placeholder={"Votants de cette circonscription\nUn nom par ligne"}
                  rows={3}
                  style={{ ...inputStyle, width: "100%", marginTop: 8, fontSize: 13.5, padding: "9px 11px", resize: "vertical" }}
                />
              </div>
            ))}
          </div>
          <button
            onClick={addDistrict}
            style={{
              marginTop: 11,
              fontWeight: 700,
              fontSize: 13.5,
              cursor: "pointer",
              border: `2px dashed ${INK}`,
              background: "none",
              color: INK,
              padding: "9px 14px",
              borderRadius: 10,
            }}
          >
            + Ajouter une circonscription
          </button>
        </div>
      )}
    </div>
  );
}
