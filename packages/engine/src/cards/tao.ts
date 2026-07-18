// SPEC 8.1 — ท้อ. Played as a main action, this heals the chosen target by 1:
// the player themselves by default, or any injured other player (house rule:
// "help a hurt ally"). turnLoop validates the target is alive and not already
// at full HP. sourceId is the player who played it, so a Wu-heals-Wu bonus
// (Sun Quan's จูจ๊กเล่าตัน) fires correctly on a cross-heal.
// (Reactive use — saving a dying player out of turn — goes through
// core/damage.ts:resolveDying directly, never through this "play" path.)
import type { CardDef } from "../core/cardEffects";
import { heal } from "../core/damage";
import { getPlayer } from "../core/state";

export const taoCard: CardDef = {
  play: function* (ctx) {
    const { state, playerId, targetIds } = ctx;
    const targetId = targetIds[0] ?? playerId;
    const t = getPlayer(state, targetId);
    if (t.hp >= t.maxHp) return; // safety no-op (turnLoop already guards this)
    yield* heal(ctx, targetId, 1, playerId);
  },
};
