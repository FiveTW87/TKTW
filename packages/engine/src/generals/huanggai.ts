// SPEC 11 — อุยกาย (Wu). Active skill, no declared maxPerTurn ("หลายครั้ง")
// — HP itself is the natural limiter since loseHp can kill the caster.
import { registerGeneral } from "./registry";
import { loseHp } from "../core/damage";
import { drawCards, getPlayer, log } from "../core/state";

registerGeneral({
  id: "huanggai",
  faction: "wu",
  gender: "male",
  maxHp: 4,
  skills: [
    {
      id: "huanggai_kurou",
      active: function* (ctx) {
        const { state, rng, ownerId } = ctx;
        yield* loseHp(ctx, ownerId, 1);
        if (getPlayer(state, ownerId).alive) {
          drawCards(state, rng, ownerId, 2);
          log(state, `${ownerId} จั่ว 2 ใบ (กลลวงทรมานตน)`);
        }
      },
    },
  ],
});
