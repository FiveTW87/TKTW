import type { LegalActionView } from "@tktw/shared";
import type { DecisionRoute } from "../hooks/useDecisionController";
import type { AssistanceLevel } from "../store/assistStore";
import { cardDisplay } from "./cardNames";
import { skillById } from "./generalSkills";

type PlayCardAction = Extract<LegalActionView, { kind: "playCard" }>;
type PlayCardOption = PlayCardAction["options"][number];
export type CardUnavailableReason = Extract<PlayCardOption, { available: false }>["unavailableReason"];

type UseSkillAction = Extract<LegalActionView, { kind: "useSkill" }>;
type ActiveSkillOption = UseSkillAction["options"][number];
export type SkillUnavailableReason = Extract<ActiveSkillOption, { available: false }>["unavailableReason"];

const CARD_REASON_COPY = {
  response_only: "ใช้ได้เฉพาะตอนที่เกมขอให้ตอบสนอง",
  sha_usage_limit: "ใช้สังหารครบจำนวนที่อนุญาตในเทิร์นนี้แล้ว",
  conversion_wrong_context: "การแปลงใบนี้ใช้ไม่ได้ในจังหวะปัจจุบัน",
  insufficient_cards: "มีการ์ดไม่ครบตามจำนวนที่ต้องใช้",
  no_legal_target: "ตอนนี้ไม่มีเป้าหมายที่ถูกกติกา",
} as const satisfies Record<CardUnavailableReason, string>;

const SKILL_REASON_COPY = {
  usage_limit: "ใช้สกิลครบจำนวนครั้งในเทิร์นนี้แล้ว",
  insufficient_cards: "มีการ์ดไม่ครบตามจำนวนที่สกิลต้องใช้",
  no_legal_target: "ตอนนี้ไม่มีเป้าหมายที่ถูกกติกาสำหรับสกิลนี้",
} as const satisfies Record<SkillUnavailableReason, string>;

export function cardUnavailableReasonCopy(reason: CardUnavailableReason): string {
  return CARD_REASON_COPY[reason];
}

export function skillUnavailableReasonCopy(reason: SkillUnavailableReason): string {
  return SKILL_REASON_COPY[reason];
}

export interface ContextHelpUnavailableItem {
  key: string;
  label: string;
  reason: string;
}

export interface ContextHelpViewModel {
  kind: "context";
  title: string;
  summary: string;
  unavailable: ContextHelpUnavailableItem[];
}

export interface ContextHelpInput {
  level: AssistanceLevel;
  route: DecisionRoute;
  legalActions: LegalActionView[];
}

function unavailableItems(legalActions: LegalActionView[]): ContextHelpUnavailableItem[] {
  const items = new Map<string, ContextHelpUnavailableItem>();
  for (const action of legalActions) {
    if (action.kind === "playCard") {
      for (const option of action.options) {
        if (option.available) continue;
        const key = `card:${option.typeKey}:${option.unavailableReason}`;
        items.set(key, {
          key,
          label: cardDisplay(option.typeKey).name,
          reason: cardUnavailableReasonCopy(option.unavailableReason),
        });
      }
    } else if (action.kind === "useSkill") {
      for (const option of action.options) {
        if (option.available) continue;
        const key = `skill:${option.skillId}:${option.unavailableReason}`;
        items.set(key, {
          key,
          label: skillById(option.skillId)?.name ?? option.skillId,
          reason: skillUnavailableReasonCopy(option.unavailableReason),
        });
      }
    }
  }
  return [...items.values()];
}

function routeCopy(route: DecisionRoute): Pick<ContextHelpViewModel, "title" | "summary"> | null {
  switch (route.kind) {
    case "mainAction":
      return { title: "เฟสลงการ์ดของคุณ", summary: "เลือกการ์ดหรือสกิลที่ใช้ได้ หรือจบเฟสเมื่อพร้อม" };
    case "discard":
      return { title: `ต้องทิ้งการ์ด ${route.mustDiscard} ใบ`, summary: "แตะเลือกการ์ดให้ครบ แล้วกดยืนยันทิ้ง" };
    case "pile":
      return {
        title: route.title ?? (route.action === "draw" ? "จั่วการ์ด" : "เปิดการ์ดตัดสิน"),
        summary: "แตะกองจั่วเพื่อดำเนินการต่อ",
      };
    case "inlineSkill":
      return { title: "กำลังใช้สกิล", summary: "ทำตามข้อความบนสกิลและเลือกสิ่งที่ระบบเปิดให้" };
    case "none":
    case "waiting":
    case "modal":
    case "autoPending":
      return null;
    default:
      return assertNever(route);
  }
}

function assertNever(value: never): never {
  throw new Error(`buildContextHelp: unhandled route ${String(value)}`);
}

export function buildContextHelp(input: ContextHelpInput): ContextHelpViewModel | null {
  if (input.level === "off") return null;
  const copy = routeCopy(input.route);
  if (!copy) return null;
  return {
    kind: "context",
    ...copy,
    unavailable: input.level === "detailed" ? unavailableItems(input.legalActions) : [],
  };
}
