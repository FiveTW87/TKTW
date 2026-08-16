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
    const { result } = renderHook(() => useCombatPresentation([historical]));

    expect(result.current).toEqual([]);
  });

  it("shows an attack travelling from source to target before the hit lands", () => {
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation(logs, players),
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

    act(() => vi.advanceTimersByTime(900));
    expect(result.current).toEqual([]);
  });

  it("lands on a distinct dodge cue instead of a hit", () => {
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation(logs),
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
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation(logs),
      { initialProps: { logs: [] } },
    );

    act(() => {
      rerender({ logs: [log({ eventType: "heal", actorId: "target", amount: 1, data: { sourceId: "attacker" } })] });
    });

    expect(result.current.some((effect) => effect.kind === "heal" && effect.amount === 1)).toBe(true);
  });

  it("shows the public skill name over the player who activated it", () => {
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation(logs, players),
      { initialProps: { logs: [] } },
    );

    act(() => {
      rerender({ logs: [log({ eventType: "skillUse", actorId: "attacker", skillId: "caocao_jianxiong" })] });
    });

    expect(result.current.some((effect) => effect.kind === "skill" && effect.label === "พลิกภัยเป็นกล")).toBe(true);
    expect(result.current.find((effect) => effect.kind === "skill")?.poseArt).toBe("/assets/generals/cao_cao_skill-v1.png");
  });

  it("keeps only the newest pose visible for a player while preserving both effect cues", () => {
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation(logs, players),
      { initialProps: { logs: [] } },
    );
    const first = log({ id: "skill-1", eventType: "skillUse", actorId: "attacker", skillId: "caocao_jianxiong" });
    const second = log({ id: "skill-2", eventType: "skillUse", actorId: "attacker", skillId: "caocao_hujia" });

    act(() => rerender({ logs: [first] }));
    act(() => rerender({ logs: [first, second] }));

    expect(result.current.filter((effect) => effect.kind === "skill")).toHaveLength(2);
    expect(result.current.filter((effect) => effect.poseArt)).toHaveLength(1);
    expect(result.current.find((effect) => effect.id === "skill-2:skill")?.poseArt).toBe(
      "/assets/generals/cao_cao_skill-v1.png",
    );
  });

  it("does not let follow-up attack travel immediately replace an active skill pose", () => {
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation(logs, players),
      { initialProps: { logs: [] } },
    );
    const skill = log({ id: "skill-priority", eventType: "skillUse", actorId: "attacker", skillId: "caocao_jianxiong" });
    const damage = log({ id: "damage-after-skill", actorId: "target", amount: 1, data: { sourceId: "attacker", hp: 3 } });

    act(() => rerender({ logs: [skill] }));
    act(() => rerender({ logs: [skill, damage] }));

    expect(result.current.find((effect) => effect.id === "skill-priority:skill")?.poseArt).toBe(
      "/assets/generals/cao_cao_skill-v1.png",
    );
    expect(result.current.find((effect) => effect.id === "damage-after-skill:travel")?.poseArt).toBeUndefined();
  });

  it("clears active effects when the log stream is reset", () => {
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation(logs, players),
      { initialProps: { logs: [] } },
    );

    act(() => rerender({ logs: [log({ eventType: "skillUse", actorId: "attacker", skillId: "caocao_jianxiong" })] }));
    expect(result.current).not.toEqual([]);
    act(() => rerender({ logs: [] }));
    expect(result.current).toEqual([]);
  });

  it("shows a defeat cue over a player when a public death log arrives", () => {
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation(logs),
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
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation(logs),
      { initialProps: { logs: [] } },
    );

    act(() => {
      rerender({ logs: [log({ actorId: "target", amount: 1, data: { sourceId: "attacker", hp: 3 } })] });
    });

    expect(result.current.map((effect) => effect.kind)).toEqual(["hit"]);
    Object.defineProperty(window, "matchMedia", { configurable: true, value: originalMatchMedia });
  });
});
