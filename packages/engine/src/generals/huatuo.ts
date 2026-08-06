// SPEC 11 — ฮัวโต๋ (Qun). jiuxing's red→tao conversion is scoped to when it
// is NOT Hua Tuo's own turn ("นอกเทิร์นตัวเอง"). We check the active turn
// player rather than the play-context tag, because the reactive dying-rescue
// path can still happen on his own turn (e.g. losing a duel he started) and
// SPEC forbids converting then too.
import { registerGeneral } from "./registry";
import { colorOf, type Card } from "../types";
import { heal } from "../core/damage";
import { discardFromHand, getPlayer, log } from "../core/state";

registerGeneral({
  id: "huatuo",
  faction: "qun",
  gender: "male",
  maxHp: 3,
  skills: [
    {
      id: "huatuo_qingnang",
      maxPerTurn: 1,
      active: function* (ctx) {
        const { state, ownerId, cardIds, targetIds } = ctx;
        const targetId = targetIds[0];
        const cid = cardIds[0];
        // Self-targeting is deliberately still allowed here — he may heal
        // himself with this same skill (unlike jieyuan/fanjian, which name
        // another player by definition).
        if (!targetId) throw new Error(`${ownerId}: คัมภีร์ถุงเขียว needs a target`);
        const target = getPlayer(state, targetId);
        if (!target.alive) throw new Error(`${ownerId}: target ${targetId} is not alive`);
        if (target.hp >= target.maxHp) throw new Error(`${ownerId}: cannot heal a full-hp target`);
        if (!cid) throw new Error(`${ownerId}: คัมภีร์ถุงเขียว needs a card`);
        if (!getPlayer(state, ownerId).hand.some((c) => c.id === cid)) {
          throw new Error(`${ownerId}: ${cid} is not in hand`);
        }
        discardFromHand(state, ownerId, cid);
        yield* heal(ctx, targetId, 1, ownerId);
        log(state, "skillUse", { actorId: ownerId, skillId: "huatuo_qingnang", targetIds: [targetId], amount: 1 });
      },
    },
    {
      id: "huatuo_jiuxing",
      queries: {
        canConvertCard: (ctx) => {
          const { playerId, card, asType } = ctx.payload as {
            playerId: string;
            card: Card;
            asType: string;
          };
          if (ctx.ownerId !== playerId) return false;
          if (asType !== "tao" || colorOf(card.suit) !== "red") return false;
          // Only when it isn't Hua Tuo's own turn.
          const activeId = ctx.state.players.find((p) => p.seat === ctx.state.currentSeat)?.id;
          return activeId !== ctx.ownerId;
        },
      },
    },
  ],
});
