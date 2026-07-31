// Garde-fou i18n. DEUX contrôles :
//
//   1. PARITÉ — tous les messages/*.json ont exactement le même jeu de clés et les
//      mêmes variables d'interpolation ({name}, {count}, plural…). Les langues ne
//      doivent différer QUE par les libellés, jamais par la structure.
//
//   2. RÉSOLUTION — chaque `t("clé")` d'un composant existe dans le namespace que
//      ce composant déclare via `useTranslations("NS")`.
//
// Le second contrôle a été ajouté après un bug arrivé jusqu'à l'utilisateur :
// quatre clés avaient été insérées dans le namespace `Timing` au lieu de `Org`
// (le nom de clé servant d'ancre existait dans les deux). Les quatre langues
// étaient parfaitement d'accord entre elles — la parité était donc VERTE — et
// l'écran affichait « Org.sealedTooFewTitle » en clair. Une clé bien traduite au
// mauvais endroit reste une clé manquante.
//
// Échoue (exit 1) à la moindre divergence → branché sur `npm run build`.
// Les locales sont auto-découvertes : ajouter messages/<loc>.json suffit à l'inclure.
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const MSG_DIR = new URL("../messages/", import.meta.url);
const LOCALES = readdirSync(MSG_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.slice(0, -5))
  .sort();

const flatten = (obj, prefix = "", acc = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, acc);
    else acc[key] = v;
  }
  return acc;
};

// Variables d'interpolation RÉELLES d'une valeur ICU. On retire d'abord les
// sous-messages de pluriel/select (`one {votant}`, `other {# adoptées}`…) qui sont
// du texte traduisible — sinon on les confondrait avec des variables — puis on
// extrait les noms d'arguments restants ({name}, {count, plural…}).
const vars = (s) => {
  const cleaned = String(s).replace(/\b(zero|one|two|few|many|other|=\d+)\s*\{[^{}]*\}/g, " ");
  return [...new Set([...cleaned.matchAll(/\{(\w+)/g)].map((m) => m[1]))].sort().join(",");
};

const raw = Object.fromEntries(
  LOCALES.map((l) => [l, JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf8"))]),
);
const data = Object.fromEntries(LOCALES.map((l) => [l, flatten(raw[l])]));

const allKeys = [...new Set(LOCALES.flatMap((l) => Object.keys(data[l])))].sort();
const errors = [];

// ------------------------------------------------------------------ 1. parité
for (const key of allKeys) {
  const present = LOCALES.filter((l) => key in data[l]);
  for (const l of LOCALES) if (!present.includes(l)) errors.push(`${l.toUpperCase()} manque la clé : ${key}`);
  // Variables identiques entre toutes les langues qui possèdent la clé.
  const ref = vars(data[present[0]][key]);
  for (const l of present.slice(1)) {
    const cur = vars(data[l][key]);
    if (cur !== ref) errors.push(`${key} : variables différentes (${present[0]}=[${ref}] vs ${l}=[${cur}])`);
  }
}

// -------------------------------------------------------------- 2. résolution
// Le français sert de référence : la parité ci-dessus garantit que les autres
// langues portent les mêmes clés.
const REF = raw.fr ?? {};

const sources = [];
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) sources.push(full);
  }
};
walk(fileURLToPath(new URL("../src", import.meta.url)));

let used = 0;
for (const file of sources) {
  const src = readFileSync(file, "utf8");
  // `const t = useTranslations("Org")` → toute occurrence de `t("clé")` vise Org.
  for (const [, alias, ns] of src.matchAll(/const\s+(\w+)\s*=\s*useTranslations\(\s*"([^"]+)"\s*\)/g)) {
    const table = REF[ns] ?? {};
    for (const [, key] of src.matchAll(new RegExp(`\\b${alias}\\(\\s*"([^"]+)"`, "g"))) {
      used++;
      if (!(key in table)) {
        errors.push(`${file.split(/[\\/]/).pop()} utilise ${ns}.${key} — introuvable (mauvais namespace ?)`);
      }
    }
  }
}

if (errors.length) {
  console.error(`✗ i18n : ${errors.length} problème(s) sur ${allKeys.length} clés\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log(
  `✓ i18n : ${allKeys.length} clés × ${LOCALES.length} langues (parité) — ${used} usages résolus dans leur namespace`,
);
