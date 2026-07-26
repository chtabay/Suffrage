"use client";

import { createClient } from "@/lib/supabase/client";

export type ShareChannel = "copy" | "whatsapp" | "native" | "qr";

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
