import { createPortal } from "react-dom";
import { cardDisplay } from "../../data/cardNames";
import type { TableFeedbackCue } from "../../hooks/useTableFeedbackPresentation";

const PHASE_LABEL: Record<string, string> = {
  prepare: "เฟสเตรียมตัว",
  judge: "เฟสตัดสิน",
  draw: "เฟสจั่วไพ่",
  play: "เฟสลงการ์ด",
  discard: "เฟสทิ้งไพ่",
  end: "เฟสจบเทิร์น",
};

const SUIT_GLYPH: Record<string, string> = { heart: "♥", diamond: "♦", spade: "♠", club: "♣" };

function cardLine(cue: { cardType?: string; suit?: string; rank?: number }) {
  const suit = cue.suit ? SUIT_GLYPH[cue.suit] ?? cue.suit : "";
  const rank = cue.rank === 1 ? "A" : cue.rank === 11 ? "J" : cue.rank === 12 ? "Q" : cue.rank === 13 ? "K" : cue.rank ?? "";
  return {
    face: `${suit}${suit && rank !== "" ? " " : ""}${rank}`,
    name: cue.cardType ? cardDisplay(cue.cardType).name : "ไพ่ตัดสิน",
  };
}

function copy(cue: TableFeedbackCue): { title: string; detail?: string; tone: string } {
  switch (cue.kind) {
    case "judgmentReveal": {
      const card = cardLine(cue);
      return { title: "เปิดไพ่ตัดสิน", detail: `${card.face}${card.face ? " · " : ""}${card.name}`, tone: "judgment" };
    }
    case "judgmentReplace": {
      const card = cardLine(cue);
      return { title: "เปลี่ยนผลตัดสิน", detail: `${card.face}${card.face ? " · " : ""}${card.name}`, tone: "replace" };
    }
    case "judgmentResult": {
      const card = cardLine(cue);
      const result = cue.outcome === "fail" || cue.outcome === "miss" ? "ไม่สำเร็จ" : cue.outcome ? "สำเร็จ" : "ได้ผลตัดสิน";
      return { title: `ผลตัดสิน · ${result}`, detail: `${card.face}${card.face ? " · " : ""}${card.name}`, tone: result === "สำเร็จ" ? "success" : "result" };
    }
    case "wuxieCounter":
      return { title: `โต้ไร้เทียมทาน · ชั้น ${cue.depth}`, ...(cue.targetType ? { detail: `โต้ ${cardDisplay(cue.targetType).name}` } : {}), tone: "wuxie" };
    case "wuxieResult":
      return cue.effective
        ? { title: "กลอุบายยังสำเร็จ", detail: "การโต้ถูกหักล้าง", tone: "success" }
        : { title: "กลอุบายถูกยกเลิก", detail: "ไร้เทียมทานมีผล", tone: "cancelled" };
    case "turn":
      return { title: `เทิร์น ${cue.turnNumber} · ${cue.playerName}`, detail: "เริ่มเทิร์นใหม่", tone: "turn" };
    case "phase":
      return { title: PHASE_LABEL[cue.phase] ?? cue.phase, tone: "phase" };
  }
}

export function TableFeedbackLayer({ cues }: { cues: readonly TableFeedbackCue[] }) {
  if (cues.length === 0) return null;
  return createPortal(
    <div className="table-feedback-layer" data-testid="table-feedback-layer" style={{ pointerEvents: "none" }} aria-live="polite" aria-atomic="false">
      {cues.map((cue) => {
        const content = copy(cue);
        return (
          <div key={cue.id} className={`table-feedback-cue table-feedback-${content.tone}`} data-kind={cue.kind}>
            <span className="table-feedback-title">{content.title}</span>
            {content.detail && <span className="table-feedback-detail">{content.detail}</span>}
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
