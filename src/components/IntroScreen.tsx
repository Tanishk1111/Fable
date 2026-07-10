"use client";

import { motion } from "framer-motion";
import { playAmpHum, initAudio } from "@/lib/howler";
import { useAppStore } from "@/store/useAppStore";

export default function IntroScreen() {
  const { unlockAudio, setView } = useAppStore();

  const handlePowerOn = () => {
    initAudio();
    unlockAudio();
    playAmpHum();
    setView("main");
  };

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center bg-black"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <p className="mb-16 text-xs uppercase tracking-[0.4em] text-neutral-600">
        standby
      </p>

      <button
        onClick={handlePowerOn}
        className="group flex flex-col items-center gap-4 touch-manipulation"
        aria-label="Power on"
      >
        <div className="relative h-20 w-20">
          <div className="absolute inset-0 rounded-full bg-amp-red/20 animate-pulse-glow" />
          <div className="absolute inset-2 rounded-full border-2 border-amp-red/60 bg-neutral-950 transition-all group-active:scale-95 group-active:bg-amp-red/30" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-amp-red shadow-[0_0_12px_#ff2a2a]" />
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-[0.3em] text-amp-red/80">
          power
        </span>
      </button>
    </motion.div>
  );
}
