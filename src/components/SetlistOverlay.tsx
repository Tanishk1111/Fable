"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { playTapeWrite } from "@/lib/howler";
import { getEmbedForUrl } from "@/lib/embed";

interface SetlistEntry {
  id: string;
  url: string;
  created_at: string;
}

export default function SetlistOverlay() {
  const { setView } = useAppStore();
  const [url, setUrl] = useState("");
  const [entries, setEntries] = useState<SetlistEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [localEntries, setLocalEntries] = useState<string[]>([]);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);

  const close = () => setView("main");

  useEffect(() => {
    fetch("/api/setlist")
      .then((r) => r.json())
      .then((data) => setEntries(data.entries ?? []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    playTapeWrite();

    try {
      const res = await fetch("/api/setlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (data.ok) {
        setLocalEntries((prev) => [trimmed, ...prev]);
        if (data.entry) setEntries((prev) => [data.entry, ...prev]);
        setUrl("");
        // Auto-play if we can embed it
        if (getEmbedForUrl(trimmed)) setNowPlaying(trimmed);
      }
    } catch {
      setLocalEntries((prev) => [trimmed, ...prev]);
      setUrl("");
      if (getEmbedForUrl(trimmed)) setNowPlaying(trimmed);
    } finally {
      setSubmitting(false);
    }
  };

  const allUrls = [
    ...localEntries,
    ...entries.map((e) => e.url).filter((u) => !localEntries.includes(u)),
  ];

  const embed = nowPlaying ? getEmbedForUrl(nowPlaying) : null;

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
        initial={{ scale: 0.7, opacity: 0, rotate: -3 }}
        animate={{ scale: 1, opacity: 1, rotate: -2 }}
        exit={{ scale: 0.7, opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 260 }}
      >
        <div
          className="pointer-events-auto w-full max-w-[320px] max-h-[90dvh] overflow-y-auto rounded-sm bg-[#f5f0e1] p-5 shadow-2xl shadow-black"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundImage:
              "repeating-linear-gradient(transparent, transparent 27px, #e8e0cc 28px)",
          }}
        >
          <div className="mb-4 flex items-center justify-between border-b border-neutral-400/30 pb-2">
            <h2 className="font-handwritten text-2xl text-neutral-800 -rotate-1">
              tonight&apos;s set
            </h2>
            <button
              onClick={close}
              className="text-neutral-500 touch-manipulation active:text-neutral-800"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Player — YouTube or Spotify embed */}
          <AnimatePresence>
            {embed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden rounded border border-neutral-400/40 bg-black/5"
              >
                {embed.type === "youtube" ? (
                  <iframe
                    title="Now playing"
                    src={`https://www.youtube.com/embed/${embed.id}?autoplay=1&rel=0`}
                    className="aspect-video w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <iframe
                    title="Now playing"
                    src={embed.src}
                    className="h-[152px] w-full"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                )}
                <p className="px-2 py-1 font-handwritten text-xs text-neutral-600">
                  now playing ♪
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="mb-4">
            <input
              type="url"
              inputMode="url"
              placeholder="paste youtube or spotify..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mb-3 w-full border-b-2 border-neutral-400/50 bg-transparent px-1 py-2 font-handwritten text-lg text-neutral-800 placeholder:text-neutral-400 focus:border-neutral-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!url.trim() || submitting}
              className="w-full rounded border-2 border-neutral-800 bg-transparent py-2.5 font-handwritten text-xl text-neutral-800 touch-manipulation active:bg-neutral-800/10 disabled:opacity-40"
            >
              tape it ✎
            </button>
          </form>

          <ul className="max-h-32 space-y-2 overflow-y-auto">
            {allUrls.length === 0 && (
              <li className="font-handwritten text-lg text-neutral-500">
                nothing taped yet...
              </li>
            )}
            {allUrls.map((link, i) => {
              const playable = !!getEmbedForUrl(link);
              return (
                <li key={`${link}-${i}`}>
                  <button
                    type="button"
                    onClick={() => playable && setNowPlaying(link)}
                    className={`w-full truncate text-left font-handwritten text-base touch-manipulation ${
                      nowPlaying === link
                        ? "text-neutral-900 underline decoration-neutral-400"
                        : playable
                          ? "text-neutral-700 active:text-neutral-900"
                          : "text-neutral-600"
                    }`}
                  >
                    {playable ? "▶ " : "• "}
                    {link.replace(/^https?:\/\//, "")}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </motion.div>
    </>
  );
}
