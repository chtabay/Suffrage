"use client";

// MA CARTE — ce que le serveur ne dit qu'à moi, et le bulletin que j'en tire.
//
// DEUX ÉCRANS DANS UN, ET C'EST VOULU. La carte de l'innocent et celle du
// coupable ont la MÊME forme, la même hauteur, les mêmes couleurs : un regard
// d'une demi-seconde sur l'écran du voisin ne montre pas « un écran de
// coupable », il montre une carte. Seul le contenu diffère.
//
// L'INNOCENT N'A QU'UN BOUTON, et c'est le cœur de la jouabilité à huit ans :
// sa carte est déjà remplie, il ne peut pas se tromper. S'il ne confirme pas,
// le serveur déposera son bulletin d'office à la révélation — sans quoi un seul
// téléphone resté dans une poche ferait lire « les comptes sont justes » dans la
// pièce du coupable et LE BLANCHIRAIT (mesuré : l'enquête tombe à 9 %, soit
// exactement le hasard).
//
// LE COUPABLE, LUI, CHOISIT. C'est sa seule décision, et elle revient chaque
// manche : rester sur son propre souvenir, ou déclarer la pièce de quelqu'un
// qu'on lui montre, pour le coincer avec lui dans les soupçons.
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { GameSkin } from "@/lib/games/skin";
import { placeEmoji, placeLabel } from "@/lib/games/alibi/lieux";
import type { AlibiMine, AlibiSecret, AlibiSlate } from "@/lib/games/alibi/regles";
import { GBtn, GCard, GLabel } from "@/components/games/ui";

export default function MaCarte({
  skin,
  locale,
  card,
  mine,
  others,
  sending,
  onSubmit,
}: {
  skin: GameSkin;
  locale: string;
  card: AlibiSecret;
  /** Ce que j'ai déjà déposé cette manche, ou null. */
  mine: AlibiMine | null;
  /** Les autres joueurs, pour le carnet. */
  others: string[];
  sending: boolean;
  onSubmit: (bulletin: { room: number; count: number; hunch: string }) => void;
}) {
  const t = useTranslations("Alibi");
  const isCulprit = card.role === "culprit";
  const slate: AlibiSlate[] = card.slate ?? [];

  // Le choix courant : par défaut ma propre carte. Pour l'innocent il n'y a
  // rien d'autre ; pour le coupable c'est son point de départ.
  const [pick, setPick] = useState<{ room: number; count: number; place: string }>(
    mine && typeof mine.room === "number" && typeof mine.count === "number"
      ? { room: mine.room, count: mine.count, place: "" }
      : { room: card.room, count: card.count, place: card.place },
  );
  const [hunch, setHunch] = useState<string>(mine?.hunch ?? "");
  const done = mine != null && typeof mine.room === "number";
  // Repliée dès qu'elle est déposée, et rouverte à la demande.
  const [ouverte, setOuverte] = useState(false);

  const line = (place: string, count: number) => (
    <>
      <span aria-hidden style={{ marginRight: 7 }}>
        {placeEmoji(place)}
      </span>
      {t("card.youWere", { place: placeLabel(place, locale) })} · {t("card.withYou", { n: count })}
    </>
  );

  // ⚠️ LA CARTE SE REPLIE UNE FOIS DÉPOSÉE, et c'est la vraie protection du
  // secret à table. On joue à onze dans la même pièce ; la carte restait
  // affichée TOUTE la manche, et celle du coupable porte une carte de choix que
  // l'innocent n'a pas — six boutons contre aucun. Une silhouette se reconnaît
  // d'un banc à l'autre sans qu'on ait rien à lire. Repliée, les deux rôles
  // montrent exactement le même bloc. Le libellé existait déjà dans les quatre
  // langues, et n'était appelé nulle part.
  if (done && !ouverte) {
    return (
      <GCard skin={skin} accent={skin.accent} padding={16}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 16, color: skin.ink }}>
            ✓ {t("submit.confirmed")}
          </div>
          <GBtn skin={skin} variant="ghost" onClick={() => setOuverte(true)}>
            {t("card.reopen")}
          </GBtn>
        </div>
      </GCard>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* ⚠️ MÊME ACCENT POUR LES DEUX RÔLES. L'en-tête de ce fichier promet que
          « la carte de l'innocent et celle du coupable ont la MÊME forme, la
          même hauteur, les mêmes couleurs » — et trente lignes plus bas, le
          coupable recevait `accent2` là où l'innocent recevait `accent`. Une
          couleur différente se lit d'un bout de table, sans même lire. */}
      <GCard skin={skin} accent={skin.accent} padding={16}>
        <div style={{ display: "grid", gap: 9 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <GLabel skin={skin}>{t("card.title")}</GLabel>
            <span style={{ fontSize: 12.5, color: skin.muted }}>{t("card.keep")}</span>
          </div>

          <div
            style={{
              fontFamily: skin.fontDisplay,
              fontWeight: 800,
              fontSize: 19,
              lineHeight: 1.35,
              color: skin.ink,
            }}
          >
            {isCulprit ? t("card.culprit") : line(card.place, card.count)}
          </div>

          <p style={{ fontSize: 14, color: skin.muted, lineHeight: 1.5, margin: 0 }}>
            {isCulprit ? t("card.culpritHint") : t("card.innocentHint")}
          </p>

          {!isCulprit ? (
            <div style={{ fontSize: 13.5, color: skin.ink, opacity: 0.85 }}>😇 {t("card.innocent")}</div>
          ) : null}
        </div>
      </GCard>

      {/* Le choix du coupable : ses cinq noms, plus son propre souvenir. */}
      {isCulprit ? (
        <GCard skin={skin} accent={skin.accent} padding={16}>
          <div style={{ display: "grid", gap: 10 }}>
            <GLabel skin={skin}>{t("choose.title")}</GLabel>
            <p style={{ fontSize: 13.5, color: skin.muted, lineHeight: 1.5, margin: 0 }}>{t("choose.hint")}</p>

            <div style={{ display: "grid", gap: 7 }}>
              <Option
                skin={skin}
                selected={pick.room === card.room && pick.count === card.count}
                title={t("choose.myMemory")}
                detail={`${placeEmoji(card.place)} ${placeLabel(card.place, locale)} · ${t("choose.withN", { n: card.count })}`}
                chosen={t("choose.chosen")}
                onPick={() => setPick({ room: card.room, count: card.count, place: card.place })}
              />
              {slate.map((s) => (
                <Option
                  key={s.name}
                  skin={skin}
                  selected={pick.room === s.room && pick.count === s.count}
                  title={t("choose.follow", { name: s.name })}
                  detail={`${placeEmoji(s.place)} ${placeLabel(s.place, locale)} · ${t("choose.withN", { n: s.count })}`}
                  chosen={t("choose.chosen")}
                  onPick={() => setPick({ room: s.room, count: s.count, place: s.place })}
                />
              ))}
            </div>
          </div>
        </GCard>
      ) : null}

      {/* LE CARNET — la seule vraie décision de l'innocent, et ce qui le fait
          marquer. Sans lui, il ne ferait qu'appuyer sur « je confirme » pendant
          quatre manches : infaillible, mais passif. */}
      <GCard skin={skin} accent={skin.accent2} padding={16}>
        <div style={{ display: "grid", gap: 10 }}>
          <GLabel skin={skin}>📓 {t("submit.hunch")}</GLabel>
          <p style={{ fontSize: 13.5, color: skin.muted, lineHeight: 1.5, margin: 0 }}>{t("submit.hunchHint")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <Chip skin={skin} on={hunch === ""} label={t("submit.hunchNone")} onClick={() => setHunch("")} />
            {others.map((n) => (
              <Chip key={n} skin={skin} on={hunch === n} label={n} onClick={() => setHunch(n)} />
            ))}
          </div>
        </div>
      </GCard>

      <GBtn
        skin={skin}
        size="lg"
        full
        disabled={sending}
        onClick={() => {
          setOuverte(false);
          onSubmit({ room: pick.room, count: pick.count, hunch });
        }}
      >
        {sending ? t("submit.sending") : done ? t("submit.change") : t("submit.confirm")}
      </GBtn>
    </div>
  );
}

function Option({
  skin,
  selected,
  title,
  detail,
  chosen,
  onPick,
}: {
  skin: GameSkin;
  selected: boolean;
  title: string;
  detail: string;
  chosen: string;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      style={{
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        border: `${skin.border}px solid ${skin.ink}`,
        borderRadius: skin.radius - 4,
        background: selected ? skin.accent : "#fff",
        color: selected ? "#fff" : skin.ink,
        padding: "11px 13px",
        minHeight: 48,
        cursor: "pointer",
        font: "inherit",
      }}
    >
      <span>
        <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 15.5, display: "block" }}>{title}</span>
        <span style={{ fontSize: 13.5, opacity: selected ? 0.92 : 0.75 }}>{detail}</span>
      </span>
      {selected ? <span style={{ fontSize: 13, fontWeight: 800 }}>✓ {chosen}</span> : null}
    </button>
  );
}

function Chip({
  skin,
  on,
  label,
  onClick,
}: {
  skin: GameSkin;
  on: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{
        border: `${skin.border}px solid ${skin.ink}`,
        borderRadius: 999,
        background: on ? skin.accent2 : "#fff",
        color: skin.ink,
        fontFamily: skin.fontDisplay,
        fontWeight: 700,
        fontSize: 14,
        padding: "9px 13px",
        minHeight: 40,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
