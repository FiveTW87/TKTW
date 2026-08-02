import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PlayerView } from "@tktw/shared";
import { GameErrorPopup } from "../src/components/GameErrorPopup";

describe("GameErrorPopup", () => {
  it("shows friendly copy and can be dismissed", async () => {
    const onDismiss = vi.fn();
    const players = [{ id: "p2", name: "ลิโป้" }] as PlayerView[];
    render(<GameErrorPopup error="p0: target p2 is out of range for sha" players={players} onDismiss={onDismiss} />);

    expect(screen.getByRole("alert", { name: "เป้าหมายอยู่นอกระยะ" })).toBeInTheDocument();
    expect(screen.getByText(/ลิโป้.*จู่โจม/)).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "ปิดข้อความแจ้งเตือน" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
