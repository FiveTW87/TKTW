// SPEC 11 — กวนอู (Shu). Card conversion: red card -> counts as สังหาร,
// but only for Guan Yu himself (canConvertCard payload carries the
// submitting playerId precisely so this doesn't leak to everyone).
import { registerGeneral } from "./registry";
import { colorOf, type Card } from "../types";

registerGeneral({
  id: "guanyu",
  faction: "shu",
  gender: "male",
  maxHp: 4,
  skills: [
    {
      id: "guanyu_wusheng",
      queries: {
        canConvertCard: (ctx) => {
          const { playerId, card, asType } = ctx.payload as {
            playerId: string;
            card: Card;
            asType: string;
          };
          if (ctx.ownerId !== playerId) return false;
          return asType === "sha" && colorOf(card.suit) === "red";
        },
      },
    },
  ],
});
