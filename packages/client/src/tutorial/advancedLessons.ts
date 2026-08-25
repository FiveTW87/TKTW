import type { TutorialLesson } from "./basicLessons";

export const ADVANCED_TUTORIAL_LESSONS = [
  {
    id: "advanced-distance",
    title: "ระยะและอาวุธ",
    summary: "เพิ่มระยะโจมตีด้วยอาวุธ แล้วเลือกเป้าหมายที่เดิมอยู่ไกลเกินไป",
    minutes: 4,
    scenario: {
      id: "advanced-distance",
      version: 1,
      title: "บทที่ 4 · ระยะและอาวุธ",
      steps: [
        { id: "draw", prompt: "เริ่มเทิร์นด้วยการจั่วการ์ด", highlight: { kind: "anchor", anchor: "drawPile" }, expect: { kind: "draw" } },
        { id: "equip", prompt: "เป้าหมายฝั่งตรงข้ามยังไกลเกินไป สวมกระบี่มังกรเขียวเพื่อเพิ่มระยะ", highlight: { kind: "anchor", anchor: "hand" }, expect: { kind: "playCard", typeKey: "sword_qinggang", source: "literal" } },
        { id: "far-attack", prompt: "ตอนนี้ระยะถึงแล้ว ใช้จู่โจมใส่คู่ซ้อมฝั่งตรงข้าม", highlight: { kind: "player", playerId: "p2" }, expect: { kind: "playCard", typeKey: "sha", source: "literal" } },
        { id: "end-phase", prompt: "กดจบเทิร์นเมื่อพร้อม", highlight: { kind: "anchor", anchor: "endPhase" }, expect: { kind: "endPhase" } },
      ],
    },
  },
  {
    id: "advanced-tricks",
    title: "กลศึกและลบล้าง",
    summary: "อ่านจังหวะกลศึก การ์ดตัดสิน และใช้ลบล้างกลศึก",
    minutes: 3,
    scenario: {
      id: "advanced-tricks",
      version: 1,
      title: "บทที่ 5 · กลศึกและลบล้าง",
      steps: [{
        id: "counter-trick",
        prompt: "กลศึกและการ์ดตัดสินเปิดช่องให้ลบล้างก่อนเกิดผล เลือกลบล้างกลศึกตอนนี้",
        highlight: { kind: "anchor", anchor: "hand" },
        expect: { kind: "response", decisionKind: "askWuxie", pass: false },
      }],
    },
  },
  {
    id: "advanced-roles",
    title: "บทบาทและสกิล",
    summary: "อ่านเงื่อนไขฝ่ายและใช้สกิลแม่ทัพในเกมบทบาทจริง",
    minutes: 4,
    scenario: {
      id: "advanced-roles",
      version: 1,
      title: "บทที่ 6 · บทบาทและสกิล",
      steps: [
        { id: "draw", prompt: "สังเกตบทบาทของคุณ แล้วเริ่มเทิร์นด้วยการจั่ว", highlight: { kind: "anchor", anchor: "drawPile" }, expect: { kind: "draw" } },
        { id: "use-skill", prompt: "ใช้สกิลชั่งดุลใต้หล้า เลือกการ์ดอย่างน้อย 1 ใบเพื่อเปลี่ยนมือ", highlight: { kind: "anchor", anchor: "skills" }, expect: { kind: "useSkill", skillId: "sunquan_zhiheng" } },
        { id: "end-phase", prompt: "บทบาทกำหนดเงื่อนไขชนะ แต่ทุกเทิร์นยังจบด้วยกติกาเดิม", highlight: { kind: "anchor", anchor: "endPhase" }, expect: { kind: "endPhase" } },
      ],
    },
  },
] as const satisfies readonly TutorialLesson[];
