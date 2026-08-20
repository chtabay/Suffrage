"use client";

// OUVRIR UNE MAISON — la porte d'entrée de Rôdeurs.
//
// Un seul réglage : le prénom. Le nombre de manches est fixe (cinq, et la
// partie s'arrête plus tôt si les rôdeurs tombent), la bande d'âge se choisit au
// salon. L'avertissement des écrans est AU-DESSUS du bouton : la nièce sans
// téléphone se découvre avant de créer la partie, pas une fois tout le monde
// assis.
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createRoom, getRoom, lastNick, saveSeat } from "@/lib/games/room";
import { ROUNDS_TOTAL } from "@/lib/games/rodeurs/regles";
import { RODEURS_SKIN } from "@/lib/games/skin";
import GameShell from "@/components/games/GameShell";
import Apercus, { ApercuTexte, ApercuTitre } from "@/components/games/Apercus";
import { GBtn, GCard, GLabel } from "@/components/games/ui";

const skin = RODEURS_SKIN;

export default function RodeursCreate() {
  const t = useTranslations("Rodeurs");
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Le pseudo vit dans le localStorage : lecture APRÈS le montage seulement.
  // Un `useState(lastNick())` rend le bouton mort au second passage (désaccord
  // d'hydratation, payé sur Banalo — React ne rattrape pas `disabled`).
  useEffect(() => setName((n) => n || lastNick()), []);

  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy("create");
    setErr(null);
    try {
      const a = await createRoom("rodeurs", name.trim(), ROUNDS_TOTAL, {}, locale);
      if (a.status !== "ok" || !("code" in a)) {
        setErr(t("create.error"));
        return;
      }
      saveSeat({ code: a.code, token: a.token, name: a.name, isHost: true });
      router.push(`/games/rodeurs/${a.code}`);
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
      router.push(`/games/rodeurs/${c}`);
    } catch {
      setErr(t("create.badCode"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <GameShell skin={skin} title={t("name")} emoji="🔦" backLabel={t("back")} poweredBy={t("poweredBy")}>
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

        {/* CE QU'ON VOIT SUR SON ÉCRAN — avant de demander un prénom.
            
            Les trois vignettes sont les trois choses qu'un joueur a sous les yeux
            toute la soirée : son code, son rôle, sa mission. Le reste du jeu se
            passe dans la maison, pas dans l'application — la montrer davantage
            serait mentir sur ce qu'elle fait. */}
        <Apercus
          skin={skin}
          titre={t("apercu.titre")}
          ecrans={[
            {
              legende: t("apercu.l1"),
              contenu: (
                <div style={{ textAlign: "center", display: "grid", gap: 4 }}>
                  <ApercuTitre skin={skin}>{t("seal.title")}</ApercuTitre>
                  <div
                    style={{
                      fontFamily: skin.fontDisplay,
                      fontWeight: 800,
                      fontSize: 30,
                      letterSpacing: "0.16em",
                      color: skin.ink,
                      lineHeight: 1.05,
                    }}
                  >
                    K7M2
                  </div>
                  <ApercuTexte skin={skin} taille={9.5}>
                    {t("seal.hint")}
                  </ApercuTexte>
                </div>
              ),
            },
            {
              legende: t("apercu.l2"),
              contenu: (
                <>
                  <ApercuTitre skin={skin}>{t("carte.title")}</ApercuTitre>
                  <ApercuTexte skin={skin} fort taille={15}>
                    {t("carte.rodeur")}
                  </ApercuTexte>
                  {/* La consigne complète fait six lignes dans une vignette et
                      noie tout le reste : on garde la phrase courte, qui dit le
                      geste — le secret — et laisse la découverte au jeu. */}
                  <ApercuTexte skin={skin} taille={10}>
                    {t("carte.keep")}
                  </ApercuTexte>
                </>
              ),
            },
            {
              legende: t("apercu.l3"),
              contenu: (
                <>
                  <ApercuTitre skin={skin}>🎯 {t("mission.title")}</ApercuTitre>
                  <ApercuTexte skin={skin} fort taille={14}>
                    {t("mission.p.VALIDE_PAR_N", { n: 3 })}
                  </ApercuTexte>
                </>
              ),
            },
          ]}
        />

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

            <div
              style={{
                border: `${skin.border}px dashed ${skin.ink}`,
                borderRadius: skin.radius - 4,
                padding: "11px 13px",
                background: skin.bg,
              }}
            >
              <strong style={{ fontFamily: skin.fontDisplay, fontSize: 14.5, color: skin.ink }}>
                📱 {t("create.screens")}
              </strong>
              <div style={{ fontSize: 13.5, color: skin.muted, lineHeight: 1.5, marginTop: 4 }}>
                {t("create.screensHint")}
              </div>
            </div>

            <GBtn skin={skin} size="lg" full style={{ marginTop: 4 }} disabled={!name.trim() || busy !== null} onClick={create}>
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

        <GCard skin={skin} accent={skin.accent2} padding={16}>
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
