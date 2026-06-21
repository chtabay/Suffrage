"use client";

import { useScrutin } from "@/lib/voting/useScrutin";
import CreateScreen from "./CreateScreen";
import GalleryScreen from "./GalleryScreen";
import HomeScreen from "./HomeScreen";
import LaunchedScreen from "./LaunchedScreen";
import MesScrutinsScreen from "./MesScrutinsScreen";
import Nav from "./Nav";

export default function ScrutinApp() {
  const ctrl = useScrutin();
  const { screen } = ctrl.state;
  return (
    <div style={{ minHeight: "100vh" }}>
      <Nav ctrl={ctrl} />
      {screen === "home" && <HomeScreen ctrl={ctrl} />}
      {screen === "gallery" && <GalleryScreen ctrl={ctrl} />}
      {screen === "create" && <CreateScreen ctrl={ctrl} />}
      {screen === "launched" && <LaunchedScreen ctrl={ctrl} />}
      {screen === "mine" && <MesScrutinsScreen ctrl={ctrl} />}
    </div>
  );
}
