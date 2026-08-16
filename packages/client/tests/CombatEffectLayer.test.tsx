import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CombatEffectLayer } from "../src/components/board/CombatEffectLayer";
import type { CombatEffect } from "../src/hooks/useCombatPresentation";

describe("CombatEffectLayer", () => {
  it.each([
    ["travel", "/assets/generals/cao_cao_attack-v1.png"],
    ["hit", "/assets/generals/cao_cao_hit-v1.png"],
    ["skill", "/assets/generals/cao_cao_skill-v1.png"],
  ] as const)("renders the %s pose behind the existing combat cue", (kind, poseArt) => {
    const common = {
      id: `effect-${kind}`,
      left: 120,
      top: 80,
      angleDeg: 0,
      poseArt,
      posePlayerId: "p1",
      poseScale: 0.92,
      poseOffsetX: 2,
      poseOffsetY: 4,
    };
    const effect: CombatEffect = kind === "travel"
      ? { ...common, kind, distance: 240 }
      : kind === "hit"
        ? { ...common, kind, amount: 1 }
        : { ...common, kind, label: "พลิกภัยเป็นกล" };

    render(<CombatEffectLayer effects={[effect]} />);

    const image = document.body.querySelector<HTMLImageElement>(`.combat-character-pose-${kind}`);
    expect(image?.getAttribute("src")).toBe(poseArt);
    expect(image?.style.getPropertyValue("--pose-scale")).toBe("0.92");
    expect(image?.style.getPropertyValue("--pose-offset-x")).toBe("2px");
    expect(image?.style.getPropertyValue("--pose-offset-y")).toBe("4px");
    expect(document.body.querySelector(`.combat-effect-${kind}`)).not.toBeNull();
  });

  it("falls back to idle art when an action image cannot be loaded", () => {
    const effect: CombatEffect = {
      id: "effect-fallback",
      kind: "hit",
      left: 120,
      top: 80,
      angleDeg: 0,
      amount: 1,
      poseArt: "/missing.png",
      poseFallbackArt: "/assets/generals/cao_cao.webp",
      posePlayerId: "p1",
    };

    render(<CombatEffectLayer effects={[effect]} />);
    const image = document.body.querySelector<HTMLImageElement>(".combat-character-pose-hit");
    expect(image).not.toBeNull();
    fireEvent.error(image!);
    expect(image?.getAttribute("src")).toBe("/assets/generals/cao_cao.webp");
    fireEvent.error(image!);
    expect(image?.hidden).toBe(true);
  });
});
