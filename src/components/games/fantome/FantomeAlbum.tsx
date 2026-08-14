"use client";

// L'ALBUM DU MANOIR — le dernier moment, et le seul climax collectif du jeu.
//
// Une consigne est annoncée, ceux qui l'ont prise lèvent leur écran en même
// temps, la pièce compare et rit. Le rire vient de la COMPARAISON, pas de la
// photo — d'où l'annonce par consigne, jamais par joueur.
//
// ⚠️ ON EFFACE À MESURE. Chaque photo est supprimée d'IndexedDB dès que sa
// vignette s'éteint, pendant que la pièce rit — pas à la fermeture de la page.
// Une purge « à la sortie » ne s'exécuterait jamais dans le cas nominal : on
// joue une fois, en vacances, sur le téléphone d'un enfant, et l'application
// n'est plus rouverte.
//
// ⚠️ AUCUN VOTE. Un bulletin « laquelle est la meilleure ? » EST la liste de
// ceux qui ont montré : il publie celui qui a passé son tour. On enlève le
// bulletin plutôt que de le maquiller — la pièce dit tout haut laquelle elle
// préfère, ce qu'aucun logiciel ne fait mieux.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { packTexts } from "@/content/packs";
import * as album from "@/lib/games/fantome/album";
import { FANTOME_SKIN } from "@/lib/games/skin";
import { GBtn, GCard, GLabel } from "@/components/games/ui";

const skin = FANTOME_SKIN;

export interface AlbumEntry {
  card: string;
  takers: string[];
  gone: string[];
}

export default function FantomeAlbum({
  room,
  pack,
  entries,
  behind,
  cardLabel,
}: {
  room: string;
  pack: string;
  entries: AlbumEntry[];
  behind: string[];
  cardLabel: (card: string) => string;
}) {
  const t = useTranslations("Fantome");
  const locale = useLocale();
  const txt = useMemo(() => packTexts(pack, locale).album, [pack, locale]);
  const [i, setI] = useState(-1);
  const [url, setUrl] = useState<string | null>(null);
  const [erased, setErased] = useState(false);
  const [closed, setClosed] = useState(false);

  const current = i >= 0 && i < entries.length ? entries[i] : null;

  // La photo de CETTE consigne, si je l'ai prise. Personne ne peut allumer
  // l'écran d'un autre : chacun lève le sien.
  useEffect(() => {
    let dead = false;
    let made: string | null = null;
    setUrl(null);
    setErased(false);
    if (!current) return;
    void (async () => {
      try {
        const all = await album.mine(room);
        const shot = all.find((s) => s.card === current.card);
        if (dead || !shot) return;
        made = URL.createObjectURL(shot.blob);
        setUrl(made);
      } catch {
        /* Pas de magasin : on montre la consigne, sans image. */
      }
    })();
    return () => {
      dead = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [current, room]);

  /** ⚠️ Le geste qui tient la promesse : on efface EN AVANÇANT. */
  const next = useCallback(async () => {
    if (current) {
      try {
        await album.drop(`${room}:0:${current.card}`);
        const all = await album.mine(room);
        for (const s of all.filter((x) => x.card === current.card)) await album.drop(s.id);
        setErased(true);
      } catch {
        /* Rien à effacer : on avance quand même. */
      }
    }
    if (i + 1 >= entries.length) {
      try {
        await album.clearRoom(room);
      } catch {
        /* idem */
      }
      setClosed(true);
      return;
    }
    setI(i + 1);
  }, [current, i, entries.length, room]);

  if (closed) {
    return (
      <GCard skin={skin} accent={skin.good} padding={18}>
        <div style={{ display: "grid", gap: 8, textAlign: "center" }}>
          <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 21, color: skin.ink }}>
            📕 {txt.done}
          </div>
          <div style={{ fontSize: 13.5, color: skin.muted, lineHeight: 1.5 }}>{txt.doneHint}</div>
        </div>
      </GCard>
    );
  }

  // ── L'ouverture.
  if (i < 0) {
    return (
      <GCard skin={skin} accent={skin.accent2} padding={18}>
        <div style={{ display: "grid", gap: 10, textAlign: "center" }}>
          <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 23, color: skin.ink, letterSpacing: "0.04em" }}>
            📔 {txt.open}
          </div>
          <div style={{ fontSize: 14.5, color: skin.muted, lineHeight: 1.5 }}>{txt.openHint}</div>
          {entries.length === 0 ? (
            <div style={{ fontSize: 14, color: skin.muted, lineHeight: 1.5 }}>{txt.none}</div>
          ) : (
            <>
              {behind.length > 0 ? (
                <div
                  style={{
                    border: `2px dashed ${skin.accent}`,
                    borderRadius: skin.radius - 4,
                    padding: "10px 12px",
                    fontSize: 13.5,
                    color: skin.ink,
                    lineHeight: 1.45,
                    textAlign: "left",
                  }}
                >
                  {behind.map((n) => (
                    <div key={n}>🙈 {txt.behind.replace(/\{name\}/g, n)}</div>
                  ))}
                </div>
              ) : null}
              <GBtn skin={skin} size="lg" full onClick={() => setI(0)}>
                {txt.open}
              </GBtn>
            </>
          )}
        </div>
      </GCard>
    );
  }

  if (!current) return null;

  return (
    <GCard skin={skin} accent={skin.accent2} padding={16}>
      <div style={{ display: "grid", gap: 10, textAlign: "center" }}>
        <GLabel skin={skin}>
          {i + 1} / {entries.length}
        </GLabel>
        <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 18.5, color: skin.ink, lineHeight: 1.3 }}>
          {cardLabel(current.card)}
        </div>
        <div style={{ fontSize: 13.5, color: skin.muted }}>
          {txt.callTakers
            .replace(/\{n,\s*plural,[^}]*=0\s*\{([^}]*)\}[^}]*one\s*\{([^}]*)\}[^}]*other\s*\{([^}]*)\}\s*\}/, (
              _m: string,
              zero: string,
              one: string,
              other: string,
            ) => (current.takers.length === 0 ? zero : current.takers.length === 1 ? one : other))
            .replace(/#/g, String(current.takers.length))}
        </div>

        {current.takers.length === 0 ? (
          <div style={{ fontSize: 14, color: skin.muted }}>{txt.skip}</div>
        ) : (
          <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 17, color: skin.accent }}>
            📱 {txt.raise}
          </div>
        )}

        {url ? (
          // Luminosité au maximum : l'écran est levé à bout de bras dans une
          // pièce sombre. `alt` reste vide — c'est une image que personne ne
          // décrit, pas un contenu.
          // `next/image` optimise des images SERVIES ; celle-ci est un blob local
          // qui ne quitte jamais l'appareil et sera effacé dans la minute. Le passer
          // par un optimiseur n'aurait aucun sens, et le ferait transiter là où tout
          // ce chantier s'applique à ce qu'il ne transite pas.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            style={{
              width: "100%",
              maxHeight: "52vh",
              objectFit: "contain",
              borderRadius: skin.radius - 4,
              border: `${skin.border}px solid ${skin.ink}`,
              filter: "brightness(1.12)",
              background: "#000",
            }}
          />
        ) : null}

        {current.gone.length > 0 ? (
          <div style={{ fontSize: 13, color: skin.muted }}>
            {current.gone.map((n) => (
              <div key={n}>💤 {txt.gone.replace(/\{name\}/g, n)}</div>
            ))}
          </div>
        ) : null}

        {erased ? <div style={{ fontSize: 12.5, color: skin.good, fontWeight: 700 }}>✓ {txt.erased}</div> : null}

        <GBtn skin={skin} size="lg" full onClick={() => void next()}>
          {i + 1 >= entries.length ? t("final.title") : txt.nextCard}
        </GBtn>
      </div>
    </GCard>
  );
}
