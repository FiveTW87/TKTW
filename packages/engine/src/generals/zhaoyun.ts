// SPEC 11 — จูล่ง (Shu). "ใจมังกร" — สังหาร <-> หลบ interchangeable. The
// flagship example from the original design doc: now that card-conversion
// is consulted at both reactive AND main-action play points, this works in
// both directions (play a หลบ as สังหาร on his turn; play a สังหาร as หลบ
// when responding).
import { registerGeneral } from "./registry";
import type { Card } from "../types";

registerGeneral({
  id: "zhaoyun",
  faction: "shu",
  gender: "male",
  maxHp: 4,
  skills: [
    {
      id: "zhaoyun_longdan",
      queries: {
        canConvertCard: (ctx) => {
          const { playerId, card, asType } = ctx.payload as {
            playerId: string;
            card: Card;
            asType: string;
          };
          if (ctx.ownerId !== playerId) return false;
          return (
            (card.typeKey === "shan" && asType === "sha") ||
            (card.typeKey === "sha" && asType === "shan")
          );
        },
      },
    },
  ],
});
