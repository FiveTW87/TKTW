import { SFX_BANK, SFX_NAMES, type SfxLayer, type SfxName } from "../audio/sfxBank";
import { useSfxStore } from "../store/sfxStore";

export { SFX_NAMES, type SfxName } from "../audio/sfxBank";

export interface SfxVoice { stop(): void }
export interface SfxAudioDriver {
  readonly state: AudioContextState;
  resume(): Promise<void>;
  play(name: SfxName, volume: number, onEnded: () => void): SfxVoice | null;
  dispose(): void;
}

interface SfxPreferences { muted: boolean; volume: number }
interface SfxManagerOptions {
  createDriver: () => SfxAudioDriver | null;
  readPreferences: () => SfxPreferences;
  subscribeToInteraction?: (handler: () => void) => () => void;
  maxActive?: number;
  maxPerName?: number;
  now?: () => number;
}
interface ActiveEffect { id: number; name: SfxName; priority: number; voice: SfxVoice }

const DEFAULT_VOLUME = 0.6;
const normalizedVolume = (volume: number) => Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : DEFAULT_VOLUME;

export class SfxManager {
  private driver: SfxAudioDriver | null | undefined;
  private active: ActiveEffect[] = [];
  private lastPlayedAt = new Map<SfxName, number>();
  private nextId = 1;
  private removeInteractionListener: (() => void) | null = null;
  private resumePending = false;
  private retryResumeAfterPending = false;
  private disposed = false;
  private readonly maxActive: number;
  private readonly maxPerName: number;
  private readonly now: () => number;

  constructor(private readonly options: SfxManagerOptions) {
    this.maxActive = Math.max(1, options.maxActive ?? 10);
    this.maxPerName = Math.max(1, options.maxPerName ?? 3);
    this.now = options.now ?? (() => Date.now());
  }

  play(name: SfxName): void {
    if (this.disposed) return;
    let preferences: SfxPreferences;
    try { preferences = this.options.readPreferences(); } catch { return; }
    const volume = normalizedVolume(preferences.volume);
    if (preferences.muted || volume <= 0) return;
    const driver = this.getDriver();
    if (!driver || driver.state === "closed") return;
    if (driver.state !== "running") { this.armUnlock(); this.resumeDriver(false); return; }

    const recipe = SFX_BANK[name];
    const now = this.now();
    const lastPlayedAt = this.lastPlayedAt.get(name);
    if (lastPlayedAt !== undefined && now - lastPlayedAt < recipe.cooldownMs) return;
    const sameName = this.active.filter((effect) => effect.name === name);
    const perNameLimit = Math.min(this.maxPerName, recipe.maxVoices);
    if (sameName.length >= perNameLimit) this.evict(sameName[0]);
    if (this.active.length >= this.maxActive) {
      const candidate = this.active.find((effect) => effect.priority <= recipe.priority);
      if (!candidate) return;
      this.evict(candidate);
    }

    const id = this.nextId++;
    try {
      const voice = driver.play(name, volume, () => this.release(id));
      if (voice) {
        this.active.push({ id, name, priority: recipe.priority, voice });
        this.lastPlayedAt.set(name, now);
      }
    } catch { /* audio failure cannot own gameplay */ }
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
    for (const effect of this.active.splice(0)) this.stopVoice(effect.voice);
    this.lastPlayedAt.clear();
    try { this.driver?.dispose(); } catch { /* best effort */ }
    this.driver = null;
  }

  private getDriver(): SfxAudioDriver | null {
    if (this.driver !== undefined) return this.driver;
    try { this.driver = this.options.createDriver(); } catch { this.driver = null; }
    return this.driver;
  }
  private resumeDriver(retryAfterPending: boolean): void {
    const driver = this.driver;
    if (!driver || driver.state === "closed") return;
    if (this.resumePending) { if (retryAfterPending) this.retryResumeAfterPending = true; return; }
    this.resumePending = true;
    let result: Promise<void>;
    try { result = driver.resume(); } catch { this.resumePending = false; return; }
    void Promise.resolve(result).then(() => { if (driver.state === "running") this.disarmUnlock(); }).catch(() => undefined).finally(() => {
      this.resumePending = false;
      if (this.retryResumeAfterPending) { this.retryResumeAfterPending = false; this.resumeDriver(true); }
    });
  }
  private armUnlock(): void {
    if (this.removeInteractionListener || !this.options.subscribeToInteraction) return;
    try { this.removeInteractionListener = this.options.subscribeToInteraction(() => this.unlock()); } catch { this.removeInteractionListener = null; }
  }
  private disarmUnlock(): void {
    const remove = this.removeInteractionListener;
    this.removeInteractionListener = null;
    try { remove?.(); } catch { /* best effort */ }
  }
  private evict(effect: ActiveEffect | undefined): void { if (effect) { this.release(effect.id); this.stopVoice(effect.voice); } }
  private release(id: number): void { this.active = this.active.filter((effect) => effect.id !== id); }
  private stopVoice(voice: SfxVoice): void { try { voice.stop(); } catch { /* best effort */ } }
}

class WebAudioDriver implements SfxAudioDriver {
  private readonly voices = new Set<SfxVoice>();
  private readonly mix: GainNode;
  private readonly compressor: DynamicsCompressorNode;

  constructor(private readonly context: AudioContext) {
    this.mix = context.createGain();
    this.compressor = context.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-18, context.currentTime);
    this.compressor.knee.setValueAtTime(16, context.currentTime);
    this.compressor.ratio.setValueAtTime(5, context.currentTime);
    this.compressor.attack.setValueAtTime(0.003, context.currentTime);
    this.compressor.release.setValueAtTime(0.18, context.currentTime);
    this.mix.connect(this.compressor);
    this.compressor.connect(context.destination);
  }

  get state(): AudioContextState { return this.context.state; }
  resume(): Promise<void> { return this.context.resume(); }

  play(name: SfxName, volume: number, onEnded: () => void): SfxVoice | null {
    const recipe = SFX_BANK[name];
    const sources: Array<OscillatorNode | AudioBufferSourceNode> = [];
    const nodes: AudioNode[] = [];
    let remaining = recipe.layers.length;
    let finished = false;
    let voice: SfxVoice;
    const finish = () => {
      if (finished) return;
      finished = true;
      this.voices.delete(voice);
      for (const node of [...sources, ...nodes]) safeDisconnect(node);
      onEnded();
    };
    voice = { stop: () => { if (finished) return; for (const source of sources) { try { source.stop(); } catch { /* ended */ } } finish(); } };

    try {
      recipe.layers.forEach((layer, index) => {
        const startAt = this.context.currentTime + layer.delayMs / 1000;
        const endAt = startAt + layer.durationMs / 1000;
        const gain = this.context.createGain();
        nodes.push(gain);
        scheduleEnvelope(gain.gain, startAt, endAt, layer, volume * recipe.outputGain);
        const source = layer.kind === "tone" ? this.createTone(layer, startAt, endAt) : this.createNoise(name, index, layer, startAt);
        sources.push(source.node);
        if (source.filter) { nodes.push(source.filter); source.node.connect(source.filter); source.filter.connect(gain); } else source.node.connect(gain);
        gain.connect(this.mix);
        source.node.onended = () => { remaining -= 1; if (remaining === 0) finish(); };
        source.node.start(startAt);
        source.node.stop(endAt + 0.025);
      });
      this.voices.add(voice);
      return voice;
    } catch { voice.stop(); return null; }
  }

  dispose(): void {
    for (const voice of [...this.voices]) { try { voice.stop(); } catch { /* best effort */ } }
    this.voices.clear();
    safeDisconnect(this.mix);
    safeDisconnect(this.compressor);
    try { void this.context.close().catch(() => undefined); } catch { /* optional */ }
  }

  private createTone(layer: Extract<SfxLayer, { kind: "tone" }>, startAt: number, endAt: number): { node: OscillatorNode; filter?: undefined } {
    const node = this.context.createOscillator();
    node.type = layer.waveform;
    node.frequency.setValueAtTime(layer.frequency, startAt);
    if (layer.endFrequency) node.frequency.exponentialRampToValueAtTime(layer.endFrequency, endAt);
    return { node };
  }
  private createNoise(name: SfxName, index: number, layer: Extract<SfxLayer, { kind: "noise" }>, startAt: number): { node: AudioBufferSourceNode; filter: BiquadFilterNode } {
    const length = Math.max(1, Math.ceil(this.context.sampleRate * layer.durationMs / 1000));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = (SFX_NAMES.indexOf(name) + 1) * 7919 + index * 104729;
    for (let i = 0; i < data.length; i += 1) { seed = (seed * 16807) % 2147483647; data[i] = (seed / 1073741823.5) - 1; }
    const node = this.context.createBufferSource();
    node.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = layer.filter;
    filter.frequency.setValueAtTime(layer.filterFrequency, startAt);
    filter.Q.setValueAtTime(layer.filterQ ?? 0.8, startAt);
    return { node, filter };
  }
}

function scheduleEnvelope(gain: AudioParam, startAt: number, endAt: number, layer: SfxLayer, peak: number): void {
  const attackEnd = Math.min(endAt, startAt + (layer.attackMs ?? 8) / 1000);
  const releaseStart = Math.max(attackEnd, endAt - (layer.releaseMs ?? Math.min(90, layer.durationMs * 0.55)) / 1000);
  const level = Math.max(0.0001, layer.gain * peak);
  gain.setValueAtTime(0.0001, startAt);
  gain.exponentialRampToValueAtTime(level, attackEnd);
  gain.setValueAtTime(level, releaseStart);
  gain.exponentialRampToValueAtTime(0.0001, endAt);
}
function safeDisconnect(node: AudioNode): void { try { node.disconnect(); } catch { /* already disconnected */ } }
function createWebAudioDriver(): SfxAudioDriver | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try { return new WebAudioDriver(new Ctor()); } catch { return null; }
}
function subscribeToBrowserInteraction(handler: () => void): () => void {
  if (typeof document === "undefined") return () => undefined;
  document.addEventListener("pointerdown", handler, { capture: true });
  document.addEventListener("keydown", handler, { capture: true });
  return () => { document.removeEventListener("pointerdown", handler, { capture: true }); document.removeEventListener("keydown", handler, { capture: true }); };
}

const manager = new SfxManager({ createDriver: createWebAudioDriver, readPreferences: () => useSfxStore.getState(), subscribeToInteraction: subscribeToBrowserInteraction });
export function playSfx(name: SfxName): void { manager.play(name); }
