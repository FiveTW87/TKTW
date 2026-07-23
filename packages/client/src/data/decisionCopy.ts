// Human-readable Thai copy + an interaction "shape" for every reactive
// decision.kind the engine can send — this is what turns "kind: respondShan"
// into an actual dialog ("โดนสังหารจาก X — ลงหลบไหม?") instead of a raw bar.
// mainAction and pickGeneral aren't here — they have their own dedicated
// screens/flows.
import type { GameView, PendingDecision } from "@tktw/shared";
import { cardDisplay } from "./cardNames";
import { skillById } from "./generalSkills";

export type DecisionShape =
  // Respond with a card of a specific typeKey, or decline. `multi` allows
  // more than one (ท้อ can stack); requiredCount pins an exact count
  // instead (สลับใบแทนโดน/ตัดสิน).
  | {
      kind: "card";
      neededType?: string;
      multi?: boolean;
      requiredCount?: number;
      choiceOnConfirm?: string;
      needsTarget?: boolean;
      noDecline?: boolean;
      declineLabel?: string;
      confirmLabel?: string;
    }
  // Two (or more) named buttons, no cards involved.
  | { kind: "choice"; options: Array<{ value: string; label: string }>; declineLabel?: string }
  // Pick one of the target's visible (equipment/judgment) cards, or fall
  // back to a random card from their hand.
  | { kind: "pickFromPlayer" }
  // Pick a living player as the recipient/target.
  | { kind: "target" }
  // Pick one (or, if `ordered`, build a full order) of N anonymous face-up
  // options by position — the protocol only carries card ids for these, not
  // full card faces, so they render as plain numbered slots.
  | { kind: "anonymousPicker"; ordered?: boolean }
  // Pick one of N revealed cards whose full faces ARE carried in
  // `data.options` (wugu) — rendered as real card faces with details.
  | { kind: "pickFromRevealed" }
  // A single "flip the judgment card" tap — no card of your own is spent.
  | { kind: "reveal"; confirmLabel: string }
  // Pick up to `max` living players (from data.eligible) — e.g. เตียวเลี้ยว's
  // จู่โจมสายฟ้าแลบ choosing whom to rob.
  | { kind: "pickPlayers"; min: number; max: number }
  // Just an acknowledge/decline — no useful client-side card info exists.
  | { kind: "info" };

export interface DecisionCopy {
  icon: string;
  title: string;
  hint?: string;
  shape: DecisionShape;
}

function playerName(gameView: GameView, id: string | undefined): string {
  if (!id) return "?";
  return gameView.players.find((p) => p.id === id)?.name ?? id;
}

// What's at stake when you flip your own judgment card, keyed by the engine's
// `reason` tag — so the reveal prompt tells you what you're lucking for.
const JUDGMENT_CONTEXT: Record<string, { title: string; hint?: string }> = {
  lebusishu: {
    title: `ตัดสิน "${cardDisplay("lebusishu").name}" — แตะเปิดการ์ด`,
    hint: "ได้โพแดง (♥) = รอด เล่นได้ตามปกติ · ไม่ใช่ = ข้ามเฟสลงการ์ดเทิร์นนี้",
  },
  shandian: {
    title: `ตัดสิน "${cardDisplay("shandian").name}" — แตะเปิดการ์ด`,
    hint: "ได้โพดำ ♠ 2–9 = โดน 3 ดาเมจ · ไม่ใช่ = รอด ส่งต่อคนถัดไป",
  },
  bagua: {
    title: `${cardDisplay("bagua").name} — แตะเปิดการ์ดแทนการลง "${cardDisplay("shan").name}"`,
    hint: "ได้ดอกแดง (♥♦) = นับเป็นหลบอัตโนมัติ · ไม่ใช่ = ไม่ติด",
  },
  machao_tieqi: {
    title: `${skillById("machao_tieqi")?.name ?? "machao_tieqi"} — แตะเปิดการ์ดตัดสิน`,
    hint: `ได้ดอกแดง (♥♦) = เป้าลง "${cardDisplay("shan").name}" ไม่ได้`,
  },
  xiahoudun_ganglie: {
    title: 'พลังเดือด — แตะเปิดการ์ดตัดสิน',
    hint: "ไม่ใช่โพแดง (♥) = ตอบโต้คนที่ทำร้ายคุณ",
  },
};

export function describeDecision(pending: PendingDecision, gameView: GameView): DecisionCopy {
  const data = pending.data as Record<string, unknown>;
  const name = (id: unknown) => playerName(gameView, typeof id === "string" ? id : undefined);
  const shanName = cardDisplay("shan").name;
  const shaName = cardDisplay("sha").name;
  const taoName = cardDisplay("tao").name;
  const wuxieName = cardDisplay("wuxie").name;

  // Lu Bu's wushuang makes his สังหาร need 2 หลบ (and his duel 2 สังหาร); both
  // are asked as one all-or-nothing pick of `needed` cards.
  const needed = typeof data.needed === "number" ? data.needed : 1;

  switch (pending.kind) {
    case "respondShan":
      return needed > 1
        ? {
            icon: "閃",
            title: `โดน "${shaName}" จาก ${name(data.sourceId)} — ต้องลง "${shanName}" ${needed} ใบถึงจะรอด`,
            hint: `เลือก ${needed} ใบพร้อมกัน — ลงไม่ครบไม่เสียการ์ด แต่โดนดาเมจ`,
            shape: { kind: "card", neededType: "shan", requiredCount: needed, declineLabel: "ยอมโดน", confirmLabel: `ลง${shanName} ${needed} ใบ` },
          }
        : {
            icon: "閃",
            title: `โดน "${shaName}" จาก ${name(data.sourceId)} — จะลง "${shanName}" ไหม?`,
            shape: { kind: "card", neededType: "shan", declineLabel: "ยอมโดน", confirmLabel: `ลง${shanName}` },
          };
    case "respondSha":
      if (data.reason === "nanman") {
        return {
          icon: "蠻",
          title: `${cardDisplay("nanman").name} — จะลง "${shaName}" ไหม? (ไม่ลงจะโดน 1 ดาเมจ)`,
          shape: { kind: "card", neededType: "sha", declineLabel: "ยอมโดนดาเมจ", confirmLabel: `ลง${shaName}` },
        };
      }
      return needed > 1
        ? {
            icon: "決",
            title: `${cardDisplay("juedou").name}กับ ${name(data.opponentId)} — ต้องลง "${shaName}" ${needed} ใบถึงจะชนะรอบนี้`,
            hint: `เลือก ${needed} ใบพร้อมกัน — ลงไม่ครบไม่เสียการ์ด แต่แพ้ดวล`,
            shape: { kind: "card", neededType: "sha", requiredCount: needed, declineLabel: "ยอมแพ้ดวล", confirmLabel: `ลง${shaName} ${needed} ใบ` },
          }
        : {
            icon: "決",
            title: `${cardDisplay("juedou").name}กับ ${name(data.opponentId)} — จะลง "${shaName}" ไหม? (ไม่ลงจะแพ้ดวล)`,
            shape: { kind: "card", neededType: "sha", declineLabel: "ยอมแพ้ดวล", confirmLabel: `ลง${shaName}` },
          };
    case "respondTao":
      return {
        icon: "桃",
        title: `${name(data.dyingId)} ใกล้ตาย (HP ${data.hp}) — จะช่วยด้วย "${taoName}" ไหม?`,
        hint: "เลือกได้มากกว่า 1 ใบ (ฟื้นตามจำนวนใบ)",
        shape: { kind: "card", neededType: "tao", multi: true, declineLabel: "ไม่ช่วย", confirmLabel: `ใช้${taoName}` },
      };
    case "askWuxie":
      return {
        icon: "無",
        title: `จะใช้ "${wuxieName}" ยกเลิก "${cardDisplay(String(data.cancelledType ?? "")).name}" ไหม?`,
        shape: { kind: "card", neededType: "wuxie", declineLabel: "ปล่อยผ่าน", confirmLabel: `ใช้${wuxieName}` },
      };
    case "swordIceChoice":
      return {
        icon: "冰",
        title: `${name(data.targetId)} ถือ${cardDisplay("sword_ice").name} — จะรับดาเมจ หรือให้เขาทิ้งการ์ด 2 ใบแทน?`,
        shape: {
          kind: "choice",
          options: [
            { value: "damage", label: "รับดาเมจตามปกติ" },
            { value: "discard2", label: "ให้ทิ้งการ์ด 2 ใบแทน" },
          ],
        },
      };
    case "guanshiForce":
      return {
        icon: "貫",
        title: `${name(data.targetId)} ลงหลบสำเร็จ — จะทิ้งการ์ด 2 ใบ บังคับให้โดน (${cardDisplay("guanshi").name}) ไหม?`,
        shape: {
          kind: "card",
          multi: true,
          requiredCount: 2,
          choiceOnConfirm: "force",
          declineLabel: "ปล่อยผ่าน",
          confirmLabel: "ทิ้ง 2 ใบ บังคับให้โดน",
        },
      };
    case "qinglongReplay":
      return {
        icon: "龍",
        title: `${name(data.targetId)} โดน${shaName}แล้ว — จะใช้${cardDisplay("qinglong").name} ลง${shaName}ซ้ำไหม?`,
        shape: {
          kind: "choice",
          options: [{ value: "replay", label: `ลง${shaName}ซ้ำ` }],
          declineLabel: "พอแค่นี้",
        },
      };
    case "qilinDestroyHorse":
      return {
        icon: "麟",
        title: `${cardDisplay("qilin").name} — เลือกทำลายม้าของ ${name(data.targetId)}`,
        shape: {
          kind: "choice",
          options: [
            { value: "horseMinus", label: "ม้า −1 (ป้องกัน)" },
            { value: "horsePlus", label: "ม้า +1 (โจมตี)" },
          ],
        },
      };
    case "swordYyChoice":
      return {
        icon: "陰",
        title: `โดน${cardDisplay("sword_yy").name}จาก ${name(data.sourceId)} — จะทิ้งการ์ด 1 ใบ หรือให้เขาจั่วเพิ่ม?`,
        shape: {
          kind: "choice",
          options: [{ value: "discard", label: "ทิ้งการ์ด 1 ใบ" }],
          declineLabel: `ให้ ${name(data.sourceId)} จั่วเพิ่มแทน`,
        },
      };
    case "hujiaVolunteer":
      return {
        icon: "衛",
        title: `${name(data.lordId)} (เจ้าเมือง) ต้องการความช่วยเหลือ — จะช่วยรับแทนไหม?`,
        hint: "เลือกการ์ดที่จะใช้ช่วย หรือปล่อยผ่าน",
        shape: { kind: "card", declineLabel: "ปล่อยผ่าน", confirmLabel: "ช่วยเจ้าเมือง" },
      };
    case "ganglieChoice":
      return {
        icon: "烈",
        title: `ตัดสินไม่ติดโพธิ์แดง — จะทิ้งการ์ด 2 ใบ หรือเสีย 1 HP?`,
        shape: {
          kind: "choice",
          options: [{ value: "discard2", label: "ทิ้งการ์ด 2 ใบ" }],
          declineLabel: "เสีย 1 HP",
        },
      };
    case "jiedaoForceSha":
      return {
        icon: "借",
        title: `ถูกบังคับให้ลง "${shaName}" ใส่ ${name(data.mustTarget)} (${cardDisplay("jiedao").name}) — จะทำไหม?`,
        hint: "ถ้าไม่ทำ จะเสียอาวุธให้ผู้บังคับแทน",
        shape: { kind: "card", neededType: "sha", declineLabel: "ยอมเสียอาวุธ", confirmLabel: `ลง${shaName}` },
      };
    case "huibiRedirect":
      return {
        icon: "避",
        title: `โดน${shaName}จาก ${name(data.sourceId)} — จะทิ้งการ์ดโอนเป้าไปคนอื่นไหม? (${skillById("daiqiao_huibi")?.name ?? "daiqiao_huibi"})`,
        hint: "เลือกการ์ด 1 ใบ แล้วเลือกเป้าหมายใหม่",
        shape: { kind: "card", requiredCount: 1, needsTarget: true, declineLabel: "รับเอง", confirmLabel: "โอนเป้า" },
      };
    case "activateSkill": {
      const sid = String(data.skillId ?? "");
      const sk = skillById(sid);
      // Equipment skills are namespaced "equip:<typeKey>" by the engine.
      // bagua (ค่ายกลแปดทิศ) is the one optional one — its judge can auto-dodge.
      if (sid.startsWith("equip:")) {
        const eq = cardDisplay(sid.slice("equip:".length));
        const isBagua = sid === "equip:bagua";
        return {
          icon: "卦",
          title: `จะใช้ "${eq.name}" ตัดสินเพื่อหลบไหม?`,
          ...(isBagua ? { hint: "ตัดสินได้ดอกแดง = หลบอัตโนมัติ ไม่ต้องเสียการ์ด 'หลบ'" } : {}),
          shape: { kind: "choice", options: [{ value: "", label: "ใช้ตัดสิน" }], declineLabel: "ไม่ใช้" },
        };
      }
      // Lord's hujia — ask other same-faction players to cover the response.
      if (sid === "caocao_hujia" || sid === "liubei_hujia") {
        const coverName = sid === "caocao_hujia" ? shanName : shaName;
        return {
          icon: "衛",
          title: `จะขอเพื่อนร่วมก๊กช่วยลง "${coverName}" แทนไหม? (${sk?.name ?? sid})`,
          shape: { kind: "choice", options: [{ value: "", label: "ขอความช่วยเหลือ" }], declineLabel: "ไม่ขอ" },
        };
      }
      return {
        icon: "技",
        title: `เปิดใช้สกิล "${sk?.name ?? sid}" ตอนนี้ไหม?`,
        ...(sk?.description ? { hint: sk.description } : {}),
        shape: { kind: "choice", options: [{ value: "", label: "ใช้สกิล" }], declineLabel: "ไม่ใช้" },
      };
    }
    case "fankuiPick":
      return {
        icon: "反",
        title: `จะชิงการ์ด 1 ใบจากมือ ${name(data.sourceId)} ไหม? (${skillById("simayi_fankui")?.name ?? "simayi_fankui"})`,
        hint: "มือของเขาปิดอยู่ จะได้ใบแบบสุ่ม",
        shape: { kind: "choice", options: [{ value: "", label: "ชิงการ์ด" }], declineLabel: "ไม่เอา" },
      };
    case "discardChosenBy":
      return {
        icon: "棄",
        title: `เลือกทิ้งการ์ด ${String(data.count ?? "")} ใบ`,
        shape: { kind: "card", requiredCount: Number(data.count ?? 0), noDecline: true, confirmLabel: "ทิ้งการ์ด" },
      };
    case "guicaiReplace":
      return {
        icon: "詭",
        title: `ใช้ "${skillById("simayi_guicai")?.name ?? "simayi_guicai"}" แทนที่ไพ่ตัดสินของ ${name(data.forPlayer)} ไหม?`,
        hint: "เลือกการ์ด 1 ใบจากมือ หรือปล่อยผ่าน",
        shape: { kind: "card", requiredCount: 1, declineLabel: "ปล่อยผ่าน", confirmLabel: "แทนที่ไพ่ตัดสิน" },
      };
    case "pickCardFromPlayer":
      return {
        icon: "取",
        title: `เลือกการ์ดที่จะเอาจาก ${name(data.targetId)}`,
        hint: "เลือกจากของที่เห็น หรือสุ่มจากมือ",
        shape: { kind: "pickFromPlayer" },
      };
    case "yijiGive":
      return {
        icon: "施",
        title: `จะแจกการ์ดที่จั่วได้ให้ใคร?`,
        shape: { kind: "target" },
      };
    case "fanjianGuess":
      return {
        icon: "反",
        title: `${name(data.fromId)} ให้การ์ด 1 ใบ — ทายดอกไพ่`,
        shape: {
          kind: "choice",
          options: [
            { value: "spade", label: "♠ โพธิ์ดำ" },
            { value: "heart", label: "♥ โพธิ์แดง" },
            { value: "club", label: "♣ ดอกจิก" },
            { value: "diamond", label: "♦ ข้าวหลามตัด" },
          ],
        },
      };
    case "wuguPick":
      return {
        icon: "穀",
        title: `${cardDisplay("wugu").name} — เลือกการ์ด 1 ใบจากที่เปิด`,
        hint: "เอาเมาส์ชี้การ์ดเพื่อดูรายละเอียด",
        shape: { kind: "pickFromRevealed" },
      };
    case "judgmentReveal": {
      const reason = typeof data.reason === "string" ? data.reason : "";
      const ctx = JUDGMENT_CONTEXT[reason];
      return {
        icon: "卜",
        title: ctx?.title ?? "ถึงคราวตัดสิน — แตะเพื่อเปิดการ์ด",
        ...(ctx?.hint ? { hint: ctx.hint } : {}),
        shape: { kind: "reveal", confirmLabel: "🎴 เปิดการ์ดตัดสิน" },
      };
    }
    case "tuxiTargets":
      return {
        icon: "襲",
        title: `${skillById("zhangliao_tuxi")?.name ?? "zhangliao_tuxi"} — ชิงการ์ด 1 ใบจากผู้เล่นสูงสุด 2 คน`,
        hint: "แตะเลือกได้ถึง 2 คน (ข้ามการจั่วปกติเทิร์นนี้แล้ว)",
        shape: { kind: "pickPlayers", min: 0, max: 2 },
      };
    case "guandouOrder":
      return {
        icon: "觀",
        title: `${skillById("zhugeliang_guandou")?.name ?? "zhugeliang_guandou"} — จัดเรียงการ์ดบนกองจั่ว (แตะตามลำดับที่ต้องการ)`,
        hint: "ใบที่แตะก่อนจะถูกจั่วก่อน · ไม่แตะ = เรียงเดิม",
        shape: { kind: "anonymousPicker", ordered: true },
      };
    default:
      return {
        icon: "問",
        title: `ตัดสินใจ: ${pending.kind}`,
        shape: { kind: "card", declineLabel: "ปฏิเสธ", confirmLabel: "ยืนยัน" },
      };
  }
}
