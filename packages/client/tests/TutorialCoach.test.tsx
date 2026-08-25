import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { acceptedActionChannel } from "../src/lib/acceptedActionChannel";
import { TutorialCoach } from "../src/tutorial/TutorialCoach";

describe("TutorialCoach", () => {
  beforeEach(() => localStorage.clear());

  it("advances from acknowledged real actions, recovers a wrong action, and exposes lesson navigation", async () => {
    const user = userEvent.setup();
    const onRestart = vi.fn();
    const onNext = vi.fn();
    render(<TutorialCoach scenarioId="basic-turn" onExit={vi.fn()} onRestart={onRestart} onNext={onNext} />);

    expect(screen.getByRole("status", { name: "บทฝึกสอน" })).toHaveTextContent("ขั้น 1/3");
    expect(screen.getByText("แตะกองจั่วเพื่อจั่วการ์ด 2 ใบ")).toBeInTheDocument();

    acceptedActionChannel.publish({
      acceptedAnswer: { decisionId: "draw", choice: "draw" },
      legalActions: [{ kind: "draw" }],
    });
    await waitFor(() => expect(screen.getByText(/เลือกการ์ดจู่โจม/)).toBeInTheDocument());

    acceptedActionChannel.publish({
      acceptedAnswer: { decisionId: "wrong", choice: "endPhase" },
      legalActions: [{ kind: "playCard", options: [{
        source: "literal",
        typeKey: "sha",
        selectableCardIds: ["sha-card"],
        minCards: 1,
        maxCards: 1,
        exactCards: 1,
        targeting: { kind: "independent", minTargets: 1, maxTargets: 1, eligibleTargetIds: ["p1"] },
        available: true,
      }] }, { kind: "endPhase" }],
    });
    expect(await screen.findByText("การกระทำนี้ไม่ตรงกับขั้นฝึก ลองเริ่มสถานการณ์นี้ใหม่ได้ทันที")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "เริ่มสถานการณ์ใหม่" }));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it("resumes an accepted step boundary when the same tutorial room reconnects", () => {
    localStorage.setItem("tktw_tutorial_progress:basic-turn", JSON.stringify({
      schemaVersion: 1,
      scenarioId: "basic-turn",
      scenarioVersion: 1,
      status: "active",
      stepIndex: 1,
    }));
    render(<TutorialCoach scenarioId="basic-turn" onExit={vi.fn()} onRestart={vi.fn()} onNext={vi.fn()} />);
    expect(screen.getByRole("status", { name: "บทฝึกสอน" })).toHaveTextContent("ขั้น 2/3");
    expect(screen.getByText(/เลือกการ์ดจู่โจม/)).toBeInTheDocument();
  });
});
