// SPEC 8.2 — ธัญญาหารบริบูรณ์
import type { CardDef } from "../core/cardEffects";
import type { Card } from "../types";
import { aliveIds, seatOrderFrom, getPlayer, log, popCard } from "../core/state";

export const wuguCard: CardDef = {
  play: function* (ctx) {
    const { state, rng, playerId } = ctx;
    const n = aliveIds(state).length;
    const revealed: Card[] = [];
    for (let i = 0; i < n; i++) {
      const c = popCard(state, rng);
      if (c) revealed.push(c);
    }
    log(state, `${playerId} ใช้ "ธัญญาหารบริบูรณ์" เปิด ${revealed.length} ใบ`);

    for (const pid of seatOrderFrom(state, playerId)) {
      if (revealed.length === 0) break;
      // Send the full revealed card faces (not just ids): wugu turns them
      // face-up for everyone by the rules, so there's no hidden info, and
      // the client needs the faces to show names/suits when picking.
      const answer = yield {
        kind: "wuguPick",
        playerId: pid,
        data: { options: revealed.slice() },
      };
      const wantedId = answer.cardIds?.[0];
      const idx = wantedId ? revealed.findIndex((c) => c.id === wantedId) : 0;
      const chosen = revealed.splice(idx >= 0 ? idx : 0, 1)[0]!;
      getPlayer(state, pid).hand.push(chosen);
      log(state, `${pid} เลือก ${chosen.typeKey} จากธัญญาหารบริบูรณ์`);
    }
    state.discardPile.push(...revealed);
  },
};
