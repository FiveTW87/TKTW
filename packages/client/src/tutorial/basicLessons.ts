import type { StartTutorialInput } from "@tktw/shared";
import type { TutorialScenario } from "./tutorialController";

export interface TutorialLesson {
  readonly id: StartTutorialInput["scenarioId"];
  readonly title: string;
  readonly summary: string;
  readonly minutes: number;
  readonly scenario: TutorialScenario;
}

export const BASIC_TUTORIAL_LESSONS = [
  {
    id: "basic-turn",
    title: "เทิร์นแรก",
    summary: "จั่วการ์ด ใช้จู่โจม เลือกเป้าหมาย และจบเฟส",
    minutes: 4,
    scenario: {
      id: "basic-turn",
      version: 1,
      title: "บทที่ 1 · เทิร์นแรก",
      steps: [
        {
          id: "draw",
          prompt: "แตะกองจั่วเพื่อจั่วการ์ด 2 ใบ",
          highlight: { kind: "anchor", anchor: "drawPile" },
          expect: { kind: "draw" },
        },
        {
          id: "attack",
          prompt: "เลือกการ์ดจู่โจม แล้วเลือกคู่ซ้อมด้านซ้ายเป็นเป้าหมาย",
          highlight: { kind: "player", playerId: "p1" },
          expect: { kind: "playCard", typeKey: "sha", source: "literal" },
        },
        {
          id: "end-phase",
          prompt: "เมื่อทำสิ่งที่ต้องการแล้ว กดจบเฟสลงการ์ด",
          highlight: { kind: "anchor", anchor: "endPhase" },
          expect: { kind: "endPhase" },
        },
      ],
    },
  },
  {
    id: "basic-dodge",
    title: "ตั้งรับ",
    summary: "ตอบสนองการโจมตีด้วยหลบคม",
    minutes: 3,
    scenario: {
      id: "basic-dodge",
      version: 1,
      title: "บทที่ 2 · ตั้งรับ",
      steps: [{
        id: "dodge",
        prompt: "คู่ซ้อมกำลังโจมตี เลือกหลบคมเพื่อไม่เสีย HP",
        highlight: { kind: "anchor", anchor: "hand" },
        expect: { kind: "response", decisionKind: "respondShan", pass: false },
      }],
    },
  },
  {
    id: "basic-recovery",
    title: "บาดเจ็บและรักษา",
    summary: "ดูผลความเสียหาย แล้วใช้ท้อคืนชีพฟื้น HP",
    minutes: 4,
    scenario: {
      id: "basic-recovery",
      version: 1,
      title: "บทที่ 3 · บาดเจ็บและรักษา",
      steps: [
        {
          id: "take-damage",
          prompt: "ครั้งนี้ลองไม่ใช้หลบคม กดผ่านเพื่อดูผลความเสียหาย",
          highlight: { kind: "anchor", anchor: "hand" },
          expect: { kind: "response", decisionKind: "respondShan", pass: true },
        },
        {
          id: "draw-after-damage",
          prompt: "เมื่อถึงเทิร์นของคุณ แตะกองจั่ว",
          highlight: { kind: "anchor", anchor: "drawPile" },
          expect: { kind: "draw" },
        },
        {
          id: "heal",
          prompt: "เลือกท้อคืนชีพเพื่อฟื้น HP ให้ตัวเอง",
          highlight: { kind: "anchor", anchor: "hand" },
          expect: { kind: "playCard", typeKey: "tao", source: "literal" },
        },
      ],
    },
  },
] as const satisfies readonly TutorialLesson[];

export function basicTutorialLesson(id: StartTutorialInput["scenarioId"]): TutorialLesson {
  const lesson = BASIC_TUTORIAL_LESSONS.find((candidate) => candidate.id === id);
  if (!lesson) throw new Error(`Unknown basic tutorial lesson '${id}'.`);
  return lesson;
}
