"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { getLocalPolls } from "@/lib/db/localPolls";
import { claimPolls } from "@/lib/db/polls";
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
  const userId = auth.user?.id;

  // À la connexion, rattache les scrutins anonymes de cet appareil au compte.
  useEffect(() => {
    if (!userId) return;
    const locals = getLocalPolls();
    if (locals.length) {
      claimPolls(locals.map((p) => ({ token: p.token, secret: p.secret }))).catch(() => {});
    }
  }, [userId]);

  return (
    <div style={{ minHeight: "100vh" }}>
      <Nav ctrl={ctrl} auth={auth} />
      {screen === "home" && <HomeScreen ctrl={ctrl} />}
      {screen === "gallery" && <GalleryScreen ctrl={ctrl} />}
      {screen === "create" && <CreateScreen ctrl={ctrl} />}
      {screen === "launched" && <LaunchedScreen ctrl={ctrl} auth={auth} />}
      {screen === "mine" && <MesScrutinsScreen ctrl={ctrl} auth={auth} />}
    </div>
  );
}
