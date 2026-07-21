// SPEC 11 — สุมาอี้ (Wei). fankui is the tier-A-shaped OnDamaged steal.
// guicai ("อัจฉริยะปีศาจ") is the hard one (TC-3): it lets Sima Yi replace
// *anyone's* judgment card with one from his own hand — locked so its own
// "shenjiPick" decision (with its own pass semantics) is the only prompt,
// not a redundant generic activateSkill ask on top of it.
import { registerGeneral } from "./registry";
import type { JudgmentBox } from "../core/judgment";
import { getPlayer, removeFromHand, log } from "../core/state";

registerGeneral({
  id: "simayi",
  faction: "wei",
  gender: "male",
  maxHp: 3,
  skills: [
    {
      id: "simayi_fankui",
      triggers: {
        OnDamaged: function* (ctx) {
          const { state, ownerId, payload } = ctx;
          const { targetId, sourceId } = payload as { targetId: string; sourceId?: string };
          if (ownerId !== targetId || !sourceId) return;
          const attacker = getPlayer(state, sourceId);
          if (!attacker.alive || attacker.hand.length === 0) return;
          const answer = yield { kind: "fankuiPick", playerId: ownerId, data: { sourceId } };
          const cid = answer.cardIds?.[0];
          const idx = cid ? attacker.hand.findIndex((c) => c.id === cid) : 0;
          if (idx < 0 && attacker.hand.length === 0) return;
          const [card] = attacker.hand.splice(idx >= 0 ? idx : 0, 1);
          if (card) {
            getPlayer(state, ownerId).hand.push(card);
            log(state, "skillUse", { actorId: ownerId, skillId: "simayi_fankui", targetIds: [sourceId], cardType: card.typeKey });
          }
        },
      },
    },
    {
      id: "simayi_guicai",
      locked: true,
      triggers: {
        BeforeJudgeEffect: function* (ctx) {
          const { state, ownerId, payload } = ctx;
          const { playerId, judgment } = payload as { playerId: string; judgment: JudgmentBox };
          const self = getPlayer(state, ownerId);
          if (!self.alive || self.hand.length === 0) return;
          const answer = yield { kind: "guicaiReplace", playerId: ownerId, data: { forPlayer: playerId } };
          if (answer.pass || !answer.cardIds?.length) return;
          const cid = answer.cardIds[0]!;
          const card = removeFromHand(state, ownerId, cid);
          state.discardPile.push(judgment.card);
          judgment.card = card;
          log(state, "skillUse", { actorId: ownerId, skillId: "simayi_guicai", targetIds: [playerId], cardType: card.typeKey });
        },
      },
    },
  ],
});
