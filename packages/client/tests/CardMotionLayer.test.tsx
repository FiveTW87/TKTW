import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardMotionLayer } from "../src/components/board/CardMotionLayer";
import type { CardMotionEffect } from "../src/hooks/useCardMotionPresentation";

function effect(overrides: Partial<CardMotionEffect> = {}): CardMotionEffect {
  return {
    id: "motion-1",
    motion: "play",
    fromX: 100,
    fromY: 100,
    toX: 400,
    toY: 200,
    reduced: false,
    ...overrides,
  };
}

describe("CardMotionLayer", () => {
  it("renders public card art in a pointer-transparent portal", () => {
    render(<CardMotionLayer effects={[effect({ cardType: "sha" })]} />);
    const layer = screen.getByTestId("card-motion-layer");
    expect(layer).toHaveStyle({ pointerEvents: "none" });
    expect(layer.parentElement).toBe(document.body);
    expect(screen.getByLabelText("การ์ดเคลื่อนที่ จู่โจม")).toHaveClass("card-motion-token-play");
    expect(layer.querySelector("img")).toHaveAttribute("src", "/assets/cards/sha.png");
  });

  it("keeps hidden movement anonymous and communicates card count", () => {
    render(<CardMotionLayer effects={[effect({ motion: "steal", anonymous: true, amount: 2 })]} />);
    expect(screen.getByLabelText("การ์ดไม่เปิดเผยเคลื่อนที่ 2 ใบ")).toHaveClass("card-motion-anonymous");
    expect(screen.getByText("×2")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("marks reduced-motion effects as destination cues", () => {
    render(<CardMotionLayer effects={[effect({ reduced: true, motion: "equip", cardType: "bagua" })]} />);
    expect(screen.getByLabelText("การ์ดเคลื่อนที่ ค่ายกลแปดทิศ")).toHaveClass("card-motion-reduced");
  });
});
