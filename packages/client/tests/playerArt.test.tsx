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
});
