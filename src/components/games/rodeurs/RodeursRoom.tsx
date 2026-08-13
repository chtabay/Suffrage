"use client";

// LA MAISON — la machine à états d'une soirée de Rôdeurs.
//
// SIX ÉCRANS, UN SEUL À LA FOIS : le salon (âges et arrivées), la manche (mon
// code, ma mission, taper un code, mes rencontres), la clôture (les listes,
// « on t'a approché », le vote), la lumière, la résolution — et la porte
// d'entrée quand on n'a pas encore de place.
//
// L'ÉTAT VIENT DU SERVEUR, JAMAIS D'ICI : rôles, missions, marques et scores
// sont calculés en base. Aucun navigateur ne connaît les rôdeurs — pas même
// celui de l'hôte.
//
// ⚠️ L'ÉCRAN DU RÔDEUR NE DOIT PAS SE RECONNAÎTRE D'UN BANC. L'attaque du
// chantier l'a écrit : « montre ton écran » arrive avant la fin de la manche 1.
// La marque ne vit donc PAS dans une carte à part : chaque ligne de « Mes
// rencontres » s'ouvre d'un tap — tout le monde a la même liste, les mêmes
// chevrons — et seul le CONTENU du panneau diffère selon le rôle. De loin, les
// deux écrans sont identiques.
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { getSeat, host as hostVerbs, joinRoom, lastNick, saveSeat, type Seat } from "@/lib/games/room";
import { useGameRoom } from "@/lib/games/useGameRoom";
import { RODEURS_SKIN } from "@/lib/games/skin";
import { placeEmoji, placeLabel } from "@/lib/games/alibi/lieux";
import {
  MIN_PLAYERS,
  RODEURS_PLACES,
  secretFor,
  type Band,
  type RodeursApproached,
  type RodeursMeet,
  type RodeursMine,
  type RodeursMission,
  type RodeursResult,
  type RodeursSecret,
} from "@/lib/games/rodeurs/regles";
import * as verbes from "@/lib/games/rodeurs/verbes";
import GameShell from "@/components/games/GameShell";
import JoinGate from "@/components/games/JoinGate";
import PlayerBoard from "@/components/games/PlayerBoard";
import ShareRoom from "@/components/games/ShareRoom";
import { GBtn, GCard, GLabel } from "@/components/games/ui";

const skin = RODEURS_SKIN;

/**
 * Le libellé d'une mission. Un `switch` de clés ÉCRITES EN CLAIR, exprès : le
 * contrôle de parité i18n ne voit que les appels littéraux — une clé passée en
 * variable lui échappe et peut manquer dans une langue sans que rien ne le dise
 * (règle du dépôt, payée deux fois).
 */
function missionLabel(
  t: ReturnType<typeof useTranslations<"Rodeurs">>,
  m: RodeursMission,
  locale: string,
): string {
  const cible = m.args.cible ?? "";
  const lieu = m.args.lieu ? placeLabel(m.args.lieu, locale) : "";
  const n = m.args.n ?? 2;
  switch (m.pattern) {
    case "VALIDE_PAR":
      return t("mission.p.VALIDE_PAR", { cible });
    case "VALIDE_PAR_N":
      return t("mission.p.VALIDE_PAR_N", { n });
    case "DANS_LIEU":
      return t("mission.p.DANS_LIEU", { lieu });
    case "DEUX_LIEUX":
      return t("mission.p.DEUX_LIEUX");
    case "VALIDE_N":
      return t("mission.p.VALIDE_N", { n });
    case "ALLER_RETOUR":
      return t("mission.p.ALLER_RETOUR", { cible });
    case "LIEUX_N":
      return t("mission.p.LIEUX_N", { n });
    case "PAIRE_LIEU":
      return t("mission.p.PAIRE_LIEU");
    case "EVITE":
      return t("mission.p.EVITE", { cible });
    case "TABLEE":
      return t("mission.p.TABLEE", { n });
    case "CHAINE":
      return t("mission.p.CHAINE", { cible });
    case "PREMIER":
      return t("mission.p.PREMIER");
    case "DISCRET":
      return t("mission.p.DISCRET");
    default:
      return m.pattern;
  }
}

export default function RodeursRoom({ code }: { code: string }) {
  const t = useTranslations("Rodeurs");
  const locale = useLocale();
  const router = useRouter();
  const [seat, setSeat] = useState<Seat | null>(null);
  const [seatRead, setSeatRead] = useState(false);
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Le dernier retour d'un geste (rencontre scellée, marque posée, refus…). */
  const [notice, setNotice] = useState<string | null>(null);
  const [sealInput, setSealInput] = useState("");
  const [placePick, setPlacePick] = useState<string>(RODEURS_PLACES[0]);
  /** La ligne de rencontre dépliée (id), pour tout le monde. */
  const [openMeet, setOpenMeet] = useState<string | null>(null);
  /** La pièce d'une fausse piste en cours de choix, par rencontre. */
  const [fakePick, setFakePick] = useState<string | null>(null);
  const [accuse, setAccuse] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  // Ouvert par défaut : il faut avoir LU son rôle une fois. Le joueur le replie
  // lui-même — replié, les deux rôles montrent exactement le même écran.
  const [roleOpen, setRoleOpen] = useState(true);

  useEffect(() => {
    setSeat(getSeat(code));
    setSeatRead(true);
  }, [code]);

  const { room, loading, missing, offline, refresh } = useGameRoom<RodeursMine, RodeursResult>(
    code,
    seat?.token ?? null,
  );

  const url = typeof window === "undefined" ? "" : `${window.location.origin}/games/rodeurs/${code.toUpperCase()}`;

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
                : a.status === "started"
                  ? t("join.errStarted")
                  : t("join.errGeneric"),
        );
        return;
      }
      const s: Seat = { code: code.toUpperCase(), token: a.token!, name: a.name ?? name, isHost: false };
      saveSeat(s);
      setSeat(s);
      await refresh();
    },
    [code, refresh, t],
  );

  const shell = (children: React.ReactNode, aside?: React.ReactNode) => (
    <GameShell skin={skin} title={t("name")} emoji="🔦" aside={aside} backLabel={t("back")} poweredBy={t("poweredBy")}>
      {offline && (
        <div role="status" style={{ marginBottom: 10, fontSize: 12.5, fontWeight: 700, color: skin.muted, textAlign: "center" }}>
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
        <GBtn skin={skin} size="lg" full onClick={() => router.push("/games/rodeurs")}>
          {t("missing.cta")}
        </GBtn>
      </GCard>,
    );
  }
  if (!room) {
    return shell(
      <GCard skin={skin} padding={18}>
        {t("loading")}
      </GCard>,
    );
  }

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
  const secret = secretFor(me.secret as RodeursSecret | undefined, round?.no ?? 0);
  const isRodeur = secret?.role === "rodeur";
  const meets = (me.meets as RodeursMeet[] | null) ?? [];
  const approached = (me.approached as RodeursApproached[] | null) ?? [];
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
      {round ? `${t("round.of", { no: round.no, total: room.roundsTotal })} · ` : ""}
      {room.code}
    </span>
  );

  const act = async (fn: () => Promise<{ status: string } & Record<string, unknown>>, messages: Record<string, string>) => {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const a = await fn();
      setNotice(messages[a.status] ?? t("join.errGeneric"));
      await refresh();
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

  // ───────────────────────────────────────────────── LE SALON
  if (room.roomStatus === "lobby" || !round) {
    const enough = room.players.length >= MIN_PLAYERS;
    return shell(
      <div style={{ display: "grid", gap: 14 }}>
        <ShareRoom
          skin={skin}
          code={room.code}
          url={url}
          text={t("share.text")}
          labels={{
            code: t("share.code"),
            copy: t("share.copy"),
            copied: t("share.copied"),
            share: t("share.share"),
            whatsapp: t("share.whatsapp"),
          }}
        />
        <p style={{ fontSize: 13, color: skin.muted, lineHeight: 1.5, margin: 0 }}>{t("share.screens")}</p>

        <GCard skin={skin} accent={skin.accent2} padding={16}>
          <div style={{ display: "grid", gap: 9 }}>
            <GLabel skin={skin}>{t("lobby.band")}</GLabel>
            <p style={{ fontSize: 13.5, color: skin.muted, margin: 0 }}>{t("lobby.bandHint")}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["petit", "moyen", "grand"] as Band[]).map((b) => (
                <button
                  key={b}
                  type="button"
                  aria-pressed={me.band === b}
                  onClick={() => act(() => verbes.setBand(token, b), { ok: "" })}
                  style={{
                    border: `${skin.border}px solid ${skin.ink}`,
                    borderRadius: 999,
                    background: me.band === b ? skin.accent2 : "#fff",
                    color: skin.ink,
                    fontFamily: skin.fontDisplay,
                    fontWeight: 700,
                    fontSize: 14.5,
                    padding: "10px 15px",
                    minHeight: 44,
                    cursor: "pointer",
                  }}
                >
                  {b === "petit" ? t("lobby.petit") : b === "moyen" ? t("lobby.moyen") : t("lobby.grand")}
                </button>
              ))}
            </div>
          </div>
        </GCard>

        <div>
          <GLabel skin={skin}>{t("lobby.invite")}</GLabel>
          <div style={{ marginTop: 8 }}>
            <PlayerBoard skin={skin} players={room.players} roundNo={0} showDone={false} labels={playerLabels} showScore={false} />
          </div>
        </div>

        <p style={{ fontSize: 14, color: skin.ink, fontWeight: 700, margin: 0 }}>{t("lobby.noElimination")}</p>

        {/* Le lancement n'est PAS un verbe d'hôte : n'importe qui, dès cinq. */}
        <GBtn
          skin={skin}
          size="lg"
          full
          disabled={!enough || busy}
          onClick={() => act(() => hostVerbs.nextRound(token, {}), { ok: "" })}
        >
          🎴 {t("lobby.start")}
        </GBtn>
        <div style={{ fontSize: 13, color: skin.muted, textAlign: "center" }}>
          {enough ? t("lobby.waitAll") : t("lobby.needPlayers", { n: MIN_PLAYERS })}
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
      result.outcome === "nette" ? t("final.nette") : result.outcome === "un_reste" ? t("final.unReste") : t("final.perdu");
    return shell(
      <div style={{ display: "grid", gap: 14 }}>
        <GCard skin={skin} accent={result.outcome === "nette" ? skin.good : skin.accent2} padding={18}>
          <div style={{ display: "grid", gap: 8 }}>
            <GLabel skin={skin}>{t("final.title")}</GLabel>
            <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 26, color: skin.ink, lineHeight: 1.15 }}>
              🔦 {outcome}
            </div>
            <div style={{ fontSize: 14.5, color: skin.muted }}>
              {t("final.rodeursWere")} <strong style={{ color: skin.ink }}>{(result.rodeurs ?? []).join(" · ")}</strong>
            </div>
          </div>
        </GCard>

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
                if (next) router.push(`/games/rodeurs/${next}`);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("final.replay")}
          </GBtn>
        ) : null}
        {room.nextCode ? (
          <GBtn skin={skin} variant="accent" size="lg" full onClick={() => router.push(`/games/rodeurs/${room.nextCode}`)}>
            {t("final.joinNew")}
          </GBtn>
        ) : null}
      </div>,
      aside,
    );
  }

  // ───────────────────────────────────────────────── LA CLÔTURE (reveal)
  if (round.phase === "reveal" && result) {
    const lightKnown = "light" in result;
    const lots = result.lots ?? [];
    const lastRound = round.no >= room.roundsTotal;

    return shell(
      <div style={{ display: "grid", gap: 14 }}>
        {/* « ON T'A APPROCHÉ » — la victime d'abord : c'est son moment. */}
        {approached.length > 0 &&
          approached.map((a, i) => {
            const names = a.place
              ? [...new Set(meets.filter((m) => m.place === a.place).map((m) => m.name))]
              : [...new Set(meets.map((m) => m.name))];
            return (
              <GCard key={i} skin={skin} accent={skin.accent} padding={16}>
                <div style={{ display: "grid", gap: 9 }}>
                  <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 21, color: skin.ink }}>
                    🔦 {t("approached.title")}
                  </div>
                  <div style={{ fontSize: 15.5, fontWeight: 700, color: skin.ink }}>
                    {a.place ? t("approached.at", { place: placeLabel(a.place, locale) }) : t("approached.anywhere")}
                  </div>
                  <div style={{ fontSize: 13.5, color: skin.muted }}>
                    {a.place ? t("approached.names") : t("approached.all")}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {names.map((n) => (
                      <span
                        key={n}
                        style={{
                          border: `${skin.border}px solid ${skin.ink}`,
                          borderRadius: 999,
                          padding: "6px 12px",
                          background: skin.paper,
                          fontFamily: skin.fontDisplay,
                          fontWeight: 800,
                          fontSize: 14.5,
                          color: skin.ink,
                        }}
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 13.5, color: skin.muted }}>{t("approached.one")}</div>
                  {a.published ? (
                    <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 15, color: skin.good }}>
                      ✓ {t("approached.publishedOk")}
                    </div>
                  ) : (
                    <>
                      <GBtn skin={skin} size="lg" full disabled={busy} onClick={() => act(() => verbes.publish(token), { ok: t("approached.publishedOk") })}>
                        {t("approached.publish")} ({t("approached.publishPlus")})
                      </GBtn>
                      {secret?.mission?.secret ? (
                        <div style={{ fontSize: 13, fontWeight: 700, color: skin.accent, textAlign: "center" }}>
                          ⚠️ {t("approached.burnWarn")}
                        </div>
                      ) : null}
                      <div style={{ fontSize: 13, color: skin.muted, textAlign: "center" }}>{t("approached.keep")}</div>
                    </>
                  )}
                </div>
              </GCard>
            );
          })}

        {/* Les listes publiques. */}
        <GCard skin={skin} accent={skin.accent2} padding={16}>
          <div style={{ display: "grid", gap: 10 }}>
            <GLabel skin={skin}>{t("reveal.lots")}</GLabel>
            {lots.length === 0 ? (
              <div style={{ fontSize: 14, color: skin.muted }}>{t("reveal.none")}</div>
            ) : (
              lots.map((lot, i) => (
                <div
                  key={i}
                  style={{
                    border: `${skin.border}px solid ${skin.ink}`,
                    borderLeft: `7px solid ${skin.accent}`,
                    borderRadius: skin.radius - 4,
                    background: skin.paper,
                    padding: "11px 13px",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 15.5, color: skin.ink }}>
                    {lot.place ? (
                      <>
                        <span aria-hidden style={{ marginRight: 6 }}>{placeEmoji(lot.place)}</span>
                        {t("reveal.lotAt", { place: placeLabel(lot.place, locale) })}
                      </>
                    ) : (
                      t("reveal.lotSomewhere")
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: skin.muted }}>
                    {lot.published && lot.victim ? t("reveal.published", { name: lot.victim }) : t("reveal.silent")} · {t("reveal.hasMet")}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {lot.names.map((n) => (
                      <span
                        key={n}
                        style={{
                          border: `2px solid ${skin.muted}`,
                          borderRadius: 999,
                          padding: "4px 10px",
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: skin.ink,
                        }}
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
            {(result.noMeet ?? []).length > 0 ? (
              <div style={{ fontSize: 14, color: skin.ink }}>
                <strong>🕳 {t("reveal.noMeet")} :</strong> {(result.noMeet ?? []).join(" · ")}
              </div>
            ) : null}
            {(result.asleep ?? []).length > 0 ? (
              <div style={{ fontSize: 13.5, color: skin.muted }}>
                💤 {t("reveal.asleep")} : {(result.asleep ?? []).join(" · ")}
              </div>
            ) : null}
          </div>
        </GCard>

        {/* La confrontation — ou son verdict. */}
        {lightKnown ? (
          <GCard skin={skin} accent={result.wasRodeur ? skin.good : skin.accent2} padding={16}>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 21, color: skin.ink }}>
                {result.light
                  ? result.wasRodeur
                    ? t("light.was", { name: result.light })
                    : t("light.wasNot", { name: result.light })
                  : t("light.nobody")}
              </div>
              <GBtn skin={skin} size="lg" full disabled={busy} onClick={() => act(() => hostVerbs.nextRound(token, {}), { ok: "", finished: "" })}>
                {lastRound ? t("light.seeFinal") : t("light.next")}
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
                {busy
                  ? t("loading")
                  : round.mine?.accuse && !accuse
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

  // ───────────────────────────────────────────────── LA MANCHE (contribution)
  const fakesLeft = secret?.faux_left ?? 0;
  return shell(
    <div style={{ display: "grid", gap: 14 }}>
      {/* Le rôle — replié après lecture, identique pour tous une fois replié. */}
      {secret ? (
        roleOpen ? (
          <GCard skin={skin} accent={skin.accent} padding={16}>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                <GLabel skin={skin}>{t("carte.title")}</GLabel>
                <span style={{ fontSize: 12.5, color: skin.muted }}>{t("carte.keep")}</span>
              </div>
              <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 19, color: skin.ink }}>
                {isRodeur ? t("carte.rodeur") : t("carte.habitant")}
              </div>
              <p style={{ fontSize: 14, color: skin.muted, lineHeight: 1.5, margin: 0 }}>
                {isRodeur ? t("carte.rodeurHint") : t("carte.habitantHint")}
              </p>
              {isRodeur && secret.complices.length > 0 ? (
                <div style={{ fontSize: 14, fontWeight: 700, color: skin.ink }}>
                  {t("carte.complices")} {secret.complices.join(" · ")}
                </div>
              ) : null}
              <GBtn skin={skin} variant="ghost" onClick={() => setRoleOpen(false)}>
                ✓
              </GBtn>
            </div>
          </GCard>
        ) : (
          <div style={{ textAlign: "right" }}>
            <button
              type="button"
              onClick={() => setRoleOpen(true)}
              style={{
                border: "none",
                background: "transparent",
                color: skin.muted,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {t("carte.reopen")}
            </button>
          </div>
        )
      ) : null}

      {/* MON CODE — gros, lisible d'en face. */}
      <GCard skin={skin} accent={skin.accent2} padding={16}>
        <div style={{ display: "grid", gap: 6, textAlign: "center" }}>
          <GLabel skin={skin}>{t("seal.title")}</GLabel>
          <div
            style={{
              fontFamily: skin.fontDisplay,
              fontWeight: 800,
              fontSize: "clamp(44px,12vw,64px)",
              letterSpacing: "0.22em",
              color: skin.ink,
              lineHeight: 1.05,
            }}
          >
            {secret?.seal ?? "····"}
          </div>
          <div style={{ fontSize: 13, color: skin.muted, lineHeight: 1.45 }}>{t("seal.hint")}</div>
        </div>
      </GCard>

      {/* MA MISSION. */}
      {secret?.mission ? (
        <GCard skin={skin} accent={secret.mission.secret ? skin.accent : skin.good} padding={16}>
          <div style={{ display: "grid", gap: 7 }}>
            <GLabel skin={skin}>
              {secret.mission.secret ? `🤫 ${t("mission.secretTitle")}` : `🎯 ${t("mission.title")}`}
            </GLabel>
            <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 17.5, color: skin.ink, lineHeight: 1.3 }}>
              {missionLabel(t, secret.mission, locale)}
            </div>
            {secret.mission.secret ? (
              <div style={{ fontSize: 13, color: skin.muted, lineHeight: 1.45 }}>{t("mission.secretHint")}</div>
            ) : null}
          </div>
        </GCard>
      ) : null}

      {/* TAPER UN CODE. */}
      <GCard skin={skin} accent={skin.accent} padding={16}>
        <div style={{ display: "grid", gap: 10 }}>
          <GLabel skin={skin}>{t("tap.title")}</GLabel>
          <p style={{ fontSize: 13.5, color: skin.muted, lineHeight: 1.5, margin: 0 }}>{t("tap.hint")}</p>
          <input
            value={sealInput}
            onChange={(e) => setSealInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            placeholder="0000"
            aria-label={t("tap.title")}
            style={{
              fontFamily: skin.fontDisplay,
              fontWeight: 800,
              fontSize: 30,
              letterSpacing: "0.3em",
              textAlign: "center",
              padding: "10px 12px",
              border: `${skin.border}px solid ${skin.ink}`,
              borderRadius: skin.radius - 4,
              background: "#fff",
              color: skin.ink,
              width: "100%",
              minHeight: 56,
            }}
          />
          <div style={{ fontSize: 13, fontWeight: 700, color: skin.muted }}>{t("tap.place")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {RODEURS_PLACES.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={placePick === p}
                onClick={() => setPlacePick(p)}
                style={{
                  border: `${skin.border}px solid ${skin.ink}`,
                  borderRadius: 999,
                  background: placePick === p ? skin.accent2 : "#fff",
                  color: skin.ink,
                  fontFamily: skin.fontDisplay,
                  fontWeight: 700,
                  fontSize: 13.5,
                  padding: "8px 12px",
                  minHeight: 40,
                  cursor: "pointer",
                }}
              >
                {placeEmoji(p)} {placeLabel(p, locale)}
              </button>
            ))}
          </div>
          <GBtn
            skin={skin}
            size="lg"
            full
            disabled={sealInput.length < 4 || busy}
            onClick={async () => {
              if (busy) return;
              setBusy(true);
              setNotice(null);
              try {
                const a = await verbes.meet(token, sealInput, placePick);
                const nom = a.name ?? "";
                if (a.status === "ok" || a.status === "already") setSealInput("");
                setNotice(
                  a.status === "ok"
                    ? t("tap.ok", { name: nom })
                    : a.status === "already"
                      ? t("tap.already", { name: nom })
                      : a.status === "complice"
                        ? t("tap.complice", { name: nom })
                        : a.status === "no_seal"
                          ? t("tap.noSeal")
                          : a.status === "self"
                            ? t("tap.self")
                            : a.status === "too_many"
                              ? t("tap.tooMany")
                              : a.status === "closed"
                                ? t("tap.closed")
                                : a.status === "left"
                                  ? t("tap.left")
                                  : t("join.errGeneric"),
                );
                await refresh();
              } catch {
                setNotice(t("join.errGeneric"));
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("tap.cta")}
          </GBtn>
          {noticeLine}
        </div>
      </GCard>

      {/* MES RENCONTRES — la même liste pour tout le monde ; chaque ligne
          s'ouvre, et seul le contenu du panneau change selon le rôle. */}
      <GCard skin={skin} accent={skin.muted} padding={16}>
        <div style={{ display: "grid", gap: 8 }}>
          <GLabel skin={skin}>{t("meets.title")}</GLabel>
          {meets.length === 0 ? (
            <div style={{ fontSize: 14, color: skin.muted, lineHeight: 1.5 }}>{t("meets.empty")}</div>
          ) : (
            meets.map((m) => {
              const open = openMeet === m.id;
              const otherPlaces = [...new Set(meets.filter((x) => x.place !== m.place).map((x) => x.place))];
              return (
                <div
                  key={m.id}
                  style={{
                    border: `${skin.border}px solid ${skin.ink}`,
                    borderRadius: skin.radius - 4,
                    background: skin.paper,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMeet(open ? null : m.id);
                      setFakePick(null);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      width: "100%",
                      padding: "11px 13px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      font: "inherit",
                      color: skin.ink,
                    }}
                  >
                    <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 15.5 }}>
                      {m.name}
                      <span style={{ fontWeight: 600, color: skin.muted, fontSize: 13.5, marginLeft: 8 }}>
                        {placeEmoji(m.place)} {placeLabel(m.place, locale)}
                      </span>
                    </span>
                    <span aria-hidden style={{ color: skin.muted }}>{open ? "▴" : "▾"}</span>
                  </button>
                  {open ? (
                    <div style={{ padding: "0 13px 12px", display: "grid", gap: 8 }}>
                      {isRodeur ? (
                        <>
                          {fakesLeft > 0 && otherPlaces.length > 0 ? (
                            <>
                              <div style={{ fontSize: 13, fontWeight: 700, color: skin.muted }}>
                                {t("mark.fakeHint", { n: fakesLeft })}
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {otherPlaces.map((p) => (
                                  <button
                                    key={p}
                                    type="button"
                                    aria-pressed={fakePick === p}
                                    onClick={() => setFakePick(fakePick === p ? null : p)}
                                    style={{
                                      border: `2px solid ${skin.ink}`,
                                      borderRadius: 999,
                                      background: fakePick === p ? skin.accent2 : "#fff",
                                      color: skin.ink,
                                      fontWeight: 700,
                                      fontSize: 13,
                                      padding: "6px 11px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    {placeEmoji(p)} {placeLabel(p, locale)}
                                  </button>
                                ))}
                              </div>
                            </>
                          ) : null}
                          <GBtn
                            skin={skin}
                            variant="accent"
                            full
                            disabled={busy}
                            onClick={() => {
                              const alibi = fakePick
                                ? meets.find((x) => x.place === fakePick && x.id !== m.id)?.id ?? null
                                : null;
                              void act(() => verbes.mark(token, m.id, alibi), {
                                ok: fakePick ? t("mark.faked", { name: m.name }) : t("mark.done", { name: m.name }),
                                complice: t("tap.complice", { name: m.name }),
                                closed: t("mark.closed"),
                                no_fake_left: t("mark.fakeHint", { n: 0 }),
                              });
                              setOpenMeet(null);
                            }}
                          >
                            🔦 {t("mark.cta")} — {m.name}
                          </GBtn>
                          <div style={{ fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>{t("mark.hint")}</div>
                        </>
                      ) : (
                        <div style={{ fontSize: 13, color: skin.muted, lineHeight: 1.45 }}>
                          {placeEmoji(m.place)} {placeLabel(m.place, locale)} — {t("tap.already", { name: m.name })}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </GCard>

      {/* Clore, et se coucher — pour tout le monde, avec confirmation. */}
      <div style={{ display: "grid", gap: 8 }}>
        {confirmClose ? (
          <GBtn skin={skin} variant="accent" size="lg" full disabled={busy} onClick={() => {
            setConfirmClose(false);
            void act(() => hostVerbs.reveal(token), { ok: "" });
          }}>
            {t("close.confirm")}
          </GBtn>
        ) : (
          <GBtn skin={skin} size="lg" full disabled={busy} onClick={() => setConfirmClose(true)}>
            👁 {t("close.cta")}
          </GBtn>
        )}
        <div style={{ fontSize: 12.5, color: skin.muted, textAlign: "center" }}>{t("close.hint")}</div>

        <div style={{ textAlign: "center", marginTop: 6 }}>
          {confirmLeave ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setConfirmLeave(false);
                void act(() => verbes.leave(token), { ok: "" });
              }}
              style={{
                border: `${skin.border}px solid ${skin.accent}`,
                borderRadius: 999,
                background: "#fff",
                color: skin.accent,
                fontWeight: 800,
                fontSize: 13.5,
                padding: "9px 14px",
                cursor: "pointer",
              }}
            >
              {t("leave.confirm")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmLeave(true)}
              style={{
                border: "none",
                background: "transparent",
                color: skin.muted,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              💤 {t("leave.cta")}
            </button>
          )}
          {confirmLeave ? (
            <div style={{ fontSize: 12.5, color: skin.muted, marginTop: 5 }}>{t("leave.warn")}</div>
          ) : null}
        </div>
      </div>
    </div>,
    aside,
  );
}
