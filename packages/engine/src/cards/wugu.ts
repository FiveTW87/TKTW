// SPEC 8.2 — ธัญญาหารบริบูรณ์
import type { CardDef } from "../core/cardEffects";
import type { Card } from "../types";
import { aliveIds, seatOrderFrom, getPlayer, log } from "../core/state";

export const wuguCard: CardDef = {
  play: function* (ctx) {
    const { state, playerId } = ctx;
    const n = aliveIds(state).length;
    const revealed: Card[] = [];
    for (let i = 0; i < n; i++) {
      const c = state.drawPile.pop();
      if (c) revealed.push(c);
    }
    log(state, `${playerId} ใช้ "ธัญญาหารบริบูรณ์" เปิด ${revealed.length} ใบ`);

    for (const pid of seatOrderFrom(state, playerId)) {
      if (revealed.length === 0) break;
      const answer = yield {
        kind: "wuguPick",
        playerId: pid,
        data: { options: revealed.map((c) => c.id) },
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
