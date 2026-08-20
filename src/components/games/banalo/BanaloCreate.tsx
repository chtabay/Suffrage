"use client";

// CRÉER UNE PARTIE — et rejoindre par un code.
//
// Un seul champ obligatoire : le pseudo. Le reste a des valeurs par défaut qui
// marchent (5 manches, 8 mots — le format du jeu de plateau), et se règle d'un
// appui. Aucun compte : `game_create` accepte `anon`, exactement comme la
// création d'un scrutin par lien.
//
// La création EMMÈNE dans la salle, elle ne montre pas un écran « c'est prêt » :
// l'hôte doit se retrouver tout de suite devant le code à lire à voix haute.
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createRoom, getRoom, lastNick, saveSeat } from "@/lib/games/room";
import { UNANIMO_SKIN } from "@/lib/games/skin";
import GameShell from "@/components/games/GameShell";
import Apercus, { ApercuPastille, ApercuTexte, ApercuTitre } from "@/components/games/Apercus";
import { GBtn, GCard, GLabel } from "@/components/games/ui";

const skin = UNANIMO_SKIN;
const ROUNDS = [3, 5, 8];
const WORDS = [5, 8, 12];

export default function BanaloCreate() {
  const t = useTranslations("Banalo");
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [rounds, setRounds] = useState(5);
  const [words, setWords] = useState(8);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Le pseudo de la dernière partie vit dans le localStorage : on ne peut le
  // lire qu'APRÈS le montage — la règle est déjà écrite dans BanaloRoom, et
  // c'est ici qu'elle manquait.
  //
  // ⚠️ CE QUE COÛTAIT UN `useState(lastNick())`. Le serveur rend « » (pas de
  // localStorage), le client rend « Chloé » : désaccord d'hydratation. React ne
  // rattrape PAS les attributs — l'attribut `disabled` du bouton reste celui du
  // serveur, donc VRAI, pendant que React croit l'avoir mis à faux. Il ne le
  // réécrira jamais, puisque de son point de vue rien ne change. Résultat : le
  // champ s'affiche vide, on tape son nom, et le bouton « Créer la partie » ne
  // répond plus. Jamais au premier passage, toujours au second — la panne
  // qu'une démonstration rapide ne voit pas.
  //
  // Forme fonctionnelle : si quelqu'un a déjà tapé avant que l'effet ne tourne,
  // on ne lui reprend pas sa saisie.
  useEffect(() => setName((n) => n || lastNick()), []);

  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy("create");
    setErr(null);
    try {
      const a = await createRoom("banalo", name.trim(), rounds, { words }, locale);
      if (a.status !== "ok" || !("code" in a)) {
        setErr(t("create.error"));
        return;
      }
      saveSeat({ code: a.code, token: a.token, name: a.name, isHost: true });
      router.push(`/games/banalo/${a.code}`);
    } catch {
      setErr(t("create.error"));
    } finally {
      setBusy(null);
    }
  };

  // On vérifie que la salle EXISTE avant d'y envoyer quelqu'un : atterrir sur
  // « cette partie n'existe plus » après avoir tapé six caractères de travers
  // fait douter du code, pas de la frappe.
  const join = async () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4 || busy) return;
    setBusy("join");
    setErr(null);
    try {
      const a = await getRoom(c);
      if (a.status === "not_found") setErr(t("create.badCode"));
      else router.push(`/games/banalo/${c}`);
    } catch {
      setErr(t("create.badCode"));
    } finally {
      setBusy(null);
    }
  };

  const chips = (values: number[], value: number, set: (n: number) => void, label: (n: number) => string) => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
      {values.map((v) => {
        const on = v === value;
        return (
          <button
            key={v}
            type="button"
            onClick={() => set(v)}
            aria-pressed={on}
            style={{
              fontFamily: skin.fontDisplay,
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
              minHeight: 44,
              padding: "0 18px",
              borderRadius: 11,
              border: `${skin.border}px solid ${skin.ink}`,
              background: on ? skin.ink : skin.paper,
              color: on ? "#fff" : skin.ink,
            }}
          >
            {label(v)}
          </button>
        );
      })}
    </div>
  );

  return (
    <GameShell skin={skin} title={t("name")} emoji="🧠" backLabel={t("back")} poweredBy={t("poweredBy")}>
      {/* ⚠️ `minmax(0, 1fr)` ET PAS `1fr`. Un élément de grille a `min-width:
          auto` par défaut : il refuse de rétrécir sous le minimum intrinsèque de
          son contenu. La rangée d'aperçus est FAITE pour déborder et défiler
          (`overflow-x: auto`), mais son minimum vaut trois vignettes de 184 px —
          soit 576 px, qui étiraient la piste, donc les CINQ blocs de la page, et
          faisaient défiler tout l'écran latéralement sur un téléphone de 390 px.
          Mesuré avant/après : 592 px de large pour 390 disponibles. */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
        <div>
          <h1
            style={{
              fontFamily: skin.fontDisplay,
              fontWeight: 800,
              fontSize: "clamp(30px,9vw,44px)",
              lineHeight: 1.03,
              letterSpacing: "-0.035em",
              margin: 0,
            }}
          >
            {t("create.hero")}
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: skin.muted, margin: "10px 0 0", maxWidth: "34ch" }}>
            {t("create.pitch")}
          </p>
        </div>

        {/* CE QU'ON VOIT SUR SON ÉCRAN.
            
            Trois vignettes, dans l'ordre de la manche : on écrit, on révèle, on
            compte. La deuxième est la seule qui compte vraiment — c'est là que
            le jeu se joue, et c'est celle qu'une description ne rend pas. */}
        <Apercus
          skin={skin}
          titre={t("apercu.titre")}
          ecrans={[
            {
              legende: t("apercu.l1"),
              contenu: (
                <>
                  <ApercuTitre skin={skin}>{t("round.theme")}</ApercuTitre>
                  <ApercuTexte skin={skin} fort taille={15}>
                    🌊 {t("apercu.theme")}
                  </ApercuTexte>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                    <ApercuPastille skin={skin}>{t("apercu.mot1")}</ApercuPastille>
                    <ApercuPastille skin={skin}>{t("apercu.mot2")}</ApercuPastille>
                    <ApercuPastille skin={skin}>{t("apercu.mot3")}</ApercuPastille>
                  </div>
                </>
              ),
            },
            {
              legende: t("apercu.l2"),
              contenu: (
                <>
                  <ApercuTitre skin={skin}>{t("reveal.common")}</ApercuTitre>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    <ApercuPastille skin={skin} plein>
                      {t("apercu.mot1")}
                    </ApercuPastille>
                  </div>
                  <ApercuTexte skin={skin} taille={9.5}>
                    {t("apercu.avec")}
                  </ApercuTexte>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3 }}>
                    <ApercuPastille skin={skin}>{t("apercu.mot3")}</ApercuPastille>
                  </div>
                  <ApercuTexte skin={skin} taille={9.5}>
                    {t("reveal.alone")}
                  </ApercuTexte>
                </>
              ),
            },
            {
              legende: t("apercu.l3"),
              contenu: (
                <>
                  <ApercuTitre skin={skin}>{t("apercu.scores")}</ApercuTitre>
                  {[
                    [t("apercu.j1"), "7"],
                    [t("apercu.j2"), "5"],
                    [t("apercu.j3"), "4"],
                  ].map(([nom, pts], i) => (
                    <div
                      key={nom}
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 6,
                        borderTop: i ? `1px solid ${skin.ink}18` : undefined,
                        paddingTop: i ? 4 : 0,
                      }}
                    >
                      <ApercuTexte skin={skin} fort taille={12}>
                        {nom}
                      </ApercuTexte>
                      <ApercuTexte skin={skin} fort taille={13} style={{ color: skin.good }}>
                        {pts}
                      </ApercuTexte>
                    </div>
                  ))}
                </>
              ),
            },
          ]}
        />

        <GCard skin={skin} accent={skin.accent} padding={16}>
          <GLabel skin={skin}>{t("create.name")}</GLabel>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void create();
            }}
            placeholder={t("join.placeholder")}
            aria-label={t("create.name")}
            maxLength={24}
            enterKeyHint="go"
            autoComplete="nickname"
            style={{
              width: "100%",
              marginTop: 8,
              fontFamily: skin.fontDisplay,
              fontWeight: 700,
              fontSize: 20,
              padding: "14px 15px",
              border: `3px solid ${skin.ink}`,
              borderRadius: 13,
              background: "#fff",
              color: skin.ink,
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          <div style={{ marginTop: 14 }}>
            <GLabel skin={skin}>{t("create.rounds")}</GLabel>
            {chips(ROUNDS, rounds, setRounds, (n) => t("create.roundsN", { n }))}
            <div style={{ fontSize: 12, color: skin.muted, marginTop: 6, fontWeight: 600 }}>{t("create.roundsHint")}</div>
          </div>

          <div style={{ marginTop: 14 }}>
            <GLabel skin={skin}>{t("create.words")}</GLabel>
            {chips(WORDS, words, setWords, (n) => t("create.wordsN", { n }))}
          </div>

          {err && (
            <div role="alert" style={{ marginTop: 10, fontSize: 13.5, fontWeight: 700, color: "#C62828" }}>
              {err}
            </div>
          )}

          <GBtn skin={skin} size="lg" full style={{ marginTop: 16 }} disabled={!name.trim() || busy !== null} onClick={create}>
            {busy === "create" ? t("create.creating") : t("create.cta")}
          </GBtn>
          <div style={{ fontSize: 12, color: skin.muted, marginTop: 8, textAlign: "center", fontWeight: 600 }}>
            {t("create.noAccount")}
          </div>
        </GCard>

        <div>
          <GLabel skin={skin}>{t("how.title")}</GLabel>
          <ol style={{ margin: "8px 0 0", paddingLeft: 20, color: skin.muted, fontSize: 14.5, lineHeight: 1.6 }}>
            <li>{t("how.s1")}</li>
            <li>{t("how.s2")}</li>
            <li>{t("how.s3")}</li>
          </ol>
        </div>

        <GCard skin={skin} padding={14}>
          <GLabel skin={skin}>{t("create.joinCode")}</GLabel>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === "Enter") void join();
              }}
              placeholder={t("create.codePlaceholder")}
              aria-label={t("create.joinCode")}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily: skin.fontDisplay,
                fontWeight: 800,
                fontSize: 20,
                letterSpacing: "0.12em",
                padding: "12px 14px",
                border: `3px solid ${skin.ink}`,
                borderRadius: 12,
                background: "#fff",
                color: skin.ink,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <GBtn skin={skin} variant="accent" onClick={join} disabled={code.trim().length < 4 || busy !== null}>
              {busy === "join" ? "…" : t("create.join")}
            </GBtn>
          </div>
        </GCard>
      </div>
    </GameShell>
  );
}
