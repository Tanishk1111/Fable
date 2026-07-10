"use client";

import { motion } from "framer-motion";
import { playButtonClick } from "@/lib/howler";
import { useAppStore } from "@/store/useAppStore";

export default function CaseDock() {
  const { setView } = useAppStore();

  return (
    <div className="shrink-0 border-t border-white/[0.06] bg-gradient-to-t from-black via-[#0c0a09] to-[#121010]/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-[420px] items-stretch gap-3">
        <motion.button
          type="button"
          className="group flex flex-1 items-center gap-3 rounded-xl border border-[#f5f0e1]/10 bg-[#f5f0e1]/[0.04] px-4 py-3 text-left touch-manipulation"
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            playButtonClick();
            setView("setlist");
          }}
        >
          <div className="relative h-10 w-8 shrink-0 -rotate-6">
            <div className="absolute inset-0 rounded-[2px] bg-[#ebe4d4] shadow-md shadow-black/50" />
            <div className="absolute inset-[2px] border border-dashed border-neutral-400/30" />
            <span className="absolute inset-0 flex items-center justify-center font-handwritten text-[9px] text-neutral-600 rotate-3">
              set
            </span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              setlist
            </p>
            <p className="font-handwritten text-base leading-tight text-neutral-300">
              drop a link
            </p>
          </div>
        </motion.button>

        <motion.button
          type="button"
          className="group flex flex-1 items-center gap-3 rounded-xl border border-pager-green/15 bg-pager-green/[0.03] px-4 py-3 text-left touch-manipulation"
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            playButtonClick();
            setView("pager");
          }}
        >
          <div className="relative h-10 w-7 shrink-0 rounded-md border border-neutral-600 bg-neutral-900 shadow-lg shadow-black/60">
            <div className="mx-1 mt-1.5 h-2.5 rounded-[1px] border border-pager-green/30 bg-pager-screen">
              <span className="block font-lcd text-[7px] leading-none text-pager-green/90 px-0.5 pt-[2px]">
                ___
              </span>
            </div>
            <div className="mt-1 grid grid-cols-3 gap-px px-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[3px] rounded-[1px] bg-neutral-700" />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              pager
            </p>
            <p className="font-lcd text-sm leading-tight text-pager-green/80">
              dial in
            </p>
          </div>
        </motion.button>
      </div>
    </div>
  );
}
