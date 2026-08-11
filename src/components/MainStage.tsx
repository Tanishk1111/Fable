"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import Guitar from "./Guitar";
import CaseDock from "./CaseDock";
import JamRoom from "./listen/JamRoom";
import PagerOverlay from "./PagerOverlay";
import SetlistOverlay from "./SetlistOverlay";

function FilmGrain() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[2] opacity-[0.035] mix-blend-overlay"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "128px 128px",
      }}
    />
  );
}

export default function MainStage() {
  const { currentView } = useAppStore();
  const overlayOpen = currentView === "pager" || currentView === "setlist";

  return (
    <motion.div
      className="fixed inset-0 flex flex-col overflow-hidden bg-[#080706]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Ambient amp glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,42,42,0.07)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(0,0,0,0.85)_0%,transparent_60%)]" />
      <FilmGrain />

      <div
        className={`relative z-10 flex min-h-0 flex-1 flex-col transition-all duration-500 ${
          overlayOpen ? "scale-[1.015] blur-lg brightness-[0.3]" : ""
        }`}
      >
        {/* Header */}
        <header className="shrink-0 px-5 pt-[max(0.6rem,env(safe-area-inset-top))]">
          <div className="mx-auto flex max-w-[420px] items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-neutral-500">
                studio
              </p>
              <p className="font-lcd text-lg leading-none tracking-wider text-neutral-200">
                707
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-600">
                property of
              </p>
              <p className="font-handwritten text-lg leading-none text-neutral-400">
                blackstones
              </p>
            </div>
          </div>
          <div className="mx-auto mt-2 h-px max-w-[420px] bg-gradient-to-r from-transparent via-amp-red/30 to-transparent" />
        </header>

        {/* Case hero */}
        <div className="relative min-h-0 flex-1">
          <Guitar />

          {/* Hint — fades, not clutter */}
          <motion.p
            className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-[9px] uppercase tracking-[0.35em] text-neutral-600/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
          >
            drag across strings
          </motion.p>
        </div>

        <JamRoom />
        <CaseDock />
      </div>

      <AnimatePresence>
        {currentView === "pager" && <PagerOverlay />}
        {currentView === "setlist" && <SetlistOverlay />}
      </AnimatePresence>
    </motion.div>
  );
}
