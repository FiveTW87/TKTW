import { describe, expect, it, vi } from "vitest";
import { createTutorialProgressStorage } from "../src/tutorial/tutorialProgress";

describe("tutorial local progress storage", () => {
  it("round-trips serializable progress per scenario and can clear it", () => {
    const values = new Map<string, string>();
    const storage = createTutorialProgressStorage({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
      removeItem: (key) => { values.delete(key); },
    });
    const progress = {
      schemaVersion: 1,
      scenarioId: "basic-actions",
      scenarioVersion: 2,
      status: "active",
      stepIndex: 1,
    } as const;

    storage.save(progress);
    expect(storage.load("basic-actions")).toEqual(progress);
    expect(storage.load("another-scenario")).toBeUndefined();

    storage.clear("basic-actions");
    expect(storage.load("basic-actions")).toBeUndefined();
  });

  it("degrades safely when local storage is corrupt or unavailable", () => {
    const unavailable = createTutorialProgressStorage({
      getItem: vi.fn(() => { throw new Error("blocked"); }),
      setItem: vi.fn(() => { throw new Error("full"); }),
      removeItem: vi.fn(() => { throw new Error("blocked"); }),
    });
    expect(unavailable.load("lesson")).toBeUndefined();
    expect(() => unavailable.save({
      schemaVersion: 1,
      scenarioId: "lesson",
      scenarioVersion: 1,
      status: "active",
      stepIndex: 0,
    })).not.toThrow();
    expect(() => unavailable.clear("lesson")).not.toThrow();

    const corrupt = createTutorialProgressStorage({
      getItem: () => "not-json",
      setItem: () => undefined,
      removeItem: () => undefined,
    });
    expect(corrupt.load("lesson")).toBeUndefined();
  });
});
