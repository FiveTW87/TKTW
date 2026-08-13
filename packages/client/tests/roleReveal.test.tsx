import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PlayerView } from "@tktw/shared";
import { RoleRevealModal } from "../src/components/RoleRevealModal";

function player(role: "lord" | "loyalist" | "rebel" | "traitor"): PlayerView {
  return {
    id: "p0",
    seat: 0,
    name: "Alice",
    generalId: "caocao",
    faction: "wei",
    gender: "male",
    role,
    roleRevealed: role === "lord",
    hp: 4,
    maxHp: 4,
    alive: true,
    hand: { count: 0 },
    equipment: {},
    judgmentZone: [],
    shaUsedThisTurn: 0,
    skillUsedThisTurn: {},
  };
}

describe("RoleRevealModal role palette", () => {
  it.each([
    ["lord", "seal-lord", "เจ้าเมือง"],
    ["loyalist", "seal-loyalist", "ขุนนางภักดี"],
    ["rebel", "seal-rebel", "กบฏ"],
    ["traitor", "seal-traitor", "ไส้ศึก"],
  ] as const)("uses the semantic colour class for %s", (role, className, label) => {
    const { container, unmount } = render(<RoleRevealModal me={player(role)} />);
    expect(container.querySelector(".role-reveal-modal")).toHaveClass(className);
    expect(screen.getByText(label)).toBeInTheDocument();
    unmount();
  });
});
