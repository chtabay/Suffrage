"use client";

import { useCallback, useRef, useState } from "react";
import { addLocalPoll } from "@/lib/db/localPolls";
import { createPoll } from "@/lib/db/polls";
import type { Option, Recipe } from "./types";

export type Screen = "home" | "gallery" | "create" | "launched" | "mine";

export interface ScrutinState {
  screen: Screen;
  question: string;
  options: Option[];
  recipe: Recipe;
  shareUrl: string | null;
  adminUrl: string | null;
  launching: boolean;
  error: string | null;
}

const DEFAULT_RECIPE: Recipe = {
  suffrage: "direct",
  counting: "majority",
  rounds: 1,
  qualif: "top2",
  random: false,
  localCounting: "majority",
  electorSplit: "wta",
  threshold: 50,
};

const INITIAL: ScrutinState = {
  screen: "home",
  question: "On part où pour le week-end ?",
  options: [
    { icon: "🏔️", name: "La montagne" },
    { icon: "🏖️", name: "Le bord de mer" },
    { icon: "🌆", name: "Une grande ville" },
    { icon: "🌿", name: "La campagne" },
  ],
  recipe: { ...DEFAULT_RECIPE },
  shareUrl: null,
  adminUrl: null,
  launching: false,
  error: null,
};

const scrollTop = () => {
  if (typeof window !== "undefined") window.scrollTo({ top: 0 });
};

const ADD_ICONS = ["🎯", "⭐", "🔥", "🌟", "🎪", "🎨"];

// Toute modification de la définition du scrutin invalide les liens déjà lancés.
const CLEAR_SHARE = { shareUrl: null, adminUrl: null, error: null } as const;

export function useScrutin() {
  const [state, setState] = useState<ScrutinState>(INITIAL);
  const stateRef = useRef(state);
  stateRef.current = state;

  const go = useCallback((screen: Screen) => {
    setState((s) => ({ ...s, screen }));
    scrollTop();
  }, []);

  const selectSystemRecipe = useCallback((key: string) => {
    const r: Recipe = { ...DEFAULT_RECIPE };
    if (key === "runoff") r.rounds = 2;
    else if (key === "condorcet") r.counting = "condorcet";
    else if (key === "condorcet_random") {
      r.counting = "condorcet";
      r.random = true;
    } else if (key === "mj") r.counting = "mj";
    else if (key === "approval") r.counting = "approval";
    else if (key === "borda") r.counting = "borda";
    else if (key === "proportional") r.counting = "proportional";
    else if (key === "list") r.counting = "list";
    else if (key === "indirect") {
      r.suffrage = "indirect";
      r.localCounting = "majority";
    }
    setState((s) => ({ ...s, recipe: r, screen: "create", ...CLEAR_SHARE }));
    scrollTop();
  }, []);

  const setRecipe = useCallback((patch: Partial<Recipe>) => {
    setState((s) => ({ ...s, recipe: { ...s.recipe, ...patch }, ...CLEAR_SHARE }));
  }, []);

  const setQuestion = useCallback((question: string) => {
    setState((s) => ({ ...s, question, ...CLEAR_SHARE }));
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

  // Lance le scrutin : persiste la définition, l'enregistre localement, et bascule sur le partage.
  const launch = useCallback(async () => {
    const s = stateRef.current;
    setState((p) => ({ ...p, launching: true, error: null }));
    try {
      const { token, secret } = await createPoll(s.question, s.options, s.recipe);
      const origin = window.location.origin;
      addLocalPoll({ token, secret, question: s.question, createdAt: Date.now() });
      setState((p) => ({
        ...p,
        shareUrl: `${origin}/v/${token}`,
        adminUrl: `${origin}/v/${token}?k=${secret}`,
        launching: false,
        screen: "launched",
      }));
      scrollTop();
    } catch {
      setState((p) => ({ ...p, launching: false, error: "Impossible de lancer le scrutin. Réessayez." }));
    }
  }, []);

  const newScrutin = useCallback(() => {
    setState((s) => ({ ...s, screen: "create", shareUrl: null, adminUrl: null, error: null }));
    scrollTop();
  }, []);

  return {
    state,
    go,
    selectSystemRecipe,
    setRecipe,
    setQuestion,
    setOptionName,
    removeOption,
    addOption,
    launch,
    newScrutin,
  };
}

export type ScrutinController = ReturnType<typeof useScrutin>;
