"use client";

import { buildAiPrompt } from "@/lib/voting/aiPrompt";
import type { Option } from "@/lib/voting/types";

export interface Assistant {
  key: string;
  label: string;
  color: string;
  /** Affiché dans le rail latéral de l'accueil (sinon : seulement dans le bloc « Préparer avec une IA » de la création). */
  rail?: boolean;
  /** Pré-remplit-il le prompt via l'URL (`?q=`) ? Sinon : ouverture + collage (le prompt est déjà copié). */
  prefill: boolean;
  url: (prompt: string) => string;
}

// Ordre = ordre d'affichage. Le prompt est toujours copié dans le presse-papiers
// avant l'ouverture, donc même sans pré-remplissage l'utilisateur n'a qu'à coller.
export const ASSISTANTS: Assistant[] = [
  { key: "chatgpt", label: "ChatGPT", color: "#10A37F", rail: true, prefill: true, url: (p) => `https://chatgpt.com/?q=${encodeURIComponent(p)}` },
  { key: "claude", label: "Claude", color: "#D97757", rail: true, prefill: true, url: (p) => `https://claude.ai/new?q=${encodeURIComponent(p)}` },
  { key: "gemini", label: "Gemini", color: "#4285F4", rail: true, prefill: false, url: () => "https://gemini.google.com/app" },
  { key: "copilot", label: "Copilot", color: "#7C3AED", rail: true, prefill: false, url: () => "https://copilot.microsoft.com/" },
  { key: "perplexity", label: "Perplexity", color: "#20808D", prefill: true, url: (p) => `https://www.perplexity.ai/search?q=${encodeURIComponent(p)}` },
  { key: "grok", label: "Grok", color: "#111111", prefill: false, url: () => "https://grok.com/" },
  { key: "lechat", label: "Le Chat", color: "#FA500F", prefill: false, url: () => "https://chat.mistral.ai/chat" },
];

export const RAIL_ASSISTANTS = ASSISTANTS.filter((a) => a.rail);

async function copy(text: string) {
  try {
    await navigator.clipboard?.writeText(text);
  } catch {
    /* presse-papiers indisponible */
  }
}

/** Copie le prompt et ouvre l'assistant (avec ?q= quand la plateforme le supporte). */
export async function openAssistant(a: Assistant, question: string, options: Option[]) {
  const prompt = buildAiPrompt(question, options, a.key);
  await copy(prompt);
  window.open(a.url(prompt), "_blank", "noopener,noreferrer");
}

export async function copyAiPrompt(question: string, options: Option[]) {
  await copy(buildAiPrompt(question, options, "ai"));
}
