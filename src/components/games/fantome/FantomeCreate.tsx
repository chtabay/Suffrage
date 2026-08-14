"use client";

// OUVRIR LE MANOIR — la porte d'entrée de La Nuit du Fantôme.
//
// ⚠️ CETTE PAGE DIT SON MATÉRIEL AVANT SON BOUTON. C'est le seul jeu du
// catalogue qui se PRÉPARE (quinze à vingt minutes, trois à cinq appareils
// posés dans les pièces), et découvrir ça une fois tout le monde assis serait
// la pire façon de commencer. La préparation est la bande-annonce de la soirée,
// pas une friction qu'on cache.
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createRoom, getRoom, lastNick, saveSeat } from "@/lib/games/room";
import { ROUNDS_TOTAL } from "@/lib/games/fantome/regles";
import { FANTOME_SKIN } from "@/lib/games/skin";
import GameShell from "@/components/games/GameShell";
import { GBtn, GCard, GLabel } from "@/components/games/ui";

const skin = FANTOME_SKIN;

export default function FantomeCreate() {
  const t = useTranslations("Fantome");
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
      const a = await createRoom("fantome", name.trim(), ROUNDS_TOTAL, {}, locale);
      if (a.status !== "ok" || !("code" in a)) {
        setErr(t("create.error"));
        return;
      }
      saveSeat({ code: a.code, token: a.token, name: a.name, isHost: true });
      router.push(`/games/fantome/${a.code}`);
    } catch {
      setErr(t("create.error"));
    } finally {
      setBusy(null);
    }
  };

  const join = async () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4 || busy) return;
    setBusy("join");
    setErr(null);
    try {
      const r = await getRoom(c);
      if (r.status !== "ok") {
        setErr(t("create.badCode"));
        return;
      }
      router.push(`/games/fantome/${c}`);
    } catch {
      setErr(t("create.badCode"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <GameShell skin={skin} title={t("name")} emoji="👻" backLabel={t("back")} poweredBy={t("poweredBy")}>
      <div style={{ display: "grid", gap: 18 }}>
        <div>
          <h1
            style={{
              fontFamily: skin.fontDisplay,
              fontWeight: 800,
              fontSize: "clamp(26px,5vw,38px)",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              margin: 0,
              color: skin.ink,
            }}
          >
            {t("create.hero")}
          </h1>
          <p style={{ fontSize: 16, color: skin.muted, lineHeight: 1.55, marginTop: 10, maxWidth: "48ch" }}>
            {t("create.pitch")}
          </p>
          <p style={{ fontSize: 13.5, color: skin.muted, marginTop: 10 }}>{t("create.best")}</p>
        </div>

        <GCard skin={skin} accent={skin.accent2} padding={16}>
          <div style={{ display: "grid", gap: 7 }}>
            <strong style={{ fontFamily: skin.fontDisplay, fontSize: 15.5, color: skin.ink }}>
              {t("create.prepTitle")}
            </strong>
            <div style={{ fontSize: 14, color: skin.muted, lineHeight: 1.55 }}>{t("create.prepHint")}</div>
            <div
              style={{
                border: `${skin.border}px dashed ${skin.ink}`,
                borderRadius: skin.radius - 4,
                padding: "11px 13px",
                background: skin.bg,
                marginTop: 4,
              }}
            >
              <strong style={{ fontFamily: skin.fontDisplay, fontSize: 14.5, color: skin.ink }}>
                📱 {t("create.screens")}
              </strong>
              <div style={{ fontSize: 13.5, color: skin.muted, lineHeight: 1.5, marginTop: 4 }}>
                {t("create.screensHint")}
              </div>
            </div>
          </div>
        </GCard>

        <GCard skin={skin} accent={skin.accent} padding={16}>
          <div style={{ display: "grid", gap: 10 }}>
            <GLabel skin={skin}>{t("create.name")}</GLabel>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void create();
                }
              }}
              placeholder={t("create.name")}
              aria-label={t("create.name")}
              maxLength={24}
              enterKeyHint="go"
              autoComplete="nickname"
              style={{
                fontFamily: skin.fontDisplay,
                fontWeight: 700,
                fontSize: 17,
                padding: "13px 14px",
                border: `${skin.border}px solid ${skin.ink}`,
                borderRadius: skin.radius - 4,
                background: "#fff",
                color: skin.ink,
                width: "100%",
                minHeight: 48,
              }}
            />
            <GBtn skin={skin} size="lg" full disabled={!name.trim() || busy !== null} onClick={create}>
              {busy === "create" ? t("create.creating") : t("create.cta")}
            </GBtn>
            <div style={{ fontSize: 13, color: skin.muted, textAlign: "center" }}>{t("create.noAccount")}</div>
            {err ? (
              <div role="alert" style={{ fontSize: 14, color: skin.accent, fontWeight: 700 }}>
                {err}
              </div>
            ) : null}
          </div>
        </GCard>

        <GCard skin={skin} accent={skin.good} padding={16}>
          <div style={{ display: "grid", gap: 10 }}>
            <GLabel skin={skin}>{t("how.title")}</GLabel>
            <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 7, fontSize: 14.5, color: skin.ink, lineHeight: 1.5 }}>
              <li>{t("how.s1")}</li>
              <li>{t("how.s2")}</li>
              <li>{t("how.s3")}</li>
            </ol>
          </div>
        </GCard>

        <GCard skin={skin} accent={skin.muted} padding={16}>
          <div style={{ display: "grid", gap: 10 }}>
            <GLabel skin={skin}>{t("create.joinCode")}</GLabel>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void join();
                  }
                }}
                placeholder={t("create.codePlaceholder")}
                aria-label={t("create.joinCode")}
                maxLength={8}
                enterKeyHint="go"
                autoCapitalize="characters"
                autoComplete="off"
                style={{
                  flex: 1,
                  minWidth: 130,
                  fontFamily: skin.fontDisplay,
                  fontWeight: 800,
                  fontSize: 19,
                  letterSpacing: "0.14em",
                  textAlign: "center",
                  padding: "12px 14px",
                  border: `${skin.border}px solid ${skin.ink}`,
                  borderRadius: skin.radius - 4,
                  background: "#fff",
                  color: skin.ink,
                  minHeight: 48,
                }}
              />
              <GBtn skin={skin} variant="accent" disabled={code.trim().length < 4 || busy !== null} onClick={join}>
                {t("create.join")}
              </GBtn>
            </div>
          </div>
        </GCard>
      </div>
    </GameShell>
  );
}
