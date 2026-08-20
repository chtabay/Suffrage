"use client";

// LE BATTEMENT DES ÉCHECS — un sondage à lui, et pas celui du socle.
//
// ⚠️ `useGameRoom` EST INUTILISABLE ICI, ET C'EST MESURÉ. Il s'appuie sur
// `get_game_room`, qui rend UNE ENTRÉE PAR JOUEUR : à 4 000 participants qui
// sondent toutes les deux secondes, cela fait 552 Ko par réponse et 1,1 Go/s de
// sortie — et le socle casse déjà quelque part entre 40 et 400. `echecs_state`
// ne rend que des nombres : ~519 octets, la même réponse à neuf joueurs qu'à
// soixante-neuf. Ce fichier existe pour cette seule raison.
//
// Le reste des précautions est repris de `useGameRoom`, parce qu'elles ont été
// payées sur de vraies parties : on RALENTIT quand l'onglet est caché mais on ne
// s'arrête jamais (`visibilityState` vaut aussi `hidden` là où l'utilisateur
// voit la page — vue encapsulée, application installée réveillée : la partie a
// l'air GELÉE), et une réponse en retard ne peut pas écraser une plus récente.
import { useCallback, useEffect, useRef, useState } from "react";
import { doitClore, type EchecsState } from "./regles";
import { close as clore, state as lireEtat } from "./verbes";

const TICK_ACTIF = 2000;
const TICK_FINI = 5000;
const TICK_CACHE = 15000;

export interface EchecsHandle {
  etat: EchecsState | null;
  loading: boolean;
  missing: boolean;
  offline: boolean;
  refresh: () => Promise<void>;
}

export function useEchecs(code: string, token: string | null): EchecsHandle {
  const [etat, setEtat] = useState<EchecsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [offline, setOffline] = useState(false);
  const gen = useRef(0);
  // ⚠️ La soupape ne doit déclencher QU'UNE tentative par manche et par écran.
  // Sans ce garde, un client qui n'obtient pas tout de suite le nouveau tour
  // rappelle l'arbitre à chaque battement — six cents clients, deux fois par
  // seconde, sur une route serverless.
  const clos = useRef<number>(-1);

  const tirer = useCallback(async () => {
    const mien = ++gen.current;
    try {
      const s = await lireEtat(code, token);
      if (mien !== gen.current) return;
      setOffline(false);
      if (!s || s.status !== "ok") {
        setMissing(true);
        return;
      }
      setMissing(false);
      setEtat(s);

      // LA SOUPAPE. Il n'y a aucun ordonnanceur derrière ce jeu : les crons
      // Vercel en Hobby sont à la journée, à ±59 min près. C'est donc le
      // premier client qui CONSTATE l'échéance qui la déclenche — et
      // l'idempotence vit dans le `WHERE` des `UPDATE`, côté base.
      if (doitClore(s) && clos.current !== s.roundNo) {
        clos.current = s.roundNo;
        try {
          await clore(code, token);
          const apres = await lireEtat(code, token);
          if (mien === gen.current && apres?.status === "ok") setEtat(apres);
        } catch {
          /* l'arbitre réessaiera au prochain tour de soupape */
        }
      }
    } catch {
      if (mien === gen.current) setOffline(true);
    } finally {
      if (mien === gen.current) setLoading(false);
    }
  }, [code, token]);

  useEffect(() => {
    if (!code) return;
    let mort = false;
    let minuteur: ReturnType<typeof setTimeout> | null = null;

    const cadence = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return TICK_CACHE;
      return etat?.roomStatus === "ended" ? TICK_FINI : TICK_ACTIF;
    };
    const boucle = async () => {
      if (mort) return;
      await tirer();
      if (mort) return;
      minuteur = setTimeout(boucle, cadence());
    };
    void boucle();

    const reveil = () => {
      if (document.visibilityState !== "visible") return;
      if (minuteur) clearTimeout(minuteur);
      void boucle();
    };
    document.addEventListener("visibilitychange", reveil);
    return () => {
      mort = true;
      if (minuteur) clearTimeout(minuteur);
      document.removeEventListener("visibilitychange", reveil);
    };
    // `etat` n'entre pas dans les dépendances : il change à chaque battement et
    // relancerait la boucle sans fin. La cadence le lit au moment de l'utiliser.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, tirer]);

  return { etat, loading, missing, offline, refresh: tirer };
}
