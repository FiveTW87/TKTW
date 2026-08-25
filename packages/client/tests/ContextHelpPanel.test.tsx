import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContextHelpPanel } from "../src/components/board/ContextHelpPanel";
import type { ContextHelpViewModel } from "../src/data/contextHelp";

const model: ContextHelpViewModel = {
  kind: "context",
  title: "เฟสลงการ์ดของคุณ",
  summary: "เลือกการ์ดหรือสกิลที่ใช้ได้ หรือจบเฟสเมื่อพร้อม",
  unavailable: [
    { key: "card:sha:no_legal_target", label: "จู่โจม", reason: "ตอนนี้ไม่มีเป้าหมายที่ถูกกติกา" },
  ],
};

describe("ContextHelpPanel", () => {
  it("renders nothing when assistance is Off", () => {
    const { container } = render(<ContextHelpPanel model={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("stays compact until requested and exposes detailed reasons accessibly", () => {
    render(<ContextHelpPanel model={model} />);

    const region = screen.getByRole("region", { name: "คำแนะนำจังหวะปัจจุบัน" });
    expect(region).toHaveClass("table-context-help");
    const toggle = screen.getByText("คำแนะนำ");
    expect(screen.queryByText(model.summary)).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByText("เฟสลงการ์ดของคุณ")).toBeInTheDocument();
    expect(screen.getByText(model.summary)).toBeInTheDocument();
    expect(screen.getByText("จู่โจม")).toBeInTheDocument();
    expect(screen.getByText("ตอนนี้ไม่มีเป้าหมายที่ถูกกติกา")).toBeInTheDocument();
  });

  it("does not advertise unavailable choices at Basic level", () => {
    render(<ContextHelpPanel model={{ ...model, unavailable: [] }} />);
    fireEvent.click(screen.getByText("คำแนะนำ"));
    expect(screen.queryByText("ยังใช้ไม่ได้ตอนนี้")).not.toBeInTheDocument();
  });
});
