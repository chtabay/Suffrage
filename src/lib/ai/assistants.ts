"use client";

import { buildAiPrompt } from "@/lib/voting/aiPrompt";
import type { Option } from "@/lib/voting/types";

export interface Assistant {
  key: string;
  label: string;
  color: string;
  url: (prompt: string) => string;
}

export const ASSISTANTS: Assistant[] = [
  { key: "chatgpt", label: "ChatGPT", color: "#10A37F", url: (p) => `https://chatgpt.com/?q=${encodeURIComponent(p)}` },
  { key: "claude", label: "Claude", color: "#D97757", url: (p) => `https://claude.ai/new?q=${encodeURIComponent(p)}` },
  { key: "gemini", label: "Gemini", color: "#4285F4", url: () => "https://gemini.google.com/app" },
];

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
