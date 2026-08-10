"use client";

// SYNCHRONISATION D'UNE SALLE — générique, un jeu quelconque s'y branche.
//
// POURQUOI DU SONDAGE ET PAS DU TEMPS RÉEL. Vérifié avant d'écrire : la base
// Placet n'a AUCUNE table publiée en réplication logique (`pg_publication_tables`
// est vide), donc le temps réel de Supabase n'est pas activé du tout. Les deux
// écrans qui suivent déjà une consultation en direct — LivretVote, EventEditor —
// se rafraîchissent par `setInterval`. On suit le chemin existant plutôt que
// d'allumer une infrastructure pour une partie de six personnes.
//
// TROIS PRÉCAUTIONS QUI SE REMARQUENT SUR UN TÉLÉPHONE :
//   • onglet caché → on RALENTIT, on ne s'arrête pas (voir TICK_HIDDEN), et on
//     rattrape aussitôt au retour ;
//   • `refresh()` est exposé pour rafraîchir TOUT DE SUITE après son propre
//     geste, au lieu d'attendre le prochain battement ;
//   • une réponse en retard ne peut pas écraser une plus récente (compteur de
//     génération) — sans quoi le compteur « 5/6 » sautille.
import { useCallback, useEffect, useRef, useState } from "react";
import { getRoom, type RoomAnswer, type RoomState } from "./room";

/** Cadence du sondage. Une partie finie n'attend plus qu'une chose : « rejouer ». */
const TICK_ACTIVE = 2000;
const TICK_ENDED = 5000;
/**
 * Cadence quand le navigateur nous déclare cachés.
 *
 * La première version S'ARRÊTAIT dans ce cas — un téléphone dans une poche n'a
 * pas à interroger le serveur, l'idée tient. Mais `visibilityState` vaut aussi
 * `hidden` là où l'utilisateur voit bel et bien la page : vue encapsulée, onglet
 * qui ne compose pas de frame, application installée réveillée en arrière-plan.
 * Rencontré pour de vrai en vérifiant ce lot, et le symptôme est le pire qui
 * soit pour un jeu — la partie a l'air GELÉE, sans un mot d'explication. Une
 * requête toutes les quinze secondes coûte à peu près rien (les navigateurs
 * brident de toute façon les minuteurs en arrière-plan) et fait disparaître
 * toute une classe de pannes silencieuses.
 */
const TICK_HIDDEN = 15000;

export interface GameRoomHandle<TMine, TResult> {
  room: RoomState<TMine, TResult> | null;
  /** Vrai tant qu'on n'a jamais rien reçu (le premier écran, pas les suivants). */
  loading: boolean;
  /** La salle n'existe pas (code faux, ou partie purgée). */
  missing: boolean;
  /** Le réseau a lâché : on garde le dernier état connu à l'écran. */
  offline: boolean;
  refresh: () => Promise<void>;
}

export function useGameRoom<TMine = unknown, TResult = unknown>(
  code: string,
  token: string | null,
): GameRoomHandle<TMine, TResult> {
  const [room, setRoom] = useState<RoomState<TMine, TResult> | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [offline, setOffline] = useState(false);
  // Génération : identifie la requête la plus récente. Une réponse d'une
  // génération périmée est jetée.
  const gen = useRef(0);

  const refresh = useCallback(async () => {
    const mine = ++gen.current;
    try {
      const a: RoomAnswer<TMine, TResult> = await getRoom<TMine, TResult>(code, token);
      if (mine !== gen.current) return;
      setOffline(false);
      if (a.status === "not_found") {
        setMissing(true);
        setRoom(null);
      } else {
        setMissing(false);
        setRoom(a);
      }
    } catch {
      if (mine === gen.current) setOffline(true);
    } finally {
      if (mine === gen.current) setLoading(false);
    }
  }, [code, token]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  const ended = room?.roomStatus === "ended";
  // Date du dernier appel réellement parti : c'est elle qui espace les battements
  // en arrière-plan, plutôt qu'un second minuteur à faire vivre.
  const lastAt = useRef(0);
  useEffect(() => {
    if (missing) return;
    const period = ended ? TICK_ENDED : TICK_ACTIVE;
    const tick = () => {
      if (document.visibilityState === "hidden" && Date.now() - lastAt.current < TICK_HIDDEN) return;
      lastAt.current = Date.now();
      void refresh();
    };
    const timer = setInterval(tick, period);
    // Retour au premier plan : on rattrape sans attendre le battement suivant.
    const onBack = () => {
      if (document.visibilityState === "visible") {
        lastAt.current = Date.now();
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onBack);
    window.addEventListener("focus", onBack);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onBack);
      window.removeEventListener("focus", onBack);
    };
  }, [refresh, ended, missing]);

  return { room, loading, missing, offline, refresh };
}
