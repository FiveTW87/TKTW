// SPEC 11 — ลิบอง (Wu). Locked: no reason to decline "skip discard phase".
import { registerGeneral } from "./registry";
import { getPlayer } from "../core/state";

registerGeneral({
  id: "lumeng",
  faction: "wu",
  gender: "male",
  maxHp: 4,
  skills: [
    {
      id: "lumeng_qinxue",
      locked: true,
      triggers: {
        DiscardPhaseStart: function* (ctx) {
          const { state, ownerId, payload } = ctx;
          const { playerId } = payload as { playerId: string };
          if (ownerId !== playerId) return;
          if (getPlayer(state, ownerId).shaUsedThisTurn === 0) {
            state.skipDiscardPhase = true;
          }
        },
      },
    },
  ],
});
