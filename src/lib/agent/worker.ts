// LE WORKER — un passage de la machine à états de l'avatar éditorial.
//
// Le programme tient la boucle ; le modèle, quand il y en aura un, ne fera
// qu'écrire. C'est une exigence et non un goût : l'avatar publie sans relecture,
// donc ce qui l'encadre doit être exécutable et rejouable, pas interprété.
//
// Un passage ne fait qu'AVANCER d'un cran chaque campagne échue :
//   brouillon → (filtre) → publié → clos → analysé
// Il est sans état : on peut le déclencher n'importe quand, deux fois de suite,
// ou le rejouer après une panne. Les transitions sont gardées en base par
// l'état attendu, donc un double déclenchement ne publie pas deux fois.

import { screen } from "@/lib/agent/screen";
import {
  blockCampaign,
  dueCampaigns,
  markClosed,
  markAnalysed,
  markPublished,
  type Campaign,
} from "@/lib/agent/campaigns";
import { closePollServer, createPollServer, setPollVisibilityServer } from "@/lib/db/pollsServer";
import { getPollShareInfo } from "@/lib/db/pollMeta";
import { DRAFT_ICONS, splitLeadingEmoji } from "@/lib/voting/draft";
import { recipeForSystem } from "@/lib/voting/engine";
import { publicMethodToSystem } from "@/lib/voting/methods";
import type { Option } from "@/lib/voting/types";

export type TickReport = {
  seen: number;
  published: number;
  closed: number;
  analysed: number;
  blocked: number;
  skipped: number;
};

const optionNames = (c: Campaign): string[] =>
  (c.options as unknown[]).map((o) =>
    typeof o === "string" ? o : String((o as { name?: unknown }).name ?? ""),
  ).filter(Boolean);

/**
 * L'analyse d'un scrutin clos, SANS modèle.
 *
 * Elle dit ce que le résultat établit, et surtout ce qu'il n'établit pas. Cette
 * seconde partie est la raison d'être de l'avatar : tout le monde publie des
 * sondages, presque personne n'en publie les limites. Elle est calculée et non
 * rédigée, donc elle ne peut ni flatter le résultat ni l'oublier.
 */
export function analyse(info: NonNullable<Awaited<ReturnType<typeof getPollShareInfo>>>): string {
  const n = info.ballotCount ?? 0;
  const r = info.result;
  const lines: string[] = [];

  if (!r) {
    lines.push(`Aucun dépouillement disponible (${n} participation${n > 1 ? "s" : ""}).`);
  } else if (r.noWinner) {
    // Cycle de Condorcet : le classement existe, le vainqueur n'existe pas.
    lines.push(
      `Pas de vainqueur : ${r.noWinnerLabel ?? "les préférences forment un cycle"}. ` +
        `Le classement affiché ne désigne donc personne.`,
    );
  } else if (!r.hasWinner) {
    lines.push(
      `Égalité en tête : le vote ne désigne pas de vainqueur. ` +
        `Un départage extérieur serait nécessaire.`,
    );
  } else {
    // `winner` est un objet { name, icon } et `tallyLabel` n'est que l'UNITÉ
    // (« Voix »), pas le score : les écrire tels quels donnait
    // « [object Object] l'emporte (Voix) ». Le score chiffré vit dans la barre
    // correspondante. On la retrouve par le nom plutôt que de prendre la tête du
    // classement — qui ne désigne pas le vainqueur dans tous les scrutins.
    const name = typeof info.winner === "string" ? info.winner : (info.winner?.name ?? "—");
    const bar = r.bars.find((b) => b.name === name);
    const score = bar ? `${bar.valueLabel} ${r.tallyLabel.toLowerCase()}` : r.tallyLabel;
    lines.push(`${name} l'emporte — ${score}.`);
  }

  lines.push(`${n} bulletin${n > 1 ? "s" : ""} · méthode : ${info.methodName}.`);

  // La limite, toujours, et sans euphémisme : un vote ouvert sur un lien
  // partagé est un échantillon qui s'est choisi lui-même.
  lines.push(
    `Ce que ce résultat ne permet pas de conclure : les participants se sont ` +
      `présentés d'eux-mêmes, ils ne représentent aucune population. ` +
      (n < 30
        ? `Avec ${n} bulletin${n > 1 ? "s" : ""}, l'écart observé n'a de valeur que pour ce groupe.`
        : `Le chiffre décrit ceux qui ont voté, personne d'autre.`),
  );

  return lines.join("\n");
}

/** Traite une campagne. Rend la clé du compteur à incrémenter. */
async function step(key: string, c: Campaign): Promise<keyof Omit<TickReport, "seen">> {
  // ── brouillon → publié ────────────────────────────────────────────────────
  if (c.state === "draft") {
    const names = optionNames(c);

    // LE FILTRE, dernier point avant qu'une machine ne publie sous notre nom.
    // Il s'exécute ici et pas seulement à l'entrée de la file : entre le dépôt
    // et la publication, l'actualité a pu basculer.
    const verdict = screen(c.question, names);
    if (!verdict.ok) {
      await blockCampaign(key, c.id, verdict.reason);
      return "blocked";
    }
    if (names.length < 2) {
      await blockCampaign(key, c.id, "options:moins de deux");
      return "blocked";
    }

    // Même résolution que /new et que l'API : la clé publique passe par
    // `publicMethodToSystem`, jamais par une table parallèle qui divergerait.
    const recipe = recipeForSystem(publicMethodToSystem(c.method) ?? "fptp");
    // Même découpe de l'emoji de tête que l'écran de création : « 🍕 Italien »
    // donne une icône et un nom, ici comme ailleurs.
    const options: Option[] = names.map((label, i) =>
      splitLeadingEmoji(label, DRAFT_ICONS[i % DRAFT_ICONS.length]),
    );
    const created = await createPollServer(c.question, options, recipe, {
      closesAt: c.close_at,
    });
    if (!created) return "skipped"; // réessayé au prochain passage : rien n'a bougé en base

    // La publication au feed est une seconde opération : un refus (quota, liste
    // non figée) ne doit pas perdre le scrutin qui, lui, existe déjà.
    await setPollVisibilityServer(created.token, created.secret, true);

    // On n'enregistre l'état qu'APRÈS création : si le processus meurt avant,
    // la campagne reste « brouillon » et sera reprise. Le risque assumé est un
    // scrutin orphelin, jamais une campagne perdue.
    const ok = await markPublished(key, c.id, created.token, created.secret);
    return ok ? "published" : "skipped";
  }

  // ── publié → clos ─────────────────────────────────────────────────────────
  if (c.state === "published") {
    if (!c.poll_token || !c.poll_secret) {
      await blockCampaign(key, c.id, "secret:perdu");
      return "blocked";
    }
    const done = await closePollServer(c.poll_token, c.poll_secret);
    if (!done) return "skipped";
    const ok = await markClosed(key, c.id);
    return ok ? "closed" : "skipped";
  }

  // ── clos → analysé ────────────────────────────────────────────────────────
  if (c.state === "closed") {
    if (!c.poll_token) {
      await blockCampaign(key, c.id, "token:perdu");
      return "blocked";
    }
    const info = await getPollShareInfo(c.poll_token, { fresh: true, full: true });
    if (!info) return "skipped";
    const ok = await markAnalysed(key, c.id, analyse(info));
    return ok ? "analysed" : "skipped";
  }

  return "skipped";
}

/**
 * Un passage complet. Ne lève jamais : une campagne en échec est comptée et
 * laissée dans son état, pour être reprise au passage suivant. Un avatar qui
 * s'arrête sur la première erreur cesserait de publier sans que personne
 * l'apprenne — c'est précisément la panne silencieuse qu'on refuse.
 */
export async function tick(key: string): Promise<TickReport> {
  const due = await dueCampaigns(key);
  const report: TickReport = { seen: due.length, published: 0, closed: 0, analysed: 0, blocked: 0, skipped: 0 };

  for (const c of due) {
    try {
      report[await step(key, c)] += 1;
    } catch {
      report.skipped += 1;
    }
  }
  return report;
}
