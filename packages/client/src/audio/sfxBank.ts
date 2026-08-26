export const SFX_NAMES = [
  "cardDraw", "cardPlay", "cardDiscard", "equip", "skillUse", "attack",
  "damage", "dodge", "heal", "death", "turnStart", "judgment", "wuxie",
  "lightning", "win", "lose",
] as const;

export type SfxName = (typeof SFX_NAMES)[number];

interface LayerBase { delayMs: number; durationMs: number; gain: number; attackMs?: number; releaseMs?: number }
export interface ToneLayer extends LayerBase { kind: "tone"; frequency: number; endFrequency?: number; waveform: OscillatorType }
export interface NoiseLayer extends LayerBase { kind: "noise"; filter: BiquadFilterType; filterFrequency: number; filterQ?: number }
export type SfxLayer = ToneLayer | NoiseLayer;
export interface SfxRecipe { priority: 1 | 2 | 3 | 4; cooldownMs: number; maxVoices: number; outputGain: number; layers: readonly SfxLayer[] }

const tone = (frequency: number, durationMs: number, delayMs: number, waveform: OscillatorType, gain: number, endFrequency?: number): ToneLayer =>
  ({ kind: "tone", frequency, durationMs, delayMs, waveform, gain, ...(endFrequency ? { endFrequency } : {}) });
const noise = (filterFrequency: number, durationMs: number, delayMs: number, filter: BiquadFilterType, gain: number, filterQ = 0.8): NoiseLayer =>
  ({ kind: "noise", filterFrequency, durationMs, delayMs, filter, gain, filterQ });

export const SFX_BANK: Record<SfxName, SfxRecipe> = {
  cardDraw: { priority: 1, cooldownMs: 35, maxVoices: 2, outputGain: 0.72, layers: [noise(1800, 105, 0, "highpass", 0.18), tone(760, 70, 18, "sine", 0.08, 980)] },
  cardPlay: { priority: 1, cooldownMs: 35, maxVoices: 2, outputGain: 0.78, layers: [noise(1100, 125, 0, "bandpass", 0.24, 1.4), tone(310, 90, 18, "triangle", 0.1, 220)] },
  cardDiscard: { priority: 1, cooldownMs: 45, maxVoices: 2, outputGain: 0.7, layers: [noise(760, 150, 0, "lowpass", 0.2), tone(190, 90, 15, "triangle", 0.08, 130)] },
  equip: { priority: 2, cooldownMs: 80, maxVoices: 2, outputGain: 0.78, layers: [tone(520, 150, 0, "triangle", 0.16, 430), tone(1040, 190, 16, "sine", 0.11, 860), noise(2400, 75, 0, "highpass", 0.08)] },
  skillUse: { priority: 2, cooldownMs: 65, maxVoices: 2, outputGain: 0.82, layers: [tone(440, 150, 0, "triangle", 0.13, 660), tone(660, 190, 80, "sine", 0.15, 990), noise(1500, 180, 0, "bandpass", 0.06)] },
  attack: { priority: 2, cooldownMs: 45, maxVoices: 2, outputGain: 0.86, layers: [noise(1300, 190, 0, "bandpass", 0.28, 0.9), tone(260, 130, 20, "sawtooth", 0.08, 120)] },
  damage: { priority: 3, cooldownMs: 55, maxVoices: 2, outputGain: 0.9, layers: [tone(105, 220, 0, "sine", 0.28, 58), noise(420, 135, 0, "lowpass", 0.28), tone(68, 260, 18, "triangle", 0.13, 45)] },
  dodge: { priority: 2, cooldownMs: 45, maxVoices: 2, outputGain: 0.76, layers: [noise(2100, 180, 0, "highpass", 0.2), tone(980, 90, 10, "sine", 0.09, 620)] },
  heal: { priority: 2, cooldownMs: 0, maxVoices: 2, outputGain: 0.78, layers: [tone(523, 180, 0, "sine", 0.12, 587), tone(659, 210, 75, "sine", 0.12, 740), tone(988, 260, 150, "triangle", 0.1, 1175)] },
  death: { priority: 4, cooldownMs: 250, maxVoices: 1, outputGain: 0.9, layers: [tone(196, 260, 0, "sawtooth", 0.18, 130), tone(98, 520, 150, "triangle", 0.22, 49), noise(300, 430, 100, "lowpass", 0.13)] },
  turnStart: { priority: 2, cooldownMs: 300, maxVoices: 1, outputGain: 0.72, layers: [tone(392, 210, 0, "sine", 0.14, 523), tone(784, 330, 100, "sine", 0.14, 659)] },
  judgment: { priority: 2, cooldownMs: 60, maxVoices: 2, outputGain: 0.78, layers: [tone(330, 90, 0, "square", 0.08, 294), tone(660, 170, 80, "triangle", 0.13, 520), noise(1200, 90, 75, "bandpass", 0.08)] },
  wuxie: { priority: 3, cooldownMs: 55, maxVoices: 2, outputGain: 0.8, layers: [tone(1180, 120, 0, "sine", 0.12, 720), tone(590, 180, 55, "triangle", 0.11, 880), noise(2600, 100, 0, "highpass", 0.08)] },
  lightning: { priority: 4, cooldownMs: 400, maxVoices: 1, outputGain: 1, layers: [noise(1700, 95, 0, "highpass", 0.42), noise(480, 620, 28, "lowpass", 0.38), tone(62, 700, 18, "sawtooth", 0.28, 38), tone(124, 180, 0, "square", 0.15, 48)] },
  win: { priority: 4, cooldownMs: 1000, maxVoices: 1, outputGain: 0.86, layers: [tone(523, 190, 0, "triangle", 0.15, 587), tone(659, 210, 130, "triangle", 0.16, 740), tone(784, 380, 270, "triangle", 0.19, 1047)] },
  lose: { priority: 4, cooldownMs: 1000, maxVoices: 1, outputGain: 0.84, layers: [tone(440, 220, 0, "sawtooth", 0.14, 392), tone(349, 260, 160, "triangle", 0.16, 294), tone(220, 460, 330, "triangle", 0.18, 110)] },
};
