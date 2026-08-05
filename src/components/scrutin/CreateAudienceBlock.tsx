"use client";

// Bloc « audience de groupe » du parcours de création.
//
// Apparaît quand la création vient de la page d'un groupe (`?espace=<id>`).
// C'est la contrepartie de la disparition du formulaire intégré : le groupe ne
// crée plus, il ORIENTE — et le parcours normal doit alors offrir ce que le
// formulaire supprimé offrait, ciblage de segment et choix de régime compris.
//
// L'UI traduit l'échelle (« ce niveau et au-dessus ») en liste d'identifiants :
// la base, elle, ne connaît QUE des segments, et les quatre garanties (tout le
// segment ou rien, seuil de 5 en scellé, plafond du jour, régime annoncé au
// votant) y restent attachées au type d'audience. Rien ici n'est une garde.
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getSpace } from "@/lib/db/events";
import { listSegments, type Segment } from "@/lib/db/circles";
import { FONT_BODY, FONT_DISPLAY, INK, MUTED, SUBINK } from "./theme";

export default function CreateAudienceBlock({
  spaceId,
  segments: selected,
  sealed,
  onSegments,
  onSealed,
}: {
  spaceId: string;
  segments: string[];
  sealed: boolean;
  onSegments: (ids: string[]) => void;
  onSealed: (sealed: boolean) => void;
}) {
  const t = useTranslations("Org");
  const [spaceName, setSpaceName] = useState<string | null>(null);
  const [all, setAll] = useState<Segment[]>([]);
  const [target, setTarget] = useState("");
  const [andAbove, setAndAbove] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        // RLS propriétaire : un visiteur qui n'anime pas ce groupe obtient null,
        // et le bloc ne s'affiche pas — l'affectation échouerait de toute façon
        // en base (`forbidden`), on ne promet donc rien qu'on ne tiendra pas.
        const [sp, segs] = await Promise.all([getSpace(spaceId), listSegments(spaceId)]);
        if (cancel) return;
        setSpaceName(sp?.name ?? null);
        setAll(segs);
      } catch {
        if (!cancel) setSpaceName(null);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [spaceId]);

  // Cible → identifiants. « Et au-dessus » ne vaut que sur une échelle déclarée.
  useEffect(() => {
    if (!target) {
      onSegments([]);
      return;
    }
    const seg = all.find((g) => g.id === target);
    if (!seg) {
      onSegments([]);
      return;
    }
    if (andAbove && seg.rank != null) {
      onSegments(all.filter((g) => g.rank != null && g.rank >= (seg.rank as number)).map((g) => g.id));
    } else {
      onSegments([seg.id]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onSegments est stable (useCallback)
  }, [target, andAbove, all]);

  if (!spaceName) return null;

  const chip = (on: boolean) =>
    ({
      fontFamily: FONT_DISPLAY,
      fontWeight: 800,
      fontSize: 12.5,
      cursor: "pointer",
      border: `2px solid ${INK}`,
      background: on ? INK : "#fff",
      color: on ? "#fff" : INK,
      padding: "7px 11px",
      borderRadius: 9,
    }) as const;

  return (
    <div style={{ border: `2px dashed ${INK}`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14 }}>
        {t("createForGroup", { name: spaceName })}
      </div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 3, lineHeight: 1.45 }}>{t("createForGroupHint")}</div>

      {all.length > 0 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            aria-label={t("askAudience")}
            style={{ fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 600, padding: "7px 9px", border: `2px solid ${INK}`, borderRadius: 9, background: "#fff" }}
          >
            <option value="">{t("askAudienceAll")}</option>
            {all.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          {target && all.find((g) => g.id === target)?.rank != null && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: SUBINK, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={andAbove}
                onChange={(e) => setAndAbove(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: INK }}
              />
              {t("askAudienceAndAbove")}
            </label>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
        {[true, false].map((mode) => (
          <button key={String(mode)} onClick={() => onSealed(mode)} aria-pressed={sealed === mode} style={chip(sealed === mode)}>
            {mode ? t("modeSealed") : t("modeNamed")}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: MUTED, marginTop: 6, lineHeight: 1.45 }}>
        {sealed ? t("modeSealedHint") : t("modeNamedHint")}
      </div>
    </div>
  );
}
