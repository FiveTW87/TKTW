import { useLayoutEffect, useState } from "react";
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

function LightningJudgmentEffect({ playerId }: { playerId: string }) {
  const [point, setPoint] = useState(() => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }));
  useLayoutEffect(() => {
    const anchors = Array.from(document.querySelectorAll<HTMLElement>("[data-player-anchor]"));
    for (const anchor of anchors) {
      if (anchor.dataset.playerAnchor !== playerId || !anchor.isConnected) continue;
      const rect = anchor.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      setPoint({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      break;
    }
  }, [playerId]);
  return (
    <div
      className="table-lightning-impact"
      data-testid="shandian-lightning"
      aria-label="อสนีบาตฟาดใส่ผู้เล่น"
      style={{ left: point.x, top: point.y, pointerEvents: "none" }}
    >
      <div className="table-lightning-sky-flash" />
      <svg className="table-lightning-bolt" viewBox="0 0 160 360" aria-hidden="true">
        <path className="table-lightning-glow" d="M105 0 61 127l34-10-47 100 31-8-52 151 93-177-36 9 52-111-38 12z" />
        <path className="table-lightning-core" d="M105 0 61 127l34-10-47 100 31-8-52 151 93-177-36 9 52-111-38 12z" />
      </svg>
      <span className="table-lightning-ring" />
      <span className="table-lightning-spark spark-a" />
      <span className="table-lightning-spark spark-b" />
      <span className="table-lightning-spark spark-c" />
      <span className="table-lightning-spark spark-d" />
    </div>
  );
}

export function TableFeedbackLayer({ cues }: { cues: readonly TableFeedbackCue[] }) {
  if (cues.length === 0) return null;
  return createPortal(
    <>
    {cues.map((cue) => cue.kind === "judgmentResult" && cue.cardType === "shandian" && cue.outcome === "hit"
      ? <LightningJudgmentEffect key={`${cue.id}:lightning`} playerId={cue.playerId} />
      : null)}
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
    </div>
    </>,
    document.body,
  );
}
