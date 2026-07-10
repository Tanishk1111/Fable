"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { playString, unlockWebAudio } from "@/lib/stringsynth";
import { playButtonClick } from "@/lib/howler";

// All positions as 0–1 fractions of the ACTUAL rendered image, computed at runtime
const STRUM_ZONE = { top: 0.12, left: 0.38, width: 0.22, height: 0.62 };
const STRING_FX = [0.41, 0.43, 0.45, 0.47, 0.49, 0.51]; // x-fraction per string

const STICKERS = [
  {
    // Arrow: upper-left body, below the cutaway — solid body beneath
    id: "nana",
    src: "/images/stickers/nana.jpg",
    alt: "NANA",
    vibe: "nana",
    top: 0.54, left: 0.31, width: 0.10, rotate: -9,
    activeGlow: "drop-shadow-[0_0_10px_#ff2a2a]",
  },
  {
    // Arrow: right-center body, upper area (rabbit moved UP from bridge area)
    id: "newjeans",
    src: "/images/stickers/newjeans.jpg",
    alt: "NewJeans",
    vibe: "newjeans",
    top: 0.59, left: 0.54, width: 0.07, rotate: 8,
    activeGlow: "drop-shadow-[0_0_10px_#6b9fff]",
  },
  {
    // Arrow: lower body, center — horse moved DOWN below bridge
    id: "deftones",
    src: "/images/stickers/deftones.jpg",
    alt: "Deftones",
    vibe: "deftones",
    top: 0.81, left: 0.43, width: 0.09, rotate: -5,
    activeGlow: "drop-shadow-[0_0_10px_#ffffff88]",
  },
] as const;

interface ImgBounds { top: number; left: number; w: number; h: number }

async function notify(action: string) {
  try {
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  } catch { /* silent */ }
}

export default function Guitar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [bounds, setBounds] = useState<ImgBounds | null>(null);
  const [activeSticker, setActiveSticker] = useState<string | null>(null);
  const [vibratingString, setVibratingString] = useState<number | null>(null);
  // Per-string cooldowns so sweeping across triggers each string once
  const stringCooldowns = useRef<boolean[]>([false, false, false, false, false, false]);
  const prevString = useRef(-1);
  const strumming = useRef(false);
  const lastNotify = useRef(0);
  const lastPoint = useRef<{ x: number; y: number; t: number } | null>(null);

  const computeBounds = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container || !img.naturalWidth) return;
    const cr = container.getBoundingClientRect();
    const nRatio = img.naturalWidth / img.naturalHeight;
    const cRatio = cr.width / cr.height;
    let rw: number, rh: number;
    if (nRatio > cRatio) { rw = cr.width; rh = cr.width / nRatio; }
    else { rh = cr.height; rw = cr.height * nRatio; }
    setBounds({
      top: (cr.height - rh) / 2,
      left: (cr.width - rw) / 2,
      w: rw,
      h: rh,
    });
  }, []);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth) { computeBounds(); return; }
    img.addEventListener("load", computeBounds);
    return () => img.removeEventListener("load", computeBounds);
  }, [computeBounds]);

  useEffect(() => {
    window.addEventListener("resize", computeBounds);
    return () => window.removeEventListener("resize", computeBounds);
  }, [computeBounds]);

  const handleStrum = useCallback((clientX: number, clientY: number) => {
    if (!bounds) return;

    const zoneLeft   = bounds.left + STRUM_ZONE.left * bounds.w;
    const zoneWidth  = STRUM_ZONE.width * bounds.w;
    const zoneTop    = bounds.top + STRUM_ZONE.top * bounds.h;
    const zoneHeight = STRUM_ZONE.height * bounds.h;

    const xRatio = Math.max(0, Math.min(1, (clientX - zoneLeft) / zoneWidth));
    const yRatio = Math.max(0, Math.min(1, (clientY - zoneTop) / zoneHeight));
    const stringIndex = Math.min(5, Math.floor(xRatio * 6));

    // Only fire when crossing into a new string
    if (stringIndex === prevString.current) return;
    prevString.current = stringIndex;

    // Skip if this specific string is still ringing from last hit
    if (stringCooldowns.current[stringIndex]) return;

    // Speed → intensity
    let intensity = 0.55;
    const now = performance.now();
    if (lastPoint.current) {
      const dt = now - lastPoint.current.t;
      if (dt > 0 && dt < 150) {
        const speed = Math.hypot(clientX - lastPoint.current.x, clientY - lastPoint.current.y) / dt;
        intensity = Math.min(1, speed / 2.2);
      }
    }
    lastPoint.current = { x: clientX, y: clientY, t: now };

    // Per-string cooldown — bass strings ring longer so throttle less aggressively
    stringCooldowns.current[stringIndex] = true;
    const cooldownMs = 60 + (1 - intensity) * 60 + (5 - stringIndex) * 8;
    setTimeout(() => { stringCooldowns.current[stringIndex] = false; }, cooldownMs);

    unlockWebAudio();
    playString(stringIndex, intensity, 1 - yRatio);

    if (now - lastNotify.current > 4000) {
      lastNotify.current = now;
      notify("strum");
    }

    setVibratingString(stringIndex);
    setTimeout(() => setVibratingString(null), 220);
  }, [bounds]);

  const handleSticker = (id: string, vibe: string) => {
    playButtonClick();
    setActiveSticker(id);
    notify(vibe);
    setTimeout(() => setActiveSticker(null), 500);
  };

  const toAbs = (frac: number, base: number, offset: number) => offset + frac * base;

  return (
    <div ref={containerRef} className="relative h-full w-full select-none overflow-hidden">
      {/* Blurred BG fill — kills letterbox voids */}
      <div
        className="absolute inset-0 scale-110 blur-sm opacity-50"
        style={{
          backgroundImage: "url(/images/guitar-case.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-black/55" />

      {/* The guitar image — object-contain, measured for sticker positioning */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src="/images/guitar-case.png"
        alt="Guitar in case"
        onLoad={computeBounds}
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain object-center pointer-events-none select-none"
        style={{ zIndex: 1 }}
      />

      {bounds && (
        <div className="absolute inset-0" style={{ zIndex: 2 }}>
          {/* String vibration lines */}
          {STRING_FX.map((xf, i) => {
            const x = toAbs(xf, bounds.w, bounds.left);
            const top = toAbs(STRUM_ZONE.top, bounds.h, bounds.top);
            const height = STRUM_ZONE.height * bounds.h;
            return (
              <motion.div
                key={i}
                className="pointer-events-none absolute w-px"
                style={{
                  left: x,
                  top,
                  height,
                  background:
                    "linear-gradient(to bottom, transparent 0%, rgba(200,185,150,0.12) 10%, rgba(210,195,160,0.20) 50%, rgba(180,165,130,0.12) 90%, transparent 100%)",
                }}
                animate={
                  vibratingString === i
                    ? { x: [0, i % 2 ? 2 : -2, i % 2 ? -1 : 1, 0], opacity: [0.12, 0.55, 0.28, 0.12] }
                    : { opacity: 0.10 }
                }
                transition={{ duration: 0.20, ease: "easeOut" }}
              />
            );
          })}

          {/* Strum zone — invisible, full string length */}
          <div
            className="absolute touch-manipulation cursor-pointer"
            style={{
              top: toAbs(STRUM_ZONE.top, bounds.h, bounds.top),
              left: toAbs(STRUM_ZONE.left, bounds.w, bounds.left),
              width: STRUM_ZONE.width * bounds.w,
              height: STRUM_ZONE.height * bounds.h,
            }}
            onPointerDown={(e) => {
              strumming.current = true;
              lastPoint.current = null;
              prevString.current = -1;
              handleStrum(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (!strumming.current) return;
              if (e.pointerType === "mouse" && e.buttons !== 1) return;
              handleStrum(e.clientX, e.clientY);
            }}
            onPointerUp={() => { strumming.current = false; lastPoint.current = null; }}
            onPointerLeave={() => { strumming.current = false; lastPoint.current = null; }}
            aria-label="Strum the guitar strings"
          />

          {/* Stickers — % of rendered image bounds */}
          {STICKERS.map((s) => (
            <motion.button
              key={s.id}
              type="button"
              className={`absolute touch-manipulation border-0 bg-transparent p-0 transition-[filter] duration-150 ${
                activeSticker === s.id ? s.activeGlow : ""
              }`}
              style={{
                top: toAbs(s.top, bounds.h, bounds.top),
                left: toAbs(s.left, bounds.w, bounds.left),
                width: s.width * bounds.w,
                transform: `rotate(${s.rotate}deg)`,
              }}
              whileTap={{ scale: 0.88 }}
              onClick={() => handleSticker(s.id, s.vibe)}
              aria-label={s.alt}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.src}
                alt={s.alt}
                draggable={false}
                className="h-auto w-full pointer-events-none block rounded-[1px]"
                style={{
                  filter: "saturate(0.88) contrast(1.06) brightness(0.93)",
                  opacity: 0.92,
                }}
              />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
