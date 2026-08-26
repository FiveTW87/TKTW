import { act, renderHook } from "@testing-library/react";
import type { GameLogView } from "@tktw/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCombatPresentation } from "../src/hooks/useCombatPresentation";

const players = [
  { id: "attacker", name: "โจโฉ", generalId: "caocao", faction: "wei" as const },
  { id: "target", name: "สุมาอี้", generalId: "caocao", faction: "wei" as const },
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
    const { result } = renderHook(() => useCombatPresentation({
      connected: true,
      matchId: "match-1",
      logs: [historical],
    }));

    expect(result.current).toEqual([]);
  });

  it("shows an attack travelling from source to target before the hit lands", () => {
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation({ connected: true, matchId: "match-1", logs, players }),
      { initialProps: { logs: [] } },
    );

    act(() => {
      rerender({ logs: [log({ actorId: "target", amount: 2, data: { sourceId: "attacker", hp: 2 } })] });
    });

    expect(result.current.map((effect) => effect.kind)).toEqual(["travel"]);
    expect(result.current[0]?.poseArt).toBe("/assets/generals/cao_cao_attack-v1.png");
    expect(result.current[0]).toMatchObject({ sourceLabel: "โจโฉ", targetLabel: "สุมาอี้" });

    act(() => vi.advanceTimersByTime(240));
    expect(result.current.some((effect) => effect.kind === "hit" && effect.amount === 2)).toBe(true);
    expect(result.current.find((effect) => effect.kind === "hit")?.poseArt).toBe("/assets/generals/cao_cao_hit-v1.png");

    act(() => vi.advanceTimersByTime(1800));
    expect(result.current).toEqual([]);
  });

  it("presents multi-target outcomes in received order without stacking body poses", () => {
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation({ connected: true, matchId: "match-1", logs, players }),
      { initialProps: { logs: [] } },
    );
    const hits = [1, 2, 3].map((amount, index) => log({
      id: `multi-${index + 1}`,
      actorId: "target",
      amount,
      data: { sourceId: "attacker" },
    }));

    act(() => rerender({ logs: hits }));
    expect(result.current.filter((effect) => effect.kind === "travel")).toHaveLength(1);

    act(() => vi.advanceTimersByTime(240));
    expect(result.current.filter((effect) => effect.kind === "hit").map((effect) => effect.kind === "hit" ? effect.amount : 0)).toEqual([1]);
    expect(result.current.filter((effect) => effect.kind === "travel")).toHaveLength(1);
    expect(new Set(result.current.filter((effect) => effect.poseArt).map((effect) => effect.posePlayerId)).size).toBe(
      result.current.filter((effect) => effect.poseArt).length,
    );

    act(() => vi.advanceTimersByTime(70));
    expect(result.current.filter((effect) => effect.kind === "travel")).toHaveLength(2);
    expect(result.current.filter((effect) => effect.posePlayerId === "attacker" && effect.poseArt)).toHaveLength(1);

    act(() => vi.advanceTimersByTime(610));
    expect(result.current.filter((effect) => effect.kind === "hit").map((effect) => effect.kind === "hit" ? effect.amount : 0)).toEqual([1, 2, 3]);
    expect(result.current.filter((effect) => effect.posePlayerId === "target" && effect.poseArt)).toHaveLength(1);
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
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation({ connected: true, matchId: "match-1", logs, players }),
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
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation({ connected: true, matchId: "match-1", logs }),
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
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation({ connected: true, matchId: "match-1", logs }),
      { initialProps: { logs: [] } },
    );

    act(() => {
      rerender({ logs: [log({ eventType: "heal", actorId: "target", amount: 1, data: { sourceId: "attacker" } })] });
    });

    expect(result.current.some((effect) => effect.kind === "heal" && effect.amount === 1)).toBe(true);
  });

  it("shows the public skill name over the player who activated it", () => {
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation({ connected: true, matchId: "match-1", logs, players }),
      { initialProps: { logs: [] } },
    );

    act(() => {
      rerender({ logs: [log({ eventType: "skillUse", actorId: "attacker", skillId: "caocao_jianxiong" })] });
    });

    expect(result.current.some((effect) => effect.kind === "skill" && effect.label === "พลิกภัยเป็นกล")).toBe(true);
    expect(result.current.find((effect) => effect.kind === "skill")?.poseArt).toBe("/assets/generals/cao_cao_skill-v1.png");
  });

  it("plays combat sound when the visible outcome lands, not when the snapshot arrives", () => {
    const play = vi.fn();
    const { rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation({
        connected: true,
        matchId: "match-1",
        logs,
        players,
        play,
      }),
      { initialProps: { logs: [] } },
    );

    act(() => rerender({ logs: [log({ actorId: "target", amount: 2, data: { sourceId: "attacker" } })] }));
    expect(play).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledWith("attack");
    act(() => vi.advanceTimersByTime(220));
    expect(play).toHaveBeenCalledTimes(2);
    expect(play).toHaveBeenCalledWith("damage");
    act(() => rerender({ logs: [log({ actorId: "target", amount: 2, data: { sourceId: "attacker" } })] }));
    expect(play).toHaveBeenCalledTimes(2);
  });

  it("keeps skill, damage, and death phases ordered with their matching sounds", () => {
    const play = vi.fn();
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation({
        connected: true,
        matchId: "match-1",
        logs,
        players,
        play,
      }),
      { initialProps: { logs: [] } },
    );
    const sequence = [
      log({ id: "sequence-skill", eventType: "skillUse", actorId: "attacker", skillId: "caocao_jianxiong" }),
      log({ id: "sequence-damage", actorId: "target", amount: 2, data: { sourceId: "attacker" } }),
      log({ id: "sequence-death", eventType: "death", actorId: "target" }),
    ];

    act(() => rerender({ logs: sequence }));
    expect(result.current.map((effect) => effect.kind)).toEqual(["skill"]);
    expect(play.mock.calls.map(([name]) => name)).toEqual(["skillUse"]);

    act(() => vi.advanceTimersByTime(540));
    expect(result.current.some((effect) => effect.kind === "hit")).toBe(true);
    expect(play.mock.calls.map(([name]) => name)).toEqual(["skillUse", "attack", "damage"]);

    act(() => vi.advanceTimersByTime(90));
    expect(result.current.some((effect) => effect.kind === "death")).toBe(true);
    expect(play.mock.calls.map(([name]) => name)).toEqual(["skillUse", "attack", "damage", "death"]);
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
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation({ connected: true, matchId: "match-1", logs, players }),
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
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation({ connected: true, matchId: "match-1", logs, players }),
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

  it("bounds active combat nodes during a long burst without changing received order", () => {
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation({ connected: true, matchId: "match-1", logs, players }),
      { initialProps: { logs: [] } },
    );
    const burst = Array.from({ length: 12 }, (_, index) => log({
      id: `burst-${index}`,
      actorId: "target",
      amount: index + 1,
      data: { sourceId: "attacker" },
    }));

    act(() => rerender({ logs: burst }));
    act(() => vi.advanceTimersByTime(1860));

    expect(result.current.length).toBeLessThanOrEqual(10);
    const visibleHits = result.current
      .filter((effect) => effect.kind === "hit")
      .map((effect) => effect.kind === "hit" ? effect.amount : 0);
    expect(visibleHits).toEqual([...visibleHits].sort((a, b) => (a ?? 0) - (b ?? 0)));
  });

  it("does not let follow-up attack travel immediately replace an active skill pose", () => {
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation({ connected: true, matchId: "match-1", logs, players }),
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
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation({ connected: true, matchId: "match-1", logs, players }),
      { initialProps: { logs: [] } },
    );

    act(() => rerender({ logs: [log({ eventType: "skillUse", actorId: "attacker", skillId: "caocao_jianxiong" })] }));
    expect(result.current).not.toEqual([]);
    act(() => rerender({ logs: [] }));
    expect(result.current).toEqual([]);
  });

  it("shows a defeat cue over a player when a public death log arrives", () => {
    const { result, rerender } = renderHook(
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation({ connected: true, matchId: "match-1", logs }),
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
      ({ logs }: { logs: GameLogView[] }) => useCombatPresentation({ connected: true, matchId: "match-1", logs }),
      { initialProps: { logs: [] } },
    );

    act(() => {
      rerender({ logs: [log({ actorId: "target", amount: 1, data: { sourceId: "attacker", hp: 3 } })] });
    });

    expect(result.current.map((effect) => effect.kind)).toEqual(["hit"]);
    Object.defineProperty(window, "matchMedia", { configurable: true, value: originalMatchMedia });
  });

  it("retries a temporarily missing target anchor and presents the cue exactly once", () => {
    document.body.replaceChildren();
    anchor("attacker", 100, 100);
    const { result, rerender } = renderHook(
      ({ logs }) => useCombatPresentation({ connected: true, matchId: "match-1", logs, players }),
      { initialProps: { logs: [] as GameLogView[] } },
    );
    act(() => rerender({ logs: [log({ actorId: "target", amount: 1, data: { sourceId: "attacker" } })] }));
    expect(result.current).toEqual([]);

    anchor("target", 500, 300);
    act(() => vi.advanceTimersByTime(50));
    expect(result.current.filter((effect) => effect.kind === "travel")).toHaveLength(1);
    act(() => vi.advanceTimersByTime(250));
    expect(result.current.filter((effect) => effect.kind === "hit")).toHaveLength(1);
  });

  it("waits briefly for a declared source, then degrades to one target-only outcome", () => {
    document.body.replaceChildren();
    anchor("target", 500, 300);
    const { result, rerender } = renderHook(
      ({ logs }) => useCombatPresentation({ connected: true, matchId: "match-1", logs, players }),
      { initialProps: { logs: [] as GameLogView[] } },
    );
    act(() => rerender({ logs: [log({ actorId: "target", amount: 1, data: { sourceId: "attacker" } })] }));
    expect(result.current).toEqual([]);
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.map((effect) => effect.kind)).toEqual(["hit"]);
    expect(vi.getTimerCount()).toBeGreaterThan(0); // the visible hit still owns its removal timer
  });

  it("adds travel when a declared source anchor appears within the retry bound", () => {
    document.body.replaceChildren();
    anchor("target", 500, 300);
    const { result, rerender } = renderHook(
      ({ logs }) => useCombatPresentation({ connected: true, matchId: "match-1", logs, players }),
      { initialProps: { logs: [] as GameLogView[] } },
    );
    act(() => rerender({ logs: [log({ actorId: "target", amount: 1, data: { sourceId: "attacker" } })] }));
    expect(result.current).toEqual([]);
    anchor("attacker", 100, 100);
    act(() => vi.advanceTimersByTime(50));
    expect(result.current.filter((effect) => effect.kind === "travel")).toHaveLength(1);
  });

  it("drops an effect after bounded target retries and cancels retries on reset", () => {
    document.body.replaceChildren();
    const { result, rerender } = renderHook(
      ({ logs }) => useCombatPresentation({ connected: true, matchId: "match-1", logs, players }),
      { initialProps: { logs: [] as GameLogView[] } },
    );
    act(() => rerender({ logs: [log({ actorId: "target", amount: 1 })] }));
    act(() => rerender({ logs: [] }));
    anchor("target", 500, 300);
    act(() => vi.advanceTimersByTime(370));
    expect(result.current).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels anchor retries on unmount", () => {
    document.body.replaceChildren();
    const { rerender, unmount } = renderHook(
      ({ logs }) => useCombatPresentation({ connected: true, matchId: "match-1", logs, players }),
      { initialProps: { logs: [] as GameLogView[] } },
    );
    act(() => rerender({ logs: [log({ actorId: "target", amount: 1 })] }));
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("skips zero-area duplicate anchors and keeps the first usable DOM match", () => {
    document.body.replaceChildren();
    const zero = document.createElement("div");
    zero.dataset.playerAnchor = "target";
    zero.getBoundingClientRect = () => ({
      x: 0, y: 0, left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}),
    });
    document.body.appendChild(zero);
    anchor("target", 500, 300);
    const { result, rerender } = renderHook(
      ({ logs }) => useCombatPresentation({ connected: true, matchId: "match-1", logs, players }),
      { initialProps: { logs: [] as GameLogView[] } },
    );
    act(() => rerender({ logs: [log({ actorId: "target", amount: 1 })] }));
    expect(result.current.find((effect) => effect.kind === "hit")?.left).toBe(550);
    expect(result.current.find((effect) => effect.kind === "hit")?.top).toBe(340);
  });

  it("preserves every semantic outcome without travel in reduced-motion mode", () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    const { result, rerender } = renderHook(
      ({ logs }) => useCombatPresentation({ connected: true, matchId: "match-1", logs, players }),
      { initialProps: { logs: [] as GameLogView[] } },
    );
    act(() => rerender({ logs: [
      log({ id: "damage", actorId: "target", amount: 2, data: { sourceId: "attacker" } }),
      log({ id: "dodge", eventType: "dodge", actorId: "target", data: { sourceId: "attacker" } }),
      log({ id: "heal", eventType: "heal", actorId: "target", amount: 1 }),
      log({ id: "skill", eventType: "skillUse", actorId: "attacker", skillId: "caocao_jianxiong" }),
      log({ id: "death", eventType: "death", actorId: "target" }),
    ] }));
    act(() => vi.advanceTimersByTime(370));
    expect(result.current.some((effect) => effect.kind === "travel")).toBe(false);
    expect(result.current.find((effect) => effect.kind === "hit")?.amount).toBe(2);
    expect(result.current.some((effect) => effect.kind === "dodge")).toBe(true);
    expect(result.current.find((effect) => effect.kind === "heal")?.amount).toBe(1);
    expect(result.current.find((effect) => effect.kind === "skill")?.label).toBe("พลิกภัยเป็นกล");
    expect(result.current.some((effect) => effect.kind === "death")).toBe(true);
    Object.defineProperty(window, "matchMedia", { configurable: true, value: originalMatchMedia });
  });
});
