import { useEffect } from "react";
import type { Card } from "@tktw/shared";
import { ModalOverlay } from "./Modal";
import { cardDisplay, cardInfo, rankLabel, suitGlyph } from "../data/cardNames";
import { cardMeta, type TargetRule } from "../data/cardMeta";
import { cardArtUrl } from "../data/cardArt";

const SUIT_LABEL: Record<string, string> = {
  spade: "โพดำ",
  heart: "โพแดง",
  diamond: "ข้าวหลามตัด",
  club: "ดอกจิก",
};

const TARGET_LABEL: Record<TargetRule, string> = {
  singleInRange: "ศัตรู 1 คนในระยะ",
  single: "เป้าหมาย 1 คน",
  singleArmed: "ผู้ถืออาวุธ แล้วเลือกเป้าหมาย",
  shunshouRange: "เป้าหมายระยะ 1",
  self: "ตนเอง",
  selfOrDying: "ตนเองหรือผู้ที่กำลังบาดเจ็บ",
  allOthers: "ผู้เล่นอื่นทั้งหมด",
  allIncludingSelf: "ผู้เล่นทั้งหมด",
  equipment: "สวมใส่ให้ตนเอง",
  respondOnly: "ใช้ตอบโต้เท่านั้น",
};

export function CardInspectModal({
  card,
  onClose,
  onChoose,
}: {
  card: Card;
  onClose: () => void;
  onChoose?: () => void;
}) {
  const display = cardDisplay(card.typeKey);
  const info = cardInfo(card.typeKey) ?? "ยังไม่มีคำอธิบายเพิ่มเติม";
  const meta = cardMeta(card.typeKey);
  const artUrl = cardArtUrl(card.typeKey);
  const redSuit = card.suit === "heart" || card.suit === "diamond";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <ModalOverlay onClose={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`รายละเอียดการ์ด ${display.name}`}
        className="card-inspect-modal anim-pop"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="card-inspect-close" onClick={onClose} aria-label="ปิดรายละเอียดการ์ด">×</button>
        <div className="card-inspect-art-column">
          <div className="card-inspect-face">
            {artUrl && <img className="card-inspect-art" src={artUrl} alt="" aria-hidden="true" />}
            <div className={redSuit ? "card-inspect-rank is-red" : "card-inspect-rank"}>
              <strong>{rankLabel(card.rank)}</strong>
              <span>{suitGlyph(card.suit)}</span>
            </div>
            {!artUrl && <span className="card-inspect-glyph">{display.glyph}</span>}
            <div className="card-inspect-name">{display.name}</div>
          </div>
          <div className="card-inspect-suit">{SUIT_LABEL[card.suit] ?? card.suit} · {rankLabel(card.rank)}</div>
        </div>

        <div className="card-inspect-copy">
          <div className="card-inspect-kicker">รายละเอียดการ์ด</div>
          <h2>{display.name}</h2>
          <p>{info}</p>
          <dl>
            <div><dt>เป้าหมาย</dt><dd>{TARGET_LABEL[meta.targetRule]}</dd></div>
            {meta.attackRange !== undefined && <div><dt>ระยะ</dt><dd>{meta.attackRange}</dd></div>}
            <div><dt>วิธีใช้งาน</dt><dd>{meta.targetRule === "respondOnly" ? "เมื่อเกมร้องขอการตอบโต้" : "ใช้ในเฟสลงการ์ด"}</dd></div>
          </dl>
          <div className="card-inspect-actions">
            {onChoose && <button type="button" className="btn-primary" onClick={onChoose}>เลือกการ์ดนี้</button>}
            <button type="button" className="btn-secondary" onClick={onClose}>ปิด</button>
          </div>
        </div>
      </section>
    </ModalOverlay>
  );
}
