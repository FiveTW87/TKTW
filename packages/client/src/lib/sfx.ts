import { useSfxStore } from "../store/sfxStore";

// No sound files exist in this project — every effect below is synthesized
// with the Web Audio API instead of sourcing/licensing audio assets.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null; // jsdom (tests) and unsupported browsers both no-op here
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function playTone(freq: number, durationMs: number, type: OscillatorType, gainPeak: number, delayMs = 0): void {
  const audioCtx = getCtx();
  if (!audioCtx) return;
  const startAt = audioCtx.currentTime + delayMs / 1000;
  const endAt = startAt + durationMs / 1000;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(gainPeak, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, endAt);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(startAt);
  osc.stop(endAt + 0.02);
}

interface Note {
  freq: number;
  durationMs: number;
  delayMs: number;
  type?: OscillatorType;
  gainPeak?: number;
}

function playSequence(notes: Note[]): void {
  for (const n of notes) playTone(n.freq, n.durationMs, n.type ?? "sine", n.gainPeak ?? 0.2, n.delayMs);
}

const SFX: Record<string, (volume: number) => void> = {
  cardPlay: (v) => playTone(520, 90, "square", 0.15 * v),
  skillUse: (v) => playSequence([
    { freq: 660, durationMs: 90, delayMs: 0, type: "triangle", gainPeak: 0.18 * v },
    { freq: 880, durationMs: 110, delayMs: 70, type: "triangle", gainPeak: 0.18 * v },
  ]),
  draw: (v) => playTone(900, 55, "sine", 0.12 * v),
  damage: (v) => playTone(130, 160, "sawtooth", 0.22 * v),
  dodge: (v) => playSequence([
    { freq: 1000, durationMs: 60, delayMs: 0, type: "sine", gainPeak: 0.14 * v },
    { freq: 700, durationMs: 70, delayMs: 40, type: "sine", gainPeak: 0.1 * v },
  ]),
  turnStart: (v) => playSequence([
    { freq: 523, durationMs: 110, delayMs: 0, type: "sine", gainPeak: 0.18 * v },
    { freq: 784, durationMs: 160, delayMs: 90, type: "sine", gainPeak: 0.18 * v },
  ]),
  win: (v) => playSequence([
    { freq: 523, durationMs: 130, delayMs: 0, type: "triangle", gainPeak: 0.22 * v },
    { freq: 659, durationMs: 130, delayMs: 110, type: "triangle", gainPeak: 0.22 * v },
    { freq: 784, durationMs: 220, delayMs: 220, type: "triangle", gainPeak: 0.24 * v },
  ]),
  lose: (v) => playSequence([
    { freq: 440, durationMs: 150, delayMs: 0, type: "sawtooth", gainPeak: 0.2 * v },
    { freq: 349, durationMs: 150, delayMs: 130, type: "sawtooth", gainPeak: 0.2 * v },
    { freq: 262, durationMs: 260, delayMs: 260, type: "sawtooth", gainPeak: 0.2 * v },
  ]),
};

export type SfxName = keyof typeof SFX;

export function playSfx(name: SfxName): void {
  const { muted, volume } = useSfxStore.getState();
  if (muted || volume <= 0) return;
  SFX[name]?.(volume);
}
