// LES MURMURES DU MANOIR — ce que le portrait dit pendant qu'on est planté là.
//
// LE PROBLÈME QU'ILS RÈGLENT. Une ronde dure 90 secondes dont la consigne est :
// « tape son code, et reste-là. Il faudra le retaper de temps en temps. »
// Mécaniquement c'est juste — la cadence ≤ 30 s rend une escapade physiquement
// impossible — mais vécu, c'est un contrôle de présence. Le joueur est debout
// devant un tableau, dans une pièce, pendant une minute et demie, et il n'a
// rien. C'est là que le jeu perdait son goût.
//
// ⚠️ POURQUOI LA VOIX EST SUR LA BORNE ET NON SUR LE TÉLÉPHONE. Le jeu promet
// de « permettre à la vie de continuer dans la maison » : tout ce qui réclame
// les yeux sur le téléphone ramène onze personnes sur leur écran pendant le
// dîner, c'est-à-dire exactement ce que la conception combat. Le portrait, lui,
// est déjà l'objet qu'on regarde — on vient de taper son code. Lui donner une
// voix ne coûte pas une seconde d'attention de plus, ça en occupe une qui était
// vide.
//
// ⚠️ ET POURQUOI IL NE DEMANDE JAMAIS RIEN. La spec a chiffré le renversement :
// 11 joueurs × 3 tâches × 90 s = 49 min de borne-temps par manche contre 24 min
// de capacité si les bornes étaient des guichets. Un murmure qui attendrait une
// réponse recréerait la file d'attente que ce calcul interdit. La borne parle,
// elle n'écoute pas — elle reste une BALISE.
//
// DU CONTENU, PAS DE L'i18n : même choix que `manoir.ts` et que les thèmes
// de Banalo. Un seul tableau porte les quatre langues côte à côte, la parité est
// garantie par la structure plutôt que par un contrôle.

export interface Murmure {
  fr: string;
  en: string;
  es: string;
  pcm: string;
}

/**
 * Le murmure PROPRE À LA PIÈCE, montré en premier quand on arrive devant le
 * portrait. C'est lui qui donne à chaque cadre l'air de savoir où il est
 * accroché — et c'est ce qui fait qu'on raconte le manoir après la soirée
 * plutôt que la mécanique.
 *
 * Rien de macabre : le jeu se joue dans un gîte avec des enfants de huit ans.
 * On vise l'inquiétant qui fait sourire, jamais l'effrayant qui fait pleurer.
 */
export const MURMURE_DE_PIECE: Record<string, Murmure> = {
  cuisine: {
    fr: "On a mis trois couverts de trop. Personne ne l'a remarqué.",
    en: "Three extra places were laid. Nobody noticed.",
    es: "Se han puesto tres cubiertos de más. Nadie se ha dado cuenta.",
    pcm: "Dem set three extra plate. Nobody notice.",
  },
  salon: {
    fr: "Asseyez-vous. Le fauteuil du fond est déjà pris.",
    en: "Do sit down. The armchair at the back is already taken.",
    es: "Siéntese. El sillón del fondo ya está ocupado.",
    pcm: "Siddon. Di chair for back don get owner.",
  },
  bibliotheque: {
    fr: "Il manque une page au registre. Ce n'est pas la première fois.",
    en: "A page is missing from the register. Not for the first time.",
    es: "Falta una página en el registro. No es la primera vez.",
    pcm: "One page comot for di register. E no be di first time.",
  },
  fumoir: {
    fr: "La pipe est encore tiède. Elle l'est depuis 1912.",
    en: "The pipe is still warm. It has been since 1912.",
    es: "La pipa sigue tibia. Lo está desde 1912.",
    pcm: "Di pipe still warm. E don dey warm since 1912.",
  },
  veranda: {
    fr: "Les plantes se tournent vers vous. Elles n'ont pas toujours fait ça.",
    en: "The plants are turning towards you. They did not always do that.",
    es: "Las plantas se giran hacia usted. No siempre lo hacían.",
    pcm: "Di plants dey turn face you. Dem no dey do am before.",
  },
  couloir: {
    fr: "Le couloir était plus court tout à l'heure. Vous vous souvenez ?",
    en: "The corridor was shorter a moment ago. Do you remember?",
    es: "El pasillo era más corto hace un rato. ¿Se acuerda?",
    pcm: "Dis corridor short pass dis one small time ago. You remember?",
  },
  escalier: {
    fr: "Quatorze marches en montant. Treize en descendant.",
    en: "Fourteen steps going up. Thirteen coming down.",
    es: "Catorce escalones al subir. Trece al bajar.",
    pcm: "Fourteen step when you dey climb. Thirteen when you dey come down.",
  },
  cave: {
    fr: "On a descendu douze bouteilles. Il en remonte onze.",
    en: "Twelve bottles went down. Eleven are coming back up.",
    es: "Han bajado doce botellas. Suben once.",
    pcm: "Twelve bottle go down. Na eleven dey come up.",
  },
  grenier: {
    fr: "Quelqu'un a marché ici. Personne ne l'a dit.",
    en: "Someone walked up here. Nobody mentioned it.",
    es: "Alguien ha andado por aquí. Nadie lo ha dicho.",
    pcm: "Person waka for here. Nobody talk am.",
  },
  jardin: {
    fr: "Il pleut sur le jardin depuis mardi. Il ne pleut nulle part ailleurs.",
    en: "It has rained on the garden since Tuesday. It rains nowhere else.",
    es: "Llueve sobre el jardín desde el martes. No llueve en ningún otro sitio.",
    pcm: "Rain dey fall for dis garden since Tuesday. E no dey fall anywhere else.",
  },
};

/**
 * Le fond commun, qui tourne après le murmure de la pièce.
 *
 * ⚠️ AUCUN NE DÉSIGNE QUI QUE CE SOIT. « Quelqu'un a menti dans cette pièce »
 * marche parce qu'il est vrai de toutes les pièces et de tous les soirs : il
 * met de l'humeur sans fabriquer une accusation que le jeu n'a pas calculée.
 * Un murmure qui nommerait un joueur, ou même un rôle, deviendrait une preuve —
 * et une preuve inventée par le décor fausserait l'enquête.
 */
export const MURMURES_DU_MANOIR: Murmure[] = [
  {
    fr: "Continuez. Je vous regarde.",
    en: "Carry on. I am watching you.",
    es: "Continúe. Le estoy mirando.",
    pcm: "Continue. I dey look you.",
  },
  {
    fr: "Vous êtes resté plus longtemps que le précédent.",
    en: "You have stayed longer than the last one.",
    es: "Se ha quedado más tiempo que el anterior.",
    pcm: "You don stay pass di last person.",
  },
  {
    fr: "Quelqu'un est passé derrière vous. Ne vous retournez pas tout de suite.",
    en: "Someone went past behind you. Don't turn round just yet.",
    es: "Alguien ha pasado detrás de usted. No se dé la vuelta todavía.",
    pcm: "Person pass for your back. No turn now now.",
  },
  {
    fr: "L'oncle Barnabé peignait mal. Il voyait très bien.",
    en: "Uncle Barnaby painted badly. He saw perfectly well.",
    es: "El tío Barnabé pintaba mal. Veía muy bien.",
    pcm: "Uncle Barnaby no sabi paint. But im eye dey correct well well.",
  },
  {
    fr: "Deux personnes ont donné la même excuse ce soir.",
    en: "Two people gave the same excuse tonight.",
    es: "Dos personas han dado la misma excusa esta noche.",
    pcm: "Two people give di same excuse tonight.",
  },
  {
    fr: "Le manoir note tout. Il note ce qu'on lui montre.",
    en: "The manor notes everything. It notes what it is shown.",
    es: "La mansión lo anota todo. Anota lo que se le enseña.",
    pcm: "Di manor dey note everything. E dey note wetin dem show am.",
  },
  {
    fr: "Vous n'êtes pas le premier à vous tenir là.",
    en: "You are not the first to stand there.",
    es: "No es usted el primero en quedarse ahí.",
    pcm: "Na no be you first person wey stand for there.",
  },
  {
    fr: "Il y a une porte que personne n'a ouverte.",
    en: "There is a door nobody has opened.",
    es: "Hay una puerta que nadie ha abierto.",
    pcm: "One door dey wey nobody don open.",
  },
  {
    fr: "On entend mieux depuis les cadres.",
    en: "One hears better from inside the frames.",
    es: "Se oye mejor desde los marcos.",
    pcm: "Person dey hear better from inside di frame.",
  },
  {
    fr: "Restez encore un peu. On s'habitue.",
    en: "Stay a little longer. One gets used to it.",
    es: "Quédese un poco más. Uno se acostumbra.",
    pcm: "Stay small more. Person dey get used to am.",
  },
  {
    fr: "Quelqu'un a menti dans cette pièce. Récemment.",
    en: "Someone lied in this room. Recently.",
    es: "Alguien ha mentido en esta habitación. Hace poco.",
    pcm: "Person lie for dis room. Recently.",
  },
  {
    fr: "La maison n'a pas sommeil.",
    en: "The house is not sleepy.",
    es: "La casa no tiene sueño.",
    pcm: "Sleep no dey catch dis house.",
  },
];

/** Combien de murmures un portrait connaît : le sien, puis le fond commun. */
export const NB_MURMURES = MURMURES_DU_MANOIR.length + 1;

/**
 * Le murmure numéro `tour` d'une pièce donnée. Le tour 0 est toujours celui de
 * la pièce — on arrive devant le portrait, il parle de chez lui.
 */
export function murmure(piece: string, tour: number, locale: string): string {
  const n = ((tour % NB_MURMURES) + NB_MURMURES) % NB_MURMURES;
  const m = n === 0 ? (MURMURE_DE_PIECE[piece] ?? MURMURES_DU_MANOIR[0]) : MURMURES_DU_MANOIR[n - 1];
  return locale === "en" ? m.en : locale === "es" ? m.es : locale === "pcm" ? m.pcm : m.fr;
}
