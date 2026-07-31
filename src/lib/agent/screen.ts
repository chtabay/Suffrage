// LE FILTRE DES CATÉGORIES INTERDITES
//
// L'avatar publie sans relecture humaine. Ce qui l'en empêche ne peut donc pas
// être une phrase adressée à un modèle : un modèle interprète, et une
// interprétation n'est pas un contrôle. Ce fichier est le contrôle — du code
// déterministe, exécuté AVANT toute publication, sur la question rédigée.
//
// Il est volontairement grossier et sur-bloquant. Un faux positif coûte une
// question qu'on ne posera pas ; un faux négatif coûte une publication
// automatique sur un drame en cours, signée Placet, un dimanche matin. Les deux
// erreurs ne se valent pas, donc le filtre penche du côté du silence.
//
// Ce qu'il ne prétend PAS être : une modération sémantique. Il n'attrape pas
// l'allusion ni l'ironie. C'est pourquoi il s'applique en plus — et non à la
// place — du choix des sujets en amont.

export type Verdict = { ok: true } | { ok: false; reason: string };

/** Une catégorie interdite, et de quoi la reconnaître. */
type Rule = { code: string; words: RegExp };

/**
 * Retire les accents. INDISPENSABLE, et découvert par l'essai : « le ministre
 * doit-il demissionner apres le proces » — sans accents, comme l'écrivent
 * couramment les fils de presse, les URL et les modèles — traversait un filtre
 * dont tous les motifs étaient accentués. Un garde-fou contournable par une
 * cédille absente n'est pas un garde-fou.
 */
const flatten = (s: string) => s.normalize("NFD").replace(/\p{M}+/gu, "");

// Frontières de mot en Unicode : `\b` de JS ne connaît pas les lettres
// accentuées. On encadre par « pas une lettre » plutôt que par `\b`.
// Les motifs sont écrits accentués pour rester lisibles, puis aplatis comme le
// texte examiné : les deux côtés de la comparaison subissent le même sort.
const w = (...alts: string[]) =>
  new RegExp(`(^|[^\\p{L}])(${alts.map(flatten).join("|")})([^\\p{L}]|$)`, "iu");

const RULES: Rule[] = [
  {
    // Drame en cours. Rien de ce que Placet fait — demander l'avis du public —
    // n'a sa place à côté d'un fait de ce genre.
    code: "drame",
    words: w(
      "attentats?", "attaque terroriste", "fusillades?", "tuerie",
      "meurtres?", "assassinats?", "féminicides?", "homicides?",
      "morts?", "décès", "victimes?", "tués?", "blessés?", "obsèques", "funérailles",
      "catastrophes?", "séismes?", "tremblements? de terre", "inondations? meurtrières?",
      "crashs?", "accidents? mortels?", "naufrages?", "incendies? mortels?",
      "guerres?", "bombardements?", "frappes? aériennes?", "otages?", "génocides?",
      "suicides?", "disparitions? inquiétantes?", "enlèvements?",
    ),
  },
  {
    // Personne physique mise en cause. Une question qui nomme un individu dans
    // un contexte d'accusation est une mise en cause, quelle que soit sa forme.
    code: "personne",
    words: w(
      "accusé(e|s|es)?", "mis en examen", "mise en examen", "inculpé(e|s|es)?",
      "soupçonné(e|s|es)?", "présumé(e|s|es)? coupables?",
      "démissionner", "démission de",
      "coupables?", "innocents?", "responsables? de la mort",
    ),
  },
  {
    // Procédure judiciaire en cours : on ne fait pas voter sur ce qu'un
    // tribunal instruit. Le sondage y deviendrait une pression.
    code: "justice",
    words: w(
      "procès", "audiences?", "réquisitoires?", "verdicts?", "condamnations?",
      "gardes? à vue", "instructions? judiciaires?", "plaintes? pour",
      "tribunal", "cour d'assises", "magistrats?", "perquisitions?",
    ),
  },
  {
    // Santé individuelle. Ni diagnostic, ni pronostic, ni « faut-il se faire
    // soigner » : Placet n'est pas un avis médical et n'en donnera pas l'air.
    code: "sante",
    words: w(
      "cancers?", "tumeurs?", "maladies? graves?", "diagnostics?", "pronostics?",
      // « traitement médical » comme « traitements médicaux » : l'accord ne suit
      // pas un `s` optionnel, il change le mot. Un test l'a montré.
      "traitements? médica(l|ux)", "chimiothérapies?", "euthanasies?",
      "hospitalisé(e|s|es)?", "en soins intensifs", "état critique",
      "avortements?", "IVG", "dépressions?", "troubles? psychiatriques?",
    ),
  },
];

/**
 * Passe une question au filtre. Le verdict est SANS APPEL côté worker : une
 * question bloquée n'est pas re-soumise à un modèle pour arbitrage, elle est
 * journalisée et abandonnée.
 *
 * On examine la question ET les options : l'interdit peut n'apparaître que dans
 * une réponse proposée (« Oui, il doit démissionner »).
 */
export function screen(question: string, options: readonly string[] = []): Verdict {
  const haystack = flatten([question, ...options].join(" · "));
  for (const rule of RULES) {
    const m = haystack.match(rule.words);
    if (m) return { ok: false, reason: `${rule.code}:${m[2].toLowerCase()}` };
  }
  return { ok: true };
}

/** Les codes de catégorie, pour les tests et le journal. */
export const CATEGORIES = RULES.map((r) => r.code);
