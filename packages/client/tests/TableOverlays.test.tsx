import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TableOverlays, TableRecoveryPanel, type TableOverlayViewModel } from "../src/components/board/TableOverlays";

function overlayModel(overrides: Partial<TableOverlayViewModel> = {}): TableOverlayViewModel {
  return {
    toast: null,
    combatEffects: [],
    generalPick: null,
    notice: null,
    decision: null,
    playerInspection: null,
    cardInspection: null,
    death: null,
    leaveConfirm: null,
    playChoice: null,
    discard: null,
    diagnostics: { open: false, lines: [], error: null, onToggle: vi.fn() },
    ...overrides,
  };
}

describe("TableOverlays", () => {
  it("keeps status siblings wrapper-free and shows the urgent countdown state", () => {
    const { container } = render(
      <TableOverlays model={overlayModel({
        generalPick: { playerName: "ผู้เล่นสอง", remainingSeconds: 4 },
        notice: "เลือกเป้าหมายก่อน",
      })} />,
    );

    expect(screen.getByText("รอ ผู้เล่นสอง เลือกนายพล...")).toBeInTheDocument();
    expect(screen.getByText("เหลือ 4 วิ")).toHaveStyle({ color: "var(--target-red)" });
    expect(screen.getByText("เลือกเป้าหมายก่อน")).toBeInTheDocument();
    expect(container.children).toHaveLength(3);
    expect(container.firstElementChild).toHaveClass("anim-rise");
    expect(container.lastElementChild?.tagName).toBe("BUTTON");
  });

  it("routes leave confirmation and diagnostic toggle intents", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const onToggle = vi.fn();
    render(
      <TableOverlays model={overlayModel({
        leaveConfirm: { onConfirm, onCancel },
        diagnostics: { open: false, lines: [], error: null, onToggle },
      })} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByTitle("แสดง/ซ่อน debug log"));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("keeps diagnostic entries newest-first and preserves error colors", () => {
    render(
      <TableOverlays model={overlayModel({
        diagnostics: {
          open: true,
          lines: ["first", "✗ latest failure"],
          error: "socket closed",
          onToggle: vi.fn(),
        },
      })} />,
    );

    expect(screen.getByText("error: socket closed")).toBeInTheDocument();
    const latest = screen.getByText("✗ latest failure");
    expect(latest).toHaveStyle({ color: "#ff9a8a" });
    expect(latest.compareDocumentPosition(screen.getByText("first")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("TableRecoveryPanel", () => {
  it("shows the newest trace first and exposes both recovery commands", () => {
    const onReload = vi.fn();
    const onLeave = vi.fn();
    render(<TableRecoveryPanel debugLines={["older", "newer"]} onReload={onReload} onLeave={onLeave} />);

    expect(screen.getByText("เกมค้าง — ไม่มีตาให้เล่น")).toBeInTheDocument();
    const newer = screen.getByText("newer");
    expect(newer.compareDocumentPosition(screen.getByText("older")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "รีเฟรช" }));
    fireEvent.click(screen.getByRole("button", { name: "ออกจากห้อง" }));
    expect(onReload).toHaveBeenCalledOnce();
    expect(onLeave).toHaveBeenCalledOnce();
  });
});
