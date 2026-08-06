// SPEC 11 — กุยแก (Wei)
import { registerGeneral } from "./registry";
import type { Card } from "../types";
import type { JudgmentBox } from "../core/judgment";
import { getPlayer, log, popCard } from "../core/state";

registerGeneral({
  id: "guojia",
  faction: "wei",
  gender: "male",
  maxHp: 3,
  skills: [
    {
      id: "guojia_yidu",
      triggers: {
        AfterJudge: function* (ctx) {
          const { state, ownerId, payload } = ctx;
          const { playerId, judgment } = payload as { playerId: string; judgment: JudgmentBox };
          if (ownerId !== playerId) return;
          const idx = state.discardPile.findIndex((c) => c.id === judgment.card.id);
          if (idx < 0) return;
          const [card] = state.discardPile.splice(idx, 1);
          getPlayer(state, ownerId).hand.push(card!);
          log(state, "skillUse", { actorId: ownerId, skillId: "guojia_yidu", cardType: card!.typeKey });
        },
      },
    },
    {
      id: "guojia_yiji",
      // OnHPLost now fires once per point lost (see core/damage.ts), which
      // is exactly SPEC's "เสีย 2 HP = ทำงาน 2 ครั้ง" — no looping needed here.
      triggers: {
        OnHPLost: function* (ctx) {
          const { state, rng, ownerId, payload } = ctx;
          const { targetId } = payload as { targetId: string };
          if (ownerId !== targetId) return;
          const revealed: Card[] = [];
          for (let i = 0; i < 2; i++) {
            const c = popCard(state, rng);
            if (c) revealed.push(c);
          }
          if (revealed.length === 0) return;
          for (const card of revealed) {
            // The owner may already be dying/dead by the time this round
            // comes up (yiji is an OnHPLost trigger, so a lethal hit can beat
            // it here), and a forfeit answers a dead owner's prompt with
            // `pass`. Never route a card into a corpse's hand — that is the
            // exact hang the forfeit drive exists to prevent — send it to
            // the discard pile instead.
            if (!getPlayer(state, ownerId).alive) {
              state.discardPile.push(card);
              continue;
            }
            const answer = yield {
              kind: "yijiGive",
              playerId: ownerId,
              data: { cardId: card.id },
            };
            const named = answer.targetIds?.[0];
            if (named !== undefined) {
              const t = getPlayer(state, named);
              if (!t.alive) throw new Error(`guojia_yiji: ${named} is not alive`);
            }
            const toId = named ?? ownerId;
            if (!getPlayer(state, toId).alive) {
              // owner died while this exact prompt was pending
              state.discardPile.push(card);
              continue;
            }
            getPlayer(state, toId).hand.push(card);
            log(state, "skillUse", { actorId: ownerId, skillId: "guojia_yiji", targetIds: [toId], cardType: card.typeKey });
          }
        },
      },
    },
  ],
});
