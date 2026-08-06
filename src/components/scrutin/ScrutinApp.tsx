"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { markWelcomeShown, shouldShowWelcome, touchLastOpen } from "@/lib/pwa/onboarding";
import { useInstall } from "@/lib/pwa/install";
import WelcomeSheet from "@/components/pwa/WelcomeSheet";
import type { ScrutinDraft } from "@/lib/voting/draft";
import { useScrutin } from "@/lib/voting/useScrutin";
import CreateScreen from "./CreateScreen";
import GalleryScreen from "./GalleryScreen";
import HomeScreen from "./HomeScreen";
import LaunchedScreen from "./LaunchedScreen";
import MesScrutinsScreen from "./MesScrutinsScreen";
import Nav from "./Nav";

export default function ScrutinApp({ draft }: { draft?: ScrutinDraft }) {
  const ctrl = useScrutin(draft);
  const auth = useAuth();
  const { screen } = ctrl.state;
  const { standalone } = useInstall();
  const [welcome, setWelcome] = useState(false);

  // Repères d'usage : app INSTALLÉE, écran d'accueil, et pas de brouillon en
  // cours (arriver avec un lien /new prérempli, c'est déjà savoir quoi faire).
  useEffect(() => {
    if (!standalone) return;
    if (draft && Object.keys(draft).length > 0) return;
    // L'ordre compte : décider AVANT d'horodater cette ouverture, sinon la
    // longue absence serait effacée par l'ouverture qui vient de la révéler.
    const show = screen === "home" && shouldShowWelcome();
    if (show) markWelcomeShown();
    else touchLastOpen();
    setWelcome(show);
    // Une seule évaluation par montage : les repères ne doivent pas resurgir
    // en revenant sur l'accueil au cours de la même session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standalone]);

  // Le rattachement des scrutins de cet appareil au compte a déménagé dans
  // `useAuth` : ici, il ne s'exécutait que sur `/` et `/new`, donc jamais pour
  // qui se connectait par lien magique — alors que « Mes scrutins » promet que
  // « vos scrutins vous suivent partout ».

  return (
    <div style={{ minHeight: "100vh" }}>
      <Nav />
      {screen === "home" && <HomeScreen ctrl={ctrl} />}
      {screen === "gallery" && <GalleryScreen ctrl={ctrl} />}
      {screen === "create" && <CreateScreen ctrl={ctrl} />}
      {screen === "launched" && <LaunchedScreen ctrl={ctrl} auth={auth} />}
      {screen === "mine" && <MesScrutinsScreen ctrl={ctrl} auth={auth} />}
      {welcome && (
        <WelcomeSheet
          onClose={() => setWelcome(false)}
          onCreate={() => {
            setWelcome(false);
            ctrl.go("create");
          }}
        />
      )}
    </div>
  );
}
