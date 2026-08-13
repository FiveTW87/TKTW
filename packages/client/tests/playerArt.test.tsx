import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlayerTile } from "../src/components/PlayerTile";
import { InspectModal } from "../src/components/InspectModal";

describe("PlayerTile character art", () => {
  it("shows the approved head portrait for a revealed general", () => {
    render(
      <PlayerTile
        player={{
          id: "p1",
          seat: 1,
          name: "Bob",
          generalId: "caocao",
          faction: "wei",
          gender: "male",
          hp: 4,
          maxHp: 4,
          alive: true,
          hand: { count: 3 },
          equipment: {},
          judgmentZone: [],
          shaUsedThisTurn: 0,
          skillUsedThisTurn: {},
        }}
        isCurrentTurn={false}
      />,
    );

    expect(screen.getByRole("img", { name: "ภาพตัวละคร โจโฉ" })).toHaveAttribute(
      "src",
      "/assets/generals/cao_cao_head.webp",
    );
    expect(screen.getByLabelText("ฝ่ายวุย")).toHaveTextContent("วุย");
  });

  it("keeps the faction readable in the 9–10 player head layout", () => {
    render(
      <PlayerTile
        player={{
          id: "p2",
          seat: 2,
          name: "Lu Bu",
          generalId: "lubu",
          faction: "qun",
          gender: "male",
          hp: 4,
          maxHp: 4,
          alive: true,
          hand: { count: 2 },
          equipment: {},
          judgmentZone: [],
          shaUsedThisTurn: 0,
          skillUsedThisTurn: {},
        }}
        isCurrentTurn={false}
        density="head"
      />,
    );

    expect(screen.getByLabelText("ฝ่ายกลุ่มอิสระ")).toHaveTextContent("อิสระ");
  });

  it("shows the viewer's own hidden role seal when the projection includes it", () => {
    render(
      <PlayerTile
        player={{
          id: "p0",
          seat: 0,
          name: "Alice",
          generalId: "zhaoyun",
          faction: "shu",
          gender: "male",
          role: "traitor",
          roleRevealed: false,
          hp: 4,
          maxHp: 4,
          alive: true,
          hand: { count: 3 },
          equipment: {},
          judgmentZone: [],
          shaUsedThisTurn: 0,
          skillUsedThisTurn: {},
        }}
        isCurrentTurn={false}
      />,
    );

    expect(screen.getByTitle("ไส้ศึก")).toHaveTextContent("內");
  });
});

describe("InspectModal character art", () => {
  it("uses the full-body character and faction scene in the player detail view", () => {
    render(
      <InspectModal
        player={{
          id: "p1",
          seat: 1,
          name: "Bob",
          generalId: "caocao",
          faction: "wei",
          gender: "male",
          hp: 3,
          maxHp: 4,
          alive: true,
          hand: { count: 3 },
          equipment: {},
          judgmentZone: [],
          shaUsedThisTurn: 0,
          skillUsedThisTurn: {},
        }}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByRole("dialog", { name: "รายละเอียด โจโฉ" })).toHaveStyle({
      backgroundImage: "url(/assets/factions/wei_background.webp)",
    });
    expect(screen.getByRole("img", { name: "ภาพเต็มตัว โจโฉ" })).toHaveAttribute(
      "src",
      "/assets/generals/cao_cao.webp",
    );
  });

  it("shows the viewer's own hidden identity when the projected player includes it", () => {
    render(
      <InspectModal
        player={{
          id: "p0",
          seat: 0,
          name: "Alice",
          generalId: "zhaoyun",
          faction: "shu",
          gender: "male",
          role: "traitor",
          roleRevealed: false,
          hp: 4,
          maxHp: 4,
          alive: true,
          hand: { count: 3 },
          equipment: {},
          judgmentZone: [],
          shaUsedThisTurn: 0,
          skillUsedThisTurn: {},
        }}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByText("ไส้ศึก")).toBeInTheDocument();
    expect(screen.queryByText("บทบาทปกปิด")).not.toBeInTheDocument();
  });
});
