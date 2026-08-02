import { describe, expect, it } from "vitest";
import { generalArt } from "../src/data/generalArt";

describe("generalArt", () => {
  it("maps an engine general id to its web portrait, full-body art, and faction scene", () => {
    expect(generalArt("caocao", "wei")).toEqual({
      portrait: "/assets/generals/cao_cao_head.webp",
      fullBody: "/assets/generals/cao_cao.webp",
      background: "/assets/factions/wei_background.webp",
    });
  });

  it("keeps an unknown or hidden general safe while retaining the faction scene", () => {
    expect(generalArt("", "shu")).toEqual({
      portrait: undefined,
      fullBody: undefined,
      background: "/assets/factions/shu_background.webp",
    });
  });
});
