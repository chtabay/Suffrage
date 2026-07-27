// Prompt « Préparer avec une IA » : l'assistant interroge d'abord l'utilisateur
// (au lancement on ne connaît pas forcément le sujet), puis propose un vote et
// renvoie une URL /new prête à ouvrir. Bilingue selon la locale de l'utilisateur.
import { PUBLIC_METHODS } from "./methods";
import type { Option } from "./types";

export const APP_URL = "https://placet.app";

/**
 * Prompt du PARTICIPANT pendant la phase de collecte : son IA connaît le sujet
 * du scrutin et ce qui est déjà proposé (pas de doublon), rend des propositions
 * au format exact des trois champs du formulaire, et — demande de Guillaume —
 * propose de POURSUIVRE la recherche dans la même veine avant qu'on recopie.
 */
export function buildProposalPrompt(
  question: string,
  description: string | null,
  options: Option[],
  locale = "fr",
): string {
  if (locale === "pcm") locale = "en";
  const already = options
    .map((o) => `- ${o.icon} ${o.name}${o.note ? ` — ${o.note}` : ""}`)
    .join("\n");

  if (locale === "en") {
    return `I'm taking part in a group decision on Placet (${APP_URL}): we are collecting proposals before voting.

THE QUESTION: ${question}
${description ? `CONTEXT GIVEN BY THE ORGANIZER: ${description}\n` : ""}${already ? `ALREADY PROPOSED (do not repeat these):\n${already}\n` : "Nothing has been proposed yet.\n"}
Suggest 3 to 5 NEW proposals that answer this question and fit alongside what is already there. For each one, use EXACTLY this format, one block per proposal, nothing else:

🍕 Short name of the proposal
Comment: one sentence on why it deserves a place in the list
Place: the Google Maps link IF it is a physical place (otherwise write "—")

Rules: start every name with a relevant emoji; NEVER invent a link — if you are unsure of the address, write "—"; respect any budget or constraint stated above.

When you're done, ASK ME whether you should keep looking along the same lines (other neighbourhoods, another price range, another format) before I copy these into Placet.`;
  }

  if (locale === "es") {
    return `Participo en una decisión de grupo en Placet (${APP_URL}): estamos recogiendo propuestas antes de votar.

LA PREGUNTA: ${question}
${description ? `CONTEXTO DADO POR LA ORGANIZACIÓN: ${description}\n` : ""}${already ? `YA PROPUESTO (no lo repitas):\n${already}\n` : "Aún no hay ninguna propuesta.\n"}
Propón de 3 a 5 propuestas NUEVAS que respondan a esta pregunta y encajen con lo que ya hay. Para cada una, usa EXACTAMENTE este formato, un bloque por propuesta, nada más:

🍕 Nombre corto de la propuesta
Comentario: una frase que explique por qué merece estar en la lista
Lugar: el enlace de Google Maps SI es un sitio físico (si no, escribe «—»)

Reglas: empieza cada nombre con un emoji pertinente; NUNCA inventes un enlace — si no estás seguro de la dirección, escribe «—»; respeta el presupuesto o las restricciones indicadas arriba.

Cuando termines, PREGÚNTAME si debes seguir buscando en la misma línea (otros barrios, otra gama de precios, otro formato) antes de que copie esto en Placet.`;
  }

  return `Je participe à une décision de groupe sur Placet (${APP_URL}) : nous rassemblons des propositions avant de voter.

LA QUESTION POSÉE : ${question}
${description ? `CONTEXTE DONNÉ PAR L'ORGANISATEUR : ${description}\n` : ""}${already ? `DÉJÀ PROPOSÉ (ne le repropose pas) :\n${already}\n` : "Rien n'a encore été proposé.\n"}
Propose-moi 3 à 5 propositions NOUVELLES qui répondent à cette question et tiennent à côté de ce qui existe déjà. Pour chacune, respecte EXACTEMENT ce format, un bloc par proposition, rien d'autre :

🍕 Nom court de la proposition
Commentaire : une phrase qui explique pourquoi elle mérite sa place dans la liste
Lieu : le lien Google Maps SI c'est un endroit physique (sinon écris « — »)

Règles : commence chaque nom par un emoji pertinent ; n'invente JAMAIS un lien — si tu n'es pas sûr de l'adresse, écris « — » ; respecte le budget ou les contraintes indiqués plus haut.

Quand tu as fini, DEMANDE-MOI si tu dois poursuivre les recherches dans la même veine (autres quartiers, autre gamme de prix, autre format) avant que je recopie tout cela dans Placet.`;
}

export function buildAiPrompt(question: string, options: Option[], source: string, locale = "fr"): string {
  if (locale === "pcm") locale = "en"; // créole anglophone → prompt anglais
  const methods = PUBLIC_METHODS.map((m) => m.key).join(", ");
  const opts = options.map((o) => o.name.trim()).filter(Boolean);
  const hasContext = Boolean(question.trim()) || opts.length > 0;

  if (locale === "en") {
    const proposal = `Once you understand my decision, propose:
- a short, clear title;
- if context helps people vote (place, budget, deadline…), a short optional description;
- 2 to 8 options (rephrase/merge as needed); start EACH option with a relevant emoji — e.g. "🍕 Italian" — the app turns it into the icon;
- if the decision is about a TIME ("when?": a meeting, dinner, outing…), use "dates" instead of "options": the candidate slots in ISO format (e.g. 2026-07-12T20:00), and choose approval (everyone ticks what works for them — the most available wins);
- ONE method among: ${methods} — and one sentence explaining WHY (for a date vote: single winner only — approval preferably, otherwise majority/condorcet/majority judgment/borda; never proportional, list or grand_electors);
- if the goal is to MEASURE opinions or MAP a situation rather than elect a winner (survey/diagnostic, e.g. "what weighs on you about renting?"), add survey=1 — the result shows the full panorama and crowns nobody; prefer approval (prevalence: tick all that apply) or majority_judgment (intensity per item). With majority_judgment, pick a scale that fits the question via scale= : agreement, severity (what weighs), frequency, satisfaction, dissatisfaction (degree of dissatisfaction), priority — rather than the default electoral grades;
- if the goal is NOT to elect a winner but to ALLOCATE things or FORM pairs (offices, tasks, buddy pairs, mentors, Parcoursup-style), use "assign" INSTEAD OF "method": serial_dictatorship (picking rounds, verifiable drawn order), optimal_sum (best total satisfaction), top_trading_cycles (swaps from current possessions — as many things as people), stable_roommates (stable pairs within one group — even count required), gale_shapley (two groups ranking each other, capacities — the proposing side is favoured); add participants=Alice|Bob|… (each gets a personal ranking link; for gale_shapley also sideb=Maths tutoring ; 2|English tutoring); keep options= only for the things to allocate (one-sided methods).

Then build the Placet URL below and PRESENT IT AS A CLICKABLE LINK (a markdown link with a clear label, e.g. "👉 Open the voting draft"), never the full raw URL. Keep it SHORT.
${APP_URL}/new?title=...&description=...&options=🍕 Italian|🍣 Japanese&method=...&source=${source}&why=...
Date vote (replace "options" with "dates"):
${APP_URL}/new?title=...&dates=2026-07-12T20:00|2026-07-13T12:30&method=approval&source=${source}&why=...
Assignment (replace "method" with "assign", add "participants"):
${APP_URL}/new?title=...&assign=optimal_sum&options=💼 Desk A|🌿 Desk B&participants=Alice|Bob&source=${source}&why=...
Duty roster / shifts (assign TIME SLOTS instead of things — combine "assign" with "dates"; per=N gives each person N slots, picking order snakes back and forth):
${APP_URL}/new?title=...&assign=serial_dictatorship&dates=2026-07-20T19:00|2026-07-21T19:00|2026-07-22T19:00|2026-07-23T19:00&participants=Alice|Bob&per=2&source=${source}&why=...
Encode the values properly, put your rationale in "why", and include no sensitive data (emails, IDs…).

Per-option extras — three SEPARATE, aligned-by-index lists (same order as the options, empty string when there is none):
- "places" = LOCATION links (Google Maps, OpenStreetMap, Apple Plans). Whenever an option is a PLACE (restaurant, venue, hotel, meeting point…), look up its map link and put it HERE, not in "media": Placet then draws a MAP under the vote showing where the options are relative to each other. A link carrying coordinates (…/@48.8584,2.2945,17z, ?q=lat,lng, #map=z/lat/lng) is ideal; a short link (maps.app.goo.gl) works too, the app resolves it;
- "media" = ILLUSTRATIONS (photo, menu, document, video) — what you look at, not where it is;
- "notes" = a SHORT comment per option (why it's on the list: "heated terrace", "5 min walk") — one line max, no pipe character.
Keep the /new link short: with more than 3-4 options, prefer the API below, or tell the user they can paste these per option in the app (🔗 button on each option).
${APP_URL}/new?title=...&options=🍕 Mario|🍣 Kyoto&places=https://maps.google.com/...|https://maps.app.goo.gl/...&notes=Heated terrace|5 min walk&method=...&source=${source}

This /new link works EVERYWHERE, including inside ChatGPT, Claude or Gemini: it's your default output. ONLY if you can actually make HTTP requests (an agent, a GPT with "Actions", MCP — a plain chat cannot) may you instead POST ${APP_URL}/api/poll-drafts with { title, description, options (or dates), media, places, notes, method, deadline, source, why } and present the returned { draft_url } as a clickable link. When in doubt, give the /new link.`;

    if (!hasContext) {
      // Cold start (home rail): no topic known yet.
      return `I want to run a group vote with Placet (${APP_URL}), but I haven't defined the topic yet.

First, tell me in one sentence what Placet lets me do: settle a decision with real voting methods, gauge opinion, find a date, or allocate things/seats. Then ask me ALL your questions AT ONCE (not one by one): what decision to settle? what options are possible? who votes and how many? a deadline? a clear winner or a broad consensus? Then wait for my answers (I can answer in one go) — don't guess the topic and don't invent any options, everything must come from me.

${proposal}`;
    }

    const startLines = [
      question.trim() ? `Likely decision: ${question.trim()}` : null,
      opts.length ? `Options considered: ${opts.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    return `Help me prepare a vote with Placet (${APP_URL}).

Here's what I have so far (to confirm, not final):
${startLines}

Remind me in one sentence what Placet lets me do (decide with real methods, survey, find a date, allocate), then ask me ALL AT ONCE the useful questions to clear up any ambiguity: options to add/merge, who votes, deadline, clear winner or consensus. Wait for my answers (in one go), don't fill in for me.

${proposal}`;
  }

  if (locale === "es") {
    const proposal = `Una vez que entiendas mi decisión, propón:
- un título corto y claro;
- si el contexto ayuda a votar (lugar, presupuesto, plazo…), una breve descripción opcional;
- de 2 a 8 opciones (reformula/fusiona si hace falta); empieza CADA opción con un emoji pertinente — p. ej. "🍕 Italiano" — la app lo convierte en el icono;
- si la decisión trata de un MOMENTO ("¿cuándo?": una reunión, una cena, una salida…), usa "dates" en lugar de "options": las franjas candidatas en formato ISO (p. ej. 2026-07-12T20:00), y elige la aprobación (cada cual marca lo que le va bien — gana la más disponible);
- UN método entre: ${methods} — y una frase que explique POR QUÉ (para un voto de fechas: solo ganador único — aprobación de preferencia, si no majority/condorcet/juicio mayoritario/borda; nunca proportional, list ni grand_electors);
- si el objetivo es MEDIR opiniones o hacer un DIAGNÓSTICO en lugar de elegir un ganador (encuesta, p. ej. «¿qué te pesa del alquiler?»), añade survey=1 — el resultado muestra el panorama completo sin coronar a nadie; prefiere approval (prevalencia) o majority_judgment (intensidad por opción). Con majority_judgment, elige una escala acorde a la pregunta con scale= : agreement (acuerdo), severity (gravedad), frequency (frecuencia), satisfaction, dissatisfaction (insatisfacción), priority — en vez de las menciones electorales por defecto;
- si el objetivo NO es elegir un ganador sino REPARTIR cosas o FORMAR parejas (despachos, tareas, binomios, mentores, estilo Parcoursup), usa "assign" EN LUGAR DE "method": serial_dictatorship (turnos de elección, orden sorteado verificable), optimal_sum (mejor satisfacción total), top_trading_cycles (intercambios desde posesiones actuales — tantas cosas como personas), stable_roommates (parejas estables en un grupo — número par obligatorio), gale_shapley (dos grupos que se clasifican mutuamente, capacidades — el lado que propone sale favorecido); añade participants=Alice|Bob|… (cada uno recibe un enlace personal para clasificar; para gale_shapley añade también sideb=Tutoría de mates ; 2|Tutoría de inglés); mantén options= solo para las cosas a repartir (métodos de un solo lado).

Después construye la URL de Placet de abajo y PRESÉNTALA COMO UN ENLACE CLICABLE (un enlace markdown con una etiqueta clara, p. ej. "👉 Abrir el borrador de voto"), nunca la URL en bruto completa. Mantenla CORTA.
${APP_URL}/new?title=...&description=...&options=🍕 Italiano|🍣 Japonés&method=...&source=${source}&why=...
Voto de franjas (reemplaza "options" por "dates"):
${APP_URL}/new?title=...&dates=2026-07-12T20:00|2026-07-13T12:30&method=approval&source=${source}&why=...
Asignación (reemplaza "method" por "assign", añade "participants"):
${APP_URL}/new?title=...&assign=optimal_sum&options=💼 Despacho A|🌿 Despacho B&participants=Alice|Bob&source=${source}&why=...
Turnos / guardias (asignar FRANJAS en lugar de cosas — combina "assign" con "dates"; per=N da a cada persona N franjas, el orden de elección va y vuelve):
${APP_URL}/new?title=...&assign=serial_dictatorship&dates=2026-07-20T19:00|2026-07-21T19:00|2026-07-22T19:00|2026-07-23T19:00&participants=Alice|Bob&per=2&source=${source}&why=...
Codifica correctamente los valores, pon tu justificación en "why" y no incluyas ningún dato sensible (correos, identificadores…).

Extras por opción — tres listas SEPARADAS, alineadas por índice (mismo orden que las opciones, cadena vacía si no hay):
- "places" = enlaces de UBICACIÓN (Google Maps, OpenStreetMap, Apple Mapas). Siempre que una opción sea un LUGAR (restaurante, sala, hotel, punto de encuentro…), busca su enlace de mapa y ponlo AQUÍ, no en "media": Placet dibuja entonces un MAPA bajo la votación que muestra dónde están las opciones unas respecto de otras. Un enlace con coordenadas (…/@48.8584,2.2945,17z, ?q=lat,lng, #map=z/lat/lng) es lo ideal; un enlace corto (maps.app.goo.gl) también sirve, la app lo resuelve;
- "media" = ILUSTRACIONES (foto, menú, documento, vídeo) — lo que se mira, no dónde está;
- "notes" = un comentario CORTO por opción (por qué está en la lista: «terraza climatizada», «a 5 min a pie») — una línea como máximo, sin barra vertical.
Mantén corto el enlace /new: con más de 3-4 opciones, prefiere la API de abajo, o dile al usuario que puede pegar esto en cada opción dentro de la app (botón 🔗).
${APP_URL}/new?title=...&options=🍕 Mario|🍣 Kyoto&places=https://maps.google.com/...|https://maps.app.goo.gl/...&notes=Terraza climatizada|A 5 min a pie&method=...&source=${source}

Este enlace /new funciona EN TODAS PARTES, incluso dentro de ChatGPT, Claude o Gemini: es tu salida por defecto. SOLO si realmente puedes hacer peticiones HTTP (un agente, un GPT con "Actions", MCP — un simple chat no puede) puedes en su lugar hacer POST a ${APP_URL}/api/poll-drafts con { title, description, options (o dates), media, places, notes, method, deadline, source, why } y presentar el { draft_url } recibido como enlace clicable. En caso de duda, da el enlace /new.`;

    if (!hasContext) {
      // Arranque en frío (rail de inicio): aún no se conoce el tema.
      return `Quiero organizar una votación de grupo con Placet (${APP_URL}), pero aún no he definido el tema.

Primero, explícame en una frase qué permite Placet: zanjar una decisión con métodos de voto de verdad, sondear una opinión, encontrar una fecha o repartir cosas/plazas. Luego hazme TODAS tus preguntas DE UNA VEZ (no una a una): ¿qué decisión zanjar? ¿qué opciones son posibles? ¿quién vota y cuántos? ¿una fecha límite? ¿un ganador claro o un consenso amplio? Después espera mis respuestas (puedo responder de golpe) — no adivines el tema y no inventes ninguna opción, todo debe venir de mí.

${proposal}`;
    }

    const startLines = [
      question.trim() ? `Decisión probable: ${question.trim()}` : null,
      opts.length ? `Opciones consideradas: ${opts.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    return `Ayúdame a preparar una votación con Placet (${APP_URL}).

Esto es lo que tengo por ahora (por confirmar, no definitivo):
${startLines}

Recuérdame en una frase qué permite Placet (decidir con métodos de verdad, sondear, encontrar una fecha, repartir), luego hazme DE UNA VEZ las preguntas útiles para despejar cualquier ambigüedad: opciones que añadir/fusionar, quién vota, fecha límite, ganador claro o consenso. Espera mis respuestas (de golpe), no rellenes por mí.

${proposal}`;
  }

  // ---- FR (défaut) ----
  const proposal = `Une fois que tu as compris ma décision, propose :
- un titre court et clair ;
- si le contexte aide à voter (lieu, budget, échéance…), un court descriptif facultatif ;
- 2 à 8 options (reformule/fusionne si besoin) ; commence CHAQUE option par un emoji pertinent — ex. "🍕 Italien" — l'app en fera l'icône ;
- si la décision porte sur un MOMENT (« quand ? » : réunion, dîner, sortie…), utilise "dates" au lieu de "options" : les créneaux candidats au format ISO (ex. 2026-07-12T20:00), et choisis l'approbation (chacun coche ce qui lui convient — le plus disponible gagne) ;
- UNE méthode parmi : ${methods} — et une phrase expliquant POURQUOI (pour un vote de dates : uniquement gagnant unique — approbation de préférence, sinon majoritaire/condorcet/jugement majoritaire/borda ; jamais proportional, list ni grand_electors) ;
- si l'objectif est de MESURER des avis ou de dresser un ÉTAT DES LIEUX plutôt que d'élire un gagnant (sondage/diagnostic, ex. « qu'est-ce qui vous pèse dans la location ? »), ajoute survey=1 — le résultat montre le panorama complet sans couronner personne ; privilégie approval (prévalence : cochez tout ce qui s'applique) ou majority_judgment (intensité par option). Avec majority_judgment, choisis une échelle adaptée à la question via scale= : agreement (accord), severity (gravité/ce qui pèse), frequency (fréquence), satisfaction, dissatisfaction (insatisfaction), priority — plutôt que les mentions électorales par défaut ;
- si l'objectif n'est PAS d'élire un gagnant mais d'ATTRIBUER des choses ou de FORMER des paires (bureaux, tâches, binômes, mentors, façon Parcoursup), utilise "assign" À LA PLACE DE "method" : serial_dictatorship (tour de choix, ordre tiré au sort vérifiable), optimal_sum (meilleure satisfaction totale), top_trading_cycles (échanges depuis les possessions actuelles — autant de choses que de personnes), stable_roommates (binômes stables dans un groupe — effectif pair obligatoire), gale_shapley (deux groupes qui se classent mutuellement, capacités — le côté qui propose est favorisé) ; ajoute participants=Alice|Bob|… (chacun reçoit un lien personnel pour classer ; pour gale_shapley ajoute aussi sideb=Tutorat maths ; 2|Tutorat anglais) ; garde options= uniquement pour les choses à attribuer (méthodes à sens unique).

Construis ensuite l'URL Placet ci-dessous et PRÉSENTE-LA COMME UN LIEN CLIQUABLE (lien markdown avec un libellé clair, ex. « 👉 Ouvrir le brouillon de vote »), jamais l'URL brute en entier. Garde-la COURTE.
${APP_URL}/new?title=...&description=...&options=🍕 Italien|🍣 Japonais&method=...&source=${source}&why=...
Vote de créneaux (remplace "options" par "dates") :
${APP_URL}/new?title=...&dates=2026-07-12T20:00|2026-07-13T12:30&method=approval&source=${source}&why=...
Affectation (remplace "method" par "assign", ajoute "participants") :
${APP_URL}/new?title=...&assign=optimal_sum&options=💼 Bureau A|🌿 Bureau B&participants=Alice|Bob&source=${source}&why=...
Permanences / tours de garde (attribuer des CRÉNEAUX au lieu de choses — combine "assign" avec "dates" ; per=N donne N créneaux à chacun, l'ordre de choix fait l'aller-retour) :
${APP_URL}/new?title=...&assign=serial_dictatorship&dates=2026-07-20T19:00|2026-07-21T19:00|2026-07-22T19:00|2026-07-23T19:00&participants=Alice|Bob&per=2&source=${source}&why=...
Encode correctement les valeurs, mets ta justification dans "why", n'inclus aucune donnée sensible (e-mails, identifiants…).

Compléments par option — trois listes SÉPARÉES, alignées par index (même ordre que les options, chaîne vide s'il n'y a rien) :
- "places" = liens de LOCALISATION (Google Maps, OpenStreetMap, Plans). Dès qu'une option est un LIEU (restaurant, salle, hôtel, point de rendez-vous…), cherche son lien de carte et mets-le ICI, pas dans "media" : Placet dessine alors une CARTE sous le vote qui montre où sont les options les unes par rapport aux autres. Un lien portant les coordonnées (…/@48.8584,2.2945,17z, ?q=lat,lng, #map=z/lat/lng) est idéal ; un lien court (maps.app.goo.gl) marche aussi, l'app le résout ;
- "media" = ILLUSTRATIONS (photo, menu, document, vidéo) — ce qu'on regarde, pas où c'est ;
- "notes" = un commentaire COURT par option (pourquoi elle est dans la liste : « terrasse chauffée », « à 5 min à pied ») — une ligne maximum, sans barre verticale.
Garde le lien /new court : au-delà de 3-4 options, préfère l'API ci-dessous, ou dis à l'utilisateur qu'il pourra coller tout cela option par option dans l'app (bouton 🔗).
${APP_URL}/new?title=...&options=🍕 Mario|🍣 Kyoto&places=https://maps.google.com/...|https://maps.app.goo.gl/...&notes=Terrasse chauffée|À 5 min à pied&method=...&source=${source}

Ce lien /new fonctionne PARTOUT, y compris dans ChatGPT, Claude ou Gemini : c'est ta sortie par défaut. UNIQUEMENT si tu peux réellement faire des requêtes HTTP (agent, GPT à « Actions », MCP — un simple chat ne le peut pas), tu peux à la place POST ${APP_URL}/api/poll-drafts avec { title, description, options (ou dates), media, places, notes, method, deadline, source, why } et présenter le { draft_url } reçu comme lien cliquable. Dans le doute, donne le lien /new.`;

  if (!hasContext) {
    // Lancement « à froid » (rail d'accueil) : aucun sujet connu.
    return `Je veux organiser un vote de groupe avec Placet (${APP_URL}), mais je n'ai pas encore défini le sujet.

D'abord, explique-moi en une phrase ce que Placet permet : trancher une décision avec de vraies méthodes de vote, sonder un avis, trouver une date, ou répartir des choses/des places. Puis pose-moi TOUTES tes questions EN UNE SEULE FOIS (pas une par une) : quelle décision trancher ? quelles options possibles ? qui vote et combien ? une date limite ? un gagnant net ou un consensus large ? Attends ensuite mes réponses (je peux répondre en bloc) — ne devine pas le sujet et n'invente aucune option, tout doit venir de moi.

${proposal}`;
  }

  // Un début de saisie existe (écran de création) : on le donne comme point de départ.
  const startLines = [
    question.trim() ? `Décision pressentie : ${question.trim()}` : null,
    opts.length ? `Options envisagées : ${opts.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Aide-moi à préparer un vote avec Placet (${APP_URL}).

Voici ce que j'ai pour l'instant (à confirmer, pas figé) :
${startLines}

Rappelle-moi en une phrase ce que Placet permet (décider avec de vraies méthodes, sonder, trouver une date, répartir), puis pose-moi EN UNE SEULE FOIS les questions utiles pour lever les ambiguïtés : options à ajouter/fusionner, qui vote, date limite, gagnant net ou consensus. Attends mes réponses (en bloc), ne complète pas à ma place.

${proposal}`;
}
