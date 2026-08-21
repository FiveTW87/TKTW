import type { Card, GameView, PendingDecision, PlayerAnswer, PlayerView } from "@tktw/shared";
import { CardInspectModal } from "../CardInspectModal";
import { DeathDialog } from "../DeathDialog";
import { DecisionModal } from "../DecisionModal";
import { HandCard } from "../HandCard";
import { InspectModal } from "../InspectModal";
import { ModalGlyph, ModalOverlay, ModalPanel } from "../Modal";
import { SkillToast, type ToastData } from "../SkillToast";
import { cardDisplay } from "../../data/cardNames";
import type { CombatEffect } from "../../hooks/useCombatPresentation";
import type { CardMotionEffect } from "../../hooks/useCardMotionPresentation";
import type { TableFeedbackCue } from "../../hooks/useTableFeedbackPresentation";
import type { PlayCardOption, PlayChoice } from "../../hooks/mainActionController";
import { CombatEffectLayer } from "./CombatEffectLayer";
import { CardMotionLayer } from "./CardMotionLayer";
import { TableFeedbackLayer } from "./TableFeedbackLayer";

type AnswerFields = Omit<PlayerAnswer, "playerId">;

export interface TableOverlayViewModel {
  toast: ToastData | null;
  cardMotionEffects: CardMotionEffect[];
  combatEffects: CombatEffect[];
  feedbackCues: TableFeedbackCue[];
  generalPick: { playerName: string; remainingSeconds: number | null } | null;
  notice: string | null;
  decision: {
    pending: PendingDecision;
    gameView: GameView;
    hand: Card[];
    onAnswer: (answer: AnswerFields) => Promise<void>;
  } | null;
  playerInspection: {
    player: PlayerView;
    onClose: () => void;
    onInspectCard: (card: Card) => void;
  } | null;
  cardInspection: {
    card: Card;
    onClose: () => void;
    onChoose?: () => void;
  } | null;
  death: {
    role: string | undefined;
    onSpectate: () => void;
    onLeave: () => void;
  } | null;
  leaveConfirm: {
    onConfirm: () => void;
    onCancel: () => void;
  } | null;
  playChoice: {
    choice: PlayChoice;
    viewerName: string;
    onChoose: (card: Card, option: PlayCardOption) => void;
    onClose: () => void;
  } | null;
  discard: {
    cardsNewestFirst: Card[];
    onInspect: (card: Card) => void;
    onClose: () => void;
  } | null;
  diagnostics: {
    open: boolean;
    lines: readonly string[];
    error: string | null;
    onToggle: () => void;
  };
}

function LeaveGameConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <ModalOverlay onClose={onCancel}>
      <ModalPanel width={380}>
        <ModalGlyph>退</ModalGlyph>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>ออกจากเกมตอนนี้?</div>
        <div style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 18 }}>
          ตัวละครของคุณจะเสียชีวิตทันที และกลับเข้าเกมเดิมไม่ได้
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onConfirm} className="btn-danger" style={{ padding: "10px 22px", fontSize: 14 }}>
            ยืนยัน
          </button>
          <button onClick={onCancel} className="btn-secondary" style={{ padding: "10px 22px", fontSize: 14 }}>
            ยกเลิก
          </button>
        </div>
      </ModalPanel>
    </ModalOverlay>
  );
}

export function TableRecoveryPanel({
  debugLines,
  onReload,
  onLeave,
}: {
  debugLines: readonly string[];
  onReload: () => void;
  onLeave: () => void;
}) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="panel-plain" style={{ width: 460, maxWidth: "100%", padding: 32, textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--red)" }}>เกมค้าง — ไม่มีตาให้เล่น</div>
        <div style={{ marginTop: 8, color: "var(--ink-muted)", fontSize: 14 }}>
          เซิร์ฟเวอร์ไม่ได้ส่งตาถัดไปมา ลองรีเฟรชหน้า หรือออกจากห้อง
        </div>
        <div style={{ marginTop: 16, textAlign: "left", background: "rgba(28,22,14,.92)", color: "#e8dcc0", borderRadius: 8, padding: "10px 12px", fontFamily: "monospace", fontSize: 11, maxHeight: 180, overflow: "auto" }}>
          {[...debugLines].reverse().slice(0, 12).map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18 }}>
          <button onClick={onReload} className="btn-secondary" style={{ padding: "11px 22px", fontSize: 14 }}>รีเฟรช</button>
          <button onClick={onLeave} className="btn-primary" style={{ padding: "11px 22px", fontSize: 14 }}>ออกจากห้อง</button>
        </div>
      </div>
    </div>
  );
}

export function TableOverlays({ model }: { model: TableOverlayViewModel }) {
  const {
    toast,
    cardMotionEffects,
    combatEffects,
    feedbackCues,
    generalPick,
    notice,
    decision,
    playerInspection,
    cardInspection,
    death,
    leaveConfirm,
    playChoice,
    discard,
    diagnostics,
  } = model;

  return (
    <>
      {toast && <SkillToast toast={toast} />}
      <CardMotionLayer effects={cardMotionEffects} />
      <CombatEffectLayer effects={combatEffects} />
      <TableFeedbackLayer cues={feedbackCues} />
      {generalPick && (
        <div
          className="anim-rise"
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "linear-gradient(#241a11,#160f09)",
            border: "1px solid var(--panel-border-3)",
            borderRadius: 10,
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--ink)",
            boxShadow: "0 12px 34px rgba(0,0,0,.5)",
            pointerEvents: "none",
          }}
        >
          <span>รอ {generalPick.playerName} เลือกนายพล...</span>
          {generalPick.remainingSeconds !== null && (
            <span style={{ fontSize: 12, fontWeight: 700, color: generalPick.remainingSeconds <= 5 ? "var(--target-red)" : "var(--ink-muted)" }}>
              เหลือ {generalPick.remainingSeconds} วิ
            </span>
          )}
        </div>
      )}
      {notice && (
        <div
          className="anim-rise"
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            background: "linear-gradient(#241a11,#160f09)",
            border: "1px solid var(--panel-border-3)",
            borderRadius: 10,
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--ink)",
            boxShadow: "0 12px 34px rgba(0,0,0,.5)",
            pointerEvents: "none",
          }}
        >
          {notice}
        </div>
      )}
      {decision && (
        <DecisionModal
          pending={decision.pending}
          gameView={decision.gameView}
          myHand={decision.hand}
          onAnswer={decision.onAnswer}
        />
      )}
      {playerInspection && (
        <InspectModal
          player={playerInspection.player}
          onClose={playerInspection.onClose}
          onInspectCard={playerInspection.onInspectCard}
        />
      )}
      {cardInspection && (
        <CardInspectModal
          card={cardInspection.card}
          onClose={cardInspection.onClose}
          {...(cardInspection.onChoose ? { onChoose: cardInspection.onChoose } : {})}
        />
      )}
      {death && (
        <DeathDialog
          role={death.role}
          onSpectate={death.onSpectate}
          onLeave={death.onLeave}
        />
      )}
      {leaveConfirm && (
        <LeaveGameConfirmDialog
          onConfirm={leaveConfirm.onConfirm}
          onCancel={leaveConfirm.onCancel}
        />
      )}
      {playChoice && (
        <ModalOverlay onClose={playChoice.onClose}>
          <ModalPanel width={360}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
              เล่น "{cardDisplay(playChoice.choice.card.typeKey).name}" เป็น?
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 16 }}>{playChoice.viewerName} · เลือกวิธีเล่นการ์ดใบนี้</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              {playChoice.choice.options.map((option) => (
                <button
                  key={option.typeKey}
                  className="btn-primary"
                  style={{ padding: "10px 18px", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}
                  onClick={() => playChoice.onChoose(playChoice.choice.card, option)}
                >
                  <span style={{ fontFamily: "var(--font-glyph)" }}>{cardDisplay(option.typeKey).glyph}</span>
                  {cardDisplay(option.typeKey).name}
                  {option.asType && <span style={{ fontSize: 10, opacity: 0.8 }}>(แปลง)</span>}
                </button>
              ))}
            </div>
            <button onClick={playChoice.onClose} className="btn-secondary" style={{ marginTop: 16, padding: "8px 16px", fontSize: 13 }}>
              ยกเลิก
            </button>
          </ModalPanel>
        </ModalOverlay>
      )}
      {discard && (
        <ModalOverlay onClose={discard.onClose}>
          <ModalPanel width={560}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>กองทิ้ง · {discard.cardsNewestFirst.length} ใบ</span>
              <button onClick={discard.onClose} className="btn-secondary" style={{ padding: "6px 14px", fontSize: 13 }}>ปิด</button>
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 10, textAlign: "left" }}>ใหม่สุดอยู่บนซ้าย · เอาเมาส์ชี้เพื่อดูรายละเอียด</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-start", maxHeight: "60vh", overflowY: "auto", paddingTop: 40 }}>
              {discard.cardsNewestFirst.map((card, index) => (
                <HandCard key={`${card.id}-${index}`} card={card} selected={false} onInspect={() => discard.onInspect(card)} />
              ))}
            </div>
          </ModalPanel>
        </ModalOverlay>
      )}

      <button
        onClick={diagnostics.onToggle}
        title="แสดง/ซ่อน debug log"
        style={{
          position: "fixed",
          bottom: 16,
          left: 16,
          zIndex: 70,
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: diagnostics.open ? "var(--red)" : "linear-gradient(#241a11,#160f09)",
          border: "1px solid var(--panel-border-2)",
          cursor: "pointer",
          fontSize: 18,
          boxShadow: "0 4px 12px rgba(0,0,0,.5)",
        }}
      >
        🐛
      </button>
      {diagnostics.open && (
        <div
          style={{
            position: "fixed",
            bottom: 64,
            left: 16,
            zIndex: 70,
            width: 420,
            maxWidth: "calc(100vw - 32px)",
            maxHeight: "50vh",
            overflow: "auto",
            background: "rgba(28,22,14,.94)",
            color: "#e8dcc0",
            border: "1px solid var(--panel-border-2)",
            borderRadius: 8,
            padding: "10px 12px",
            fontFamily: "monospace",
            fontSize: 11.5,
            lineHeight: 1.5,
            boxShadow: "0 12px 34px rgba(0,0,0,.5)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <b style={{ color: "#f0d68a" }}>DEBUG LOG (ล่าสุดอยู่บน)</b>
            <span style={{ fontSize: 10, opacity: 0.7 }}>{diagnostics.error ? `error: ${diagnostics.error}` : ""}</span>
          </div>
          {[...diagnostics.lines].reverse().map((line, index) => (
            <div key={index} style={{ whiteSpace: "pre-wrap", color: line.includes("✗") ? "#ff9a8a" : line.includes("⨯") ? "#ffcf6a" : "#cfe0c0" }}>
              {line}
            </div>
          ))}
          {diagnostics.lines.length === 0 && <div style={{ opacity: 0.6 }}>(ยังไม่มี event)</div>}
        </div>
      )}
    </>
  );
}
