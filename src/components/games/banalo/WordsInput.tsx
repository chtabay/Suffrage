"use client";

// SAISIE DES MOTS — l'écran le plus utilisé du jeu, donc le plus travaillé.
//
// CE QUI EST OPTIMISÉ, ET POURQUOI :
//
// • LE CLAVIER NE SE FERME JAMAIS. Après chaque mot validé, le champ garde le
//   focus. Sur un téléphone, un clavier qui se replie entre deux mots coûte un
//   appui et une demi-seconde à chaque fois — huit fois par manche, six joueurs.
//
// • ENTRÉE AJOUTE, ELLE N'ENVOIE PAS. `enterKeyHint="enter"` : le clavier montre
//   un retour à la ligne, pas « OK ». Envoyer par mégarde au troisième mot est
//   l'erreur la plus coûteuse de la manche, et elle serait irréversible si on ne
//   pouvait pas se corriger — on peut, jusqu'à la révélation.
//
// • ON COLLE UNE LISTE. « plage, vague, sel » saisi d'un bloc devient trois mots :
//   certains joueurs pensent en liste, et le séparateur ne doit pas les punir.
//
// • LE DOUBLON EST DIT, PAS AVALÉ. Écrire « Plage » puis « plages » ne rapporte
//   qu'une fois (le serveur dédoublonne). Le taire donnerait un joueur persuadé
//   d'avoir huit mots avec sept qui comptent. On le prévient, avec la raison.
import { useMemo, useRef, useState } from "react";
import { normalizeWord, themeTokens } from "@/lib/games/banalo/scoring";
import type { GameSkin } from "@/lib/games/skin";
import { GBtn } from "@/components/games/ui";

export default function WordsInput({
  skin,
  max,
  initial = [],
  theme,
  labels,
  busy,
  onSubmit,
}: {
  skin: GameSkin;
  max: number;
  initial?: string[];
  /** Le thème : le citer ne rapporte rien, autant le dire tout de suite. */
  theme: string;
  labels: {
    placeholder: string;
    add: string;
    count: (n: number, max: number) => string;
    send: string;
    sending: string;
    duplicate: (w: string) => string;
    isTheme: string;
    full: string;
    remove: (w: string) => string;
  };
  busy?: boolean;
  onSubmit: (words: string[]) => void | Promise<void>;
}) {
  const [words, setWords] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);

  // Les MÊMES jetons que le dépouillement (thème entier + chaque mot de ≥ 3
  // lettres), et non le thème entier seul : sinon la saisie accepte un mot que le
  // serveur écartera, et l'emplacement est perdu sans un mot d'explication.
  const themeWords = useMemo(() => themeTokens(theme), [theme]);
  const taken = useMemo(() => new Set(words.map(normalizeWord)), [words]);

  const flash = (m: string) => {
    setNote(m);
    setTimeout(() => setNote((cur) => (cur === m ? null : cur)), 2600);
  };

  const add = (raw: string) => {
    // Un bloc collé peut porter plusieurs mots : virgules, points-virgules,
    // retours à la ligne. Le trait d'union, lui, appartient au mot.
    const parts = raw.split(/[,;\n\r]+/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...words];
    const seen = new Set(taken);
    for (const p of parts) {
      if (next.length >= max) {
        flash(labels.full);
        break;
      }
      const n = normalizeWord(p);
      if (!n) continue;
      if (themeWords.has(n)) {
        flash(labels.isTheme);
        continue;
      }
      if (seen.has(n)) {
        flash(labels.duplicate(p));
        continue;
      }
      seen.add(n);
      next.push(p.slice(0, 40));
    }
    setWords(next);
    setDraft("");
    // Le focus reste dans le champ : on enchaîne au mot suivant sans viser.
    field.current?.focus();
  };

  const remove = (i: number) => {
    setWords(words.filter((_, k) => k !== i));
    field.current?.focus();
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          ref={field}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            }
            if (e.key === "Backspace" && draft === "" && words.length) remove(words.length - 1);
          }}
          placeholder={labels.placeholder}
          aria-label={labels.placeholder}
          maxLength={40}
          enterKeyHint="enter"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={words.length >= max}
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: skin.fontDisplay,
            fontWeight: 700,
            fontSize: 19,
            padding: "14px 15px",
            border: `3px solid ${skin.ink}`,
            borderRadius: 13,
            background: words.length >= max ? "#f2f2f2" : "#fff",
            color: skin.ink,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <GBtn skin={skin} variant="accent" onClick={() => add(draft)} disabled={!draft.trim()} aria-label={labels.add}>
          +
        </GBtn>
      </div>

      {/* Le compteur, et le doublon expliqué au même endroit : on ne cherche pas
          où l'information est apparue. */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 8, minHeight: 20 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: note ? "#C62828" : skin.muted }} role={note ? "alert" : undefined}>
          {note ?? labels.count(words.length, max)}
        </span>
      </div>

      <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0, display: "flex", flexWrap: "wrap", gap: 7 }}>
        {words.map((w, i) => (
          <li key={`${w}-${i}`} style={{ animation: "popIn 0.18s ease both" }}>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={labels.remove(w)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                fontFamily: skin.fontDisplay,
                fontWeight: 700,
                fontSize: 15,
                padding: "8px 11px",
                borderRadius: 11,
                cursor: "pointer",
                border: `2px solid ${skin.ink}`,
                background: skin.paper,
                color: skin.ink,
              }}
            >
              {w}
              <span aria-hidden style={{ color: skin.muted, fontWeight: 800 }}>
                ×
              </span>
            </button>
          </li>
        ))}
      </ul>

      <GBtn
        skin={skin}
        size="lg"
        full
        onClick={() => void onSubmit(words)}
        disabled={!words.length || busy}
        style={{ marginTop: 14 }}
      >
        {busy ? labels.sending : labels.send}
      </GBtn>
    </div>
  );
}
