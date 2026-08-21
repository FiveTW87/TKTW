import { describe, expect, it, vi } from "vitest";
import {
  SfxManager,
  playSfx,
  type SfxAudioDriver,
  type SfxName,
  type SfxVoice,
} from "../src/lib/sfx";

class FakeVoice implements SfxVoice {
  stopped = false;

  constructor(private readonly finish: () => void) {}

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.finish();
  }
}

class FakeDriver implements SfxAudioDriver {
  state: "running" | "suspended" | "closed" = "running";
  readonly plays: Array<{ name: SfxName; volume: number; voice: FakeVoice }> = [];
  resume = vi.fn(async () => {
    this.state = "running";
  });
  dispose = vi.fn();

  play(name: SfxName, volume: number, onEnded: () => void): SfxVoice {
    const voice = new FakeVoice(onEnded);
    this.plays.push({ name, volume, voice });
    return voice;
  }
}

function setup(options: {
  driver?: FakeDriver;
  muted?: boolean;
  volume?: number;
  maxActive?: number;
  maxPerName?: number;
} = {}) {
  const driver = options.driver ?? new FakeDriver();
  const interactionHandlers = new Set<() => void>();
  const createDriver = vi.fn(() => driver);
  const subscribeToInteraction = vi.fn((handler: () => void) => {
    interactionHandlers.add(handler);
    return () => interactionHandlers.delete(handler);
  });
  const manager = new SfxManager({
    createDriver,
    readPreferences: () => ({
      muted: options.muted ?? false,
      volume: options.volume ?? 0.6,
    }),
    subscribeToInteraction,
    maxActive: options.maxActive,
    maxPerName: options.maxPerName,
  });

  return { manager, driver, createDriver, subscribeToInteraction, interactionHandlers };
}

describe("SfxManager", () => {
  it("keeps the compatibility player safe when Web Audio is unavailable", () => {
    const names = ["cardPlay", "skillUse", "draw", "damage", "dodge", "heal", "death", "turnStart", "win", "lose"] as const;
    for (const name of names) expect(() => playSfx(name)).not.toThrow();
  });

  it("creates the driver lazily and skips muted or silent playback", () => {
    const muted = setup({ muted: true });
    muted.manager.play("cardPlay");
    expect(muted.createDriver).not.toHaveBeenCalled();

    const silent = setup({ volume: 0 });
    silent.manager.play("cardPlay");
    expect(silent.createDriver).not.toHaveBeenCalled();
  });

  it("normalizes non-finite volume and clamps finite volume", () => {
    const loud = setup({ volume: 3 });
    loud.manager.play("cardPlay");
    expect(loud.driver.plays[0]?.volume).toBe(1);

    const invalid = setup({ volume: Number.NaN });
    invalid.manager.play("cardPlay");
    expect(invalid.driver.plays[0]?.volume).toBe(0.6);
  });

  it("counts a sequence as one effect and evicts the oldest same-name effect", () => {
    const { manager, driver } = setup({ maxPerName: 2 });
    manager.play("heal");
    manager.play("heal");
    manager.play("heal");

    expect(driver.plays).toHaveLength(3);
    expect(driver.plays[0]?.voice.stopped).toBe(true);
    expect(driver.plays[1]?.voice.stopped).toBe(false);
    expect(driver.plays[2]?.voice.stopped).toBe(false);
  });

  it("protects high-priority effects from low-priority bursts", () => {
    const { manager, driver } = setup({ maxActive: 2, maxPerName: 2 });
    manager.play("death");
    manager.play("win");
    manager.play("draw");
    expect(driver.plays.map((entry) => entry.name)).toEqual(["death", "win"]);

    manager.play("lose");
    expect(driver.plays.map((entry) => entry.name)).toEqual(["death", "win", "lose"]);
    expect(driver.plays[0]?.voice.stopped).toBe(true);
  });

  it("releases ended effects and disposes resources idempotently", () => {
    const { manager, driver } = setup({ maxActive: 1 });
    manager.play("cardPlay");
    driver.plays[0]?.voice.stop();
    manager.play("draw");
    expect(driver.plays).toHaveLength(2);

    expect(() => manager.dispose()).not.toThrow();
    expect(() => manager.dispose()).not.toThrow();
    expect(driver.plays[1]?.voice.stopped).toBe(true);
    expect(driver.dispose).toHaveBeenCalledTimes(1);
  });

  it("drops blocked sounds, unlocks on one interaction, and plays only future sounds", async () => {
    const driver = new FakeDriver();
    driver.state = "suspended";
    driver.resume.mockRejectedValueOnce(new Error("blocked"));
    const { manager, subscribeToInteraction, interactionHandlers } = setup({ driver });

    manager.play("damage");
    manager.play("dodge");
    await Promise.resolve();
    expect(driver.plays).toHaveLength(0);
    expect(subscribeToInteraction).toHaveBeenCalledTimes(1);
    expect(interactionHandlers.size).toBe(1);

    const gesture = [...interactionHandlers][0];
    expect(gesture).toBeDefined();
    gesture?.();
    await vi.waitFor(() => expect(interactionHandlers.size).toBe(0));
    expect(driver.plays).toHaveLength(0);

    manager.play("heal");
    expect(driver.plays.map((entry) => entry.name)).toEqual(["heal"]);
  });

  it("keeps the unlock listener when resume resolves but the driver stays suspended", async () => {
    const driver = new FakeDriver();
    driver.state = "suspended";
    driver.resume.mockImplementation(async () => undefined);
    const { manager, interactionHandlers } = setup({ driver });

    manager.play("damage");
    await Promise.resolve();
    await Promise.resolve();
    expect(driver.plays).toHaveLength(0);
    expect(interactionHandlers.size).toBe(1);
  });

  it("isolates driver construction, playback, cleanup, and listener failures", () => {
    const constructionFailure = new SfxManager({
      createDriver: () => {
        throw new Error("constructor failed");
      },
      readPreferences: () => ({ muted: false, volume: 0.6 }),
      subscribeToInteraction: () => {
        throw new Error("listener failed");
      },
    });
    expect(() => constructionFailure.play("cardPlay")).not.toThrow();

    const driver = new FakeDriver();
    driver.play = () => {
      throw new Error("play failed");
    };
    driver.dispose.mockImplementation(() => {
      throw new Error("dispose failed");
    });
    const { manager } = setup({ driver });
    expect(() => manager.play("damage")).not.toThrow();
    expect(() => manager.dispose()).not.toThrow();
  });
});
