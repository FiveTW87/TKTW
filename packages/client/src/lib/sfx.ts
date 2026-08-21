import { useSfxStore } from "../store/sfxStore";

// No sound files exist in this project. The driver keeps the original ten
// synthesized effects while SfxManager owns failure isolation and lifecycle.

const SFX_NAMES = ["cardPlay", "skillUse", "draw", "damage", "dodge", "heal", "death", "turnStart", "win", "lose"] as const;
export type SfxName = (typeof SFX_NAMES)[number];

interface Note {
  freq: number;
  durationMs: number;
  delayMs: number;
  type: OscillatorType;
  gainPeak: number;
}

const SFX: Record<SfxName, readonly Note[]> = {
  cardPlay: [{ freq: 520, durationMs: 90, delayMs: 0, type: "square", gainPeak: 0.15 }],
  skillUse: [
    { freq: 660, durationMs: 90, delayMs: 0, type: "triangle", gainPeak: 0.18 },
    { freq: 880, durationMs: 110, delayMs: 70, type: "triangle", gainPeak: 0.18 },
  ],
  draw: [{ freq: 900, durationMs: 55, delayMs: 0, type: "sine", gainPeak: 0.12 }],
  damage: [{ freq: 130, durationMs: 160, delayMs: 0, type: "sawtooth", gainPeak: 0.22 }],
  dodge: [
    { freq: 1000, durationMs: 60, delayMs: 0, type: "sine", gainPeak: 0.14 },
    { freq: 700, durationMs: 70, delayMs: 40, type: "sine", gainPeak: 0.1 },
  ],
  heal: [
    { freq: 523, durationMs: 100, delayMs: 0, type: "sine", gainPeak: 0.12 },
    { freq: 659, durationMs: 120, delayMs: 70, type: "sine", gainPeak: 0.14 },
    { freq: 988, durationMs: 150, delayMs: 145, type: "triangle", gainPeak: 0.12 },
  ],
  death: [
    { freq: 196, durationMs: 170, delayMs: 0, type: "sawtooth", gainPeak: 0.18 },
    { freq: 147, durationMs: 260, delayMs: 120, type: "sawtooth", gainPeak: 0.2 },
  ],
  turnStart: [
    { freq: 523, durationMs: 110, delayMs: 0, type: "sine", gainPeak: 0.18 },
    { freq: 784, durationMs: 160, delayMs: 90, type: "sine", gainPeak: 0.18 },
  ],
  win: [
    { freq: 523, durationMs: 130, delayMs: 0, type: "triangle", gainPeak: 0.22 },
    { freq: 659, durationMs: 130, delayMs: 110, type: "triangle", gainPeak: 0.22 },
    { freq: 784, durationMs: 220, delayMs: 220, type: "triangle", gainPeak: 0.24 },
  ],
  lose: [
    { freq: 440, durationMs: 150, delayMs: 0, type: "sawtooth", gainPeak: 0.2 },
    { freq: 349, durationMs: 150, delayMs: 130, type: "sawtooth", gainPeak: 0.2 },
    { freq: 262, durationMs: 260, delayMs: 260, type: "sawtooth", gainPeak: 0.2 },
  ],
};

export interface SfxVoice {
  stop(): void;
}

export interface SfxAudioDriver {
  readonly state: AudioContextState;
  resume(): Promise<void>;
  play(name: SfxName, volume: number, onEnded: () => void): SfxVoice | null;
  dispose(): void;
}

interface SfxPreferences {
  muted: boolean;
  volume: number;
}

interface SfxManagerOptions {
  createDriver: () => SfxAudioDriver | null;
  readPreferences: () => SfxPreferences;
  subscribeToInteraction?: (handler: () => void) => () => void;
  maxActive?: number;
  maxPerName?: number;
}

interface ActiveEffect {
  id: number;
  name: SfxName;
  priority: number;
  voice: SfxVoice;
}

const DEFAULT_VOLUME = 0.6;
const PRIORITY: Record<SfxName, number> = {
  cardPlay: 1,
  draw: 1,
  dodge: 1,
  damage: 2,
  heal: 2,
  skillUse: 2,
  turnStart: 2,
  death: 3,
  win: 3,
  lose: 3,
};

function normalizedVolume(volume: number): number {
  return Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : DEFAULT_VOLUME;
}

export class SfxManager {
  private driver: SfxAudioDriver | null | undefined;
  private active: ActiveEffect[] = [];
  private nextId = 1;
  private removeInteractionListener: (() => void) | null = null;
  private resumePending = false;
  private retryResumeAfterPending = false;
  private disposed = false;
  private readonly maxActive: number;
  private readonly maxPerName: number;

  constructor(private readonly options: SfxManagerOptions) {
    this.maxActive = Math.max(1, options.maxActive ?? 8);
    this.maxPerName = Math.max(1, options.maxPerName ?? 2);
  }

  play(name: SfxName): void {
    if (this.disposed) return;
    let preferences: SfxPreferences;
    try {
      preferences = this.options.readPreferences();
    } catch {
      return;
    }
    const volume = normalizedVolume(preferences.volume);
    if (preferences.muted || volume <= 0) return;

    const driver = this.getDriver();
    if (!driver || driver.state === "closed") return;
    if (driver.state !== "running") {
      this.armUnlock();
      this.resumeDriver(false);
      return;
    }

    const priority = PRIORITY[name];
    const sameName = this.active.filter((effect) => effect.name === name);
    if (sameName.length >= this.maxPerName) this.evict(sameName[0]);
    if (this.active.length >= this.maxActive) {
      const candidate = this.active.find((effect) => effect.priority <= priority);
      if (!candidate) return;
      this.evict(candidate);
    }

    const id = this.nextId++;
    try {
      const voice = driver.play(name, volume, () => this.release(id));
      if (voice) this.active.push({ id, name, priority, voice });
    } catch {
      // Sound is optional; backend failures must never escape into gameplay.
    }
  }

  unlock(): void {
    if (this.disposed) return;
    const driver = this.getDriver();
    if (!driver || driver.state === "closed") return;
    this.resumeDriver(true);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.disarmUnlock();
    const effects = this.active.splice(0);
    for (const effect of effects) this.stopVoice(effect.voice);
    try {
      this.driver?.dispose();
    } catch {
      // Best-effort cleanup.
    }
    this.driver = null;
  }

  private getDriver(): SfxAudioDriver | null {
    if (this.driver !== undefined) return this.driver;
    try {
      this.driver = this.options.createDriver();
    } catch {
      this.driver = null;
    }
    return this.driver;
  }

  private resumeDriver(retryAfterPending: boolean): void {
    const driver = this.driver;
    if (!driver || driver.state === "closed") return;
    if (this.resumePending) {
      if (retryAfterPending) this.retryResumeAfterPending = true;
      return;
    }
    this.resumePending = true;
    let result: Promise<void>;
    try {
      result = driver.resume();
    } catch {
      this.resumePending = false;
      return;
    }
    void Promise.resolve(result)
      .then(() => {
        if (driver.state === "running") this.disarmUnlock();
      })
      .catch(() => undefined)
      .finally(() => {
        this.resumePending = false;
        if (this.retryResumeAfterPending) {
          this.retryResumeAfterPending = false;
          this.resumeDriver(true);
        }
      });
  }

  private armUnlock(): void {
    if (this.removeInteractionListener || !this.options.subscribeToInteraction) return;
    try {
      this.removeInteractionListener = this.options.subscribeToInteraction(() => this.unlock());
    } catch {
      this.removeInteractionListener = null;
    }
  }

  private disarmUnlock(): void {
    const remove = this.removeInteractionListener;
    this.removeInteractionListener = null;
    try {
      remove?.();
    } catch {
      // Listener cleanup is best effort.
    }
  }

  private evict(effect: ActiveEffect | undefined): void {
    if (!effect) return;
    this.release(effect.id);
    this.stopVoice(effect.voice);
  }

  private release(id: number): void {
    this.active = this.active.filter((effect) => effect.id !== id);
  }

  private stopVoice(voice: SfxVoice): void {
    try {
      voice.stop();
    } catch {
      // Best-effort cleanup.
    }
  }
}

class WebAudioDriver implements SfxAudioDriver {
  private readonly voices = new Set<SfxVoice>();

  constructor(private readonly context: AudioContext) {}

  get state(): AudioContextState {
    return this.context.state;
  }

  resume(): Promise<void> {
    return this.context.resume();
  }

  play(name: SfxName, volume: number, onEnded: () => void): SfxVoice | null {
    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    let remaining = SFX[name].length;
    let finished = false;
    let voice: SfxVoice;

    const finish = () => {
      if (finished) return;
      finished = true;
      this.voices.delete(voice);
      for (const oscillator of oscillators) safeDisconnect(oscillator);
      for (const gain of gains) safeDisconnect(gain);
      onEnded();
    };
    voice = {
      stop: () => {
        if (finished) return;
        for (const oscillator of oscillators) {
          try { oscillator.stop(); } catch { /* already stopped */ }
        }
        finish();
      },
    };

    try {
      for (const note of SFX[name]) {
        const startAt = this.context.currentTime + note.delayMs / 1000;
        const endAt = startAt + note.durationMs / 1000;
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillators.push(oscillator);
        gains.push(gain);
        oscillator.type = note.type;
        oscillator.frequency.setValueAtTime(note.freq, startAt);
        gain.gain.setValueAtTime(0, startAt);
        gain.gain.linearRampToValueAtTime(note.gainPeak * volume, startAt + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, endAt);
        oscillator.connect(gain);
        gain.connect(this.context.destination);
        oscillator.onended = () => {
          remaining -= 1;
          if (remaining === 0) finish();
        };
        oscillator.start(startAt);
        oscillator.stop(endAt + 0.02);
      }
      this.voices.add(voice);
      return voice;
    } catch {
      voice.stop();
      return null;
    }
  }

  dispose(): void {
    for (const voice of [...this.voices]) {
      try { voice.stop(); } catch { /* best effort */ }
    }
    this.voices.clear();
    try {
      void this.context.close().catch(() => undefined);
    } catch {
      // Context cleanup is optional.
    }
  }
}

function safeDisconnect(node: AudioNode): void {
  try {
    node.disconnect();
  } catch {
    // Node may already be disconnected.
  }
}

function createWebAudioDriver(): SfxAudioDriver | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new WebAudioDriver(new Ctor());
  } catch {
    return null;
  }
}

function subscribeToBrowserInteraction(handler: () => void): () => void {
  if (typeof document === "undefined") return () => undefined;
  document.addEventListener("pointerdown", handler, { capture: true });
  document.addEventListener("keydown", handler, { capture: true });
  return () => {
    document.removeEventListener("pointerdown", handler, { capture: true });
    document.removeEventListener("keydown", handler, { capture: true });
  };
}

const manager = new SfxManager({
  createDriver: createWebAudioDriver,
  readPreferences: () => useSfxStore.getState(),
  subscribeToInteraction: subscribeToBrowserInteraction,
});

export function playSfx(name: SfxName): void {
  manager.play(name);
}
