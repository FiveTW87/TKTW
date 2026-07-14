// A deliberately dumb bot. It only ever looks at projectFor(state, viewerId)
// — never raw GameState — so it can't accidentally "cheat" by reading
// hidden roles/hands, which is what makes the headless fuzz-run (1000s of
// games) a meaningful integrity check rather than just a happy-path smoke
// test. Every choice is a plain deterministic heuristic (no RNG) so TC-6
// (same seed -> byte-identical state) still holds.
import type { GameSession } from "../core/decisions";
import type { EquipSlot, PlayerAnswer } from "../types";
import { projectFor, type GameView, type PlayerView } from "../core/view";
import { cardDef } from "../core/cardData";

function seatDistance(view: GameView, aId: string, bId: string): number {
  const alive = view.players.filter((p) => p.alive).sort((x, y) => x.seat - y.seat);
  const ids = alive.map((p) => p.id);
  const i = ids.indexOf(aId);
  const j = ids.indexOf(bId);
  if (i < 0 || j < 0 || i === j) return 0;
  const n = ids.length;
  return Math.min((j - i + n) % n, (i - j + n) % n);
}

function netDistance(view: GameView, a: PlayerView, b: PlayerView): number {
  const base = seatDistance(view, a.id, b.id);
  return Math.max(1, base - (a.equipment.horseMinus ? 1 : 0) + (b.equipment.horsePlus ? 1 : 0));
}

function inAttackRange(view: GameView, a: PlayerView, b: PlayerView): boolean {
  const weapon = a.equipment.weapon;
  const range = weapon ? (cardDef(weapon.typeKey).attackRange ?? 1) : 1;
  return range >= netDistance(view, a, b);
}

// Candidate order starting right after `fromId`, clockwise, alive only.
// Rotationally symmetric on purpose — see the note in an earlier revision:
// scanning view.players in raw array order instead always favours
// low-numbered seats as targets, giving high seats a survivorship bias.
function seatOrderAfter(view: GameView, fromId: string): string[] {
  const alive = view.players.filter((p) => p.alive).sort((x, y) => x.seat - y.seat);
  const ids = alive.map((p) => p.id);
  const idx = ids.indexOf(fromId);
  if (idx < 0) return ids;
  return [...ids.slice(idx), ...ids.slice(0, idx)].slice(1);
}

function othersInOrder(view: GameView, me: PlayerView): PlayerView[] {
  return seatOrderAfter(view, me.id)
    .map((id) => view.players.find((p) => p.id === id)!)
    .filter((p) => p.alive);
}

export function simpleBotAnswer(session: GameSession): PlayerAnswer {
  const pending = session.state.pendingDecision;
  if (!pending) throw new Error("simpleBotAnswer: no pending decision");

  const view = projectFor(session.state, pending.playerId);
  const me = view.players.find((p) => p.id === pending.playerId);
  if (!me) throw new Error(`simpleBotAnswer: viewer ${pending.playerId} not found`);
  const hand = Array.isArray(me.hand) ? me.hand : [];
  const base = { decisionId: pending.id, playerId: me.id };
  const find = (typeKey: string) => hand.find((c) => c.typeKey === typeKey);

  switch (pending.kind) {
    case "mainAction": {
      // 1. Equip anything sitting idle in hand into an empty slot.
      for (const c of hand) {
        const slot = cardDef(c.typeKey).slot as EquipSlot | undefined;
        if (slot && !me.equipment[slot]) {
          return { ...base, choice: "playCard", cardIds: [c.id], targetIds: [] };
        }
      }

      // 2. Attack with สังหาร if the limit allows and someone's in range.
      //    fangtian + last card in hand -> hit up to 3 in-range enemies.
      if (me.shaUsedThisTurn < 1) {
        const sha = find("sha");
        if (sha) {
          const inRange = othersInOrder(view, me).filter((p) => inAttackRange(view, me, p));
          if (inRange.length > 0) {
            const isLastCard = hand.length === 1;
            const n = isLastCard && me.equipment.weapon?.typeKey === "fangtian" ? 3 : 1;
            return {
              ...base,
              choice: "playCard",
              cardIds: [sha.id],
              targetIds: inRange.slice(0, n).map((p) => p.id),
            };
          }
        }
      }

      // 3. Free value: draw 2.
      const wuzhong = find("wuzhong");
      if (wuzhong) return { ...base, choice: "playCard", cardIds: [wuzhong.id], targetIds: [] };

      // 4. Top up HP.
      if (me.hp < me.maxHp) {
        const tao = find("tao");
        if (tao) return { ...base, choice: "playCard", cardIds: [tao.id], targetIds: [] };
      }

      // 5. Group tricks — no explicit target needed, card effect scans the table itself.
      const nanman = find("nanman");
      if (nanman) return { ...base, choice: "playCard", cardIds: [nanman.id], targetIds: [] };
      const wanjian = find("wanjian");
      if (wanjian) return { ...base, choice: "playCard", cardIds: [wanjian.id], targetIds: [] };
      const taoyuan = find("taoyuan");
      if (taoyuan) return { ...base, choice: "playCard", cardIds: [taoyuan.id], targetIds: [] };
      const wugu = find("wugu");
      if (wugu) return { ...base, choice: "playCard", cardIds: [wugu.id], targetIds: [] };

      // 6. Single-target tricks against the nearest opponent.
      const others = othersInOrder(view, me);
      const juedou = find("juedou");
      if (juedou && others[0]) {
        return { ...base, choice: "playCard", cardIds: [juedou.id], targetIds: [others[0].id] };
      }
      // shunshou has a fixed range-1 rule independent of the actor's weapon
      // — unlike สังหาร, do NOT use inAttackRange (which is weapon-aware).
      // ลกซุน's "ถ่อมตน" is immune to shunshou/lebusishu (canBeTargetedBy) —
      // that's a general-vs-general skill check the bot can't generically
      // predict from public view alone, so it's special-cased by name here
      // rather than teaching every future targeting-restriction skill to it.
      const shunshou = find("shunshou");
      const shunshouTarget = others.find(
        (p) => netDistance(view, me, p) <= 1 && p.generalId !== "luxun",
      );
      if (shunshou && shunshouTarget) {
        return { ...base, choice: "playCard", cardIds: [shunshou.id], targetIds: [shunshouTarget.id] };
      }
      const guohe = find("guohe");
      if (guohe && others[0]) {
        return { ...base, choice: "playCard", cardIds: [guohe.id], targetIds: [others[0].id] };
      }
      const jiedao = find("jiedao");
      const armed = others.find((p) => p.equipment.weapon);
      const victim = others.find((p) => p.id !== armed?.id);
      if (jiedao && armed && victim) {
        return { ...base, choice: "playCard", cardIds: [jiedao.id], targetIds: [armed.id, victim.id] };
      }
      const delayed = find("lebusishu") ?? find("shandian");
      if (delayed) {
        // judgmentZone is public — avoid the "already has one" throw in
        // turnLoop.ts by only targeting someone without a duplicate.
        // (Same ลกซุน special-case as shunshou above — lebusishu specifically.)
        const eligible = [me, ...others].find(
          (p) =>
            !p.judgmentZone.some((c) => c.typeKey === delayed.typeKey) &&
            !(delayed.typeKey === "lebusishu" && p.generalId === "luxun"),
        );
        if (eligible) {
          return { ...base, choice: "playCard", cardIds: [delayed.id], targetIds: [eligible.id] };
        }
      }

      return { ...base, choice: "endPhase" };
    }
    case "respondShan": {
      const shan = find("shan");
      return shan ? { ...base, cardIds: [shan.id] } : { ...base, pass: true };
    }
    case "respondTao": {
      const tao = find("tao");
      return tao ? { ...base, cardIds: [tao.id] } : { ...base, pass: true };
    }
    case "respondSha":
    case "jiedaoForceSha": {
      const sha = find("sha");
      return sha ? { ...base, cardIds: [sha.id] } : { ...base, pass: true };
    }
    case "askWuxie":
      // Simple bots never counter — keeps M1 games short and legible.
      return { ...base, pass: true };
    case "discardTo": {
      const need = (pending.data as { mustDiscard: number }).mustDiscard;
      return { ...base, cardIds: hand.slice(0, need).map((c) => c.id) };
    }
    case "discardChosenBy": {
      const need = (pending.data as { count: number }).count;
      return { ...base, cardIds: hand.slice(0, need).map((c) => c.id) };
    }
    case "activateSkill":
      return { ...base, pass: true };
    case "pickCardFromPlayer":
      // Never specify a hand card by id (would leak info) — the effect
      // falls back to a random hand card when we pass.
      return { ...base, pass: true };
    case "wuguPick": {
      const options = (pending.data as { options: string[] }).options;
      return { ...base, cardIds: options.length > 0 ? [options[0]!] : [] };
    }
    case "swordIceChoice":
      return { ...base, choice: "damage" };
    case "guanshiForce":
      return { ...base, pass: true }; // never pay 2 cards to force it through
    case "qinglongReplay":
      return { ...base, pass: true }; // decline the bonus attempt, keeps games bounded
    case "swordYyChoice":
      return hand.length > 0 ? { ...base, choice: "discard", cardIds: [hand[0]!.id] } : { ...base, choice: "draw" };
    default:
      return { ...base, pass: true };
  }
}
