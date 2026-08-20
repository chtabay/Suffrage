"use client";

// OUVRIR UNE PARTIE — la porte d'entrée des Échecs collaboratifs.
//
// ⚠️ CETTE PAGE NE PROMET AUCUN NIVEAU. Ni « ~1750 Elo », ni « la foule joue
// comme un maître » : la seule mesure publique dont on dispose (Fouloscopie
// 2022, 24 405 participants) ne dit rien de tel, et Kasparov contre le Monde
// n'était pas de la foule mais du suivi d'expert. On promet ce qu'on tient :
// une équipe qui délibère, un coup par vote.
//
// ⚠️ AUCUN PLAFOND DE JOUEURS N'EST ANNONCÉ parce qu'il n'y en a pas — le §18
// l'interdit explicitement. Ce qui est écrit ici doit rester vrai à six comme à
// six cents.
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createRoom, getSeat, lastNick, saveSeat } from "@/lib/games/room";
import { joinRoom } from "@/lib/games/room";
import { ECHECS_SKIN } from "@/lib/games/skin";
import GameShell from "@/components/games/GameShell";
import { GBtn, GCard, GLabel } from "@/components/games/ui";

const skin = ECHECS_SKIN;

/**
 * La soupape, en secondes.
 *
 * ⚠️ CE N'EST PAS UNE PENDULE, et le choix de sa valeur en dépend. En mode
 * salon, l'équipe au trait clôt quand elle a fini (« on est prêts ») ; ce délai
 * n'existe QUE pour qu'une table qui se disperse ne fige pas la partie. Réglé
 * trop court, il devient une horloge de fait : à trois minutes, il tomberait au
 * milieu d'une discussion, avec deux bulletins sur huit. Dix minutes laissent
 * la délibération se dérouler et rattrapent quand même l'abandon.
 */
const SOUPAPE = 600;

/** `rounds_total` est borné à 50 par le socle et ne veut rien dire ici : une
 *  partie d'échecs fait le nombre de demi-coups qu'elle fait. Aucun verbe de ce
 *  jeu ne le lit — `echecs_open` incrémente `round_no` sans le consulter. */
const MANCHES_IGNOREES = 50;

export default function EchecsCreate() {
  const t = useTranslations("Echecs");
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Le pseudo vit dans le localStorage : lecture APRÈS le montage seulement.
  // Un `useState(lastNick())` rend le bouton mort au second passage (désaccord
  // d'hydratation, payé sur Unanimo — React ne rattrape pas `disabled`).
  useEffect(() => setName((n) => n || lastNick()), []);

  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy("create");
    setErr(null);
    try {
      const a = await createRoom("echecs", name.trim(), MANCHES_IGNOREES, { valveSeconds: SOUPAPE }, locale);
      if (a.status !== "ok" || !("code" in a)) {
        setErr(t("create.error"));
        return;
      }
      saveSeat({ code: a.code, token: a.token, name: a.name, isHost: true });
      router.push(`/games/echecs/${a.code}`);
    } catch {
      setErr(t("create.error"));
    } finally {
      setBusy(null);
    }
  };

  // ⚠️ ON ENTRE ICI, PAS DANS LA SALLE. Contrairement aux autres jeux, on prend
  // son siège dès la saisie du code : la salle des échecs ne rend JAMAIS la
  // liste des joueurs (c'est ce qui la fait tenir à six cents), donc elle n'a
  // aucun moyen de dire « tu n'es pas encore assis » autrement qu'en le
  // demandant. Autant le demander une fois, ici, où le pseudo est déjà saisi.
  const join = async () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4 || !name.trim() || busy) return;
    setBusy("join");
    setErr(null);
    try {
      const deja = getSeat(c);
      if (deja) {
        router.push(`/games/echecs/${c}`);
        return;
      }
      const r = await joinRoom(c, name.trim());
      if (r.status !== "ok" || !("token" in r)) {
        setErr(r.status === "started" ? t("create.started") : t("create.badCode"));
        return;
      }
      saveSeat({ code: c, token: r.token, name: r.name, isHost: false });
      router.push(`/games/echecs/${c}`);
    } catch {
      setErr(t("create.badCode"));
    } finally {
      setBusy(null);
    }
  };

  const champ = {
    width: "100%",
    border: `${skin.border}px solid ${skin.ink}`,
    borderRadius: skin.radius - 4,
    padding: "12px 13px",
    fontSize: 16,
    fontFamily: skin.fontBody,
    background: skin.paper,
    color: skin.ink,
  } as const;

  return (
    <GameShell skin={skin} title={t("name")} emoji="♟️" backLabel={t("back")} poweredBy={t("poweredBy")}>
      <div style={{ display: "grid", gap: 18 }}>
        <div>
          <h1
            style={{
              fontFamily: skin.fontDisplay,
              fontWeight: 800,
              fontSize: 27,
              lineHeight: 1.15,
              color: skin.ink,
              margin: 0,
            }}
          >
            {t("tagline")}
          </h1>
          <p style={{ fontSize: 15, color: skin.muted, lineHeight: 1.55, marginTop: 9 }}>{t("pitch")}</p>
        </div>

        <GCard skin={skin} accent={skin.accent}>
          <div style={{ display: "grid", gap: 10 }}>
            <GLabel skin={skin}>{t("create.title")}</GLabel>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              placeholder={t("create.namePlaceholder")}
              aria-label={t("create.nameLabel")}
              style={champ}
            />
            <GBtn skin={skin} size="lg" full disabled={!name.trim() || busy !== null} onClick={() => void create()}>
              {busy === "create" ? t("create.opening") : t("create.cta")}
            </GBtn>
            <div style={{ fontSize: 12.5, color: skin.muted, lineHeight: 1.45 }}>{t("create.hint")}</div>
          </div>
        </GCard>

        <GCard skin={skin} accent={skin.accent2}>
          <div style={{ display: "grid", gap: 10 }}>
            <GLabel skin={skin}>{t("join.title")}</GLabel>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
              placeholder={t("join.codePlaceholder")}
              aria-label={t("join.codeLabel")}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              style={{ ...champ, letterSpacing: "0.22em", fontWeight: 800, textAlign: "center" }}
            />
            <GBtn
              skin={skin}
              variant="accent"
              size="lg"
              full
              disabled={code.trim().length < 4 || !name.trim() || busy !== null}
              onClick={() => void join()}
            >
              {busy === "join" ? t("join.entering") : t("join.cta")}
            </GBtn>
          </div>
        </GCard>

        {err ? (
          <div role="alert" style={{ fontSize: 14, color: skin.ink, fontWeight: 700 }}>
            {err}
          </div>
        ) : null}

        <GCard skin={skin} padding={14}>
          <div style={{ display: "grid", gap: 7 }}>
            <GLabel skin={skin}>{t("how.title")}</GLabel>
            {["one", "two", "three", "four"].map((k) => (
              <div key={k} style={{ fontSize: 13.5, color: skin.ink, lineHeight: 1.5 }}>
                {k === "one" ? t("how.one") : k === "two" ? t("how.two") : k === "three" ? t("how.three") : t("how.four")}
              </div>
            ))}
          </div>
        </GCard>
      </div>
    </GameShell>
  );
}
