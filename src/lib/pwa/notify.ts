"use client";

import { useEffect, useState } from "react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function notifySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    Boolean(VAPID_PUBLIC)
  );
}

/**
 * La plomberie push est-elle déployée du tout ?
 *
 * ⚠️ ELLE NE SE CONFOND PAS AVEC `notifySupported`, ET LES CONFONDRE FAIT MENTIR
 * L'ÉCRAN. `notifySupported` replie l'absence de clé VAPID sur les capacités du
 * navigateur : sur un déploiement où la clé manque, TOUS les joueurs s'entendent
 * dire que leur navigateur ne sait pas recevoir de notifications, ce qui est
 * faux et les envoie chercher le défaut chez eux. Sans clé, il n'y a rien à
 * proposer et rien à expliquer — l'offre ne s'affiche pas.
 */
export function notifyDeployed(): boolean {
  return Boolean(VAPID_PUBLIC);
}

export type SubscribeResult = "ok" | "denied" | "unsupported" | "error";

/**
 * Le fuseau de l'appareil, tel que la base IANA le nomme — jamais un décalage
 * horaire. Un décalage est faux la moitié de l'année dans tout pays qui change
 * d'heure ; le serveur, lui, a besoin de savoir quelle heure il est CHEZ le
 * joueur pour ne pas lui envoyer la clôture de sa journée à cinq heures et
 * demie du matin.
 */
function fuseauDIci(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * La langue de l'interface, lue sur `<html lang>` que la mise en page pose déjà.
 *
 * ⚠️ ELLE EST NÉCESSAIRE PARCE QU'UNE NOTIFICATION NE TRAVERSE PAS REACT :
 * personne n'est là pour lire `messages/*.json` au moment de l'envoi, donc le
 * texte est rendu côté serveur — dans la langue que l'abonnement déclare, ou en
 * français à défaut. La lire ici plutôt que la faire passer par chaque appelant
 * évite qu'un écran l'oublie en silence.
 */
function langueDIci(): string | null {
  if (typeof document === "undefined") return null;
  const l = document.documentElement.lang;
  return /^[a-z]{2,3}$/.test(l) ? l : null;
}

/**
 * ⚠️ `navigator.serviceWorker.ready` PEUT NE JAMAIS SE RÉSOUDRE, et c'est le
 * piège de ce fichier. Ce n'est pas une promesse qui échoue : quand aucun
 * service worker n'arrive à s'activer — fichier introuvable, navigation privée,
 * navigateur qui les bloque —, elle reste EN ATTENTE, pour toujours. Le `await`
 * ne rend donc jamais la main, aucun `catch` ne se déclenche, et le bouton reste
 * sur ses trois points : un bouton mort, sans un mot d'explication. Vu à
 * l'écran, pas à la relecture.
 *
 * Dix secondes : un enregistrement normal prend quelques dizaines de
 * millisecondes, et au-delà de dix secondes le joueur a de toute façon conclu
 * que rien ne se passe.
 */
async function pretBorne(): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resoudre) => setTimeout(() => resoudre(null), 10000)),
  ]).catch(() => null);
}

/** Demande la permission, s'abonne au push et enregistre l'abonnement côté serveur. */
export async function subscribeNotifications(pollToken?: string): Promise<SubscribeResult> {
  if (!notifySupported() || !VAPID_PUBLIC) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    await navigator.serviceWorker.register("/sw.js").catch(() => {});
    const reg = await pretBorne();
    if (!reg) return "error";

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
    }
    const keys = sub.toJSON().keys ?? {};
    const res = await fetch("/api/notify/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        pollToken: pollToken ?? null,
        fuseau: fuseauDIci(),
        langue: langueDIci(),
      }),
    });
    return res.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}

/**
 * Cet appareil-ci a-t-il un abonnement push ?
 *
 * ⚠️ LA QUESTION N'EST PAS CELLE QUE LA BASE SAIT RÉPONDRE. Elle compte les
 * abonnements d'un COMPTE ; le joueur, lui, regarde UN téléphone. Quelqu'un qui
 * s'est abonné sur son ordinateur a bien « un appareil abonné » sans que celui
 * qu'il tient en main reçoive quoi que ce soit — lui cacher l'offre au motif que
 * le compte est couvert lui promettrait des notifications qui n'arriveraient
 * jamais ici.
 */
export async function abonnementDIci(): Promise<boolean> {
  if (!notifySupported()) return false;
  if (typeof Notification !== "undefined" && Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;
    return (await reg.pushManager.getSubscription()) !== null;
  } catch {
    return false;
  }
}

export function useNotify() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  useEffect(() => {
    setSupported(notifySupported());
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
  }, []);
  return { supported, permission };
}
