import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RulesModal } from "../src/components/RulesModal";

describe("RulesModal", () => {
  it("lets the player switch from the quick-start overview to the card guide", async () => {
    const user = userEvent.setup();
    render(<RulesModal onClose={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "บทบาท & เงื่อนไขชนะ" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "คู่มือการ์ด" }));

    expect(screen.getByRole("heading", { name: "ความหมายของการ์ด" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "บทบาท & เงื่อนไขชนะ" })).not.toBeInTheDocument();
  });
});
