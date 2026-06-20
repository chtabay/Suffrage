"use client";

import { useCallback, useState } from "react";
import {
  compute,
  methodMode,
  normalizeFromApproved,
  normalizeFromGrades,
  normalizeFromRank,
  normalizeFromSingle,
  operativeMethod,
  simulateCrowd,
} from "./engine";
import type { Ballot, ComputeResult, Option, Recipe } from "./types";

export type Screen = "home" | "gallery" | "create" | "vote" | "results";

export interface ScrutinState {
  screen: Screen;
  question: string;
  options: Option[];
  recipe: Recipe;
  ballots: Ballot[];
  myChoice: number | null;
  myApproved: number[];
  myRank: number[];
  myGrades: Record<number, number>;
  result: ComputeResult | null;
  shared: boolean;
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
  ballots: [],
  myChoice: null,
  myApproved: [],
  myRank: [],
  myGrades: {},
  result: null,
  shared: false,
};

const scrollTop = () => {
  if (typeof window !== "undefined") window.scrollTo({ top: 0 });
};

const ADD_ICONS = ["🎯", "⭐", "🔥", "🌟", "🎪", "🎨"];

export function useScrutin() {
  const [state, setState] = useState<ScrutinState>(INITIAL);

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
    setState((s) => ({ ...s, recipe: r, screen: "create" }));
    scrollTop();
  }, []);

  const setRecipe = useCallback((patch: Partial<Recipe>) => {
    setState((s) => ({ ...s, recipe: { ...s.recipe, ...patch } }));
  }, []);

  const setQuestion = useCallback((question: string) => {
    setState((s) => ({ ...s, question }));
  }, []);

  const setOptionName = useCallback((i: number, name: string) => {
    setState((s) => {
      const options = s.options.slice();
      options[i] = { ...options[i], name };
      return { ...s, options };
    });
  }, []);

  const removeOption = useCallback((i: number) => {
    setState((s) =>
      s.options.length <= 2
        ? s
        : { ...s, options: s.options.filter((_, j) => j !== i), ballots: [] },
    );
  }, []);

  const addOption = useCallback(() => {
    setState((s) => {
      const idx = s.options.length;
      return {
        ...s,
        options: [...s.options, { icon: ADD_ICONS[idx % ADD_ICONS.length], name: "Nouvelle option" }],
        ballots: [],
      };
    });
  }, []);

  const setChoice = useCallback((i: number) => setState((s) => ({ ...s, myChoice: i })), []);

  const toggleApprove = useCallback((i: number) => {
    setState((s) => ({
      ...s,
      myApproved: s.myApproved.includes(i)
        ? s.myApproved.filter((x) => x !== i)
        : [...s.myApproved, i],
    }));
  }, []);

  const rank = useCallback((i: number) => {
    setState((s) => (s.myRank.includes(i) ? s : { ...s, myRank: [...s.myRank, i] }));
  }, []);

  const resetRank = useCallback(() => setState((s) => ({ ...s, myRank: [] })), []);

  const setGrade = useCallback((i: number, gi: number) => {
    setState((s) => ({ ...s, myGrades: { ...s.myGrades, [i]: gi } }));
  }, []);

  const addMyVote = useCallback(() => {
    setState((s) => {
      const mode = methodMode(operativeMethod(s.recipe));
      const len = s.ballots.length;
      const n = s.options.length;
      let b: Ballot | null = null;
      if (mode === "single") {
        if (s.myChoice === null) return s;
        b = normalizeFromSingle(s.myChoice, n, len);
      } else if (mode === "approve") {
        if (!s.myApproved.length) return s;
        b = normalizeFromApproved(s.myApproved, n, len);
      } else if (mode === "rank") {
        if (!s.myRank.length) return s;
        b = normalizeFromRank(s.myRank, n, len);
      } else if (mode === "grade") {
        b = normalizeFromGrades(s.myGrades, n, len);
      }
      if (!b) return s;
      return {
        ...s,
        ballots: [...s.ballots, b],
        myChoice: null,
        myApproved: [],
        myRank: [],
        myGrades: {},
      };
    });
  }, []);

  const simulate = useCallback(() => {
    setState((s) => ({
      ...s,
      ballots: [...s.ballots, ...simulateCrowd(s.options.length, s.ballots.length)],
    }));
  }, []);

  const reset = useCallback(() => setState((s) => ({ ...s, ballots: [], result: null })), []);

  const goResults = useCallback(() => {
    setState((s) => {
      if (!s.ballots.length) return s;
      return {
        ...s,
        result: compute({ recipe: s.recipe, options: s.options, ballots: s.ballots }),
        shared: false,
        screen: "results",
      };
    });
    scrollTop();
  }, []);

  const recalc = useCallback(() => {
    setState((s) => ({
      ...s,
      result: compute({ recipe: s.recipe, options: s.options, ballots: s.ballots }),
      shared: false,
    }));
    scrollTop();
  }, []);

  const share = useCallback(() => setState((s) => ({ ...s, shared: true })), []);

  return {
    state,
    go,
    selectSystemRecipe,
    setRecipe,
    setQuestion,
    setOptionName,
    removeOption,
    addOption,
    setChoice,
    toggleApprove,
    rank,
    resetRank,
    setGrade,
    addMyVote,
    simulate,
    reset,
    goResults,
    recalc,
    share,
  };
}

export type ScrutinController = ReturnType<typeof useScrutin>;
export { operativeMethod, methodMode };
