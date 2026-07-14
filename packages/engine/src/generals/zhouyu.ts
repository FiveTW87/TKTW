// SPEC 11 — จิวยี่ (Wu). สง่างามผงาด is a reactive trigger (draw 1 extra);
// กลไส้ศึก is the first active/player-initiated skill (SPEC 12.1's third
// hook shape — see core/activeSkill.ts).
import { registerGeneral } from "./registry";
import { drawCards, getPlayer, removeFromHand, log } from "../core/state";
import { loseHp } from "../core/damage";

registerGeneral({
  id: "zhouyu",
  faction: "wu",
  gender: "male",
  maxHp: 3,
  skills: [
    {
      id: "zhouyu_yingzi",
      triggers: {
        DrawPhaseStart: function* (ctx) {
          const { state, rng, ownerId, payload } = ctx;
          const { playerId } = payload as { playerId: string };
          if (ownerId !== playerId) return;
          drawCards(state, rng, ownerId, 1);
          log(state, `${ownerId} จั่วเพิ่ม 1 ใบ (สง่างามผงาด)`);
        },
      },
    },
    {
      id: "zhouyu_fanjian",
      maxPerTurn: 1,
      active: function* (ctx) {
        const { state, ownerId, cardIds, targetIds } = ctx;
        const targetId = targetIds[0];
        const cardId = cardIds[0];
        if (!targetId || !cardId) return;

        const answer = yield {
          kind: "fanjianGuess",
          playerId: targetId,
          data: { fromId: ownerId },
        };
        const guess = answer.choice;

        const card = removeFromHand(state, ownerId, cardId);
        getPlayer(state, targetId).hand.push(card);
        log(state, `${targetId} ได้การ์ด ${card.typeKey} จาก ${ownerId} (กลไส้ศึก)`);

        if (guess !== card.suit) {
          log(state, `${targetId} ทายดอกผิด (ทาย ${guess ?? "?"}, จริง ${card.suit})`);
          yield* loseHp(ctx, targetId, 1);
        } else {
          log(state, `${targetId} ทายดอกถูก`);
        }
      },
    },
  ],
});
