import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TableFeedbackLayer } from "../src/components/board/TableFeedbackLayer";

describe("TableFeedbackLayer", () => {
  it("renders judgment stages, Wuxie depth/result, turn and phase as distinct pointer-transparent cues", () => {
    render(<TableFeedbackLayer cues={[
      { id: "j0", kind: "judgmentReveal", playerId: "p1", cardType: "tao", suit: "heart", rank: 8, reason: "bagua" },
      { id: "j1", kind: "judgmentReplace", actorId: "p2", playerId: "p1", cardType: "sha", suit: "spade", rank: 7 },
      { id: "w0", kind: "wuxieCounter", actorId: "p3", targetType: "juedou", depth: 2 },
      { id: "w1", kind: "wuxieResult", actorId: "p0", targetType: "juedou", effective: false },
      { id: "t2", kind: "turn", turnNumber: 2, playerName: "โจโฉ" },
      { id: "p2", kind: "phase", turnNumber: 2, phase: "draw" },
    ]} />);

    const layer = screen.getByTestId("table-feedback-layer");
    expect(layer).toHaveStyle({ pointerEvents: "none" });
    expect(layer.parentElement).toBe(document.body);
    expect(screen.getByText("เปิดไพ่ตัดสิน")).toBeInTheDocument();
    expect(screen.getByText("เปลี่ยนผลตัดสิน")).toBeInTheDocument();
    expect(screen.getByText("โต้ไร้เทียมทาน · ชั้น 2")).toBeInTheDocument();
    expect(screen.getByText("กลอุบายถูกยกเลิก")).toBeInTheDocument();
    expect(screen.getByText("เทิร์น 2 · โจโฉ")).toBeInTheDocument();
    expect(screen.getByText("เฟสจั่วไพ่")).toBeInTheDocument();
    expect(screen.getByText(/^♥ 8 ·/)).toBeInTheDocument();
  });

  it("renders nothing when there are no cues", () => {
    const { container } = render(<TableFeedbackLayer cues={[]} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId("table-feedback-layer")).not.toBeInTheDocument();
  });
});
