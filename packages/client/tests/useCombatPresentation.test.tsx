import { act, renderHook } from "@testing-library/react";
import type { GameLogView } from "@tktw/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCombatPresentation } from "../src/hooks/useCombatPresentation";

const players = [
  { id: "attacker", generalId: "caocao", faction: "wei" as const },
  { id: "target", generalId: "caocao", faction: "wei" as const },
];

function anchor(playerId: string, left: number, top: number): HTMLElement {
  const element = document.createElement("div");
  element.dataset.playerAnchor = playerId;
  element.getBoundingClientRect = () => ({
    x: left,
    y: top,
    left,
    top,
    right: left + 100,
    bottom: top + 80,
    width: 100,
    height: 80,
    toJSON: () => ({}),
  });
  document.body.appendChild(element);
  return element;
}

function log(overrides: Partial<GameLogView>): GameLogView {
  return {
    id: "log-1",
    turn: 1,
    eventType: "damage",
    visibility: "public",
    ...overrides,
  };
}

describe("useCombatPresentation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    anchor("attacker", 100, 100);
    anchor("target", 500, 300);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it("does not replay historical effects from the initial reconnect snapshot", () => {
    const historical = log({ actorId: "target", amount: 1, data: { sourceId: "attacker", hp: 3 } });
    const { result } = renderHook(() => useCombatPresentation("match-1", [historical]));

    expect(result.current).toEqual([]);
  });

  it("shows an attack travelling from source to target before the hit lands", () => {
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation("match-1", logs, players),
      { initialProps: { logs: [] } },
    );

    act(() => {
      rerender({ logs: [log({ actorId: "target", amount: 2, data: { sourceId: "attacker", hp: 2 } })] });
    });

    expect(result.current.map((effect) => effect.kind)).toEqual(["travel"]);
    expect(result.current[0]?.poseArt).toBe("/assets/generals/cao_cao_attack-v1.png");

    act(() => vi.advanceTimersByTime(240));
    expect(result.current.some((effect) => effect.kind === "hit" && effect.amount === 2)).toBe(true);
    expect(result.current.find((effect) => effect.kind === "hit")?.poseArt).toBe("/assets/generals/cao_cao_hit-v1.png");

    act(() => vi.advanceTimersByTime(1800));
    expect(result.current).toEqual([]);
  });

  it("clamps a desktop opponent pose into the visible battle area", () => {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 1280 });
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: 720 });
    document.body.replaceChildren();
    anchor("attacker", 20, 20);
    anchor("target", 1100, 40);
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation("match-1", logs, players),
      { initialProps: { logs: [] } },
    );

    act(() => rerender({ logs: [log({ actorId: "target", amount: 1, data: { sourceId: "attacker" } })] }));
    const attack = result.current.find((effect) => effect.kind === "travel");
    expect(attack?.left).toBe(70);
    expect(attack?.top).toBe(60);
    expect(attack?.poseLeft).toBe(130);
    expect(attack?.poseTop).toBe(260);

    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: originalWidth });
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: originalHeight });
  });

  it("lands on a distinct dodge cue instead of a hit", () => {
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation("match-1", logs),
      { initialProps: { logs: [] } },
    );

    act(() => {
      rerender({ logs: [log({ eventType: "dodge", actorId: "target", cardType: "shan", data: { sourceId: "attacker" } })] });
    });

    expect(result.current.map((effect) => effect.kind)).toEqual(["travel"]);

    act(() => vi.advanceTimersByTime(240));
    expect(result.current.some((effect) => effect.kind === "dodge")).toBe(true);
    expect(result.current.some((effect) => effect.kind === "hit")).toBe(false);
  });

  it("shows healing as a positive cue on the healed player", () => {
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation("match-1", logs),
      { initialProps: { logs: [] } },
    );

    act(() => {
      rerender({ logs: [log({ eventType: "heal", actorId: "target", amount: 1, data: { sourceId: "attacker" } })] });
    });

    expect(result.current.some((effect) => effect.kind === "heal" && effect.amount === 1)).toBe(true);
  });

  it("shows the public skill name over the player who activated it", () => {
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation("match-1", logs, players),
      { initialProps: { logs: [] } },
    );

    act(() => {
      rerender({ logs: [log({ eventType: "skillUse", actorId: "attacker", skillId: "caocao_jianxiong" })] });
    });

    expect(result.current.some((effect) => effect.kind === "skill" && effect.label === "พลิกภัยเป็นกล")).toBe(true);
    expect(result.current.find((effect) => effect.kind === "skill")?.poseArt).toBe("/assets/generals/cao_cao_skill-v1.png");
  });

  it("keeps full-body poses inside a short mobile landscape viewport while impact stays on the seat", () => {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 932 });
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: 430 });
    document.body.replaceChildren();
    anchor("attacker", 20, 60);
    anchor("target", 810, 60);
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation("match-1", logs, players),
      { initialProps: { logs: [] } },
    );

    act(() => rerender({ logs: [log({ actorId: "target", amount: 1, data: { sourceId: "attacker" } })] }));
    const attack = result.current.find((effect) => effect.kind === "travel");
    expect(attack?.left).toBe(70); // travel cue still starts at the real rail tile
    expect(attack?.top).toBe(100);
    expect(attack?.poseLeft).toBe(82);
    expect(attack?.poseTop).toBeGreaterThanOrEqual(168);

    act(() => vi.advanceTimersByTime(240));
    const hit = result.current.find((effect) => effect.kind === "hit");
    expect(hit?.left).toBe(860); // hit cue remains over the actual target
    expect(hit?.poseLeft).toBe(850);
    expect(hit?.poseTop).toBeGreaterThanOrEqual(168);

    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: originalWidth });
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: originalHeight });
  });

  it("keeps only the newest pose visible for a player while preserving both effect cues", () => {
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation("match-1", logs, players),
      { initialProps: { logs: [] } },
    );
    const first = log({ id: "skill-1", eventType: "skillUse", actorId: "attacker", skillId: "caocao_jianxiong" });
    const second = log({ id: "skill-2", eventType: "skillUse", actorId: "attacker", skillId: "caocao_hujia" });

    act(() => rerender({ logs: [first] }));
    act(() => rerender({ logs: [first, second] }));

    expect(result.current.filter((effect) => effect.kind === "skill")).toHaveLength(2);
    expect(result.current.filter((effect) => effect.poseArt)).toHaveLength(1);
    expect(result.current.find((effect) => effect.id === "match-1:skill-2:skill")?.poseArt).toBe(
      "/assets/generals/cao_cao_skill-v1.png",
    );
  });

  it("does not let follow-up attack travel immediately replace an active skill pose", () => {
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation("match-1", logs, players),
      { initialProps: { logs: [] } },
    );
    const skill = log({ id: "skill-priority", eventType: "skillUse", actorId: "attacker", skillId: "caocao_jianxiong" });
    const damage = log({ id: "damage-after-skill", actorId: "target", amount: 1, data: { sourceId: "attacker", hp: 3 } });

    act(() => rerender({ logs: [skill] }));
    act(() => rerender({ logs: [skill, damage] }));

    expect(result.current.find((effect) => effect.id === "match-1:skill-priority:skill")?.poseArt).toBe(
      "/assets/generals/cao_cao_skill-v1.png",
    );
    expect(
      result.current.find((effect) => effect.id === "match-1:damage-after-skill:damage:travel")?.poseArt,
    ).toBeUndefined();
  });

  it("clears active effects when the log stream is reset", () => {
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation("match-1", logs, players),
      { initialProps: { logs: [] } },
    );

    act(() => rerender({ logs: [log({ eventType: "skillUse", actorId: "attacker", skillId: "caocao_jianxiong" })] }));
    expect(result.current).not.toEqual([]);
    act(() => rerender({ logs: [] }));
    expect(result.current).toEqual([]);
  });

  it("shows a defeat cue over a player when a public death log arrives", () => {
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation("match-1", logs),
      { initialProps: { logs: [] } },
    );

    act(() => {
      rerender({ logs: [log({ eventType: "death", actorId: "target", data: { role: "rebel", killerId: "attacker" } })] });
    });

    expect(result.current.some((effect) => effect.kind === "death")).toBe(true);
  });

  it("skips travel and shows the outcome immediately when reduced motion is requested", () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation("match-1", logs),
      { initialProps: { logs: [] } },
    );

    act(() => {
      rerender({ logs: [log({ actorId: "target", amount: 1, data: { sourceId: "attacker", hp: 3 } })] });
    });

    expect(result.current.map((effect) => effect.kind)).toEqual(["hit"]);
    Object.defineProperty(window, "matchMedia", { configurable: true, value: originalMatchMedia });
  });
});
