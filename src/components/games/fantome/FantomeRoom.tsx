"use client";

// LE MANOIR — la machine à états d'une soirée.
//
// L'ÉTAT VIENT DU SERVEUR, JAMAIS D'ICI : rôles, fenêtre de hantise,
// dépouillement et scores sont calculés en base. Aucun navigateur ne connaît le
// Fantôme, pas même celui qui a ouvert la salle.
//
// ⚠️ L'ÉCRAN DU FANTÔME NE DOIT PAS SE RECONNAÎTRE D'UN BANC. Sa carte de rôle
// se replie comme celle des autres, et sa fenêtre de hantise emprunte
// EXACTEMENT la même carte que la ronde — même pavé, même bouton — parce que
// « montre ton écran » arrive avant la fin de la manche 1.
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { getSeat, host as hostVerbs, joinRoom, lastNick, saveSeat, type Seat } from "@/lib/games/room";
import { useGameRoom } from "@/lib/games/useGameRoom";
import { FANTOME_SKIN } from "@/lib/games/skin";
import { pieceEmoji, pieceLabel } from "@/lib/games/fantome/manoir";
import {
  MIN_BORNES,
  MIN_PLAYERS,
  RONDE_SECONDS,
  secretFor,
  type FantomeMine,
  type FantomeResult,
  type FantomeSecret,
  type FantomeState,
} from "@/lib/games/fantome/regles";
import * as verbes from "@/lib/games/fantome/verbes";
import * as albumStore from "@/lib/games/fantome/album";
import { packBeat } from "@/content/packs";
import FantomeAlbum from "@/components/games/fantome/FantomeAlbum";
import FantomeCamera from "@/components/games/fantome/FantomeCamera";
import GameShell from "@/components/games/GameShell";
import ApresLaSalle from "@/components/games/ApresLaSalle";
import JoinGate from "@/components/games/JoinGate";
import PlayerBoard from "@/components/games/PlayerBoard";
import ShareRoom from "@/components/games/ShareRoom";
import { GBtn, GCard, GLabel } from "@/components/games/ui";

const skin = FANTOME_SKIN;

/**
 * Le libellé d'une consigne photo. Un `switch` de clés ÉCRITES EN CLAIR : le
 * contrôle de parité i18n ne voit que les appels littéraux — une clé passée en
 * variable lui échappe et peut manquer dans une langue sans que rien ne le dise
 * avant que l'écran n'affiche `Fantome.photo.c.x` en toutes lettres.
 */
function carteLabel(t: ReturnType<typeof useTranslations<"Fantome">>, card: string): string {
  switch (card) {
    case "ombre_portee": return t("photo.c.ombre_portee");
    case "trace_de_doigt": return t("photo.c.trace_de_doigt");
    case "objet_hors_place": return t("photo.c.objet_hors_place");
    case "reflet": return t("photo.c.reflet");
    case "nature_morte": return t("photo.c.nature_morte");
    case "poussiere": return t("photo.c.poussiere");
    case "clef_oubliee": return t("photo.c.clef_oubliee");
    case "fenetre_noire": return t("photo.c.fenetre_noire");
    case "portrait_ancetre": return t("photo.c.portrait_ancetre");
    case "six_pieds": return t("photo.c.six_pieds");
    case "tablee_figee": return t("photo.c.tablee_figee");
    default: return card;
  }
}

export default function FantomeRoom({ code }: { code: string }) {
  const t = useTranslations("Fantome");
  const locale = useLocale();
  const router = useRouter();
  const [seat, setSeat] = useState<Seat | null>(null);
  const [seatRead, setSeatRead] = useState(false);
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [sealInput, setSealInput] = useState("");
  const [accuse, setAccuse] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [roleOpen, setRoleOpen] = useState(true);
  /** L'état propre au Fantôme, sondé en parallèle de la salle. */
  const [fs, setFs] = useState<FantomeState | null>(null);
  /** La halte déjà lue : une annonce ne se montre qu'UNE fois. */
  const [beatSeen, setBeatSeen] = useState<string | null>(null);
  const [camera, setCamera] = useState(false);

  useEffect(() => {
    setSeat(getSeat(code));
    setSeatRead(true);
  }, [code]);

  const { room, loading, missing, offline, refresh } = useGameRoom<FantomeMine, FantomeResult>(
    code,
    seat?.token ?? null,
  );

  // ⚠️ Deux RPC, une seule attente : `fantome_state` vit à côté de
  // `get_game_room` plutôt que dedans, pour ne pas réécrire une fonction
  // partagée avec Alibi — un chantier clos.
  const pollState = useCallback(async () => {
    try {
      setFs(await verbes.state(code, seat?.token ?? null));
    } catch {
      /* Un wifi de gîte qui hoquette. */
    }
  }, [code, seat?.token]);

  useEffect(() => {
    if (!seatRead) return;
    void pollState();
    const id = window.setInterval(pollState, 2000);
    return () => window.clearInterval(id);
  }, [seatRead, pollState]);

  // ⚠️ APRÈS avoir le code de la salle, jamais avant : `sweep` appelée sans
  // code effacerait l'album entier.
  useEffect(() => {
    if (!code || !albumStore.available()) return;
    void albumStore.sweep(code.toUpperCase()).catch(() => {});
  }, [code]);

  const url = typeof window === "undefined" ? "" : `${window.location.origin}/games/fantome/${code.toUpperCase()}`;
  const borneUrl = `${url}/borne`;

  const join = useCallback(
    async (name: string) => {
      setJoinErr(null);
      const a = await joinRoom(code, name);
      if (a.status !== "ok") {
        setJoinErr(
          a.status === "name_taken" ? t("join.errNameTaken")
          : a.status === "full" ? t("join.errFull")
          : a.status === "not_found" ? t("join.errNotFound")
          : a.status === "started" ? t("join.errStarted")
          : t("join.errGeneric"),
        );
        return;
      }
      const s: Seat = { code: code.toUpperCase(), token: a.token!, name: a.name ?? name, isHost: false };
      saveSeat(s);
      setSeat(s);
      await refresh();
      await pollState();
    },
    [code, refresh, pollState, t],
  );

  const shell = (children: React.ReactNode, aside?: React.ReactNode) => (
    <GameShell skin={skin} title={t("name")} emoji="👻" aside={aside} backLabel={t("back")} poweredBy={t("poweredBy")}>
      {offline && (
        <div role="status" style={{ marginBottom: 10, fontSize: 12.5, fontWeight: 700, color: skin.muted, textAlign: "center" }}>
          {t("offline")}
        </div>
      )}
      {children}
    </GameShell>
  );

  if (!seatRead || loading) {
    return shell(<GCard skin={skin} padding={18}><div style={{ color: skin.muted, fontWeight: 600 }}>{t("loading")}</div></GCard>);
  }
  if (missing) {
    return shell(
      <GCard skin={skin} accent={skin.accent} padding={18}>
        <h1 style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 23, margin: 0 }}>{t("missing.title")}</h1>
        <p style={{ color: skin.muted, fontSize: 14.5, lineHeight: 1.5 }}>{t("missing.hint")}</p>
        <GBtn skin={skin} size="lg" full onClick={() => router.push("/games/fantome")}>{t("missing.cta")}</GBtn>
      </GCard>,
    );
  }
  if (!room) return shell(<GCard skin={skin} padding={18}>{t("loading")}</GCard>);

  if (!room.me) {
    return shell(
      <>
        <JoinGate
          skin={skin}
          title={t("join.title")}
          hint={room.players.length ? t("join.hintPlayers", { n: room.players.length }) : t("join.hint")}
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
  const token = seat?.token ?? "";
  const secret = secretFor(me.secret as FantomeSecret | undefined, round?.no ?? 0);
  const mine = fs?.me ?? null;
  const bornes = fs?.bornes ?? [];
  const others = room.players.filter((p) => !p.isMe && !p.left).map((p) => p.name);
  const playerLabels = {
    joinedAt: () => "",
    host: t("players.host"),
    waiting: t("players.waiting"),
    idle: t("players.idle"),
    done: t("players.done"),
  };
  const aside = (
    <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 13, letterSpacing: "0.08em" }}>
      {round ? `${round.no}/${room.roundsTotal} · ` : ""}{room.code}
    </span>
  );

  // LA HALTE du paquet : une annonce plein écran, montrée UNE fois, que
  // n'importe qui referme. Le paquet ne change aucune règle — il pose le décor.
  const beatKey = fs?.beat ? `${fs.beat.round}:${fs.beat.when}` : null;
  const beat = fs?.beat && beatKey !== beatSeen ? packBeat(fs.pack ?? "manoir", locale, fs.beat.key) : null;

  const act = async (fn: () => Promise<{ status: string } & Record<string, unknown>>, msgs: Record<string, string>) => {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const a = await fn();
      setNotice(msgs[a.status] ?? t("join.errGeneric"));
      await Promise.all([refresh(), pollState()]);
    } catch {
      setNotice(t("join.errGeneric"));
    } finally {
      setBusy(false);
    }
  };

  const noticeLine = notice ? (
    <div role="status" style={{ fontSize: 14, fontWeight: 700, color: skin.ink, textAlign: "center", lineHeight: 1.45 }}>
      {notice}
    </div>
  ) : null;

  // ───────────────────────────────────────────────── LA HALTE DU PAQUET
  if (beat && beatKey) {
    return shell(
      <GCard skin={skin} accent={skin.accent2} padding={20}>
        <div style={{ display: "grid", gap: 12, textAlign: "center", minHeight: "42vh", alignContent: "center" }}>
          <div style={{ fontSize: 34 }} aria-hidden>🕯️</div>
          <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 21, color: skin.ink, lineHeight: 1.2 }}>
            {beat.title}
          </div>
          <p style={{ fontSize: 15.5, color: skin.muted, lineHeight: 1.6, margin: 0, maxWidth: "40ch", marginInline: "auto" }}>
            {beat.body}
          </p>
          <GBtn skin={skin} size="lg" full onClick={() => setBeatSeen(beatKey)}>
            {t("light.next")}
          </GBtn>
        </div>
      </GCard>,
      aside,
    );
  }

  // ───────────────────────────────────────────────── LE SALON
  if (room.roomStatus === "lobby" || !round) {
    const enough = room.players.length >= MIN_PLAYERS && bornes.length >= MIN_BORNES;
    return shell(
      <div style={{ display: "grid", gap: 14 }}>
        <ShareRoom
          skin={skin}
          code={room.code}
          url={url}
          text={t("share.text")}
          labels={{ code: t("share.code"), copy: t("share.copy"), copied: t("share.copied"), share: t("share.share"), whatsapp: t("share.whatsapp") }}
        />

        <GCard skin={skin} accent={skin.accent2} padding={16}>
          <div style={{ display: "grid", gap: 9 }}>
            <GLabel skin={skin}>{t("lobby.portraits")}</GLabel>
            <p style={{ fontSize: 13.5, color: skin.muted, margin: 0, lineHeight: 1.5 }}>
              {t("lobby.portraitsHint", { n: MIN_BORNES })}
            </p>
            <code
              style={{
                display: "block",
                fontFamily: skin.fontDisplay,
                fontWeight: 700,
                fontSize: 13,
                background: skin.bg,
                border: `2px solid ${skin.ink}`,
                borderRadius: skin.radius - 6,
                padding: "9px 11px",
                wordBreak: "break-all",
                color: skin.ink,
              }}
            >
              {borneUrl}
            </code>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: bornes.length >= MIN_BORNES ? skin.good : skin.accent }}>
              {t("lobby.portraitsCount", { n: bornes.length, min: MIN_BORNES })}
            </div>
            {bornes.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {bornes.map((b) => (
                  <span
                    key={b.place}
                    style={{
                      border: `2px solid ${b.alive ? skin.ink : skin.muted}`,
                      borderRadius: 999,
                      padding: "5px 11px",
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: b.alive ? skin.ink : skin.muted,
                      opacity: b.alive ? 1 : 0.6,
                    }}
                  >
                    {pieceEmoji(b.place)} {pieceLabel(b.place, locale)}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13.5, color: skin.muted }}>{t("lobby.portraitsNone")}</div>
            )}
            <p style={{ fontSize: 12.5, color: skin.muted, margin: 0, lineHeight: 1.5 }}>👥 {t("lobby.twoReaders")}</p>
            <GBtn skin={skin} variant="ghost" onClick={() => router.push(`/games/fantome/${room.code}/borne`)}>
              🖼️ {t("lobby.portraitsOpen")}
            </GBtn>
          </div>
        </GCard>

        <GCard skin={skin} accent={skin.accent} padding={16}>
          <div style={{ display: "grid", gap: 9 }}>
            <GLabel skin={skin}>{t("lobby.photoTitle")}</GLabel>
            <p style={{ fontSize: 13.5, color: skin.muted, margin: 0, lineHeight: 1.5 }}>{t("lobby.photoHint")}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  aria-pressed={mine?.photoOk === v}
                  onClick={() => act(() => verbes.photoOk(token, v), { ok: "" })}
                  style={{
                    border: `${skin.border}px solid ${skin.ink}`,
                    borderRadius: 999,
                    background: mine?.photoOk === v ? skin.accent2 : "#fff",
                    color: skin.ink,
                    fontFamily: skin.fontDisplay,
                    fontWeight: 700,
                    fontSize: 14,
                    padding: "10px 15px",
                    minHeight: 44,
                    cursor: "pointer",
                  }}
                >
                  {v ? t("lobby.photoIn") : t("lobby.photoOut")}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12.5, color: skin.muted, margin: 0, lineHeight: 1.5 }}>⚠️ {t("lobby.photoWarn")}</p>
          </div>
        </GCard>

        <div>
          <GLabel skin={skin}>{t("lobby.invite")}</GLabel>
          <div style={{ marginTop: 8 }}>
            <PlayerBoard skin={skin} players={room.players} roundNo={0} showDone={false} labels={playerLabels} showScore={false} />
          </div>
        </div>

        <p style={{ fontSize: 14, color: skin.ink, fontWeight: 700, margin: 0 }}>{t("lobby.noElimination")}</p>

        <GBtn skin={skin} size="lg" full disabled={!enough || busy} onClick={() => act(() => hostVerbs.nextRound(token, {}), { ok: "" })}>
          🕯️ {t("lobby.start")}
        </GBtn>
        <div style={{ fontSize: 13, color: skin.muted, textAlign: "center" }}>
          {room.players.length < MIN_PLAYERS
            ? t("lobby.needPlayers", { n: MIN_PLAYERS })
            : bornes.length < MIN_BORNES
              ? t("lobby.needBornes", { n: MIN_BORNES })
              : t("lobby.noElimination")}
        </div>
        {noticeLine}
      </div>,
      aside,
    );
  }

  const result = round.result;

  // ───────────────────────────────────────────────── LA RÉSOLUTION
  if (result?.final) {
    const outcome =
      result.outcome === "demasque" ? t("final.demasque")
      : result.outcome === "testament" ? t("final.testament")
      : t("final.manoir");
    const iAmGhost = secret?.role === "fantome" || me.name === result.ghost;
    return shell(
      <div style={{ display: "grid", gap: 14 }}>
        <GCard skin={skin} accent={result.outcome === "manoir" ? skin.accent : skin.good} padding={18}>
          <div style={{ display: "grid", gap: 8 }}>
            <GLabel skin={skin}>{t("final.title")}</GLabel>
            <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 25, color: skin.ink, lineHeight: 1.15 }}>
              👻 {outcome}
            </div>
            <div style={{ fontSize: 14.5, color: skin.muted }}>
              {t("final.ghostWas")} <strong style={{ color: skin.ink }}>{result.ghost}</strong>
            </div>
          </div>
        </GCard>

        {iAmGhost ? (
          <GCard skin={skin} accent={skin.accent2} padding={18}>
            <div style={{ display: "grid", gap: 8, textAlign: "center" }}>
              <GLabel skin={skin}>🎭 {t("final.tirade")}</GLabel>
              <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 20, color: skin.ink, lineHeight: 1.3 }}>
                {result.outcome === "manoir" ? t("final.tiradeWon") : t("final.tiradeLost")}
              </div>
            </div>
          </GCard>
        ) : null}

        {(fs?.album ?? []).length > 0 || (fs?.album && fs.album.length === 0) ? (
          <FantomeAlbum
            room={room.code}
            pack={fs?.pack ?? "manoir"}
            entries={fs?.album ?? []}
            behind={fs?.behind ?? []}
            cardLabel={(c) => carteLabel(t, c)}
          />
        ) : null}

        <div>
          <GLabel skin={skin}>{t("final.ranking")}</GLabel>
          <div style={{ marginTop: 8 }}>
            <PlayerBoard skin={skin} players={room.players} roundNo={round.no} showDone={false} labels={playerLabels} podium />
          </div>
        </div>

        {me.isHost ? (
          <GBtn
            skin={skin}
            size="lg"
            full
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const a = await hostVerbs.replay(token);
                const next = typeof a.code === "string" ? a.code : null;
                if (next) router.push(`/games/fantome/${next}`);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("final.replay")}
          </GBtn>
        ) : null}
        {room.nextCode ? (
          <GBtn skin={skin} variant="accent" size="lg" full onClick={() => router.push(`/games/fantome/${room.nextCode}`)}>
            {t("final.joinNew")}
          </GBtn>
        ) : null}

        <ApresLaSalle skin={skin} jeu="fantome" attenteHote={!me.isHost && !room.nextCode} />
      </div>,
      aside,
    );
  }

  // ───────────────────────────────────────────────── LA RÉUNION (reveal)
  if (round.phase === "reveal" && result) {
    const lightKnown = "light" in result;
    const events = result.events ?? [];
    const last = round.no >= room.roundsTotal;

    return shell(
      <div style={{ display: "grid", gap: 14 }}>
        <GCard skin={skin} accent={skin.accent2} padding={16}>
          <div style={{ display: "grid", gap: 10 }}>
            <GLabel skin={skin}>{t("reunion.events")}</GLabel>
            {events.length === 0 ? (
              <div style={{ fontSize: 14, color: skin.muted }}>{t("reunion.lost")}</div>
            ) : (
              events.map((ev, i) => (
                <div
                  key={i}
                  style={{
                    border: `${skin.border}px solid ${skin.ink}`,
                    borderLeft: `7px solid ${ev.kind === "panne" ? skin.muted : skin.accent}`,
                    borderRadius: skin.radius - 4,
                    background: skin.paper,
                    padding: "11px 13px",
                    display: "grid",
                    gap: 7,
                  }}
                >
                  <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 15.5, color: skin.ink }}>
                    {ev.lost || !ev.place ? (
                      t("reunion.lost")
                    ) : ev.kind === "panne" ? (
                      <>{pieceEmoji(ev.place)} {t("reunion.panne", { place: pieceLabel(ev.place, locale) })}</>
                    ) : (
                      <>🕯️ {t("reunion.haunted", { place: pieceLabel(ev.place, locale) })}</>
                    )}
                  </div>
                  {ev.at ? (
                    <div style={{ fontSize: 12.5, color: skin.muted }}>
                      {t("reunion.hauntedAt", {
                        time: new Date(ev.at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
                      })}
                    </div>
                  ) : null}
                  {!ev.lost ? (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 700, color: skin.good }}>{t("reunion.cleared")}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {ev.cleared.length === 0 ? (
                          <span style={{ fontSize: 13.5, color: skin.muted }}>{t("reunion.none")}</span>
                        ) : (
                          ev.cleared.map((n) => (
                            <span key={n} style={{ border: `2px solid ${skin.good}`, borderRadius: 999, padding: "4px 10px", fontSize: 13.5, fontWeight: 700, color: skin.ink }}>
                              {n}
                            </span>
                          ))
                        )}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: skin.muted }}>{t("reunion.silent")}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {ev.silent.length === 0 ? (
                          <span style={{ fontSize: 13.5, color: skin.muted }}>{t("reunion.none")}</span>
                        ) : (
                          ev.silent.map((n) => (
                            <span key={n} style={{ border: `2px dashed ${skin.muted}`, borderRadius: 999, padding: "4px 10px", fontSize: 13.5, fontWeight: 700, color: skin.ink }}>
                              {n}
                            </span>
                          ))
                        )}
                      </div>
                      {/* ⚠️ La phrase qui empêche l'app de fabriquer un lynchage :
                          ne pas pointer arrive à tout le monde. */}
                      <div style={{ fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>{t("reunion.silentHint")}</div>
                    </>
                  ) : null}
                </div>
              ))
            )}
            {(result.asleep ?? []).length > 0 ? (
              <div style={{ fontSize: 13.5, color: skin.muted }}>💤 {t("reunion.asleep")} : {(result.asleep ?? []).join(" · ")}</div>
            ) : null}
          </div>
        </GCard>

        {lightKnown ? (
          <GCard skin={skin} accent={result.wasGhost ? skin.good : skin.accent2} padding={16}>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 21, color: skin.ink, lineHeight: 1.25 }}>
                {result.light
                  ? result.wasGhost
                    ? t("light.was", { name: result.light })
                    : t("light.wasNot", { name: result.light })
                  : t("light.nobody")}
              </div>
              <GBtn
                skin={skin}
                size="lg"
                full
                disabled={busy}
                onClick={() =>
                  act(
                    async () => (last ? await verbes.finish(token) : await hostVerbs.nextRound(token, {})),
                    { ok: "", finished: "" },
                  )
                }
              >
                {last ? t("light.seeFinal") : t("light.next")}
              </GBtn>
            </div>
          </GCard>
        ) : (
          <GCard skin={skin} accent={skin.accent} padding={16}>
            <div style={{ display: "grid", gap: 9 }}>
              <GLabel skin={skin}>{t("vote.title")}</GLabel>
              <p style={{ fontSize: 14, color: skin.muted, lineHeight: 1.5, margin: 0 }}>{t("vote.hint")}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {others.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={(accuse || round.mine?.accuse) === n}
                    onClick={() => setAccuse(n)}
                    style={{
                      border: `${skin.border}px solid ${skin.ink}`,
                      borderRadius: 999,
                      background: (accuse || round.mine?.accuse) === n ? skin.accent : "#fff",
                      color: (accuse || round.mine?.accuse) === n ? "#fff" : skin.ink,
                      fontFamily: skin.fontDisplay,
                      fontWeight: 700,
                      fontSize: 15,
                      padding: "10px 15px",
                      minHeight: 44,
                      cursor: "pointer",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <GBtn
                skin={skin}
                size="lg"
                full
                disabled={!(accuse || round.mine?.accuse) || busy}
                onClick={() => act(() => verbes.vote(token, accuse || round.mine?.accuse || ""), { ok: "", done: "" })}
              >
                {round.mine?.accuse && !accuse
                  ? t("vote.voted", { name: round.mine.accuse })
                  : accuse
                    ? t("vote.cta", { name: accuse })
                    : t("vote.pick")}
              </GBtn>
              <div style={{ fontSize: 13, color: skin.muted, textAlign: "center" }}>
                {t("vote.progress", { done: round.submitted, total: room.expected })}
              </div>
            </div>
          </GCard>
        )}
        {noticeLine}
      </div>,
      aside,
    );
  }

  // ───────────────────────────────────────────────── LA MANCHE
  const st = mine?.stint ?? null;
  const charge = mine?.charge ?? null;
  const gauge = fs?.gauge ?? 0;
  const target = fs?.target ?? 1;

  return shell(
    <div style={{ display: "grid", gap: 14 }}>
      {/* Le rôle — ouvert à l'arrivée (il faut l'avoir lu), replié ensuite. */}
      {secret ? (
        roleOpen ? (
          <GCard skin={skin} accent={skin.accent} padding={16}>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                <GLabel skin={skin}>{t("carte.title")}</GLabel>
                <span style={{ fontSize: 12.5, color: skin.muted }}>{t("carte.keep")}</span>
              </div>
              <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 19, color: skin.ink }}>
                {secret.role === "fantome" ? t("carte.fantome")
                 : secret.role === "complice" ? t("carte.complice")
                 : secret.role === "clause" ? t("carte.clause")
                 : t("carte.heritier")}
              </div>
              <p style={{ fontSize: 14, color: skin.muted, lineHeight: 1.5, margin: 0 }}>
                {secret.role === "fantome" ? t("carte.fantomeHint")
                 : secret.role === "complice" ? t("carte.compliceHint")
                 : secret.role === "clause" ? t("carte.clauseHint")
                 : t("carte.heritierHint")}
              </p>
              {secret.complices.length > 0 ? (
                <div style={{ fontSize: 14, fontWeight: 700, color: skin.ink }}>
                  {t("carte.avecToi")} {secret.complices.join(" · ")}
                </div>
              ) : null}
              <GBtn skin={skin} variant="ghost" onClick={() => setRoleOpen(false)}>✓</GBtn>
            </div>
          </GCard>
        ) : (
          <div style={{ textAlign: "right" }}>
            <button
              type="button"
              onClick={() => setRoleOpen(true)}
              style={{ border: "none", background: "transparent", color: skin.muted, fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
            >
              {t("carte.reopen")}
            </button>
          </div>
        )
      ) : null}

      {/* LA FENÊTRE DE HANTISE — même carte, même pavé, même bouton que la
          ronde. De loin, l'écran du Fantôme est celui de tout le monde. */}
      {charge ? (
        <GCard skin={skin} accent={skin.accent2} padding={16}>
          <div style={{ display: "grid", gap: 8, textAlign: "center" }}>
            <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 22, color: skin.ink, letterSpacing: "0.06em" }}>
              {t("charge.title")}
            </div>
            <div style={{ fontSize: 14, color: skin.muted }}>{t("charge.hint", { n: charge.left })}</div>
          </div>
        </GCard>
      ) : null}

      {/* MON SCEAU. */}
      <GCard skin={skin} accent={skin.muted} padding={14}>
        <div style={{ display: "grid", gap: 4, textAlign: "center" }}>
          <GLabel skin={skin}>{t("seal.title")}</GLabel>
          <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: "clamp(34px,9vw,48px)", letterSpacing: "0.2em", color: skin.ink, lineHeight: 1.05 }}>
            {mine?.seal ?? "····"}
          </div>
          <div style={{ fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>{t("seal.hint")}</div>
        </div>
      </GCard>

      {/* LA RONDE. */}
      <GCard skin={skin} accent={st ? skin.good : skin.accent} padding={16}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <GLabel skin={skin}>{t("ronde.title")}</GLabel>
            <span style={{ fontSize: 12.5, color: skin.muted }}>
              {t("ronde.doneRound", { n: mine?.doneThisRound ?? 0 })}
            </span>
          </div>

          {st ? (
            <>
              <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 17, color: skin.ink }}>
                {pieceEmoji(st.place)} {t("ronde.at", { place: pieceLabel(st.place, locale) })}
                <span style={{ fontWeight: 600, color: skin.muted, fontSize: 14, marginLeft: 8 }}>
                  {st.duo ? t("ronde.duo") : t("ronde.solo")}
                </span>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: skin.bg, border: `2px solid ${skin.ink}`, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${Math.min(100, Math.round((st.elapsed / RONDE_SECONDS) * 100))}%`,
                    height: "100%",
                    background: skin.good,
                  }}
                />
              </div>
              <div style={{ fontSize: 13, color: skin.muted, textAlign: "center" }}>
                {t("ronde.progress", { s: Math.min(RONDE_SECONDS, st.elapsed) })}
              </div>
              {st.since >= 20 ? (
                <div role="status" style={{ fontSize: 13.5, fontWeight: 800, color: skin.accent, textAlign: "center" }}>
                  ⏳ {t("ronde.hurry")}
                </div>
              ) : null}
              {st.duo ? (
                st.signed ? (
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: skin.good, textAlign: "center" }}>
                    {t("ronde.signed", { name: "✓" })}
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 7 }}>
                    <div style={{ fontSize: 13, color: skin.muted, lineHeight: 1.45 }}>{t("ronde.duoHint")}</div>
                    <input
                      value={sealInput}
                      onChange={(e) => setSealInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      inputMode="numeric"
                      placeholder="0000"
                      aria-label={t("sign.title")}
                      style={{
                        fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 24, letterSpacing: "0.28em",
                        textAlign: "center", padding: "9px 12px", border: `${skin.border}px solid ${skin.ink}`,
                        borderRadius: skin.radius - 4, background: "#fff", color: skin.ink, width: "100%", minHeight: 50,
                      }}
                    />
                    <GBtn
                      skin={skin}
                      variant="accent"
                      full
                      disabled={sealInput.length < 4 || busy}
                      onClick={() =>
                        act(
                          () => verbes.sign(token, sealInput).then((a) => { if (a.status === "ok") setSealInput(""); return a; }),
                          {
                            ok: t("sign.ok", { name: "✓" }),
                            no_seal: t("sign.noSeal"),
                            not_here: t("sign.notHere", { name: "" }),
                            too_often: t("sign.tooOften"),
                            no_stint: t("sign.noStint"),
                          },
                        )
                      }
                    >
                      {t("sign.cta")}
                    </GBtn>
                  </div>
                )
              ) : null}
            </>
          ) : (
            <p style={{ fontSize: 13.5, color: skin.muted, lineHeight: 1.5, margin: 0 }}>{t("ronde.hint")}</p>
          )}

          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            placeholder="0000"
            aria-label={t("ronde.code")}
            style={{
              fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 30, letterSpacing: "0.3em",
              textAlign: "center", padding: "10px 12px", border: `${skin.border}px solid ${skin.ink}`,
              borderRadius: skin.radius - 4, background: "#fff", color: skin.ink, width: "100%", minHeight: 56,
            }}
          />
          <GBtn
            skin={skin}
            size="lg"
            full
            disabled={codeInput.length < 4 || busy}
            onClick={async () => {
              if (busy) return;
              setBusy(true);
              setNotice(null);
              try {
                // La fenêtre de hantise emprunte le MÊME bouton : de loin,
                // rien ne distingue les deux gestes.
                const a = charge
                  ? await verbes.haunt(token, codeInput)
                  : await verbes.beat(token, codeInput);
                const place = typeof a.place === "string" ? pieceLabel(a.place, locale) : "";
                setCodeInput("");
                setNotice(
                  a.status === "ok" ? t("charge.ok", { place })
                  : a.status === "started" ? t("ronde.okStarted", { place })
                  : a.status === "beat" ? t("ronde.okBeat", { place })
                  : a.status === "done" ? t("ronde.okDone", { place })
                  : a.status === "need_sign" ? t("ronde.needSign")
                  : a.status === "no_code" ? t("ronde.noCode")
                  : a.status === "too_fast" ? t("ronde.tooFast")
                  : a.status === "closed" ? t("ronde.closed")
                  : a.status === "left" ? t("ronde.left")
                  : a.status === "no_charge" ? t("charge.missed")
                  : t("join.errGeneric"),
                );
                await Promise.all([refresh(), pollState()]);
              } catch {
                setNotice(t("join.errGeneric"));
              } finally {
                setBusy(false);
              }
            }}
          >
            {charge ? t("charge.cta") : st ? t("ronde.again") : t("ronde.cta")}
          </GBtn>
          {noticeLine}
        </div>
      </GCard>

      {/* MA CONSIGNE PHOTO. */}
      {secret?.card && mine?.photoOk !== false ? (
        <GCard skin={skin} accent={skin.accent2} padding={16}>
          <div style={{ display: "grid", gap: 8 }}>
            <GLabel skin={skin}>📷 {t("photo.title")}</GLabel>
            <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 16.5, color: skin.ink, lineHeight: 1.3 }}>
              {carteLabel(t, secret.card)}
            </div>
            {mine?.photoDone ? (
              <div style={{ fontSize: 13.5, fontWeight: 700, color: skin.good }}>{t("photo.done")}</div>
            ) : (
              <>
                <GBtn skin={skin} variant="accent" full disabled={busy} onClick={() => setCamera(true)}>
                  📷 {t("photo.cta")}
                </GBtn>
                <div style={{ fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>{t("photo.where")}</div>
              </>
            )}
          </div>
        </GCard>
      ) : null}

      {camera && secret?.card ? (
        <FantomeCamera
          label={carteLabel(t, secret.card)}
          onClose={() => setCamera(false)}
          onShot={async (blob) => {
            // ⚠️ L'IMAGE NE PART PAS. Elle est rangée dans le navigateur de son
            // auteur ; le serveur n'apprend QUE qu'une photo a été prise pour
            // cette consigne, et l'album l'effacera dès qu'elle aura été montrée.
            try {
              if (albumStore.available() && round) {
                await albumStore.put(room.code, round.no, secret.card!, blob);
              }
            } catch {
              /* Magasin plein ou refusé : la consigne compte quand même. */
            }
            setCamera(false);
            await act(() => verbes.photo(token), { ok: t("photo.done"), already: "" });
          }}
        />
      ) : null}

      {/* LA JAUGE DU TESTAMENT. */}
      <GCard skin={skin} accent={skin.good} padding={14}>
        <div style={{ display: "grid", gap: 6 }}>
          <GLabel skin={skin}>📜 {t("gauge.title")}</GLabel>
          <div style={{ height: 12, borderRadius: 999, background: skin.bg, border: `2px solid ${skin.ink}`, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, Math.round((gauge / target) * 100))}%`, height: "100%", background: skin.accent2 }} />
          </div>
          <div style={{ fontSize: 12.5, color: skin.muted, textAlign: "center" }}>
            {t("gauge.hint", { done: gauge, total: target })}
          </div>
        </div>
      </GCard>

      {/* Sonner la réunion — n'importe qui. */}
      <div style={{ display: "grid", gap: 8 }}>
        {confirmClose ? (
          <GBtn skin={skin} variant="accent" size="lg" full disabled={busy} onClick={() => {
            setConfirmClose(false);
            void act(() => hostVerbs.reveal(token), { ok: "", too_early: t("close.tooEarly") });
          }}>
            {t("close.confirm")}
          </GBtn>
        ) : (
          <GBtn skin={skin} size="lg" full disabled={busy} onClick={() => setConfirmClose(true)}>
            🔔 {t("close.cta")}
          </GBtn>
        )}
        <div style={{ fontSize: 12.5, color: skin.muted, textAlign: "center" }}>{t("close.hint")}</div>
      </div>
    </div>,
    aside,
  );
}
