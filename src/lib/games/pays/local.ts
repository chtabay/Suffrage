// LES RÉSULTATS GARDÉS DANS LE NAVIGATEUR — la série d'un joueur sans compte.
//
// POURQUOI ÇA EXISTE AVANT LE COMPTE, ET PAS APRÈS. La tentation était d'offrir
// la série comme récompense de l'inscription. C'est le mauvais sens : un jeu
// quotidien doit donner la sensation de revenir DÈS le deuxième jour, et
// quelqu'un qui n'a rien à garder n'a aucune raison de créer un compte. La série
// vit donc ici d'abord, gratuitement ; le compte ne fait que la rendre durable
// et lui ajouter le rang.
//
// ⚠️ CETTE LISTE NE SORT JAMAIS DU NAVIGATEUR TANT QUE PERSONNE NE SE CONNECTE.
// Elle n'est envoyée qu'au moment où un compte existe, et à ce compte-là. Ce
// n'est pas un identifiant : il n'y a pas de jeton stable, rien qui permette de
// reconnaître ce navigateur d'un jour à l'autre côté serveur.
//
// ⚠️ ELLE SURVIT À LA PURGE QUOTIDIENNE. L'écran efface `placet.pays.<jour>` des
// journées passées — sinon le stockage grossit d'une partie par jour. Le
// résumé, lui, tient dans UNE clé et ne grossit que d'une ligne par victoire :
// c'est la seule mémoire longue du jeu, et elle est plafonnée.

const CLE = "placet.pays.resultats";
/** Deux mois de jeu quotidien : au-delà, la série ancienne n'intéresse plus personne. */
const MAX = 60;

export interface Resultat {
  jour: number;
  essais: number;
  secondes?: number;
}

export function lisResultats(): Resultat[] {
  if (typeof window === "undefined") return [];
  try {
    const brut = JSON.parse(window.localStorage.getItem(CLE) ?? "[]");
    if (!Array.isArray(brut)) return [];
    return brut
      .filter((r): r is Resultat => typeof r?.jour === "number" && typeof r?.essais === "number")
      .sort((a, b) => a.jour - b.jour);
  } catch {
    return [];
  }
}

/** Ajoute une victoire. Idempotent : rejouer une journée ne l'empile pas. */
export function ajouteResultat(r: Resultat): Resultat[] {
  const gardes = lisResultats().filter((x) => x.jour !== r.jour);
  const suite = [...gardes, r].sort((a, b) => a.jour - b.jour).slice(-MAX);
  try {
    window.localStorage.setItem(CLE, JSON.stringify(suite));
  } catch {
    // Navigation privée : on perd la série, pas la partie.
  }
  return suite;
}

/**
 * La série EN COURS, à la date du jour.
 *
 * ⚠️ ELLE SE COMPTE À REBOURS DEPUIS AUJOURD'HUI OU HIER, jamais depuis la
 * dernière journée jouée. Sans cette condition, quelqu'un qui a joué cinq jours
 * de suite il y a trois mois verrait « série : 5 » en arrivant, et le chiffre
 * cesserait de vouloir dire quoi que ce soit. Hier est admis parce que la
 * journée d'aujourd'hui n'est pas encore jouée quand on ouvre la page.
 */
export function serieEnCours(jourActuel: number, resultats = lisResultats()): number {
  const joues = new Set(resultats.map((r) => r.jour));
  let depart = joues.has(jourActuel) ? jourActuel : joues.has(jourActuel - 1) ? jourActuel - 1 : 0;
  if (!depart) return 0;
  let n = 0;
  while (joues.has(depart)) {
    n++;
    depart--;
  }
  return n;
}

/**
 * Combien de journées le joueur doit avoir finies avant qu'on cesse de lui
 * rappeler la méthode.
 *
 * ⚠️ CE SONT DES VICTOIRES, PAS DES VISITES. `ajouteResultat` n'est appelé qu'à
 * la victoire, donc quelqu'un qui a ouvert le jeu trois fois sans jamais
 * trouver compte encore comme débutant — et c'est exactement ce qu'on veut : il
 * n'a pas fini une partie, il n'a pas vu la mécanique aller au bout.
 */
export const PARTIES_DEBUTANT = 3;

/**
 * Au bout de combien de jours d'absence on redonne la méthode.
 *
 * Deux semaines : assez pour avoir oublié le sens des cinq cases, assez peu
 * pour qu'un habitué en vacances ne se sente pas repris à zéro.
 */
export const JOURS_ABSENCE = 14;

/**
 * Faut-il rappeler à ce joueur COMMENT on cherche ?
 *
 * ⚠️ SANS CETTE CONDITION, LA MODALE DE MÉTHODE EST UNE INTERRUPTION
 * QUOTIDIENNE. Elle dit toujours la même chose — c'est son objet — donc pour un
 * habitué elle devient du mobilier qu'on ferme sans lire, et c'est ce qui use
 * la seule forme d'annonce dont le jeu dispose. Elle est donc réservée à ceux
 * qui en ont besoin : les trois premières parties, et le retour après une
 * absence.
 */
export function rappelleLaMethode(jourActuel: number, resultats = lisResultats()): boolean {
  if (resultats.length < PARTIES_DEBUTANT) return true;
  const dernier = resultats[resultats.length - 1];
  return jourActuel - dernier.jour > JOURS_ABSENCE;
}
