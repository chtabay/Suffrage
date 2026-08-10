"use client";

// UNE PARTIE D'UNANIMO, DE BOUT EN BOUT.
//
// Ce composant est le seul à connaître les règles du jeu ; tout ce qu'il utilise
// autour (salle, joueurs, phases, sondage, partage, entrée en cours de partie)
// vient de `src/lib/games/*` et `src/components/games/*`, qui ignorent Unanimo.
//
// LES QUATRE ÉTATS DE L'ÉCRAN, et le fait qu'ils ne sont PAS quatre pages : la
// partie est un fil (SALON → MANCHE → RÉVÉLATION → … → FIN), et l'URL ne change
// jamais. Un joueur qui rouvre son lien retombe exactement là où le groupe en
// est, quoi qu'il ait manqué.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { getSeat, host as hostVerbs, joinRoom, lastNick, saveSeat, submitEntry, type Seat } from "@/lib/games/room";
import { useGameRoom } from "@/lib/games/useGameRoom";
import { pickTheme } from "@/lib/games/unanimo/themes";
import { UNANIMO_SKIN } from "@/lib/games/skin";
import GameShell from "@/components/games/GameShell";
import JoinGate from "@/components/games/JoinGate";
import PlayerBoard from "@/components/games/PlayerBoard";
import ShareRoom from "@/components/games/ShareRoom";
import { GBtn, GCard, GLabel } from "@/components/games/ui";
import RevealBoard, { type UnanimoResult } from "./RevealBoard";
import WordsInput from "./WordsInput";

const skin = UNANIMO_SKIN;

export default function UnanimoRoom({ code }: { code: string }) {
  const t = useTranslations("Unanimo");
  const router = useRouter();
  const [seat, setSeat] = useState<Seat | null>(null);
  const [seatRead, setSeatRead] = useState(false);
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // « Modifier mes mots » : rouvre la saisie alors qu'on a déjà envoyé.
  const [editing, setEditing] = useState(false);

  // Le jeton vit dans le localStorage : on ne peut le lire qu'après le montage,
  // sinon le rendu serveur et le rendu client ne diraient pas la même chose.
  useEffect(() => {
    setSeat(getSeat(code));
    setSeatRead(true);
  }, [code]);

  const { room, loading, missing, offline, refresh } = useGameRoom<string[], UnanimoResult>(code, seat?.token ?? null);

  const url = useMemo(
    () => (typeof window === "undefined" ? "" : `${window.location.origin}/games/unanimo/${code.toUpperCase()}`),
    [code],
  );

  const join = useCallback(
    async (name: string) => {
      setJoinErr(null);
      const a = await joinRoom(code, name);
      if (a.status !== "ok") {
        setJoinErr(
          a.status === "name_taken"
            ? t("join.errNameTaken")
            : a.status === "full"
              ? t("join.errFull")
              : a.status === "not_found"
                ? t("join.errNotFound")
                : t("join.errGeneric"),
        );
        return;
      }
      const s: Seat = { code: code.toUpperCase(), token: a.token, name: a.name, isHost: false };
      saveSeat(s);
      setSeat(s);
      await refresh();
    },
    [code, refresh, t],
  );

  // Un verbe d'hôte, puis un rafraîchissement IMMÉDIAT : sans lui, l'hôte
  // attendrait le prochain battement du sondage pour voir son propre geste.
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch {
      /* le sondage reprendra la main ; l'indicateur « hors ligne » le dira */
    } finally {
      setBusy(false);
    }
  };

  const shell = (children: React.ReactNode, aside?: React.ReactNode) => (
    <GameShell
      skin={skin}
      title={t("name")}
      emoji="🧠"
      aside={aside}
      backLabel={t("back")}
      poweredBy={t("poweredBy")}
    >
      {offline && (
        <div
          role="status"
          style={{ marginBottom: 10, fontSize: 12.5, fontWeight: 700, color: skin.muted, textAlign: "center" }}
        >
          {t("offline")}
        </div>
      )}
      {children}
    </GameShell>
  );

  if (!seatRead || loading) {
    return shell(
      <GCard skin={skin} padding={18}>
        <div style={{ color: skin.muted, fontWeight: 600 }}>{t("loading")}</div>
      </GCard>,
    );
  }

  if (missing) {
    return shell(
      <GCard skin={skin} accent={skin.accent} padding={18}>
        <h1 style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 23, margin: 0 }}>{t("missing.title")}</h1>
        <p style={{ color: skin.muted, fontSize: 14.5, lineHeight: 1.5 }}>{t("missing.hint")}</p>
        <GBtn skin={skin} size="lg" full onClick={() => router.push("/games/unanimo")}>
          {t("missing.cta")}
        </GBtn>
      </GCard>,
    );
  }
  if (!room) return shell(<GCard skin={skin} padding={18}>{t("loading")}</GCard>);

  // Pas encore de place dans cette salle : le seul écran possible, et il est court.
  if (!room.me) {
    return shell(
      <>
        <JoinGate
          skin={skin}
          title={t("join.title")}
          hint={room.players.length ? t("join.hintPlayers", { count: room.players.length }) : t("join.hint")}
          placeholder={t("join.placeholder")}
          cta={t("join.cta")}
          busyLabel={t("join.busy")}
          error={joinErr}
          initialName={lastNick()}
          onJoin={join}
        />
        <div style={{ marginTop: 14 }}>
          <GLabel skin={skin}>{t("rules.title")}</GLabel>
          <p style={{ color: skin.muted, fontSize: 14, lineHeight: 1.55, margin: "6px 0 0" }}>{t("rules.body")}</p>
        </div>
      </>,
    );
  }

  const me = room.me;
  const round = room.round;
  const isHost = me.isHost;
  const maxWords = Math.max(1, Math.min(20, Number(room.settings?.words ?? 8) || 8));
  const shareText = t("share.text");
  const playerLabels = {
    joinedAt: (n: number) => t("players.joinedAt", { n }),
    host: t("players.host"),
    waiting: t("players.waiting"),
    idle: t("players.idle"),
    done: t("players.done"),
  };

  const progress = round ? t("wait.progress", { n: round.submitted, total: room.expected }) : "";

  const shareBlock = (compact: boolean) => (
    <ShareRoom
      skin={skin}
      code={room.code}
      url={url}
      text={shareText}
      compact={compact}
      labels={{
        code: t("share.code"),
        copy: t("share.copy"),
        copied: t("share.copied"),
        share: t("share.share"),
        whatsapp: t("share.whatsapp"),
      }}
    />
  );

  const ranking = (podium: boolean) => (
    <div>
      <GLabel skin={skin}>{podium ? t("final.ranking") : t("rank.title")}</GLabel>
      <div style={{ marginTop: 8 }}>
        <PlayerBoard
          skin={skin}
          players={room.players}
          roundNo={room.roundNo}
          showDone={!podium && round?.phase === "contribution"}
          labels={playerLabels}
          podium={podium}
        />
      </div>
    </div>
  );

  const counter = (
    <span
      style={{
        fontFamily: skin.fontDisplay,
        fontWeight: 800,
        fontSize: 13,
        background: skin.paper,
        border: `2px solid ${skin.ink}`,
        borderRadius: 999,
        padding: "4px 11px",
      }}
    >
      {room.roundNo > 0 ? t("round.of", { n: room.roundNo, total: room.roundsTotal }) : room.code}
    </span>
  );

  // ─────────────────────────────────────────────────────── SALON
  if (room.roomStatus === "lobby") {
    return shell(
      <div style={{ display: "grid", gap: 16 }}>
        <GCard skin={skin} accent={skin.accent} padding={16}>
          <GLabel skin={skin}>{t("lobby.invite")}</GLabel>
          <div style={{ marginTop: 10 }}>{shareBlock(false)}</div>
        </GCard>

        {ranking(false)}

        {isHost ? (
          <GCard skin={skin} padding={16}>
            <GLabel skin={skin}>{t("lobby.rounds")}</GLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <GBtn
                skin={skin}
                variant="ghost"
                onClick={() => void act(() => hostVerbs.setRounds(seat!.token, room.roundsTotal - 1))}
                disabled={busy || room.roundsTotal <= 1}
                aria-label={t("lobby.fewer")}
              >
                −
              </GBtn>
              <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 30, minWidth: 42, textAlign: "center" }}>
                {room.roundsTotal}
              </span>
              <GBtn
                skin={skin}
                variant="ghost"
                onClick={() => void act(() => hostVerbs.setRounds(seat!.token, room.roundsTotal + 1))}
                disabled={busy || room.roundsTotal >= 50}
                aria-label={t("lobby.more")}
              >
                +
              </GBtn>
              <span style={{ fontSize: 12.5, color: skin.muted, fontWeight: 600 }}>{t("lobby.roundsHint")}</span>
            </div>
            <GBtn
              skin={skin}
              size="lg"
              full
              style={{ marginTop: 14 }}
              disabled={busy}
              onClick={() =>
                void act(() => hostVerbs.nextRound(seat!.token, pickTheme(room.locale, room.usedPrompts)))
              }
            >
              {t("lobby.start")}
            </GBtn>
          </GCard>
        ) : (
          <GCard skin={skin} padding={16}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{t("lobby.waitHost")}</div>
            <p style={{ color: skin.muted, fontSize: 13.5, lineHeight: 1.5, margin: "6px 0 0" }}>{t("rules.body")}</p>
          </GCard>
        )}
      </div>,
      counter,
    );
  }

  // ─────────────────────────────────────────────────────── FIN DE PARTIE
  if (room.roomStatus === "ended") {
    const top = room.players[0];
    const tie = room.players.filter((p) => p.score === top?.score).length > 1;
    return shell(
      <div style={{ display: "grid", gap: 16 }}>
        <GCard skin={skin} accent={skin.accent2} padding={18}>
          <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 13, color: skin.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {t("final.title")}
          </div>
          <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: "clamp(26px,8vw,38px)", lineHeight: 1.05, marginTop: 4 }}>
            {tie ? t("final.tie") : t("final.winner", { name: top?.name ?? "" })}
          </div>
          <div style={{ fontSize: 13.5, color: skin.muted, marginTop: 6, fontWeight: 600 }}>
            {t("final.rounds", { count: room.roundNo })}
          </div>
        </GCard>

        {ranking(true)}

        {/* La nouvelle salle ouverte par l'hôte : c'est l'action principale de
            tout le monde dès qu'elle existe. */}
        {room.nextCode && (
          <GBtn
            skin={skin}
            size="lg"
            full
            disabled={busy}
            onClick={() =>
              void act(async () => {
                const a = await joinRoom(room.nextCode!, me.name);
                if (a.status === "ok") {
                  saveSeat({ code: room.nextCode!, token: a.token, name: a.name, isHost: false });
                  router.push(`/games/unanimo/${room.nextCode}`);
                }
              })
            }
          >
            ▶ {t("final.joinNew")}
          </GBtn>
        )}

        {isHost && !room.nextCode && (
          <div style={{ display: "grid", gap: 9 }}>
            <GBtn
              skin={skin}
              size="lg"
              full
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  const a = await hostVerbs.replay(seat!.token);
                  if (a.status === "ok" && typeof a.code === "string") {
                    // `game_replay` rend le jeton d'hôte de la salle neuve.
                    if (typeof a.token === "string") {
                      saveSeat({ code: a.code, token: a.token, name: me.name, isHost: true });
                    }
                    router.push(`/games/unanimo/${a.code}`);
                  }
                })
              }
            >
              🔄 {t("final.replay")}
            </GBtn>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              {[1, 3].map((n) => (
                <GBtn
                  skin={skin}
                  key={n}
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void act(() => hostVerbs.setRounds(seat!.token, room.roundsTotal + n))}
                >
                  {t("host.more", { count: n })}
                </GBtn>
              ))}
            </div>
          </div>
        )}
        {!isHost && !room.nextCode && (
          <div style={{ fontSize: 13.5, color: skin.muted, fontWeight: 600, textAlign: "center" }}>
            {t("final.waitHost")}
          </div>
        )}

        <GCard skin={skin} padding={14}>
          <GLabel skin={skin}>{t("lobby.invite")}</GLabel>
          <div style={{ marginTop: 10 }}>{shareBlock(true)}</div>
        </GCard>
      </div>,
      counter,
    );
  }

  // ─────────────────────────────────────────────────────── MANCHE EN COURS
  if (!round) return shell(<GCard skin={skin} padding={18}>{t("loading")}</GCard>, counter);

  const themeCard = (
    <GCard skin={skin} accent={skin.accent} padding={18} style={{ textAlign: "center" }}>
      <GLabel skin={skin}>{t("round.theme")}</GLabel>
      <div style={{ fontSize: 40, lineHeight: 1.1, marginTop: 6 }} aria-hidden>
        {round.prompt.emoji ?? "💡"}
      </div>
      <div
        style={{
          fontFamily: skin.fontDisplay,
          fontWeight: 800,
          fontSize: "clamp(28px,9vw,44px)",
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
          marginTop: 2,
        }}
      >
        {round.prompt.text}
      </div>
    </GCard>
  );

  // Le bouton de l'hôte. IL N'EST JAMAIS DÉSACTIVÉ PAR LES ABSENTS : c'est la
  // règle la plus importante du lot — un téléphone abandonné ne fige pas la
  // partie. Le compteur est là pour éclairer la décision, pas pour la bloquer.
  const revealBtn = round.phase === "contribution" && isHost && (
    <GCard skin={skin} padding={14}>
      <GBtn skin={skin} variant="accent" size="lg" full disabled={busy} onClick={() => void act(() => hostVerbs.reveal(seat!.token))}>
        👀 {t("host.reveal")}
      </GBtn>
      <div style={{ marginTop: 7, fontSize: 12.5, color: skin.muted, fontWeight: 600, textAlign: "center" }}>
        {progress} · {t("host.revealHint")}
      </div>
    </GCard>
  );

  // Suis-je dans CETTE manche ? Un retardataire entré pendant la manche 3 porte
  // `joinedRound = 4` : il est dans la salle sans être dans le coup.
  const inRound = me.joinedRound <= room.roundNo;

  if (round.phase === "contribution") {
    // Retardataire : il voit la partie vivre sans jamais voir la manche.
    if (!inRound) {
      return shell(
        <div style={{ display: "grid", gap: 16 }}>
          <GCard skin={skin} accent={skin.accent2} padding={18}>
            <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 21 }}>
              {t("late.title", { n: me.joinedRound })}
            </div>
            <p style={{ color: skin.muted, fontSize: 14, lineHeight: 1.5, margin: "8px 0 0" }}>{t("late.hint")}</p>
          </GCard>
          <div style={{ textAlign: "center", fontWeight: 700, fontSize: 14.5 }}>{progress}</div>
          {ranking(false)}
        </div>,
        counter,
      );
    }

    const sent = round.mine !== null;
    if (!sent || editing) {
      return shell(
        <div style={{ display: "grid", gap: 16 }}>
          {themeCard}
          <div>
            <p style={{ color: skin.muted, fontSize: 13.5, lineHeight: 1.5, margin: "0 0 10px" }}>
              {t("round.instructions", { max: maxWords })}
            </p>
            <WordsInput
              key={`${round.no}-${editing}`}
              skin={skin}
              max={maxWords}
              initial={round.mine ?? []}
              theme={round.prompt.text ?? ""}
              busy={busy}
              labels={{
                placeholder: t("input.placeholder"),
                add: t("input.add"),
                count: (n, max) => t("input.count", { n, max }),
                send: sent ? t("input.update") : t("input.send"),
                sending: t("input.sending"),
                duplicate: (w) => t("input.duplicate", { word: w }),
                isTheme: t("input.isTheme"),
                full: t("input.full", { max: maxWords }),
                remove: (w) => t("input.remove", { word: w }),
              }}
              onSubmit={(words) =>
                act(async () => {
                  await submitEntry(seat!.token, { words });
                  setEditing(false);
                })
              }
            />
          </div>
          {revealBtn}
        </div>,
        counter,
      );
    }

    // Envoyé : on attend, et on voit AVANCER — jamais le contenu des autres.
    return shell(
      <div style={{ display: "grid", gap: 16 }}>
        <GCard skin={skin} accent={skin.good} padding={16} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 34 }} aria-hidden>
            ✅
          </div>
          <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 21, marginTop: 2 }}>
            {t("wait.done")}
          </div>
          <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 27, marginTop: 8 }}>{progress}</div>
          <p style={{ color: skin.muted, fontSize: 13, lineHeight: 1.5, margin: "6px 0 0" }}>{t("wait.hint")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 12 }}>
            {(round.mine ?? []).map((w) => (
              <span
                key={w}
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: `2px solid ${skin.ink}`,
                  background: skin.paper,
                }}
              >
                {w}
              </span>
            ))}
          </div>
          <GBtn skin={skin} variant="ghost" size="sm" style={{ marginTop: 12 }} onClick={() => setEditing(true)}>
            ✏️ {t("wait.edit")}
          </GBtn>
        </GCard>
        {revealBtn}
        {ranking(false)}
      </div>,
      counter,
    );
  }

  // ─────────────────────────────────────────────────────── RÉVÉLATION
  const last = room.roundNo >= room.roundsTotal;
  return shell(
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ textAlign: "center" }}>
        <span style={{ fontSize: 26 }} aria-hidden>
          {round.prompt.emoji}
        </span>
        <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em" }}>
          {round.prompt.text}
        </div>
      </div>

      {round.result && (
        <RevealBoard
          skin={skin}
          result={round.result}
          myName={me.name}
          labels={{
            common: t("reveal.common"),
            alone: t("reveal.alone"),
            nobodyElse: t("reveal.nobodyElse"),
            myRound: t("reveal.myRound"),
            roundTable: t("reveal.roundTable"),
            noAnswer: t("reveal.noAnswer"),
            andMore: (n) => t("reveal.andMore", { n }),
            empty: t("reveal.empty"),
          }}
        />
      )}

      {ranking(false)}

      {isHost ? (
        <GCard skin={skin} padding={14}>
          {last ? (
            <>
              <GBtn skin={skin} size="lg" full disabled={busy} onClick={() => void act(() => hostVerbs.end(seat!.token))}>
                🏆 {t("host.finish")}
              </GBtn>
              <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 9 }}>
                {[1, 3].map((n) => (
                  <GBtn
                    skin={skin}
                    key={n}
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void act(() => hostVerbs.setRounds(seat!.token, room.roundsTotal + n))}
                  >
                    {t("host.more", { count: n })}
                  </GBtn>
                ))}
              </div>
            </>
          ) : (
            <GBtn
              skin={skin}
              size="lg"
              full
              disabled={busy}
              onClick={() => void act(() => hostVerbs.nextRound(seat!.token, pickTheme(room.locale, room.usedPrompts)))}
            >
              ▶ {t("host.next")}
            </GBtn>
          )}
        </GCard>
      ) : (
        <div style={{ fontSize: 13.5, color: skin.muted, fontWeight: 600, textAlign: "center" }}>
          {last ? t("final.waitHost") : t("host.waitNext")}
        </div>
      )}
    </div>,
    counter,
  );
}
