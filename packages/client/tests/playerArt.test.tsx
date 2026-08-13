import { fireEvent, render, screen } from "@testing-library/react";
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

  it("uses the themed tooltip instead of a native title for equipment icons", () => {
    render(
      <PlayerTile
        player={{
          id: "p0",
          seat: 0,
          name: "Alice",
          generalId: "zhaoyun",
          faction: "shu",
          gender: "male",
          hp: 4,
          maxHp: 4,
          alive: true,
          hand: { count: 3 },
          equipment: { weapon: { id: "weapon-1", typeKey: "qinglong", suit: "spade", rank: 5 } },
          judgmentZone: [],
          shaUsedThisTurn: 0,
          skillUsedThisTurn: {},
        }}
        isCurrentTurn={false}
      />,
    );

    const icon = screen.getByLabelText("อาวุธ: ง้าวมังกรเขียว");
    expect(icon).not.toHaveAttribute("title");
    fireEvent.mouseEnter(icon);
    expect(screen.getByRole("tooltip")).toHaveTextContent("ง้าวมังกรเขียว");
  });

  it("uses the themed tooltip for delayed trick icons", () => {
    render(
      <PlayerTile
        player={{
          id: "p0",
          seat: 0,
          name: "Alice",
          generalId: "zhaoyun",
          faction: "shu",
          gender: "male",
          hp: 4,
          maxHp: 4,
          alive: true,
          hand: { count: 3 },
          equipment: {},
          judgmentZone: [{ id: "delay-1", typeKey: "shandian", suit: "spade", rank: 9 }],
          shaUsedThisTurn: 0,
          skillUsedThisTurn: {},
        }}
        isCurrentTurn={false}
      />,
    );

    const delayedTrick = screen.getByLabelText(/อุบายรอเวลา:/);
    expect(delayedTrick).not.toHaveAttribute("title");
    fireEvent.mouseEnter(delayedTrick);
    expect(screen.getByRole("tooltip")).toHaveTextContent("อสนีบาตเวียนค่าย");
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

  it("shows approved card artwork for equipped items", () => {
    render(
      <InspectModal
        player={{
          id: "p0",
          seat: 0,
          name: "Alice",
          generalId: "lubu",
          faction: "qun",
          gender: "male",
          hp: 4,
          maxHp: 4,
          alive: true,
          hand: { count: 1 },
          equipment: { weapon: { id: "weapon-1", typeKey: "qilin", suit: "heart", rank: 5 } },
          judgmentZone: [],
          shaUsedThisTurn: 0,
          skillUsedThisTurn: {},
        }}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByRole("img", { name: "ภาพการ์ด ธนูกิเลน" })).toHaveAttribute(
      "src",
      "/assets/cards/qilin.png",
    );
  });
});
