import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TableActionCluster, TableUtilityRail, type TableActionViewModel } from "../src/components/board/TableControls";
import { useSfxStore } from "../src/store/sfxStore";

describe("TableActionCluster", () => {
  it("renders nothing for the hidden variant", () => {
    const { container } = render(<TableActionCluster action={{ kind: "hidden" }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders confirm as the only primary action and routes both commands", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const action: TableActionViewModel = {
      kind: "confirm",
      caption: "เลือกเป้าหมาย",
      busy: false,
      enabled: true,
      onCancel,
      onConfirm,
    };
    const { container } = render(<TableActionCluster action={action} />);

    expect(container.querySelectorAll(".table-action-cluster")).toHaveLength(1);
    expect(screen.getByText("เลือกเป้าหมาย")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));
    fireEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("gates confirm and discard buttons with the typed counts", () => {
    const { rerender } = render(
      <TableActionCluster action={{ kind: "confirm", caption: "ยังไม่ครบ", busy: false, enabled: false, onCancel: vi.fn(), onConfirm: vi.fn() }} />,
    );
    expect(screen.getByRole("button", { name: "ยืนยัน" })).toBeDisabled();

    rerender(<TableActionCluster action={{ kind: "discard", selectedCount: 1, requiredCount: 2, busy: false, onSubmit: vi.fn() }} />);
    expect(screen.getByText("การ์ดเกินมือ — ทิ้ง 1/2 ใบ")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ทิ้ง 1/2" })).toBeDisabled();
  });

  it("renders the end-phase caption and command", () => {
    const onSubmit = vi.fn();
    render(<TableActionCluster action={{ kind: "endPhase", turnNumber: 8, busy: false, onSubmit }} />);
    expect(screen.getByText("เทิร์นที่ 8")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "จบเทิร์น" });
    expect(button).toHaveClass("table-end-turn");
    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});

describe("TableUtilityRail", () => {
  beforeEach(() => {
    useSfxStore.setState({ muted: false, volume: 0.6 });
  });

  it("preserves the rail shape and routes leave and sound preferences", () => {
    const onRequestLeave = vi.fn();
    const { container } = render(<TableUtilityRail onRequestLeave={onRequestLeave} />);
    const rail = container.querySelector("nav.table-utility-rail");
    expect(rail).not.toBeNull();
    expect(rail?.children).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "ตั้งค่าเสียง" }));
    fireEvent.click(screen.getByRole("button", { name: "ปิดเสียง" }));
    expect(useSfxStore.getState().muted).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "ออกจากเกม" }));
    expect(onRequestLeave).toHaveBeenCalledOnce();
  });
});
