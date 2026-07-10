"use client";

import { AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import IntroScreen from "@/components/IntroScreen";
import MainStage from "@/components/MainStage";

export default function AppShell() {
  const currentView = useAppStore((s) => s.currentView);

  return (
    <main className="h-[100dvh] w-full overflow-hidden bg-black">
      <AnimatePresence mode="wait">
        {currentView === "intro" ? (
          <IntroScreen key="intro" />
        ) : (
          <MainStage key="main" />
        )}
      </AnimatePresence>
    </main>
  );
}
