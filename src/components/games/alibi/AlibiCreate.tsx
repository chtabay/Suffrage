"use client";

// OUVRIR UNE MAISON — la porte d'entrée d'Alibi.
//
// Un seul réglage, et il n'y en aura pas d'autre : le prénom. Pas de choix du
// nombre de manches (il est fixe à cinq — quatre d'enquête, puis l'accusation),
// pas d'ambiance, pas d'options. Une murder party se lance en dix secondes ou
// la soirée est passée à autre chose.
//
// L'AVERTISSEMENT SUR LES ÉCRANS EST AU-DESSUS DU BOUTON, PAS EN BAS DE PAGE.
// C'est le vrai risque du gîte : la nièce de neuf ans n'a pas de téléphone, et
// jouer à deux sur un écran détruit le secret — donc le jeu. Ça doit se lire
// AVANT de créer la partie, pas se découvrir une fois tout le monde assis.
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createRoom, getRoom, lastNick, saveSeat } from "@/lib/games/room";
import { ROUNDS_TOTAL } from "@/lib/games/alibi/regles";
import { ALIBI_SKIN } from "@/lib/games/skin";
import GameShell from "@/components/games/GameShell";
import { GBtn, GCard, GLabel } from "@/components/games/ui";

const skin = ALIBI_SKIN;

export default function AlibiCreate() {
  const t = useTranslations("Alibi");
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Le pseudo de la dernière partie vit dans le localStorage : on ne peut le
  // lire qu'APRÈS le montage.
  //
  // ⚠️ CE QUE COÛTAIT UN `useState(lastNick())`, payé une fois sur Unanimo. Le
  // serveur rend « », le client rend le pseudo enregistré : désaccord
  // d'hydratation. React ne rattrape PAS les attributs — l'attribut `disabled`
  // du bouton reste celui du serveur, donc vrai, pendant que React le croit à
  // faux et ne le réécrira jamais. Le champ s'affiche vide, on tape son nom, et
  // le bouton ne répond plus. Jamais au premier passage, toujours au second.
  useEffect(() => setName((n) => n || lastNick()), []);

  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy("create");
    setErr(null);
    try {
      const a = await createRoom("alibi", name.trim(), ROUNDS_TOTAL, {}, locale);
      // `"code" in a` : le type de retour a une branche fourre-tout
      // `{ status: string }` qui empêche TypeScript de réduire sur le seul
      // statut. C'est le même contrôle que dans UnanimoCreate.
      if (a.status !== "ok" || !("code" in a)) {
        setErr(t("create.error"));
        return;
      }
      saveSeat({ code: a.code, token: a.token, name: a.name, isHost: true });
      router.push(`/games/alibi/${a.code}`);
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
      router.push(`/games/alibi/${c}`);
    } catch {
      setErr(t("create.badCode"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <GameShell skin={skin} title={t("name")} emoji="🕯️" backLabel={t("back")} poweredBy={t("poweredBy")}>
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
          <p style={{ fontSize: 16, color: skin.muted, lineHeight: 1.55, marginTop: 10, maxWidth: "46ch" }}>
            {t("create.pitch")}
          </p>
          <p style={{ fontSize: 13.5, color: skin.muted, marginTop: 10 }}>{t("create.best")}</p>
        </div>

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

            {/* L'avertissement des écrans, juste au-dessus du bouton. */}
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
              <div role="alert" style={{ fontSize: 14, color: "#B3261E", fontWeight: 700 }}>
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
