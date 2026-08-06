// SPEC 8.2 — ยืมดาบฆ่าคน. targetIds[0] = the armed player being coerced,
// targetIds[1] = who they're forced to shoot at.
import type { CardDef } from "../core/cardEffects";
import { shaCard } from "./sha";
import { discardCardsFromHand, equipCard, getPlayer, log } from "../core/state";
import { commitShaCards } from "../core/shaCommit";

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
    const ids = answer.pass ? [] : (answer.cardIds ?? []);
    const spend = commitShaCards(state, targetId, ids, 1, "jiedao");
    if (spend) {
      discardCardsFromHand(state, targetId, spend);
      log(state, "jiedaoForce", { actorId: targetId, targetIds: [victimId], cardType: "jiedao" });
      // First spent card stands in as the reference สังหาร for a zhangba
      // substitute (see turnLoop.ts's playZhangbaSha) — the discard above
      // already spent whichever card(s) were actually committed.
      yield* shaCard.play!({ ...ctx, playerId: targetId, cardIds: [spend[0]!], targetIds: [victimId] });
    } else {
      const victim = getPlayer(state, targetId);
      const weapon = victim.equipment.weapon;
      if (weapon) {
        const currentWeapon = getPlayer(state, playerId).equipment.weapon;
        if (currentWeapon) {
          const swap = yield {
            kind: "jiedaoWeaponSwap",
            playerId,
            data: { newWeapon: weapon.typeKey, currentWeapon: currentWeapon.typeKey },
          };
          if (swap.pass || swap.choice !== "swap") {
            delete victim.equipment.weapon;
            state.discardPile.push(weapon); // declined — offered weapon is lost, caster keeps their own
            log(state, "jiedaoWeaponDeclined", { actorId: playerId, targetIds: [targetId], cardType: weapon.typeKey });
            return;
          }
        }
        delete victim.equipment.weapon;
        equipCard(state, playerId, weapon);
        log(state, "jiedaoTakeWeapon", { actorId: playerId, targetIds: [targetId], cardType: weapon.typeKey });
      }
    }
  },
};
