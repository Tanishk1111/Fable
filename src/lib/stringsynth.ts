"use client";

let audioCtx: AudioContext | null = null;
let distortion: WaveShaperNode | null = null;
let masterGain: GainNode | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AC();

    // Mild amp crunch
    distortion = audioCtx.createWaveShaper();
    distortion.curve = makeDistortionCurve(22);
    distortion.oversample = "2x";

    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.80;

    distortion.connect(masterGain);
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

export function unlockWebAudio() {
  const ctx = getCtx();
  if (ctx?.state === "suspended") ctx.resume();
}

function makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 512;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

/** Standard tuning: E2 A2 D3 G3 B3 E4 */
const STRING_FREQS = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];
/** Bass strings sustain longer */
const STRING_DECAY = [0.9990, 0.9987, 0.9984, 0.9981, 0.9977, 0.9973];
/** Bass strings are louder acoustically */
const STRING_VOL   = [1.00,   0.96,   0.91,   0.86,   0.82,   0.78];

/**
 * Karplus-Strong plucked string synthesis.
 * Generates a buffer that sounds like a plucked electric guitar string.
 */
function synthesizeKS(
  ctx: AudioContext,
  freq: number,
  decay: number,
  intensity: number,
  brightness: number   // 0 = dark (near nut), 1 = bright (near bridge)
): AudioBuffer {
  const sr = ctx.sampleRate;
  const N = Math.round(sr / freq);          // wavetable length = period
  const duration = 1.8 + (1 - freq / 330) * 1.8; // bass strings ring longer
  const total = Math.floor(sr * duration);

  // Noise excitation scaled by intensity
  const buf = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    buf[i] = (Math.random() * 2 - 1) * intensity;
  }

  // alpha controls brightness: higher = less averaging = brighter
  const alpha = 0.47 + brightness * 0.10;

  const output = new Float32Array(total);
  const table = buf.slice();

  for (let i = 0; i < total; i++) {
    const pos  = i % N;
    const next = (i + 1) % N;
    output[i]  = table[pos];
    table[pos] = decay * (alpha * table[pos] + (1 - alpha) * table[next]);
  }

  const ab = ctx.createBuffer(1, total, sr);
  ab.getChannelData(0).set(output);
  return ab;
}

export function playString(
  stringIndex: number,       // 0 = low E, 5 = high e
  intensity: number,         // 0–1 swipe speed
  positionAlongNeck: number  // 0 = bridge, 1 = nut
) {
  const ctx = getCtx();
  if (!ctx || !distortion || !masterGain) return;
  if (ctx.state === "suspended") ctx.resume();

  const idx     = Math.max(0, Math.min(5, Math.round(stringIndex)));
  const freq    = STRING_FREQS[idx];
  const decay   = STRING_DECAY[idx];
  const bright  = 1 - positionAlongNeck;
  const vol     = STRING_VOL[idx] * (0.28 + intensity * 0.72);

  const buffer = synthesizeKS(ctx, freq, decay, intensity, bright);

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // Pickup EQ — remove sub-bass rumble, slight high-mid presence
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = freq * 0.55;

  const presence = ctx.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = 2800;
  presence.gain.value = 2.5;
  presence.Q.value = 0.9;

  const gain = ctx.createGain();
  gain.gain.value = vol;

  source.connect(hp);
  hp.connect(presence);
  presence.connect(gain);
  gain.connect(distortion);

  source.start(ctx.currentTime);
  source.stop(ctx.currentTime + 3.0);
}
