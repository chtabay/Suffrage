// Le seul test d'Alibi, et il garde la seule chose que rien d'autre ne garde.
//
// POURQUOI CELUI-LÀ. La spec du jeu (§5) écrit noir sur blanc : « ⚠️ Cette liste
// doit rester synchrone avec le tableau de `scrutin_game_alibi_deal`. » Et
// `lieux.ts` annonce en commentaire « un test compare les deux listes ». Ce test
// n'existait pas. Deux listes de douze chaînes, dans deux langages, dans deux
// fichiers, qu'on maintient à la main : c'est exactement la forme d'une
// divergence silencieuse.
//
// CE QUI ARRIVE QUAND ELLES DIVERGENT. La base ne stocke que des CLÉS, jamais
// des libellés. Une clé écrite par le SQL et inconnue du client fait rendre
// `placeLabel` la clé brute — la table lit « bibliotheque » en minuscules sans
// accent au milieu d'un écran soigné, et l'emoji retombe sur la porte générique.
// Ce n'est pas une panne, c'est pire : ça marche presque, et personne ne le
// signale.
//
// ⚠️ ON LIT LA MIGRATION, PAS UNE COPIE. Recopier la liste attendue dans le test
// ne prouverait rien : il faudrait la maintenir aussi, et on aurait TROIS listes
// au lieu de deux. Le test va donc chercher le tableau dans le fichier SQL
// réellement appliqué. S'il ne le trouve pas, il ÉCHOUE — un test qui se tait
// quand il ne sait pas lire ne garde rien.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PLACE_KEYS, placeEmoji, placeLabel } from "./lieux";

/** Le tableau de pièces tel qu'il est écrit dans `scrutin_game_alibi_deal`. */
function clesDuSql(): string[] {
  const dossier = join(process.cwd(), "supabase", "migrations");
  // La DERNIÈRE migration qui définit la distribution fait foi : une migration
  // ultérieure peut avoir remplacé la fonction.
  const fichiers = readdirSync(dossier)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  let trouve: string[] | null = null;
  for (const f of fichiers) {
    const sql = readFileSync(join(dossier, f), "utf8");
    if (!sql.includes("function public.scrutin_game_alibi_deal")) continue;
    const m = sql.match(/unnest\(array\[([^\]]*)\]\)/);
    if (!m) continue;
    trouve = [...m[1].matchAll(/'([a-z0-9_]+)'/g)].map((x) => x[1]);
  }
  assert.ok(trouve, "aucune migration ne définit le tableau de pièces de scrutin_game_alibi_deal");
  return trouve;
}

test("les douze pièces du client sont EXACTEMENT celles du serveur", () => {
  const sql = clesDuSql();
  assert.ok(sql.length >= 3, "le serveur doit proposer au moins trois pièces");
  // L'ORDRE compte autant que le contenu : le SQL tire `array_agg(k order by
  // random())` puis coupe, donc n'importe quelle clé peut sortir. Une seule
  // absente du client suffit à afficher une clé brute à l'écran.
  assert.deepEqual([...PLACE_KEYS].sort(), [...sql].sort());
});

test("chaque clé du serveur a un libellé dans les quatre langues et un emoji", () => {
  for (const k of clesDuSql()) {
    for (const loc of ["fr", "en", "es", "pcm"]) {
      const l = placeLabel(k, loc);
      // `placeLabel` rend la CLÉ quand elle est inconnue : c'est un repli
      // volontaire à l'exécution, et c'est précisément ce qu'on refuse ici.
      assert.notEqual(l, k, `${k} n'a pas de libellé en ${loc}`);
      assert.ok(l.length > 1, `${k}/${loc} : libellé vide`);
    }
    // ⚠️ ON NE TESTE PAS « l'emoji n'est pas celui du repli ». `couloir` porte
    // légitimement 🚪, qui est aussi la valeur de repli : l'assertion ne peut
    // pas distinguer un choix d'un échec, et elle échouait sur une clé
    // parfaitement valide. C'est le libellé, ci-dessus, qui prouve déjà que la
    // clé est connue du client — l'emoji n'a plus qu'à exister.
    assert.ok(placeEmoji(k).length > 0, `${k} n'a pas d'emoji`);
  }
});

test("une clé inconnue ne casse pas l'écran, elle se lit", () => {
  // Le repli documenté : une partie ouverte avant l'ajout d'une pièce, ou une
  // base plus récente que le client déployé.
  assert.equal(placeLabel("donjon", "fr"), "donjon");
  assert.equal(placeEmoji("donjon"), "🚪");
});
