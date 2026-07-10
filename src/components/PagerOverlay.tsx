"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { playPagerBeep, playPagerRing } from "@/lib/howler";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

const SECRET_MESSAGE =
  process.env.NEXT_PUBLIC_PAGER_MESSAGE ??
  "you found the back door.\nno pressure. just say what's on your mind.";

export default function PagerOverlay() {
  const { setView } = useAppStore();
  const [phase, setPhase] = useState<"dial" | "connected">("dial");
  const [inputCode, setInputCode] = useState("");
  const [secretNote, setSecretNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const close = () => setView("main");

  const appendDigit = (digit: string) => {
    if (phase === "connected" || inputCode.length >= 6 || !/^[0-9]$/.test(digit)) return;
    playPagerBeep();
    setInputCode((prev) => prev + digit);
  };

  const clear = () => {
    playPagerBeep();
    setInputCode("");
    if (phase === "dial") setPhase("dial");
  };

  const send = async () => {
    playPagerBeep();
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pager", code: inputCode }),
      });
      if (res.ok) {
        playPagerRing();
        setTimeout(() => setPhase("connected"), 600);
      } else {
        setInputCode("");
      }
    } catch {
      setInputCode("");
    }
  };

  const transmit = async () => {
    const note = secretNote.trim();
    if (!note || sending) return;
    setSending(true);
    playPagerBeep();
    try {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pager-message", message: note }),
      });
      setSent(true);
      setSecretNote("");
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
      />

      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.6, opacity: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
      >
        <div
          className="pointer-events-auto w-full max-w-[300px] rounded-2xl border-2 border-neutral-600 bg-neutral-900 p-4 shadow-2xl shadow-black"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-neutral-500">
              {phase === "dial" ? "pager" : "direct line"}
            </span>
            <button
              onClick={close}
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 touch-manipulation active:bg-neutral-800"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <AnimatePresence mode="wait">
            {phase === "dial" ? (
              <motion.div
                key="dial"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="mb-4 rounded-md border border-pager-green/40 bg-pager-screen px-3 py-3 font-lcd text-xl tracking-widest text-pager-green">
                  {inputCode.padEnd(3, "_") || "___"}
                </div>

                <div className="mb-3 grid grid-cols-3 gap-2">
                  {KEYS.map((key) => (
                    <button
                      key={key}
                      onClick={() => appendDigit(key)}
                      disabled={key === "*" || key === "#"}
                      className="flex h-12 items-center justify-center rounded-lg bg-neutral-800 font-lcd text-lg text-neutral-200 touch-manipulation active:bg-neutral-700 disabled:opacity-30"
                    >
                      {key}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={clear}
                    className="h-11 rounded-lg bg-neutral-700 text-xs uppercase tracking-wider text-neutral-300 touch-manipulation active:bg-neutral-600"
                  >
                    clear
                  </button>
                  <button
                    onClick={send}
                    className="h-11 rounded-lg bg-pager-green/20 text-xs uppercase tracking-wider text-pager-green touch-manipulation active:bg-pager-green/30"
                  >
                    send
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="connected"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                {/* Connected pulse */}
                <motion.div
                  className="mb-4 rounded-md border border-pager-green bg-pager-green/10 px-3 py-2 text-center"
                  animate={{ boxShadow: ["0 0 0px #7cfc0000", "0 0 20px #7cfc0044", "0 0 0px #7cfc0000"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <p className="font-lcd text-lg tracking-widest text-pager-green">
                    CONNECTED_
                  </p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.3em] text-pager-green/60">
                    line secure
                  </p>
                </motion.div>

                {/* Your secret note to her */}
                <div className="mb-4 rounded-lg border border-neutral-700 bg-neutral-950/80 p-3">
                  <p className="mb-1 text-[9px] uppercase tracking-widest text-neutral-500">
                    incoming transmission
                  </p>
                  <p className="whitespace-pre-line font-handwritten text-lg leading-snug text-neutral-300">
                    {SECRET_MESSAGE}
                  </p>
                </div>

                {/* She replies */}
                {!sent ? (
                  <>
                    <textarea
                      value={secretNote}
                      onChange={(e) => setSecretNote(e.target.value)}
                      placeholder="type something..."
                      maxLength={280}
                      rows={3}
                      className="mb-3 w-full resize-none rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 font-handwritten text-lg text-neutral-200 placeholder:text-neutral-600 focus:border-pager-green/40 focus:outline-none"
                    />
                    <button
                      onClick={transmit}
                      disabled={!secretNote.trim() || sending}
                      className="w-full rounded-lg bg-pager-green/20 py-3 font-lcd text-sm uppercase tracking-wider text-pager-green touch-manipulation active:bg-pager-green/30 disabled:opacity-40"
                    >
                      {sending ? "sending..." : "transmit →"}
                    </button>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-pager-green/30 bg-pager-green/5 py-4 text-center"
                  >
                    <p className="font-lcd text-sm tracking-wider text-pager-green">
                      MESSAGE SENT_
                    </p>
                    <p className="mt-1 font-handwritten text-base text-neutral-400">
                      he got it ♡
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
