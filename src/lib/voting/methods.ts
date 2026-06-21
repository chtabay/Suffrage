// Vocabulaire public des méthodes de scrutin — source unique stable.
// Sert aux URLs /new, à l'API, à la page /ai, aux prompts IA, à Slack/Teams/MCP.
// La clé publique est le « langage Suffrage » ; le label/tagline viennent de SYSTEMS.
import { SYSTEMS } from "./systems";

export interface PublicMethodDef {
  /** Clé publique canonique (stable, utilisée partout). */
  key: string;
  /** Clé interne du système (voir SYSTEMS). */
  system: string;
  /** Quand l'utiliser (aide au choix). */
  whenToUse: string;
  /** Synonymes acceptés en entrée. */
  aliases?: string[];
}

export const PUBLIC_METHODS: PublicMethodDef[] = [
  { key: "simple_vote", system: "fptp", whenToUse: "Trancher vite : un tour, le plus de voix gagne.", aliases: ["majority", "fptp"] },
  { key: "two_round", system: "runoff", whenToUse: "Garantir une majorité absolue, avec un second tour si besoin.", aliases: ["runoff"] },
  { key: "approval", system: "approval", whenToUse: "Plusieurs choix acceptables : chacun coche tout ce qui lui convient." },
  { key: "borda", system: "borda", whenToUse: "Favoriser le consensus large à partir d'un classement." },
  { key: "condorcet", system: "condorcet", whenToUse: "Désigner le gagnant de tous les duels (vrai consensus)." },
  { key: "condorcet_random", system: "condorcet_random", whenToUse: "Condorcet, en départageant au sort les blocages." },
  { key: "majority_judgment", system: "mj", whenToUse: "Juger par mentions ; limite le vote tactique.", aliases: ["mj"] },
  { key: "proportional", system: "proportional", whenToUse: "Répartir des sièges au prorata des voix (assemblée)." },
  { key: "list", system: "list", whenToUse: "Voter pour des listes avec prime majoritaire (municipales)." },
  { key: "grand_electors", system: "indirect", whenToUse: "Voter par circonscriptions / grands électeurs.", aliases: ["indirect"] },
];

const RESOLVE: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const d of PUBLIC_METHODS) {
    m[d.key] = d.system;
    (d.aliases ?? []).forEach((a) => (m[a] = d.system));
  }
  return m;
})();

/** Clé publique (ou alias) → clé interne de système, sinon undefined. */
export function publicMethodToSystem(key: string): string | undefined {
  return RESOLVE[key.trim().toLowerCase()];
}

/** Catalogue enrichi (label/tagline/icône depuis SYSTEMS) — pour la doc /ai et l'UI. */
export function publicMethodCatalog() {
  return PUBLIC_METHODS.map((d) => {
    const s = SYSTEMS[d.system];
    return {
      key: d.key,
      label: s.name,
      tagline: s.tagline,
      icon: s.icon,
      whenToUse: d.whenToUse,
      aliases: d.aliases ?? [],
    };
  });
}
