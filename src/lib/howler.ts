import type { Howl } from "howler";

type HowlConstructor = typeof Howl;

let HowlClass: HowlConstructor | null = null;
let initialized = false;

const sounds: Record<string, Howl> = {};

function getHowlClass(): HowlConstructor | null {
  if (typeof window === "undefined") return null;
  if (!HowlClass) {
    HowlClass = require("howler").Howl as HowlConstructor;
  }
  return HowlClass;
}

function getSound(
  key: string,
  src: string,
  options?: Partial<{ volume: number; loop: boolean }>
): Howl | null {
  const Howl = getHowlClass();
  if (!Howl) return null;

  if (!sounds[key]) {
    sounds[key] = new Howl({
      src: [src],
      volume: options?.volume ?? 1,
      loop: options?.loop ?? false,
      html5: true,
    });
  }
  return sounds[key];
}

export function initAudio() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  getSound("amp-hum", "/audio/amp-hum.mp3", { volume: 0.6, loop: true });
  getSound("strum", "/audio/strum.mp3", { volume: 0.85 });
  getSound("button-click", "/audio/button-click.mp3", { volume: 0.5 });
  getSound("pager-beep", "/audio/pager-beep.mp3", { volume: 0.6 });
  getSound("pager-ring", "/audio/pager-ring.mp3", { volume: 0.8 });
  getSound("tape-write", "/audio/tape-write.mp3", { volume: 0.7 });
}

export function playAmpHum() {
  initAudio();
  const hum = getSound("amp-hum", "/audio/amp-hum.mp3", { volume: 0.55, loop: false });
  if (!hum) return;
  const id = hum.play();
  if (id === undefined) return;
  // Fade hum out after 2.5s so it doesn't loop or drone on
  setTimeout(() => {
    hum.fade(0.55, 0, 1200, id);
  }, 2500);
}

export function stopAmpHum() {
  sounds["amp-hum"]?.stop();
}

export function playButtonClick() {
  initAudio();
  getSound("button-click", "/audio/button-click.mp3")?.play();
}

export function playPagerBeep() {
  initAudio();
  getSound("pager-beep", "/audio/pager-beep.mp3")?.play();
}

export function playPagerRing() {
  initAudio();
  getSound("pager-ring", "/audio/pager-ring.mp3")?.play();
}

export function playTapeWrite() {
  initAudio();
  const sound = getSound("tape-write", "/audio/tape-write.mp3");
  if (!sound) return;
  const id = sound.play();
  if (id === undefined) return;
  // Stop long scribble files early — just a quick tape effect
  setTimeout(() => sound.stop(id), 1400);
}
