// SPEC 8.2 — ยืมดาบฆ่าคน. targetIds[0] = the armed player being coerced,
// targetIds[1] = who they're forced to shoot at.
import type { CardDef } from "../core/cardEffects";
import { shaCard } from "./sha";
import { discardFromHand, equipCard, getPlayer, log } from "../core/state";
import { countsAsType } from "../core/cardChecks";

export const jiedaoCard: CardDef = {
  play: function* (ctx) {
    const { state, playerId } = ctx;
    const targetId = ctx.targetIds[0];
    const victimId = ctx.targetIds[1];
    if (!targetId || !victimId) return;

    const answer = yield {
      kind: "jiedaoForceSha",
      playerId: targetId,
      data: { mustTarget: victimId, sourceId: playerId },
    };
    const offered = !answer.pass && (answer.cardIds?.length ?? 0) > 0;
    if (offered) {
      const cid = answer.cardIds![0]!;
      if (!countsAsType(state, targetId, cid, "sha")) throw new Error(`jiedao: ${cid} does not count as sha`);
      discardFromHand(state, targetId, cid);
      log(state, "jiedaoForce", { actorId: targetId, targetIds: [victimId], cardType: "jiedao" });
      yield* shaCard.play!({ ...ctx, playerId: targetId, cardIds: [cid], targetIds: [victimId] });
    } else {
      const victim = getPlayer(state, targetId);
      const weapon = victim.equipment.weapon;
      if (weapon) {
        delete victim.equipment.weapon;
        equipCard(state, playerId, weapon);
        log(state, "jiedaoTakeWeapon", { actorId: playerId, targetIds: [targetId], cardType: weapon.typeKey });
      }
    }
  },
};
