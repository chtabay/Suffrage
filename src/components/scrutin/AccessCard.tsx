"use client";

import { useTranslations } from "next-intl";
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

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      aria-label={label}
      style={{
        width: "100%",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        border: `2px solid ${INK}`,
        borderRadius: 10,
        background: on ? INK : CREAM,
        color: on ? "#fff" : INK,
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
          border: `2px solid ${on ? "#fff" : INK}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
        }}
      >
        {on ? "✓" : ""}
      </span>
      {label}
    </button>
  );
}

export default function AccessCard({ ctrl }: { ctrl: ScrutinController }) {
  const t = useTranslations("Access");
  const {
    state,
    toggleHideResults,
    setPublicListing,
    setProposalsPhase,
    setVoterNames,
    setDistrictField,
    addDistrict,
    removeDistrict,
    toggleCloseOnComplete,
  } = ctrl;
  const isGE = state.recipe.suffrage === "indirect";
  const invite = state.access === "invite";

  return (
    <div style={cardStyle}>
      {/* Le choix Vote rapide / vérifié vit désormais TOUJOURS visible au-dessus
          (AccessModeChips) ; cette carte ne porte plus que le corps électoral et
          les options liées (résultats cachés, propositions, publication, clôture). */}
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>{t("title")}</div>

      {/* résultats cachés */}
      <div style={{ marginTop: 16 }}>
        <Toggle on={state.hideResults} label={t("hideResults")} onClick={toggleHideResults} />
      </div>

      {/* phase de propositions : les votants ajoutent des options avant le vote.
          Disponible sur tout vote à propositions (rapide OU vérifié), hors dates,
          affectation et grands électeurs. Le scrutin reste privé pendant la collecte
          et ne peut être publié qu'une fois la liste figée. */}
      {state.optionKind === "text" && !isGE && (
        <div style={{ marginTop: 10 }}>
          <Toggle
            on={state.proposalsPhase}
            label={t("proposalsLabel")}
            onClick={() => setProposalsPhase(!state.proposalsPhase)}
          />
          {state.proposalsPhase && (
            <div style={{ marginTop: 7, fontSize: 12.5, color: MUTED, lineHeight: 1.45 }}>
              {t("proposalsHint")}
            </div>
          )}
        </div>
      )}

      {/* feed public : uniquement en vote ouvert. Impossible tant qu'on collecte
          (liste non figée) → on l'annonce au lieu du toggle. */}
      {!invite && (
        <div style={{ marginTop: 10 }}>
          {state.proposalsPhase && state.optionKind === "text" ? (
            <div
              style={{
                fontSize: 12.5,
                color: MUTED,
                lineHeight: 1.45,
                background: CREAM,
                border: `2px solid ${INK}`,
                borderRadius: 10,
                padding: "9px 12px",
              }}
            >
              {t("publishAfterOpen")}
            </div>
          ) : (
            <>
              <Toggle
                on={state.publicListing}
                label={t("publishLabel")}
                onClick={() => setPublicListing(!state.publicListing)}
              />
              {state.publicListing && (
                <div style={{ marginTop: 7, fontSize: 12.5, color: MUTED, lineHeight: 1.45 }}>
                  {t("publishConsent")}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* clôture sur complétude (invitation) */}
      {invite && (
        <div style={{ marginTop: 10 }}>
          <Toggle
            on={state.closeOnComplete}
            label={t("closeOnComplete")}
            onClick={toggleCloseOnComplete}
          />
        </div>
      )}

      {/* corps électoral */}
      {invite && !isGE && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>{t("votersTitle")}</div>
          <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 9, lineHeight: 1.35 }}>
            {t("votersHint")}
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

      {invite && isGE && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>{t("districtsTitle")}</div>
          <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 11, lineHeight: 1.35 }}>
            {t("districtsHint")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {state.districts.map((d, i) => (
              <div key={i} style={{ border: `2px solid ${INK}`, borderRadius: 12, padding: 12, background: "#fff" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={d.name}
                    onChange={(e) => setDistrictField(i, "name", e.target.value)}
                    placeholder={t("districtNamePlaceholder")}
                    style={{ ...inputStyle, flex: 1, fontSize: 14, padding: "8px 11px" }}
                  />
                  <input
                    type="number"
                    min={0}
                    value={d.electors}
                    onChange={(e) => setDistrictField(i, "electors", Number(e.target.value))}
                    title={t("electorsTitle")}
                    style={{ ...inputStyle, width: 70, fontSize: 14, padding: "8px 9px" }}
                  />
                  <span style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>{t("electorsAbbr")}</span>
                  <button
                    onClick={() => removeDistrict(i)}
                    title={t("removeDistrictTitle")}
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
                  placeholder={t("districtVotersPlaceholder")}
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
            {t("addDistrict")}
          </button>
        </div>
      )}
    </div>
  );
}
