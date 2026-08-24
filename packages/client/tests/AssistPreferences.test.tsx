import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { AssistPreferencesButton } from "../src/components/AssistPreferences";
import { useAssistStore } from "../src/store/assistStore";

describe("AssistPreferencesButton", () => {
  beforeEach(() => {
    localStorage.clear();
    useAssistStore.setState({ level: "basic", walkthrough: { status: "new", step: 0 } });
  });

  it("lets the player change their assistance level", async () => {
    const user = userEvent.setup();
    render(<AssistPreferencesButton />);

    await user.click(screen.getByRole("button", { name: "ตั้งค่าคำแนะนำ" }));
    expect(screen.getByRole("dialog", { name: "ตั้งค่าคำแนะนำ" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /ละเอียด/ }));

    expect(useAssistStore.getState().level).toBe("detailed");
  });

  it("recommends detailed help without overriding the player and can replay the table guide", async () => {
    const user = userEvent.setup();
    useAssistStore.setState({ walkthrough: { status: "completed", step: 3 } });
    render(<AssistPreferencesButton recommendedDetailed />);

    await user.click(screen.getByRole("button", { name: "ตั้งค่าคำแนะนำ" }));
    expect(screen.getByText(/ห้องผู้เริ่มต้นแนะนำระดับ “ละเอียด”/)).toBeInTheDocument();
    expect(useAssistStore.getState().level).toBe("basic");
    await user.click(screen.getByRole("button", { name: "ดูคำแนะนำโต๊ะอีกครั้ง" }));

    expect(useAssistStore.getState().walkthrough).toEqual({ status: "active", step: 0 });
  });

  it("lets experienced players turn assistance off immediately", async () => {
    const user = userEvent.setup();
    render(<AssistPreferencesButton />);
    await user.click(screen.getByRole("button", { name: "ตั้งค่าคำแนะนำ" }));
    await user.click(screen.getByRole("radio", { name: /ปิด/ }));

    expect(useAssistStore.getState().level).toBe("off");
    expect(screen.getByRole("button", { name: "ดูคำแนะนำโต๊ะอีกครั้ง" })).toBeDisabled();
  });
});
