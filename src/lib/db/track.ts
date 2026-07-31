"use client";

import { createClient } from "@/lib/supabase/client";

export type ShareChannel = "copy" | "whatsapp" | "native" | "qr";
/** `link` = lien collé à la main, sans passer par un bouton de partage. */
export type FunnelChannel = ShareChannel | "link";

/** Clé de session : l'origine du visiteur, jusqu'à sa propre création. */
const SRC_KEY = "scrutin.src";

/**
 * Compte un clic de partage (métrique interne, agrégée sur /admin).
 * Fire-and-forget : jamais bloquant, jamais d'erreur visible.
 * Ne compte que les liens de vote /v/<token> — un lien d'admin (?k=…)
 * copié par l'organisateur n'est pas un partage.
 */
export function trackShare(url: string, channel: ShareChannel): void {
  try {
    const m = url.match(/\/v\/([^/?#]+)/);
    if (!m || /[?&]k=/.test(url)) return;
    const supabase = createClient();
    void supabase.rpc("scrutin_track_share", { p_token: m[1], p_channel: channel }).then(
      () => {},
      () => {},
    );
  } catch {
    /* hors navigateur ou client indisponible : on ignore */
  }
}

/**
 * Décore le lien à PARTAGER avec son canal d'origine (`?s=…`).
 *
 * Sans cette marque, on comptait des clics sur « partager » sans jamais savoir
 * s'ils produisaient une visite : la seule question qui vaille. On ne décore
 * jamais un lien d'administration — il n'a pas vocation à circuler.
 */
export function shareUrl(url: string, channel: FunnelChannel): string {
  if (!url || /[?&]k=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}s=${channel}`;
}

/** Enregistre une étape de l'entonnoir sur le scrutin d'ORIGINE. */
function trackFunnel(token: string, channel: FunnelChannel, kind: "visit" | "create"): void {
  try {
    const supabase = createClient();
    void supabase
      .rpc("scrutin_track_funnel", { p_token: token, p_channel: channel, p_kind: kind })
      .then(
        () => {},
        () => {},
      );
  } catch {
    /* ignoré : une métrique ne doit jamais gêner un vote */
  }
}

/**
 * À l'arrivée sur un scrutin : compte la visite si le lien portait `?s=`, et
 * MÉMORISE l'origine pour la suite. Sans mémoire, on saurait qu'un partage
 * amène du monde, jamais qu'il amène des créateurs.
 */
export function trackVisit(token: string, source: string | null): void {
  const channel = (source ?? "").trim() as FunnelChannel;
  if (!token || !["copy", "whatsapp", "native", "qr", "link"].includes(channel)) return;
  trackFunnel(token, channel, "visit");
  try {
    sessionStorage.setItem(SRC_KEY, JSON.stringify({ token, channel }));
  } catch {
    /* session indisponible (navigation privée stricte) : on perd l'attribution */
  }
}

/**
 * Au lancement d'un scrutin : si ce créateur était arrivé par un lien partagé,
 * on ferme la boucle — partage → visite → création. L'origine est CONSOMMÉE
 * pour qu'un même parcours ne soit pas compté deux fois.
 */
export function trackConversion(): void {
  try {
    const raw = sessionStorage.getItem(SRC_KEY);
    if (!raw) return;
    sessionStorage.removeItem(SRC_KEY);
    const { token, channel } = JSON.parse(raw) as { token: string; channel: FunnelChannel };
    if (token && channel) trackFunnel(token, channel, "create");
  } catch {
    /* rien à attribuer */
  }
}
