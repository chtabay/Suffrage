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

// `t("wait.progress")` doit se résoudre à travers les SOUS-OBJETS, comme le fait
// next-intl. Le contrôle se contentait d'un `key in table`, qui ne voit que le
// premier niveau : une clé imbriquée pourtant correcte était donc signalée
// manquante, et l'unique échappatoire était d'aplatir tout un namespace. On
// descend le chemin, et on exige une CHAÎNE à l'arrivée — viser un sous-objet
// (`t("wait")`) lève à l'exécution, c'est donc une faute, pas un raccourci.
const resolve = (table, path) =>
  path.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), table);

// ------------------------------------------------------------ 3. arguments
// Les NOMS passés à l'appel doivent couvrir les variables du message.
//
// Ajouté après un troisième bug arrivé à l'écran, d'une famille que ni la parité
// ni la résolution ne voyaient : le message disait `{count, plural, …}` et
// l'appel passait `{ n }`. La clé existait, les quatre langues étaient
// d'accord — et l'écran affichait « Unanimo.host.more » en clair, parce qu'un
// argument manquant fait échouer le formatage ICU, pas seulement l'interpolation.
//
// On ne signale QUE le manque. Un argument passé en trop est sans effet, et
// l'exiger interdirait de partager un même objet de paramètres entre appels.
//
// Renvoie la liste des noms passés, ou `null` quand on ne sait pas lire l'appel
// (objet étalé, variable, appel sur plusieurs niveaux d'imbrication) : dans le
// doute, on se taît plutôt que de crier à tort.
const callArgs = (src, from) => {
  let i = from;
  while (i < src.length && /\s/.test(src[i])) i++;
  if (src[i] !== ",") return []; // aucun argument passé
  i++;
  while (i < src.length && /\s/.test(src[i])) i++;
  if (src[i] !== "{") return null; // `t("k", params)` : illisible d'ici
  let depth = 0;
  const start = i;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) break;
  }
  const body = src.slice(start + 1, i);
  if (body.includes("...")) return null; // étalement : on ne peut pas conclure
  const names = new Set();
  // `{ n: 3 }`, `{ n }`, `{ count: x, total: y }` — uniquement le premier niveau.
  let level = 0;
  for (const m of body.matchAll(/[{}[\]()]|([A-Za-z_$][\w$]*)\s*(:|,|$)/g)) {
    const tok = m[0];
    if (/[{[(]/.test(tok)) level++;
    else if (/[}\])]/.test(tok)) level--;
    else if (level === 0 && m[1]) names.add(m[1]);
  }
  return [...names];
};

let used = 0;
for (const file of sources) {
  const src = readFileSync(file, "utf8");
  const short = file.split(/[\\/]/).pop();
  // `const t = useTranslations("Org")` → toute occurrence de `t("clé")` vise Org.
  for (const [, alias, ns] of src.matchAll(/const\s+(\w+)\s*=\s*useTranslations\(\s*"([^"]+)"\s*\)/g)) {
    const table = REF[ns] ?? {};
    for (const m of src.matchAll(new RegExp(`\\b${alias}\\(\\s*"([^"]+)"`, "g"))) {
      const key = m[1];
      used++;
      const found = resolve(table, key);
      if (typeof found !== "string") {
        const why = found === undefined ? "introuvable (mauvais namespace ?)" : "pointe un groupe, pas un libellé";
        errors.push(`${short} utilise ${ns}.${key} — ${why}`);
        continue;
      }
      const needed = vars(found).split(",").filter(Boolean);
      if (!needed.length) continue;
      const passed = callArgs(src, m.index + m[0].length);
      if (passed === null) continue;
      const missing = needed.filter((v) => !passed.includes(v));
      if (missing.length) {
        errors.push(
          `${short} appelle ${ns}.${key} sans ${missing.map((v) => `{${v}}`).join(", ")}` +
            `${passed.length ? ` (passe ${passed.map((v) => `{${v}}`).join(", ")})` : " (aucun argument)"}`,
        );
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
