"use client";

// LA MAISON — la machine à états d'une partie d'Alibi.
//
// SIX ÉCRANS, ET UN SEUL À LA FOIS : le salon (on attend tout le monde), ma
// carte (je confirme et je note mon soupçon), l'attente (j'ai déposé), les
// comptes (la manche est dépouillée), l'accusation, la résolution.
//
// L'ÉTAT VIENT DU SERVEUR, JAMAIS D'ICI. Le rôle, la pièce, le nombre
// d'occupants et le dépouillement sont entièrement calculés en base : ce
// composant ne fait que LIRE `room` et choisir quoi afficher. C'est ce qui
// permet de dire, sans réserve, qu'aucun navigateur ne connaît le coupable —
// pas même celui de l'hôte.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { getSeat, host as hostVerbs, joinRoom, lastNick, saveSeat, submitEntry, type Seat } from "@/lib/games/room";
import { useGameRoom } from "@/lib/games/useGameRoom";
import { ALIBI_ALERT, ALIBI_SKIN } from "@/lib/games/skin";
import { cardFor, isVerdictRound, type AlibiMine, type AlibiResult, type AlibiSecret } from "@/lib/games/alibi/regles";
import GameShell from "@/components/games/GameShell";
import JoinGate from "@/components/games/JoinGate";
import PlayerBoard from "@/components/games/PlayerBoard";
import ShareRoom from "@/components/games/ShareRoom";
import { GBtn, GCard, GLabel } from "@/components/games/ui";
import MaCarte from "./MaCarte";
import LesComptes from "./LesComptes";

const skin = ALIBI_SKIN;

export default function AlibiRoom({ code }: { code: string }) {
  const t = useTranslations("Alibi");
  const locale = useLocale();
  const router = useRouter();
  const [seat, setSeat] = useState<Seat | null>(null);
  const [seatRead, setSeatRead] = useState(false);
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [accuse, setAccuse] = useState<string>("");
  /** Un dépôt qui n'a pas abouti. Sans lui, on croit avoir voté. */
  const [envoiKo, setEnvoiKo] = useState(false);

  // Le jeton vit dans le localStorage : on ne peut le lire qu'APRÈS le montage,
  // sinon le rendu serveur et le rendu client ne diraient pas la même chose.
  useEffect(() => {
    setSeat(getSeat(code));
    setSeatRead(true);
  }, [code]);

  const { room, loading, missing, offline, refresh } = useGameRoom<AlibiMine, AlibiResult>(code, seat?.token ?? null);

  const url = useMemo(
    () => (typeof window === "undefined" ? "" : `${window.location.origin}/games/alibi/${code.toUpperCase()}`),
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
                : // `started` : le roster est fermé au lancement. C'est une RÈGLE,
                  // pas une panne, et le message l'explique — sinon on croit à un bug.
                  a.status === "started"
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
    <GameShell skin={skin} title={t("name")} emoji="🕯️" aside={aside} backLabel={t("back")} poweredBy={t("poweredBy")}>
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
        <GBtn skin={skin} size="lg" full onClick={() => router.push("/games/alibi")}>
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

  // Pas encore de place dans cette salle.
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
  const isHost = me.isHost;
  const token = seat?.token ?? "";
  const others = room.players.filter((p) => !p.isMe).map((p) => p.name);
  const playerLabels = {
    joinedAt: () => "",
    host: t("players.host"),
    waiting: t("players.waiting"),
    idle: t("players.idle"),
    done: t("players.done"),
  };

  // ⚠️ UN DÉPÔT REFUSÉ DOIT SE DIRE. Il n'y avait ni `catch` ni lecture du
  // statut rendu : une coupure réseau, ou un refus du serveur (`closed`,
  // `waiting`, `invalid`), passait en silence — on croyait avoir voté. Sur la
  // manche d'accusation, c'est la voix qui disparaît.
  const send = async (payload: Record<string, unknown>) => {
    if (!token || busy) return;
    setBusy(true);
    setEnvoiKo(false);
    try {
      const a = await submitEntry(token, payload);
      if (a?.status !== "ok") throw new Error(a?.status ?? "ko");
      await refresh();
    } catch {
      setEnvoiKo(true);
    } finally {
      setBusy(false);
    }
  };

  const echecLigne = envoiKo ? (
    <div role="alert" style={{ fontSize: 14, fontWeight: 800, color: ALIBI_ALERT, lineHeight: 1.45 }}>
      {t("join.errGeneric")}
    </div>
  ) : null;

  const hostBar = (children: React.ReactNode) =>
    isHost ? <div style={{ marginTop: 14, display: "grid", gap: 8 }}>{children}</div> : null;

  const aside = <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, letterSpacing: "0.12em" }}>{room.code}</span>;

  // ───────────────────────────────────────────────── LE SALON
  if (room.roomStatus === "lobby" || !round) {
    return shell(
      <div style={{ display: "grid", gap: 14 }}>
        {/* `ShareRoom` colle DÉJÀ l'adresse sous le texte : la joindre au
            message la ferait apparaître deux fois dans WhatsApp. */}
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

        <div>
          <GLabel skin={skin}>{t("lobby.invite")}</GLabel>
          <div style={{ marginTop: 8 }}>
            <PlayerBoard skin={skin} players={room.players} roundNo={0} showDone={false} labels={playerLabels} showScore={false} />
          </div>
        </div>

        <p style={{ fontSize: 14, color: skin.ink, fontWeight: 700, margin: 0 }}>{t("lobby.noElimination")}</p>

        {hostBar(
          <>
            <GBtn
              skin={skin}
              size="lg"
              full
              disabled={room.players.length < 4 || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await hostVerbs.nextRound(token, {});
                  await refresh();
                } finally {
                  setBusy(false);
                }
              }}
            >
              🎴 {t("lobby.start")}
            </GBtn>
            {room.players.length < 4 ? (
              <div style={{ fontSize: 13, color: skin.muted, textAlign: "center" }}>{t("lobby.needPlayers", { n: 4 })}</div>
            ) : null}
          </>,
        )}
        {!isHost ? <div style={{ fontSize: 13.5, color: skin.muted, textAlign: "center" }}>{t("lobby.waitHost")}</div> : null}
      </div>,
      aside,
    );
  }

  const verdictRound = isVerdictRound(round.no, room.roundsTotal);
  const roundLine = verdictRound ? t("round.verdict") : t("round.of", { no: round.no, total: room.roundsTotal - 1 });
  const asideRound = (
    <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 13 }}>
      {roundLine} · {room.code}
    </span>
  );

  // LE RESSERREMENT DU VIVIER, qui est le cœur du jeu, n'était JAMAIS affiché :
  // cette valeur était câblée à `null`, donc la phrase « vous étiez 6, vous êtes
  // 3 » — traduite dans les quatre langues — ne sortait jamais. Le client ne
  // pouvait pas la calculer : `get_game_room` ne sert que la manche COURANTE.
  // C'est donc le dépouillement qui la donne désormais.
  const previousSize: number | null = round?.result?.previous ?? null;

  // ───────────────────────────────────────────────── LA RÉSOLUTION
  if (verdictRound && round.phase === "reveal" && round.result?.final) {
    const r = round.result;
    return shell(
      <div style={{ display: "grid", gap: 14 }}>
        <GCard skin={skin} accent={r.hit ? skin.good : skin.accent2} padding={18}>
          <div style={{ display: "grid", gap: 8 }}>
            <GLabel skin={skin}>{t("final.title")}</GLabel>
            <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 26, color: skin.ink, lineHeight: 1.15 }}>
              🕯️ {t("final.culpritWas", { name: r.culprit ?? "" })}
            </div>
            <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 17, color: r.hit ? skin.good : skin.accent }}>
              {r.hit ? t("final.caught") : t("final.escaped")}
            </div>
          </div>
        </GCard>

        {/* LES VOIX ET LES CARNETS. Les deux libellés existaient, traduits dans
            les quatre langues, et n'étaient appelés nulle part : la partie se
            terminait sans qu'on sache qui avait accusé qui, ni ce que chacun
            avait noté — alors que l'écran de saisie promet « personne ne le
            verra AVANT LA FIN ». La promesse tenait à moitié : le carnet
            fuitait pendant, et ne se montrait pas après. */}
        {r.votes && Object.keys(r.votes).length > 0 ? (
          <GCard skin={skin} accent={skin.accent2} padding={16}>
            <div style={{ display: "grid", gap: 8 }}>
              <GLabel skin={skin}>{t("verdict.title")}</GLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {Object.entries(r.votes)
                  .sort((a, b) => b[1] - a[1])
                  .map(([nom, n]) => (
                    <span
                      key={nom}
                      style={{
                        border: `${skin.border}px solid ${skin.ink}`,
                        borderRadius: 999,
                        padding: "7px 12px",
                        background: nom === r.culprit ? skin.good : skin.paper,
                        color: nom === r.culprit ? "#fff" : skin.ink,
                        fontFamily: skin.fontDisplay,
                        fontWeight: 800,
                        fontSize: 14,
                      }}
                    >
                      {nom} · {t("final.votes", { n })}
                    </span>
                  ))}
              </div>
              {r.carnets && Object.keys(r.carnets).length > 0 ? (
                <div style={{ fontSize: 13, color: skin.muted, lineHeight: 1.7, marginTop: 2 }}>
                  {Object.entries(r.carnets).map(([nom, suites]) => (
                    <div key={nom}>
                      <strong style={{ color: skin.ink }}>{nom}</strong> · {t("final.carnet")} : {suites.join(" → ")}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </GCard>
        ) : null}

        <div>
          <GLabel skin={skin}>{t("final.ranking")}</GLabel>
          <div style={{ marginTop: 8 }}>
            <PlayerBoard skin={skin} players={room.players} roundNo={round.no} showDone={false} labels={playerLabels} podium />
          </div>
        </div>

        {hostBar(
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
                if (next) router.push(`/games/alibi/${next}`);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("final.replay")}
          </GBtn>,
        )}
        {room.nextCode ? (
          <GBtn skin={skin} variant="accent" size="lg" full onClick={() => router.push(`/games/alibi/${room.nextCode}`)}>
            {t("final.joinNew")}
          </GBtn>
        ) : null}
      </div>,
      asideRound,
    );
  }

  // ───────────────────────────────────────────────── L'ACCUSATION
  if (verdictRound) {
    const done = round.mine?.accuse;
    return shell(
      <div style={{ display: "grid", gap: 14 }}>
        <GCard skin={skin} accent={skin.accent} padding={16}>
          <div style={{ display: "grid", gap: 9 }}>
            <GLabel skin={skin}>{t("verdict.title")}</GLabel>
            <p style={{ fontSize: 14, color: skin.muted, lineHeight: 1.5, margin: 0 }}>{t("verdict.hint")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {others.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={(accuse || done) === n}
                  onClick={() => setAccuse(n)}
                  style={{
                    border: `${skin.border}px solid ${skin.ink}`,
                    borderRadius: 999,
                    background: (accuse || done) === n ? skin.accent : "#fff",
                    color: (accuse || done) === n ? "#fff" : skin.ink,
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
            {echecLigne}
            <GBtn skin={skin} size="lg" full disabled={!(accuse || done) || busy} onClick={() => send({ accuse: accuse || done })}>
              {/* Sans nom choisi, « J'accuse  » se terminerait par un blanc. */}
              {busy
                ? t("verdict.sending")
                : done && !accuse
                  ? t("verdict.accused", { name: done })
                  : accuse
                    ? t("verdict.accuse", { name: accuse })
                    : t("verdict.pick")}
            </GBtn>
          </div>
        </GCard>

        <div style={{ fontSize: 13.5, color: skin.muted, textAlign: "center" }}>
          {t("wait.progress", { done: round.submitted, total: room.expected })}
        </div>

        {hostBar(
          <GBtn
            skin={skin}
            variant="accent"
            size="lg"
            full
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await hostVerbs.reveal(token);
                await refresh();
              } finally {
                setBusy(false);
              }
            }}
          >
            🕯️ {t("host.finish")}
          </GBtn>,
        )}
      </div>,
      asideRound,
    );
  }

  // ───────────────────────────────────────────────── LES COMPTES
  if (round.phase === "reveal" && round.result) {
    return shell(
      <div style={{ display: "grid", gap: 14 }}>
        <LesComptes skin={skin} locale={locale} result={round.result} previous={previousSize} />
        {hostBar(
          <GBtn
            skin={skin}
            size="lg"
            full
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await hostVerbs.nextRound(token, {});
                await refresh();
              } finally {
                setBusy(false);
              }
            }}
          >
            {round.no + 1 >= room.roundsTotal ? t("host.toVerdict") : t("host.next")}
          </GBtn>,
        )}
        {!isHost ? <div style={{ fontSize: 13.5, color: skin.muted, textAlign: "center" }}>{t("host.waitNext")}</div> : null}
      </div>,
      asideRound,
    );
  }

  // ───────────────────────────────────────────────── MA CARTE
  //
  // ⚠️ `cardFor` refuse une carte qui ne porte pas le numéro de la manche en
  // cours. Le sondage peut tomber entre l'ouverture d'une manche et l'écriture
  // des secrets : sans cette garde, on afficherait une demi-seconde la pièce de
  // la manche PRÉCÉDENTE, et le joueur déposerait un bulletin faux — qui le
  // désignerait comme menteur au dépouillement.
  const card = cardFor(me.secret as AlibiSecret | undefined, round.no);
  const submitted = round.mine != null && typeof round.mine.room === "number";

  return shell(
    <div style={{ display: "grid", gap: 14 }}>
      {echecLigne}
      {card ? (
        <MaCarte
          skin={skin}
          locale={locale}
          card={card}
          mine={round.mine}
          others={others}
          sending={busy}
          onSubmit={(b) => send(b)}
        />
      ) : (
        <GCard skin={skin} padding={18}>
          <div style={{ color: skin.muted, fontWeight: 600 }}>{t("loading")}</div>
        </GCard>
      )}

      <div style={{ display: "grid", gap: 7 }}>
        <div style={{ fontSize: 13.5, color: skin.muted, textAlign: "center" }}>
          {round.submitted >= room.expected
            ? t("wait.done")
            : t("wait.progress", { done: round.submitted, total: room.expected })}
        </div>
        {submitted ? (
          <div style={{ fontSize: 12.5, color: skin.muted, textAlign: "center" }}>{t("wait.hint")}</div>
        ) : null}
        <div style={{ fontSize: 12.5, color: skin.muted, textAlign: "center", lineHeight: 1.45 }}>{t("wait.auto")}</div>
      </div>

      <PlayerBoard skin={skin} players={room.players} roundNo={round.no} showDone labels={playerLabels} showScore={false} />

      {hostBar(
        <GBtn
          skin={skin}
          variant="accent"
          size="lg"
          full
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await hostVerbs.reveal(token);
              await refresh();
            } finally {
              setBusy(false);
            }
          }}
        >
          👁 {t("host.reveal")}
        </GBtn>,
      )}
      {isHost ? (
        <div style={{ fontSize: 12.5, color: skin.muted, textAlign: "center" }}>
          {t("host.revealHint", { done: round.submitted, total: room.expected })}
        </div>
      ) : null}
    </div>,
    asideRound,
  );
}
