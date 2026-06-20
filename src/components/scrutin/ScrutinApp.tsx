"use client";

import { useScrutin } from "@/lib/voting/useScrutin";
import CreateScreen from "./CreateScreen";
import GalleryScreen from "./GalleryScreen";
import HomeScreen from "./HomeScreen";
import Nav from "./Nav";
import ResultsScreen from "./ResultsScreen";
import VoteScreen from "./VoteScreen";

export default function ScrutinApp() {
  const ctrl = useScrutin();
  const { screen } = ctrl.state;
  return (
    <div style={{ minHeight: "100vh" }}>
      <Nav ctrl={ctrl} />
      {screen === "home" && <HomeScreen ctrl={ctrl} />}
      {screen === "gallery" && <GalleryScreen ctrl={ctrl} />}
      {screen === "create" && <CreateScreen ctrl={ctrl} />}
      {screen === "vote" && <VoteScreen ctrl={ctrl} />}
      {screen === "results" && <ResultsScreen ctrl={ctrl} />}
    </div>
  );
}
