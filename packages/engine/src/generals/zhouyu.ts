// SPEC 11 — จิวยี่ (Wu). สง่างามผงาด is a reactive trigger (draw 1 extra);
// กลไส้ศึก is the first active/player-initiated skill (SPEC 12.1's third
// hook shape — see core/activeSkill.ts).
import { registerGeneral } from "./registry";
import { getPlayer, removeFromHand, log } from "../core/state";
import { loseHp } from "../core/damage";

registerGeneral({
  id: "zhouyu",
  faction: "wu",
  gender: "male",
  maxHp: 3,
  skills: [
    {
      id: "zhouyu_yingzi",
      // Mandatory, no prompt: draws +1. Modelled purely as a draw-count query
      // so the whole draw happens in the single draw transaction (ENG-004),
      // plus a notification so the client can banner "สกิลทำงาน". (No `locked`
      // needed — it has no triggers, only queries, which never prompt.)
      queries: {
        drawAmountModifier: (ctx) => {
          const { playerId } = ctx.payload as { playerId: string };
          return ctx.ownerId === playerId ? 1 : 0;
        },
        drawNotifications: (ctx) => {
          const { playerId } = ctx.payload as { playerId: string };
          return ctx.ownerId === playerId ? ["zhouyu_yingzi"] : [];
        },
      },
    },
    {
      id: "zhouyu_fanjian",
      maxPerTurn: 1,
      activeSpec: { minCards: 1, maxCards: 1, targetRule: "oneOther" },
      active: function* (ctx) {
        const { state, ownerId, cardIds, targetIds } = ctx;
        const targetId = targetIds[0];
        const cardId = cardIds[0];
        if (!targetId) throw new Error(`${ownerId}: ไพ่ลวงซ่อนคม needs a target`);
        if (targetId === ownerId) throw new Error(`${ownerId}: cannot target themselves`);
        if (!getPlayer(state, targetId).alive) throw new Error(`${ownerId}: target ${targetId} is not alive`);
        if (!cardId) throw new Error(`${ownerId}: ไพ่ลวงซ่อนคม needs a card`);
        if (!getPlayer(state, ownerId).hand.some((c) => c.id === cardId)) {
          throw new Error(`${ownerId}: ${cardId} is not in hand`);
        }

        const answer = yield {
          kind: "fanjianGuess",
          playerId: targetId,
          data: { fromId: ownerId },
        };
        const guess = answer.choice;

        const card = removeFromHand(state, ownerId, cardId);
        getPlayer(state, targetId).hand.push(card);
        log(state, "skillUse", {
          actorId: ownerId,
          skillId: "zhouyu_fanjian",
          targetIds: [targetId],
          cardId: card.id,
          cardType: card.typeKey,
          data: { suit: card.suit, rank: card.rank },
        });

        if (guess !== card.suit) {
          log(state, "fanjianGuess", { actorId: targetId, data: { correct: false, guess: guess ?? "", actual: card.suit } });
          yield* loseHp(ctx, targetId, 1);
        } else {
          log(state, "fanjianGuess", { actorId: targetId, data: { correct: true } });
        }
      },
    },
  ],
});
