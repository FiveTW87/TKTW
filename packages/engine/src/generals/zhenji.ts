// SPEC 11 — เอียนสี (Wei). Card conversion (black -> shan) + a judge-loop
// passive that reuses runJudgment/JudgmentBox, retrieving the card back out
// of the discard pile since runJudgment unconditionally discards it there.
import { registerGeneral } from "./registry";
import { colorOf, type Card } from "../types";
import { runJudgment } from "../core/judgment";
import { getPlayer, log } from "../core/state";

registerGeneral({
  id: "zhenji",
  faction: "wei",
  gender: "female",
  maxHp: 3,
  skills: [
    {
      id: "zhenji_guose",
      queries: {
        canConvertCard: (ctx) => {
          const { playerId, card, asType } = ctx.payload as {
            playerId: string;
            card: Card;
            asType: string;
          };
          if (ctx.ownerId !== playerId) return false;
          return asType === "shan" && colorOf(card.suit) === "black";
        },
      },
    },
    {
      id: "zhenji_luoshen",
      triggers: {
        TurnStart: function* (ctx) {
          const { state, ownerId, payload } = ctx;
          const { playerId } = payload as { playerId: string };
          if (ownerId !== playerId) return;
          for (;;) {
            const judged = yield* runJudgment(ctx, ownerId);
            if (colorOf(judged.suit) !== "black") break;
            const idx = state.discardPile.findIndex((c) => c.id === judged.id);
            if (idx < 0) break;
            const [card] = state.discardPile.splice(idx, 1);
            getPlayer(state, ownerId).hand.push(card!);
            log(state, `${ownerId} เก็บ ${card!.typeKey} จากเทพีลั่วสุ่ย — ตัดสินซ้ำ`);
          }
        },
      },
    },
  ],
});
