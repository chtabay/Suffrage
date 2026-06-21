"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: string }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let started = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !nav.standalone;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  deferred.prompt();
  const res = await deferred.userChoice;
  deferred = null;
  notify();
  return res.outcome === "accepted";
}

export interface InstallState {
  canPrompt: boolean;
  standalone: boolean;
  ios: boolean;
}

export function useInstall(): InstallState & { promptInstall: typeof promptInstall } {
  const [state, setState] = useState<InstallState>({ canPrompt: false, standalone: false, ios: false });
  useEffect(() => {
    start();
    const update = () => setState({ canPrompt: deferred !== null, standalone: isStandalone(), ios: isIOS() });
    update();
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);
  return { ...state, promptInstall };
}
