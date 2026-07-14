// SPEC 11 — กำเหลง (Wu). Card conversion: black -> counts as ข้ามสะพานแล้วรื้อทิ้ง
import { registerGeneral } from "./registry";
import { colorOf, type Card } from "../types";

registerGeneral({
  id: "ganning",
  faction: "wu",
  gender: "male",
  maxHp: 4,
  skills: [
    {
      id: "ganning_qixi",
      queries: {
        canConvertCard: (ctx) => {
          const { playerId, card, asType } = ctx.payload as {
            playerId: string;
            card: Card;
            asType: string;
          };
          if (ctx.ownerId !== playerId) return false;
          return asType === "guohe" && colorOf(card.suit) === "black";
        },
      },
    },
  ],
});
