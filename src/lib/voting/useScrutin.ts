"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addLocalPoll } from "@/lib/db/localPolls";
import { addVoters, createPoll, type AccessMode, type District, type VoterInput } from "@/lib/db/polls";
import type { ScrutinDraft } from "./draft";
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
  options: Option[];
  recipe: Recipe;
  access: AccessMode;
  hideResults: boolean;
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
  question: "On part où pour le week-end ?",
  description: "",
  options: [
    { icon: "🏔️", name: "La montagne" },
    { icon: "🏖️", name: "Le bord de mer" },
    { icon: "🌆", name: "Une grande ville" },
    { icon: "🌿", name: "La campagne" },
  ],
  recipe: { ...DEFAULT_RECIPE },
  access: "open",
  hideResults: false,
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

function makeInitial(draft?: ScrutinDraft): ScrutinState {
  if (!draft) return INITIAL;
  const prefilled = Boolean(
    draft.question || draft.options || draft.recipe || draft.closesAt || draft.description,
  );
  const recipe = draft.recipe ?? INITIAL.recipe;
  return {
    ...INITIAL,
    screen: "create",
    question: draft.question ?? INITIAL.question,
    description: draft.description ?? INITIAL.description,
    options: draft.options ?? INITIAL.options,
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
  const [state, setState] = useState<ScrutinState>(() => makeInitial(draft));
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
    setState((s) => ({
      ...s,
      recipe: recipeForSystem(key),
      screen: "create",
      access: key === "indirect" ? "invite" : s.access,
      ...CLEAR_SHARE,
    }));
    scrollTop();
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

  const removeOption = useCallback((i: number) => {
    setState((s) =>
      s.options.length <= 2 ? s : { ...s, options: s.options.filter((_, j) => j !== i), ...CLEAR_SHARE },
    );
  }, []);

  const addOption = useCallback(() => {
    setState((s) => {
      const idx = s.options.length;
      return {
        ...s,
        options: [...s.options, { icon: ADD_ICONS[idx % ADD_ICONS.length], name: "Nouvelle option" }],
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

  const setVoterNames = useCallback((voterNames: string) => {
    setState((s) => ({ ...s, voterNames, ...CLEAR_SHARE }));
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
    setState((p) => ({ ...p, launching: true, error: null }));
    try {
      const isGE = s.recipe.suffrage === "indirect";
      let districtsPayload: District[] | null = null;
      const voters: VoterInput[] = [];
      if (s.access === "invite") {
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

      const toISO = (str: string) => (str ? new Date(str).toISOString() : null);
      const { token, secret } = await createPoll(s.question, s.options, s.recipe, {
        description: s.description,
        hideResults: s.hideResults,
        accessMode: s.access,
        districts: districtsPayload,
        opensAt: toISO(s.opensAt),
        closesAt: toISO(s.closesAt),
        closeOnComplete: s.closeOnComplete,
        quorum: s.quorum,
      });
      const origin = window.location.origin;

      let voterLinks: { label: string; url: string }[] = [];
      if (s.access === "invite" && voters.length) {
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
      setState((p) => ({ ...p, launching: false, error: "Impossible de lancer le scrutin. Réessayez." }));
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
    removeOption,
    addOption,
    setAccess,
    toggleHideResults,
    setVoterNames,
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
