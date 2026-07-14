// SPEC 8.1 — ท้อ. Played as a main action, this only heals the player who
// played it, and only when not already at full HP. (Reactive use — saving a
// dying player out of turn — goes through core/damage.ts:resolveDying
// directly, never through this "play" path.)
import type { CardDef } from "../core/cardEffects";
import { heal } from "../core/damage";
import { getPlayer } from "../core/state";

export const taoCard: CardDef = {
  play: function* (ctx) {
    const { state, playerId } = ctx;
    const p = getPlayer(state, playerId);
    if (p.hp >= p.maxHp) return;
    yield* heal(ctx, playerId, 1);
  },
};
