"use client";

// LA SALLE — le seul écran du jeu, dans ses quatre moments.
//
// ⚠️ ON N'AFFICHE JAMAIS QUI EST LÀ, ET C'EST LA CONTRAINTE STRUCTURANTE.
// Pas de liste de joueurs, pas de « X a voté », pas de pastilles. Mesuré : une
// réponse d'état par joueur pèse 552 Ko et 1,1 Go/s à 4 000 participants, quand
// des compteurs tiennent en ~519 octets — identiques à neuf comme à
// soixante-neuf. Le §18 de la spec l'exige, et chaque ligne d'interface par
// joueur qu'on ajouterait ramènerait le mur.
//
// ⚠️ ET ON N'AFFICHE PAS LES VOTES EN COURS. Le §7 est formel : les choix des
// autres ne sont pas visibles pendant le tour. On montre COMBIEN de bulletins
// sont arrivés, jamais lesquels. La répartition n'existe qu'après la clôture,
// et elle est agrégée.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getSeat, joinRoom, lastNick, saveSeat, type Seat } from "@/lib/games/room";
import { ECHECS_SKIN, ECHIQUIER } from "@/lib/games/skin";
import { libelleCoup, sanLocal } from "@/lib/games/echecs/echiquier";
import { campKey, valveRestante, type EchecsPrev, type EchecsState, type Uci } from "@/lib/games/echecs/regles";
import { useEchecs } from "@/lib/games/echecs/useEchecs";
import { close as clore, start as demarrer, team as choisirCamp, vote as voter } from "@/lib/games/echecs/verbes";
import GameShell from "@/components/games/GameShell";
import { GBtn, GCard, GLabel } from "@/components/games/ui";
import Echiquier from "./Echiquier";

const skin = ECHECS_SKIN;

export default function EchecsRoom({ code }: { code: string }) {
  const t = useTranslations("Echecs");
  const locale = useLocale();
  const [seat, setSeat] = useState<Seat | null>(null);
  const [pret, setPret] = useState(false);

  // Le siège vit dans le localStorage : lecture APRÈS le montage seulement.
  // Un `useState(getSeat(code))` rend le bouton mort au second passage
  // (désaccord d'hydratation, payé sur Unanimo — React ne rattrape pas
  // `disabled`).
  useEffect(() => {
    setSeat(getSeat(code));
    setPret(true);
  }, [code]);

  const { etat, loading, missing, offline } = useEchecs(code, seat?.token ?? null);

  const labels = useMemo(
    () => ({
      piece: {
        k: t("piece.roi"),
        q: t("piece.dame"),
        r: t("piece.tour"),
        b: t("piece.fou"),
        n: t("piece.cavalier"),
        p: t("piece.pion"),
      },
      vide: t("piece.vide"),
      promotion: t("promotion.title"),
      blanc: t("camp.blanc"),
      noir: t("camp.noir"),
    }),
    [t],
  );

  if (!pret || (loading && !etat)) {
    return (
      <GameShell skin={skin} title={t("name")} emoji="♟️" backLabel={t("back")} poweredBy={t("poweredBy")}>
        <GCard skin={skin}>
          <div style={{ fontSize: 14.5, color: skin.muted }}>{t("room.loading")}</div>
        </GCard>
      </GameShell>
    );
  }

  if (missing || !etat) {
    return (
      <GameShell skin={skin} title={t("name")} emoji="♟️" backLabel={t("back")} poweredBy={t("poweredBy")}>
        <GCard skin={skin} accent={skin.accent2}>
          <div style={{ fontSize: 15, color: skin.ink, lineHeight: 1.5 }}>{t("room.missing")}</div>
        </GCard>
      </GameShell>
    );
  }

  return (
    <GameShell skin={skin} title={t("name")} emoji="♟️" backLabel={t("back")} poweredBy={t("poweredBy")}>
      <div style={{ display: "grid", gap: 14 }}>
        {offline ? (
          <div
            role="status"
            style={{
              fontSize: 13, fontWeight: 700, color: skin.ink, background: skin.accent2,
              borderRadius: skin.radius - 4, padding: "8px 11px",
            }}
          >
            {t("room.offline")}
          </div>
        ) : null}

        {!seat ? (
          <Assise code={code} onSeat={setSeat} />
        ) : etat.roomStatus === "lobby" ? (
          <Salon etat={etat} seat={seat} />
        ) : (
          <Partie etat={etat} seat={seat} locale={locale} labels={labels} />
        )}
      </div>
    </GameShell>
  );
}

// ─────────────────────────────────────────────────────── prendre son siège
//
// On arrive ici par un lien partagé, sans être passé par la porte d'entrée.
function Assise({ code, onSeat }: { code: string; onSeat: (s: Seat) => void }) {
  const t = useTranslations("Echecs");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => setName((n) => n || lastNick()), []);

  const entrer = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await joinRoom(code, name.trim());
      if (r.status !== "ok" || !("token" in r)) {
        setErr(t("create.badCode"));
        return;
      }
      const s = { code, token: r.token, name: r.name, isHost: false };
      saveSeat(s);
      onSeat(s);
    } catch {
      setErr(t("create.badCode"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <GCard skin={skin} accent={skin.accent}>
      <div style={{ display: "grid", gap: 10 }}>
        <GLabel skin={skin}>{t("seat.title")}</GLabel>
        <div style={{ fontSize: 14, color: skin.muted, lineHeight: 1.5 }}>{t("seat.hint")}</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 20))}
          placeholder={t("create.namePlaceholder")}
          aria-label={t("create.nameLabel")}
          style={{
            width: "100%", border: `${skin.border}px solid ${skin.ink}`, borderRadius: skin.radius - 4,
            padding: "12px 13px", fontSize: 16, fontFamily: skin.fontBody, background: skin.paper, color: skin.ink,
          }}
        />
        <GBtn skin={skin} size="lg" full disabled={!name.trim() || busy} onClick={() => void entrer()}>
          {t("seat.cta")}
        </GBtn>
        {err ? <div role="alert" style={{ fontSize: 13.5, fontWeight: 700, color: skin.ink }}>{err}</div> : null}
      </div>
    </GCard>
  );
}

// ─────────────────────────────────────────────────────────────── le salon
//
// ⚠️ CHACUN SE MET DANS UNE ÉQUIPE — il n'y a pas d'organisateur qui distribue
// les invitations. C'est l'arbitrage du fondateur pour les parties informelles,
// et il simplifie tout : aucun rôle à porter, aucune liste à tenir.
function Salon({ etat, seat }: { etat: EchecsState; seat: Seat }) {
  const t = useTranslations("Echecs");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mien = etat.me?.team ?? null;
  const pretes = etat.teams.w >= 1 && etat.teams.b >= 1;

  const prendre = async (camp: "w" | "b") => {
    if (busy) return;
    setBusy(true);
    try {
      await choisirCamp(seat.token, camp);
    } catch {
      /* le prochain battement dira la vérité */
    } finally {
      setBusy(false);
    }
  };

  const ouvrir = async () => {
    if (busy || !pretes) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await demarrer(etat.code, seat.token);
      if (r.status === "need_teams") setErr(t("lobby.needTeams"));
    } catch {
      setErr(t("lobby.needTeams"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <GCard skin={skin} accent={skin.accent}>
        <div style={{ display: "grid", gap: 6, textAlign: "center" }}>
          <GLabel skin={skin}>{t("lobby.code")}</GLabel>
          <div
            style={{
              fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 34,
              letterSpacing: "0.2em", color: skin.ink,
            }}
          >
            {etat.code}
          </div>
          <div style={{ fontSize: 13, color: skin.muted, lineHeight: 1.45 }}>{t("lobby.share")}</div>
        </div>
      </GCard>

      <GCard skin={skin}>
        <div style={{ display: "grid", gap: 11 }}>
          <GLabel skin={skin}>{t("lobby.pick")}</GLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            {(["w", "b"] as const).map((camp) => {
              const actif = mien === camp;
              return (
                <button
                  key={camp}
                  type="button"
                  aria-pressed={actif}
                  disabled={busy}
                  onClick={() => void prendre(camp)}
                  style={{
                    display: "grid", gap: 4, placeItems: "center", padding: "15px 8px",
                    // ⚠️ LE CAMP CHOISI SE DIT EN COULEUR, ET IL SE DIT AUSSI EN
                    // TOUTES LETTRES. La première version se contentait de passer
                    // le trait de 2,5 px à 4 px DANS LA MÊME ENCRE : mesuré au
                    // navigateur, `4px solid rgb(22,33,58)` contre `2.4px solid
                    // rgb(22,33,58)` — on ne voyait pas dans quel camp on était.
                    // Défaut trouvé en jouant, comme les trois précédents.
                    border: `${actif ? 4 : skin.border}px solid ${actif ? ECHIQUIER.corailSombre : skin.ink}`,
                    borderRadius: skin.radius, cursor: busy ? "default" : "pointer",
                    background: camp === "w" ? ECHIQUIER.claire : ECHIQUIER.sombre,
                    font: "inherit",
                  }}
                >
                  {/* Le roi du camp, dessiné exactement comme sur l'échiquier. */}
                  <span
                    aria-hidden
                    style={{
                      fontSize: 36,
                      lineHeight: 1,
                      color: camp === "w" ? ECHIQUIER.corpsClair : ECHIQUIER.corpsSombre,
                      WebkitTextStroke:
                        camp === "w" ? `${ECHIQUIER.lisere * 2}px ${ECHIQUIER.corpsSombre}` : undefined,
                      paintOrder: camp === "w" ? "stroke fill" : undefined,
                    }}
                  >
                    ♚
                  </span>
                  <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 15, color: skin.ink }}>
                    {camp === "w" ? t("camp.blancs") : t("camp.noirs")}
                  </span>
                  <span style={{ fontSize: 13, color: skin.ink, fontWeight: 700 }}>
                    {t("lobby.count", { n: camp === "w" ? etat.teams.w : etat.teams.b })}
                  </span>
                  {actif ? (
                    <span
                      style={{
                        marginTop: 2, padding: "2px 9px", borderRadius: 999,
                        background: ECHIQUIER.corailSombre, color: ECHIQUIER.encrePastille,
                        fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 11,
                        letterSpacing: "0.04em", textTransform: "uppercase",
                      }}
                    >
                      {t("lobby.mine")}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>{t("lobby.switch")}</div>
        </div>
      </GCard>

      <GBtn skin={skin} size="lg" full disabled={!pretes || busy} onClick={() => void ouvrir()}>
        {pretes ? t("lobby.start") : t("lobby.waiting")}
      </GBtn>
      {err ? <div role="alert" style={{ fontSize: 13.5, fontWeight: 700, color: skin.ink }}>{err}</div> : null}
    </>
  );
}

// ────────────────────────────────────────────────────────────── la partie
function Partie({
  etat,
  seat,
  locale,
  labels,
}: {
  etat: EchecsState;
  seat: Seat;
  locale: string;
  labels: { piece: Record<string, string>; vide: string; promotion: string; blanc: string; noir: string };
}) {
  // Pas de `useTranslations` ici : cette fonction n'écrit aucun texte, elle
  // n'aiguille que vers les quatre moments, qui traduisent chacun le leur.
  const camp = etat.me?.team ?? null;
  const monTour = etat.me?.canVote ?? false;
  const approbation = etat.method === "approval";
  const [choix, setChoix] = useState<Uci[]>([]);
  const [busy, setBusy] = useState(false);

  // ⚠️ MON BULLETIN VIENT DU SERVEUR, PAS DE MA MÉMOIRE D'ÉCRAN. On rejoint
  // depuis un autre téléphone, on recharge, on revient d'une poche : ce qui
  // fait foi est ce que la base a enregistré pour ce siège et ce tour.
  useEffect(() => {
    setChoix(etat.me?.mine ?? []);
  }, [etat.roundNo, etat.me?.mine]);

  const envoyer = useCallback(
    async (coups: Uci[]) => {
      if (!coups.length || busy) return;
      setBusy(true);
      try {
        await voter(seat.token, coups);
      } catch {
        /* le prochain battement remettra l'écran d'accord avec la base */
      } finally {
        setBusy(false);
      }
    },
    [busy, seat.token],
  );

  const basculer = (uci: Uci) => {
    if (!monTour) return;
    if (!approbation) {
      setChoix([uci]);
      void envoyer([uci]);
      return;
    }
    const suivant = choix.includes(uci) ? choix.filter((c) => c !== uci) : [...choix, uci];
    setChoix(suivant);
    if (suivant.length) void envoyer(suivant);
  };

  const conclure = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await clore(etat.code, seat.token);
    } catch {
      /* la soupape rattrapera */
    } finally {
      setBusy(false);
    }
  };

  if (etat.roomStatus === "ended") return <Fin etat={etat} locale={locale} />;

  return (
    <>
      {etat.prev ? <Depouillement prev={etat.prev} locale={locale} /> : null}

      <div style={{ display: "grid", gap: 8 }}>
        <Bandeau etat={etat} camp={camp} />
        <Echiquier
          fen={etat.fen ?? ""}
          legal={monTour ? etat.legal : []}
          camp={camp}
          dernier={etat.last?.uci ?? null}
          choix={choix[0] ?? null}
          onChoix={basculer}
          labels={labels}
        />
      </div>

      {etat.runoff ? <Departage etat={etat} choix={choix} onBasculer={basculer} monTour={monTour} /> : null}

      {monTour ? (
        <Bulletin
          etat={etat}
          choix={choix}
          busy={busy}
          onConclure={() => void conclure()}
        />
      ) : (
        <Attente etat={etat} camp={camp} seat={seat} />
      )}
    </>
  );
}

// ── le bandeau : à qui de jouer, et combien de bulletins sont arrivés
function Bandeau({ etat, camp }: { etat: EchecsState; camp: "w" | "b" | null }) {
  const t = useTranslations("Echecs");
  const trait = etat.turn === "w" ? "blancs" : "noirs";
  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        border: `${skin.border}px solid ${skin.ink}`, borderRadius: skin.radius - 4,
        padding: "9px 12px", background: skin.paper,
      }}
    >
      <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 14.5, color: skin.ink }}>
        {etat.turn === camp ? t("turn.yours") : trait === "blancs" ? t("turn.white") : t("turn.black")}
      </div>
      <div style={{ fontSize: 12.5, color: skin.muted, fontWeight: 700 }}>
        {t("turn.ballots", { n: etat.votes, of: etat.active })}
      </div>
    </div>
  );
}

// ── LE DÉPOUILLEMENT du coup précédent : le seul moment où le collectif se voit
//
// ⚠️ IL S'AFFICHE AU-DESSUS DE LA POSITION, PAS SUR UN ÉCRAN À LUI. Clore un
// tour ouvre le suivant dans la même requête (rien ne le rouvrirait sinon :
// aucun ordonnanceur n'existe ici), donc la révélation n'a pas de moment propre
// où s'installer. Elle accompagne le tour suivant — et c'est mieux ainsi : on
// voit l'échiquier ET ce que l'équipe a décidé, du même regard.
function Depouillement({ prev, locale }: { prev: EchecsPrev; locale: string }) {
  const t = useTranslations("Echecs");
  const tete = prev.tally[0];
  const part = prev.voters > 0 && tete ? Math.round((tete.n / prev.voters) * 100) : 0;
  const reste = Math.max(0, prev.kinds - prev.tally.length);

  return (
    <GCard skin={skin} accent={prev.silent || prev.drawn ? skin.accent2 : skin.good} padding={13}>
      <div style={{ display: "grid", gap: 8 }}>
        <GLabel skin={skin}>
          {prev.turn === "w" ? t("tally.byWhite") : t("tally.byBlack")}
        </GLabel>

        {prev.silent ? (
          <div style={{ fontSize: 14, color: skin.ink, lineHeight: 1.5 }}>{t("tally.silent")}</div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
              <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 25, color: skin.ink }}>
                {/* ⚠️ TROIS CAS, ET LE TROISIÈME N'EST PAS UN BOUCHE-TROU. Le
                    SAN est calculé une fois par l'arbitre et traduit ici. S'il
                    manque mais que le coup existe, on écrit les deux cases —
                    on ne peut pas recalculer la notation sans les règles, et on
                    ne va pas embarquer chess.js pour ça. S'il n'y a pas de coup
                    du tout, c'est qu'une égalité a ouvert un second tour. */}
                {prev.san
                  ? sanLocal(prev.san, locale)
                  : prev.move
                    ? `${prev.move.slice(0, 2)} → ${prev.move.slice(2, 4)}`
                    : t("tally.pending")}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: skin.accent }}>
                {t("tally.share", { pct: part, n: tete?.n ?? 0, of: prev.voters })}
              </span>
            </div>

            {/* La barre est DÉCORATIVE : le chiffre est déjà écrit à côté, en
                toutes lettres. Elle ne porte donc aucun texte de remplacement. */}
            <div
              aria-hidden
              style={{
                height: 9, borderRadius: 5, overflow: "hidden",
                background: skin.bg, border: `1.5px solid ${skin.ink}`,
              }}
            >
              <div style={{ width: `${part}%`, height: "100%", background: skin.accent }} />
            </div>

            {prev.tally.length > 1 ? (
              <div style={{ fontSize: 12.5, color: skin.muted, lineHeight: 1.5 }}>
                {/* ⚠️ PAS D'UCI BRUT À L'ÉCRAN. « g1f3 1 » ne se lit pas, et
                    on ne peut pas mettre le glyphe de la pièce non plus : la
                    position qu'on a sous la main est celle d'APRÈS le coup, la
                    case de départ y est vide. Les deux cases suffisent. */}
                {prev.tally
                  .slice(1)
                  .map((l) => `${l.move.slice(0, 2)} → ${l.move.slice(2, 4)} (${l.n})`)
                  .join(" · ")}
                {reste > 0 ? ` · ${t("tally.more", { n: reste })}` : ""}
              </div>
            ) : null}

            {prev.drawn ? (
              <div style={{ fontSize: 13, color: skin.ink, fontWeight: 700, lineHeight: 1.45 }}>
                {t("tally.drawn")}
              </div>
            ) : null}
            {prev.method === "approval" ? (
              <div style={{ fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>{t("tally.approval")}</div>
            ) : null}
          </>
        )}
      </div>
    </GCard>
  );
}

// ── LE DÉPARTAGE : un second tour, à l'approbation, entre les seuls ex æquo
//
// ⚠️ ON NE REPOSE PAS LA MÊME QUESTION. Simulé : reposer une pluralité entre
// ex æquo ne tranche que 18 % du temps quand les gens tiennent à leur choix,
// contre 56 % à l'approbation. Et jamais de troisième tour : si l'égalité
// tient encore, le sort tranche tout de suite.
function Departage({
  etat,
  choix,
  onBasculer,
  monTour,
}: {
  etat: EchecsState;
  choix: Uci[];
  onBasculer: (u: Uci) => void;
  monTour: boolean;
}) {
  const t = useTranslations("Echecs");
  return (
    <GCard skin={skin} accent={skin.accent2}>
      <div style={{ display: "grid", gap: 10 }}>
        <GLabel skin={skin}>{t("runoff.title")}</GLabel>
        <div style={{ fontSize: 13.5, color: skin.ink, lineHeight: 1.5 }}>
          {monTour ? t("runoff.hint") : t("runoff.watching")}
        </div>
        <div style={{ display: "grid", gap: 7 }}>
          {etat.legal.map((uci) => {
            const l = libelleCoup(etat.fen ?? "", uci);
            const coche = choix.includes(uci);
            return (
              <button
                key={uci}
                type="button"
                role="checkbox"
                aria-checked={coche}
                disabled={!monTour}
                onClick={() => onBasculer(uci)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "11px 13px",
                  border: `${coche ? 4 : skin.border}px solid ${coche ? ECHIQUIER.pastille : skin.ink}`,
                  borderRadius: skin.radius - 4, background: skin.paper,
                  cursor: monTour ? "pointer" : "default", font: "inherit", textAlign: "left",
                }}
              >
                <span aria-hidden style={{ fontSize: 22, lineHeight: 1, color: skin.ink }}>
                  {coche ? "☑" : "☐"}
                </span>
                <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 16, color: skin.ink }}>
                  <span aria-hidden>{l.glyphe}</span> {l.de} → {l.vers}
                  {l.promo ? <span aria-hidden> = {l.promo}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </GCard>
  );
}

// ── MON BULLETIN, et le bouton qui clôt le tour
function Bulletin({
  etat,
  choix,
  busy,
  onConclure,
}: {
  etat: EchecsState;
  choix: Uci[];
  busy: boolean;
  onConclure: () => void;
}) {
  const t = useTranslations("Echecs");
  const pose = choix.length > 0;
  const l = pose ? libelleCoup(etat.fen ?? "", choix[0]) : null;

  return (
    <GCard skin={skin} accent={pose ? skin.good : skin.accent}>
      <div style={{ display: "grid", gap: 10 }}>
        <GLabel skin={skin}>{t("ballot.title")}</GLabel>
        <div style={{ fontSize: 14.5, color: skin.ink, lineHeight: 1.5 }}>
          {!pose ? (
            t("ballot.empty")
          ) : etat.method === "approval" ? (
            t("ballot.approved", { n: choix.length })
          ) : (
            <span style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 19 }}>
              <span aria-hidden>{l?.glyphe}</span> {l?.de} → {l?.vers}
              {l?.promo ? <span aria-hidden> = {l.promo}</span> : null}
            </span>
          )}
        </div>
        {pose ? <div style={{ fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>{t("ballot.change")}</div> : null}

        {/* ⚠️ « ON EST PRÊTS » N'ATTEND PAS TOUT LE MONDE, et c'est écrit sous
            le bouton. Le §7 l'exige : une clôture qui attendrait tous les votes
            serait bloquée par la première personne qui pose son téléphone. */}
        <GBtn skin={skin} size="lg" full disabled={busy || etat.votes === 0} onClick={onConclure}>
          {t("ballot.close")}
        </GBtn>
        <div style={{ fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>
          {etat.votes === 0 ? t("ballot.needOne") : t("ballot.closeHint")}
        </div>
      </div>
    </GCard>
  );
}

// ── L'ÉQUIPE QUI ATTEND
//
// ⚠️ CET ÉCRAN NE DOIT PAS ÊTRE UN ÉCRAN VIDE. C'est la moitié du temps de jeu
// pour la moitié des joueurs : le laisser inerte, c'est laisser tomber le
// téléphone. On y donne de quoi occuper le regard — la position, ce que
// l'adversaire est en train de faire — sans jamais rien révéler de ses choix.
function Attente({ etat, camp, seat }: { etat: EchecsState; camp: "w" | "b" | null; seat: Seat }) {
  const t = useTranslations("Echecs");
  const [busy, setBusy] = useState(false);
  const reste = valveRestante(etat.valveAt);
  const adverse = campKey(etat.turn);

  // Sans camp, on regarde — et on peut en prendre un pour le prochain tour.
  if (!camp) {
    return (
      <GCard skin={skin} accent={skin.accent2}>
        <div style={{ display: "grid", gap: 10 }}>
          <GLabel skin={skin}>{t("watch.title")}</GLabel>
          <div style={{ fontSize: 14, color: skin.ink, lineHeight: 1.5 }}>{t("watch.hint")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {(["w", "b"] as const).map((c) => (
              <GBtn
                key={c}
                skin={skin}
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void choisirCamp(seat.token, c).finally(() => setBusy(false));
                }}
              >
                {c === "w" ? t("camp.blancs") : t("camp.noirs")}
              </GBtn>
            ))}
          </div>
        </div>
      </GCard>
    );
  }

  return (
    <GCard skin={skin} accent={skin.accent}>
      <div style={{ display: "grid", gap: 9 }}>
        <GLabel skin={skin}>{t("wait.title")}</GLabel>
        <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 18, color: skin.ink, lineHeight: 1.3 }}>
          {adverse === "blancs" ? t("wait.white", { n: etat.active }) : t("wait.black", { n: etat.active })}
        </div>
        <div style={{ fontSize: 14, color: skin.ink, lineHeight: 1.5 }}>
          {t("wait.ballots", { n: etat.votes })}
        </div>
        {/* ⚠️ LA SOUPAPE N'EST PAS UNE PENDULE, et elle ne s'affiche pas comme
            telle. Pas de compte à rebours en gros : ce délai n'existe que pour
            qu'une table qui se disperse ne fige pas la partie, et l'afficher
            comme une horloge transformerait la délibération en course. */}
        {reste !== null && reste < 90 ? (
          <div style={{ fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>{t("wait.valve")}</div>
        ) : null}
      </div>
    </GCard>
  );
}

// ── LA FIN
//
// ⚠️ ICI ON LIT `result`, PAS `prev`, ET C'EST UN DÉCALAGE PAYÉ EN JOUANT.
// `echecs_open` incrémente `round_no` ; `echecs_finish` ne l'incrémente pas —
// il n'y a pas de tour suivant. À la fin, la manche courante EST celle qu'on
// vient de clore, donc `prev` (à `round_no - 1`) pointe un cran trop tôt :
// l'écran affichait « les blancs ont joué g4 » sous « échec et mat, les noirs
// gagnent ». Au moment le plus fort du jeu, le mauvais coup.
function Fin({ etat, locale }: { etat: EchecsState; locale: string }) {
  const t = useTranslations("Echecs");
  const r = etat.result;
  const gagnant = r?.winner ?? null;
  const mien = etat.me?.team ?? null;

  // Le dépouillement du coup qui conclut, remis dans la forme que
  // `Depouillement` sait lire. `turn` est celui de la manche close, donc le
  // camp qui a joué le mat.
  const dernier: EchecsPrev | null = r
    ? {
        move: r.move,
        san: r.san ?? null,
        voters: r.voters,
        drawn: r.drawn,
        silent: r.silent,
        runoff: false,
        method: r.method,
        turn: etat.turn,
        tally: r.tally.slice(0, 5),
        kinds: r.tally.length,
      }
    : null;

  return (
    <>
      {dernier ? <Depouillement prev={dernier} locale={locale} /> : null}
      <GCard skin={skin} accent={skin.good} padding={18}>
        <div style={{ display: "grid", gap: 9, textAlign: "center" }}>
          <div style={{ fontFamily: skin.fontDisplay, fontWeight: 800, fontSize: 24, color: skin.ink }}>
            {r?.outcome === "checkmate"
              ? gagnant === "w"
                ? t("end.whiteWins")
                : t("end.blackWins")
              : r?.outcome === "stalemate"
                ? t("end.stalemate")
                : t("end.draw")}
          </div>
          {gagnant && mien ? (
            <div style={{ fontSize: 15, color: skin.ink, lineHeight: 1.5 }}>
              {gagnant === mien ? t("end.you") : t("end.them")}
            </div>
          ) : null}
          {/* L'INSTRUMENTATION, comme sur les autres jeux : le vrai intérêt de
              ce jeu ne se lira que sur de vraies parties. */}
          {r?.plies ? (
            <div style={{ fontSize: 13, color: skin.muted, lineHeight: 1.5 }}>
              {t("end.stats", { plies: r.plies, ballots: r.ballots ?? 0 })}
            </div>
          ) : null}
        </div>
      </GCard>
    </>
  );
}
