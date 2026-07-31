"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { pickLocale } from "@/i18n/locales";
import { trackConversion } from "@/lib/db/track";
import { addLocalPoll } from "@/lib/db/localPolls";
import { addVoters, createPoll, setPollVisibility, type AccessMode, type District, type VoterInput } from "@/lib/db/polls";
import { ASSIGN_METHODS, type AssignMethodKey } from "@/lib/assign/methods";
import { SLOT_ICON, slotLabel, type ScrutinDraft } from "./draft";
import { resolvePlace } from "./geo";
import { DEFAULT_RECIPE, recipeForSystem } from "./engine";
import type { Option, Recipe } from "./types";

export type Screen = "home" | "gallery" | "create" | "launched" | "mine";

export interface DistrictDraft {
  name: string;
  electors: number;
  voterNames: string;
}

export interface ScrutinState {
  screen: Screen;
  question: string;
  description: string;
  optionKind: "text" | "slot" | "assign";
  options: Option[];
  slotMinutes: number;
  assignMethod: AssignMethodKey;
  /** Affectation deux groupes : côté 2 (« Nom ; capacité », une ligne par entrée). */
  assignSideB: string;
  /** Affectation à sens unique : les objets sont des créneaux (calendrier). */
  assignSlots: boolean;
  /** Affectation à sens unique : nombre d'objets reçus par personne. */
  assignPer: number;
  /** Mode sondage : panorama des avis, personne n'est déclaré vainqueur. */
  survey: boolean;
  recipe: Recipe;
  access: AccessMode;
  hideResults: boolean;
  /** Publier sur le feed public /explorer au lancement (accès ouvert uniquement). */
  publicListing: boolean;
  /** Ouvrir une phase de collecte : les votants ajoutent des options avant le vote (invitation seulement). */
  proposalsPhase: boolean;
  voterNames: string;
  districts: DistrictDraft[];
  opensAt: string;
  closesAt: string;
  quorum: number | null;
  closeOnComplete: boolean;
  shareUrl: string | null;
  adminUrl: string | null;
  voterLinks: { label: string; url: string }[];
  launching: boolean;
  error: string | null;
  prefilled: boolean;
  prefillSource: string | null;
  prefillWhy: string | null;
}

const INITIAL: ScrutinState = {
  screen: "home",
  // Vide par défaut : l'exemple « week-end » vit en placeholder (CreateScreen),
  // pas en valeurs à supprimer. Le pré-remplissage IA/URL pose, lui, de vraies valeurs.
  question: "",
  description: "",
  options: [
    { icon: "🏔️", name: "" },
    { icon: "🏖️", name: "" },
    { icon: "🌆", name: "" },
  ],
  optionKind: "text",
  slotMinutes: 60,
  assignMethod: "serial_dictatorship",
  assignSideB: "",
  assignSlots: false,
  assignPer: 1,
  survey: false,
  recipe: { ...DEFAULT_RECIPE },
  access: "open",
  hideResults: false,
  publicListing: false,
  proposalsPhase: false,
  voterNames: "",
  districts: [
    { name: "Circonscription 1", electors: 3, voterNames: "" },
    { name: "Circonscription 2", electors: 2, voterNames: "" },
  ],
  opensAt: "",
  closesAt: "",
  quorum: null,
  closeOnComplete: false,
  shareUrl: null,
  adminUrl: null,
  voterLinks: [],
  launching: false,
  error: null,
  prefilled: false,
  prefillSource: null,
  prefillWhy: null,
};

function makeInitial(draft?: ScrutinDraft, locale = "fr"): ScrutinState {
  const districts = pickLocale(locale, {
    fr: INITIAL.districts,
    en: [
      { name: "District 1", electors: 3, voterNames: "" },
      { name: "District 2", electors: 2, voterNames: "" },
    ],
    es: [
      { name: "Distrito 1", electors: 3, voterNames: "" },
      { name: "Distrito 2", electors: 2, voterNames: "" },
    ],
  });
  if (!draft) return { ...INITIAL, districts };
  const prefilled = Boolean(
    draft.question || draft.options || draft.recipe || draft.closesAt || draft.description || draft.assignMethod,
  );
  const recipe = draft.recipe ?? INITIAL.recipe;
  return {
    ...INITIAL,
    districts,
    screen: "create",
    question: draft.question ?? INITIAL.question,
    description: draft.description ?? INITIAL.description,
    optionKind: draft.optionKind ?? INITIAL.optionKind,
    options: draft.options ?? INITIAL.options,
    assignMethod: draft.assignMethod ?? INITIAL.assignMethod,
    voterNames: draft.participants ?? INITIAL.voterNames,
    assignSideB: draft.assignSideB ?? INITIAL.assignSideB,
    assignSlots: draft.assignSlots ?? INITIAL.assignSlots,
    assignPer: draft.assignPer ?? INITIAL.assignPer,
    survey: Boolean(draft.recipe?.survey),
    recipe,
    closesAt: draft.closesAt ?? INITIAL.closesAt,
    access: recipe.suffrage === "indirect" ? "invite" : INITIAL.access,
    prefilled,
    prefillSource: draft.source ?? null,
    prefillWhy: draft.why ?? null,
  };
}

const scrollTop = () => {
  if (typeof window !== "undefined") window.scrollTo({ top: 0 });
};

const ADD_ICONS = ["🎯", "⭐", "🔥", "🌟", "🎪", "🎨"];

const freshSlot = (locale: string): Option => ({ icon: SLOT_ICON, name: slotLabel("", locale), at: "" });

// Toute modification de la définition invalide les liens déjà lancés.
const CLEAR_SHARE: Pick<ScrutinState, "shareUrl" | "adminUrl" | "voterLinks" | "error"> = {
  shareUrl: null,
  adminUrl: null,
  voterLinks: [],
  error: null,
};

const splitNames = (text: string) =>
  text
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

export function useScrutin(draft?: ScrutinDraft) {
  const locale = useLocale();
  const [state, setState] = useState<ScrutinState>(() => makeInitial(draft, locale));
  const stateRef = useRef(state);
  stateRef.current = state;

  // Clôture par défaut : dans 7 jours (le scrutin « autoportant » se ferme tout seul).
  useEffect(() => {
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setState((s) => (s.closesAt ? s : { ...s, closesAt: local }));
  }, []);

  const go = useCallback((screen: Screen) => {
    setState((s) => ({ ...s, screen }));
    scrollTop();
  }, []);

  const selectSystemRecipe = useCallback((key: string) => {
    // Ne remonter en haut que lorsqu'on ENTRE dans l'écran de création (depuis
    // l'accueil). Si on y est déjà et qu'on change juste de méthode, on reste en
    // place près de la section de choix.
    const entering = stateRef.current.screen !== "create";
    setState((s) => ({
      ...s,
      recipe: recipeForSystem(key),
      screen: "create",
      access: key === "indirect" ? "invite" : s.access,
      ...CLEAR_SHARE,
    }));
    if (entering) scrollTop();
  }, []);

  const setRecipe = useCallback((patch: Partial<Recipe>) => {
    setState((s) => ({
      ...s,
      recipe: { ...s.recipe, ...patch },
      access: patch.suffrage === "indirect" ? "invite" : s.access,
      ...CLEAR_SHARE,
    }));
  }, []);

  const setQuestion = useCallback((question: string) => {
    setState((s) => ({ ...s, question, ...CLEAR_SHARE }));
  }, []);

  const setDescription = useCallback((description: string) => {
    setState((s) => ({ ...s, description, ...CLEAR_SHARE }));
  }, []);

  const setOptionName = useCallback((i: number, name: string) => {
    setState((s) => {
      const options = s.options.slice();
      options[i] = { ...options[i], name };
      return { ...s, options, ...CLEAR_SHARE };
    });
  }, []);

  const setOptionUrl = useCallback((i: number, url: string) => {
    setState((s) => {
      const options = s.options.slice();
      options[i] = { ...options[i], url: url.trim() || undefined };
      return { ...s, options, ...CLEAR_SHARE };
    });
  }, []);

  // Justification courte affichée sous l'option (même champ que les propositions).
  const setOptionNote = useCallback((i: number, note: string) => {
    setState((s) => {
      const options = s.options.slice();
      options[i] = { ...options[i], note: note.trim() || undefined };
      return { ...s, options, ...CLEAR_SHARE };
    });
  }, []);

  // Localisation : le lien est posé tout de suite, les coordonnées arrivent
  // ensuite (lien court à résoudre) — d'où la mise à jour en deux temps.
  const setOptionPlace = useCallback((i: number, place: string) => {
    setState((s) => {
      const options = s.options.slice();
      const value = place.trim() || undefined;
      const { lat: _lat, lng: _lng, ...rest } = options[i];
      options[i] = value ? { ...rest, place: value } : { ...rest, place: undefined };
      return { ...s, options, ...CLEAR_SHARE };
    });
  }, []);

  const setOptionGeo = useCallback((i: number, place: string, lat?: number, lng?: number) => {
    setState((s) => {
      const options = s.options.slice();
      // Le champ a pu changer pendant la résolution : on n'écrase que si c'est
      // toujours le même lien.
      if (options[i]?.place !== place) return s;
      options[i] = { ...options[i], lat, lng };
      return { ...s, options, ...CLEAR_SHARE };
    });
  }, []);

  const setOptionIcon = useCallback((i: number, icon: string) => {
    setState((s) => {
      const options = s.options.slice();
      options[i] = { ...options[i], icon };
      return { ...s, options, ...CLEAR_SHARE };
    });
  }, []);

  // Remplace tous les créneaux d'un coup (sélecteur de dates calendaire).
  // Le calendrier ne connaît que les dates : on RECONDUIT les détails déjà
  // attachés au même créneau (commentaire, lien, lieu) — sinon toucher une case
  // effacerait en silence les notes d'un brouillon d'IA.
  const setSlots = useCallback((options: Option[]) => {
    setState((s) => {
      const key = (o: Option) => `${o.at ?? ""}|${o.end ?? ""}`;
      const kept = new Map(s.options.filter((o) => o.at).map((o) => [key(o), o]));
      const merged = options.map((o) => {
        const prev = o.at ? kept.get(key(o)) : undefined;
        return prev ? { ...o, url: prev.url, note: prev.note, place: prev.place, lat: prev.lat, lng: prev.lng } : o;
      });
      return { ...s, options: merged, ...CLEAR_SHARE };
    });
  }, []);

  // Durée d'un créneau (pour le .ics du gagnant) — votes de dates.
  const setSlotMinutes = useCallback((slotMinutes: number) => {
    setState((s) => ({ ...s, slotMinutes, ...CLEAR_SHARE }));
  }, []);

  // ---- type de vote : propositions / dates / affectation ----
  const setOptionKind = useCallback((kind: "text" | "slot" | "assign") => {
    setState((s) => {
      if (s.optionKind === kind) return s;
      if (kind === "slot") {
        // Un créneau = un objet daté ; on bascule par défaut sur l'approbation (logique Doodle).
        return { ...s, optionKind: "slot", options: [freshSlot(locale), freshSlot(locale)], recipe: recipeForSystem("approval"), ...CLEAR_SHARE };
      }
      if (kind === "assign") {
        // Les « options » deviennent les choses à attribuer (ou seront générées
        // depuis les participants pour les binômes, au lancement).
        return {
          ...s,
          optionKind: "assign",
          options: [
            { icon: ADD_ICONS[0], name: "" },
            { icon: ADD_ICONS[1], name: "" },
          ],
          ...CLEAR_SHARE,
        };
      }
      return {
        ...s,
        optionKind: "text",
        options: [
          { icon: ADD_ICONS[0], name: pickLocale(locale, { fr: "Première option", en: "First option", es: "Primera opción" }) },
          { icon: ADD_ICONS[1], name: pickLocale(locale, { fr: "Deuxième option", en: "Second option", es: "Segunda opción" }) },
        ],
        ...CLEAR_SHARE,
      };
    });
  }, [locale]);

  const setSlotAt = useCallback((i: number, local: string) => {
    setState((s) => {
      const options = s.options.slice();
      options[i] = { ...options[i], at: local, name: slotLabel(local, locale), icon: SLOT_ICON };
      return { ...s, options, ...CLEAR_SHARE };
    });
  }, [locale]);

  const addSlot = useCallback(() => {
    setState((s) => ({ ...s, options: [...s.options, freshSlot(locale)], ...CLEAR_SHARE }));
  }, [locale]);

  const removeOption = useCallback((i: number) => {
    setState((s) =>
      s.options.length <= 2 ? s : { ...s, options: s.options.filter((_, j) => j !== i), ...CLEAR_SHARE },
    );
  }, []);

  const addOption = useCallback((name: string) => {
    setState((s) => {
      const idx = s.options.length;
      return {
        ...s,
        options: [...s.options, { icon: ADD_ICONS[idx % ADD_ICONS.length], name }],
        ...CLEAR_SHARE,
      };
    });
  }, []);

  // ---- accès & corps électoral ----
  const setAccess = useCallback((access: AccessMode) => {
    setState((s) => ({ ...s, access, ...CLEAR_SHARE }));
  }, []);

  const toggleHideResults = useCallback(() => {
    setState((s) => ({ ...s, hideResults: !s.hideResults, ...CLEAR_SHARE }));
  }, []);

  // Feed public : opt-in explicite du créateur (défaut privé, comme en base).
  const setPublicListing = useCallback((publicListing: boolean) => {
    setState((s) => ({ ...s, publicListing, ...CLEAR_SHARE }));
  }, []);

  // Phase de propositions : collecte d'options par les votants avant le vote.
  const setProposalsPhase = useCallback((proposalsPhase: boolean) => {
    setState((s) => ({ ...s, proposalsPhase, ...CLEAR_SHARE }));
  }, []);

  const setVoterNames = useCallback((voterNames: string) => {
    setState((s) => ({ ...s, voterNames, ...CLEAR_SHARE }));
  }, []);

  const setAssignMethod = useCallback((assignMethod: AssignMethodKey) => {
    setState((s) => ({ ...s, assignMethod, ...CLEAR_SHARE }));
  }, []);

  const setAssignSideB = useCallback((assignSideB: string) => {
    setState((s) => ({ ...s, assignSideB, ...CLEAR_SHARE }));
  }, []);

  // Objets à attribuer : choses (texte) ou créneaux (calendrier).
  const setAssignSlots = useCallback((assignSlots: boolean) => {
    setState((s) => {
      if (s.assignSlots === assignSlots) return s;
      return {
        ...s,
        assignSlots,
        options: assignSlots
          ? [freshSlot(locale), freshSlot(locale)]
          : [
              { icon: ADD_ICONS[0], name: "" },
              { icon: ADD_ICONS[1], name: "" },
            ],
        ...CLEAR_SHARE,
      };
    });
  }, [locale]);

  const setAssignPer = useCallback((assignPer: number) => {
    setState((s) => ({ ...s, assignPer: Math.max(1, Math.min(6, Math.floor(assignPer) || 1)), ...CLEAR_SHARE }));
  }, []);

  const setSurvey = useCallback((survey: boolean) => {
    setState((s) => ({ ...s, survey, ...CLEAR_SHARE }));
  }, []);

  const setOpensAt = useCallback((opensAt: string) => {
    setState((s) => ({ ...s, opensAt, ...CLEAR_SHARE }));
  }, []);

  const setClosesAt = useCallback((closesAt: string) => {
    setState((s) => ({ ...s, closesAt, ...CLEAR_SHARE }));
  }, []);

  const setQuorum = useCallback((quorum: number | null) => {
    setState((s) => ({ ...s, quorum, ...CLEAR_SHARE }));
  }, []);

  const toggleCloseOnComplete = useCallback(() => {
    setState((s) => ({ ...s, closeOnComplete: !s.closeOnComplete, ...CLEAR_SHARE }));
  }, []);

  const setDistrictField = useCallback(
    (i: number, field: keyof DistrictDraft, value: string | number) => {
      setState((s) => {
        const districts = s.districts.slice();
        districts[i] = { ...districts[i], [field]: value };
        return { ...s, districts, ...CLEAR_SHARE };
      });
    },
    [],
  );

  const addDistrict = useCallback(() => {
    setState((s) => ({
      ...s,
      districts: [...s.districts, { name: `Circonscription ${s.districts.length + 1}`, electors: 1, voterNames: "" }],
      ...CLEAR_SHARE,
    }));
  }, []);

  const removeDistrict = useCallback((i: number) => {
    setState((s) =>
      s.districts.length <= 1 ? s : { ...s, districts: s.districts.filter((_, j) => j !== i), ...CLEAR_SHARE },
    );
  }, []);

  // Lance le scrutin : persiste, crée le corps électoral le cas échéant, enregistre localement.
  const launch = useCallback(async () => {
    const s = stateRef.current;
    const question = s.question.trim();
    const isSlot = s.optionKind === "slot";
    const isAssign = s.optionKind === "assign";
    const assignDef = ASSIGN_METHODS[s.assignMethod];
    // Phase de collecte : disponible sur tout vote à propositions (rapide OU vérifié),
    // hors dates/affectation/GE. Le garde-fou n'est plus le mode d'accès mais la
    // VISIBILITÉ : le scrutin reste privé pendant la collecte et ne peut être publié
    // qu'une fois la liste figée (cf. blocage de setPollVisibility en 'proposals').
    const collecting = s.proposalsPhase && s.optionKind === "text" && s.recipe.suffrage !== "indirect";
    // Objets = créneaux (affectation à sens unique) : filtrage comme un vote de dates.
    const slotObjects = isAssign && assignDef.oneSided && s.assignSlots;
    const participants = splitNames(s.voterNames);
    let cleanOptions = s.options
      .filter((o) => (isSlot || slotObjects ? Boolean(o.at) : o.name.trim() !== ""))
      .map((o) => ({ ...o, name: o.name.trim() }));
    if (!question) {
      setState((p) => ({ ...p, error: "needQuestion" }));
      return;
    }
    // Deux groupes (Gale-Shapley) : côté 2 au format « Nom ; capacité ».
    const sideB = splitNames(s.assignSideB)
      .map((line) => {
        const [name, capRaw] = line.split(";").map((x) => x.trim());
        return { name: name ?? "", cap: Math.max(1, Math.floor(Number(capRaw)) || 1) };
      })
      .filter((e) => e.name);
    let assignVoters = participants;
    if (isAssign) {
      // Garde-fous d'affectation : nominative, effectif suffisant, pair et
      // sans doublon pour les binômes (prévisible dès la création).
      if (participants.length < 2) {
        setState((p) => ({ ...p, error: "needParticipants" }));
        return;
      }
      if (!assignDef.oneSided) {
        if (participants.length % 2) {
          setState((p) => ({ ...p, error: "oddCount" }));
          return;
        }
        if (new Set(participants).size !== participants.length) {
          setState((p) => ({ ...p, error: "dupNames" }));
          return;
        }
        // Les « options » sont les participants eux-mêmes (chacun classe les autres).
        cleanOptions = participants.map((name) => ({ icon: "🧑", name }));
      }
      if (assignDef.twoLists) {
        if (participants.length < 1 || sideB.length < 1) {
          setState((p) => ({ ...p, error: "needBothSides" }));
          return;
        }
        const all = [...participants, ...sideB.map((e) => e.name)];
        if (new Set(all).size !== all.length) {
          setState((p) => ({ ...p, error: "dupNamesBoth" }));
          return;
        }
        cleanOptions = [
          ...participants.map((name) => ({ icon: "🧑", name })),
          ...sideB.map((e) => ({ icon: "🎓", name: e.name })),
        ];
        assignVoters = all;
      }
      if (assignDef.endowed) {
        // Bourse d'échanges : la N-ième personne possède la N-ième chose.
        if (new Set(participants).size !== participants.length) {
          setState((p) => ({ ...p, error: "dupNames" }));
          return;
        }
        if (participants.length !== cleanOptions.length) {
          setState((p) => ({ ...p, error: "endowCount" }));
          return;
        }
      }
    }
    // En phase de collecte, l'organisateur peut ne semer aucune option (les
    // votants les proposeront) ; sinon il en faut au moins deux.
    if (!collecting && cleanOptions.length < 2) {
      setState((p) => ({ ...p, error: isSlot ? "needTwoSlots" : "needTwoOptions" }));
      return;
    }
    setState((p) => ({ ...p, launching: true, error: null }));
    try {
      const isGE = !isAssign && s.recipe.suffrage === "indirect";
      let districtsPayload: District[] | null = null;
      const voters: VoterInput[] = [];
      if (isAssign) {
        assignVoters.forEach((label) => voters.push({ label, district: null }));
      } else if (s.access === "invite") {
        if (isGE) {
          districtsPayload = s.districts.map((d) => ({
            name: d.name || "Circonscription",
            electors: Math.max(0, Math.floor(d.electors) || 0),
          }));
          s.districts.forEach((d, di) =>
            splitNames(d.voterNames).forEach((label) => voters.push({ label, district: di })),
          );
        } else {
          splitNames(s.voterNames).forEach((label) => voters.push({ label, district: null }));
        }
      }

      // Affectation : bulletin = classement (counting borda → mode « rank »),
      // accès nominatif forcé, résultat masqué jusqu'à la clôture.
      const recipe: Recipe = isAssign
        ? {
            ...s.recipe,
            suffrage: "direct",
            counting: "borda",
            rounds: 1,
            assign: s.assignMethod,
            ...(assignDef.endowed
              ? { assignEndow: Object.fromEntries(participants.map((label, i) => [label, i])) }
              : {}),
            ...(assignDef.twoLists ? { assignA: participants.length, assignCaps: sideB.map((e) => e.cap) } : {}),
            ...(assignDef.oneSided && !assignDef.endowed && s.assignPer > 1 ? { assignPer: s.assignPer } : {}),
          }
        : s.survey
          ? { ...s.recipe, survey: true }
          : s.recipe;
      const access: AccessMode = isAssign ? "invite" : s.access;

      // Dernière chance de localiser : un lien court collé juste avant le clic
      // n'a peut-être pas fini d'être résolu, et les options sont FIGÉES après
      // le lancement — sans coordonnées, le lieu n'apparaîtrait jamais sur la carte.
      cleanOptions = await Promise.all(
        cleanOptions.map(async (o) => {
          if (!o.place || typeof o.lat === "number") return o;
          const geo = await resolvePlace(o.place);
          return geo ? { ...o, lat: geo.lat, lng: geo.lng } : o;
        }),
      );

      const toISO = (str: string) => (str ? new Date(str).toISOString() : null);
      const { token, secret } = await createPoll(question, cleanOptions, recipe, {
        description: s.description,
        hideResults: isAssign ? true : s.hideResults,
        accessMode: access,
        districts: districtsPayload,
        opensAt: toISO(s.opensAt),
        closesAt: toISO(s.closesAt),
        closeOnComplete: s.closeOnComplete,
        quorum: s.quorum,
        slotMinutes: isSlot || slotObjects ? s.slotMinutes : null,
        initialStatus: collecting ? "proposals" : undefined,
      });
      const origin = window.location.origin;

      // Boucle fermée : ce créateur était-il arrivé par un lien partagé ? C'est
      // la seule mesure qui dise si publier sert à quelque chose. Silencieuse et
      // consommée une fois, pour qu'un même parcours ne compte pas deux fois.
      trackConversion();

      // Feed public : publication APRÈS le lancement réussi, en silence — un
      // échec (rate-limit, réseau) ne doit JAMAIS faire échouer le lancement.
      // Jamais pendant la collecte : on ne publie qu'une fois la liste figée
      // (l'organisateur publiera depuis sa page après « Ouvrir le vote »).
      if (s.publicListing && s.access === "open" && !isAssign && !collecting) {
        try {
          await setPollVisibility(token, secret, true);
        } catch {
          /* le scrutin reste privé, le créateur pourra republier depuis sa page admin */
        }
      }

      let voterLinks: { label: string; url: string }[] = [];
      if (access === "invite" && voters.length) {
        const created = await addVoters(token, secret, voters);
        voterLinks = created.map((v) => ({ label: v.label, url: `${origin}/v/${token}?u=${v.token}` }));
      }

      addLocalPoll({ token, secret, question: s.question, createdAt: Date.now() });
      setState((p) => ({
        ...p,
        shareUrl: `${origin}/v/${token}`,
        adminUrl: `${origin}/v/${token}?k=${secret}`,
        voterLinks,
        launching: false,
        screen: "launched",
      }));
      scrollTop();
    } catch {
      setState((p) => ({ ...p, launching: false, error: "launchFailed" }));
    }
  }, []);

  const newScrutin = useCallback(() => {
    setState((s) => ({ ...s, screen: "create", prefilled: false, prefillSource: null, prefillWhy: null, ...CLEAR_SHARE }));
    scrollTop();
  }, []);

  return {
    state,
    go,
    selectSystemRecipe,
    setRecipe,
    setQuestion,
    setDescription,
    setOptionName,
    setOptionUrl,
    setOptionNote,
    setOptionPlace,
    setOptionGeo,
    setOptionIcon,
    removeOption,
    addOption,
    setOptionKind,
    setSlotAt,
    addSlot,
    setSlots,
    setSlotMinutes,
    setAccess,
    toggleHideResults,
    setPublicListing,
    setProposalsPhase,
    setVoterNames,
    setAssignMethod,
    setAssignSideB,
    setAssignSlots,
    setAssignPer,
    setSurvey,
    setOpensAt,
    setClosesAt,
    setQuorum,
    toggleCloseOnComplete,
    setDistrictField,
    addDistrict,
    removeDistrict,
    launch,
    newScrutin,
  };
}

export type ScrutinController = ReturnType<typeof useScrutin>;
