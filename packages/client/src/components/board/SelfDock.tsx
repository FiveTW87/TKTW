import { useState } from "react";
import type { Card, PlayerView } from "@tktw/shared";
import { HandCard, CardTooltip } from "../HandCard";
import { RulesButton } from "../RulesModal";
import { cardDisplay, cardInfo } from "../../data/cardNames";
import { generalDisplay, factionColor, factionLabel } from "../../data/generalNames";
import { roleDisplay } from "../../data/roles";
import { activeSkillSpec } from "../../data/skillInteraction";
import { cardMeta } from "../../data/cardMeta";
import type { SkillDisplay } from "../../data/generalSkills";

export interface CardTapState {
  tappable: boolean;
  dimmed: boolean;
}

// SPEC §11.8 — the local player's dock: bottom-center, larger than opponent
// panels, owns the character card, skills, hand and equipment. Business
// logic (targeting rules, skill legality, play routing) stays in Table.tsx;
// this component is presentational plumbing over that state.
export function SelfDock({
  me,
  skills,
  myHand,
  drawnIds,
  selecting,
  selectingLabel,
  getCardState,
  selectedCardIds,
  onTapCard,
  selfTargetable,
  selfTargetSelected,
  onToggleSelfTarget,
  pendingActivateId,
  pendingActivateMode,
  skillMode,
  busy,
  onUseSkill,
  onAnswerActivate,
  isMyDecision,
  isMainAction,
  zhangbaAvailable,
  zhangbaMode,
  onToggleZhangba,
  phaseLabel,
  showEndPhase,
  onEndPhase,
  onLeave,
  equipSlots,
}: {
  me: PlayerView;
  skills: SkillDisplay[];
  myHand: Card[];
  drawnIds: Set<string>;
  selecting: boolean;
  selectingLabel?: string;
  getCardState: (card: Card) => CardTapState;
  selectedCardIds: string[];
  onTapCard: (card: Card) => void;
  selfTargetable: boolean;
  selfTargetSelected: boolean;
  onToggleSelfTarget: () => void;
  pendingActivateId: string | null;
  pendingActivateMode: string | undefined;
  skillMode: string | null;
  busy: boolean;
  onUseSkill: (skillId: string) => void;
  onAnswerActivate: (accept: boolean) => void;
  isMyDecision: boolean;
  isMainAction: boolean;
  zhangbaAvailable: boolean;
  zhangbaMode: boolean;
  onToggleZhangba: () => void;
  phaseLabel: string;
  showEndPhase: boolean;
  onEndPhase: () => void;
  onLeave: () => void;
  equipSlots: { slot: string; label: string; glyph: string; card: Card | undefined }[];
}) {
  const role = roleDisplay(me.role);

  return (
    <div style={{ display: "flex", flexDirection: "row", gap: 14, alignItems: "stretch", width: "100%", maxWidth: 1040 }}>
      {/* LEFT: character details (+ pending judgment cards) — also a ท้อ
          self-target when helping. glow-target is a CHILD overlay (not the
          class on this box) so the box stays in flow / clickable. */}
      <div
        onClick={selfTargetable ? onToggleSelfTarget : undefined}
        style={{
          position: "relative",
          width: 230,
          flexShrink: 0,
          background: "var(--card-bg-2)",
          border: `2px solid ${selfTargetSelected ? "var(--gold)" : factionColor(me.faction)}`,
          borderRadius: 6,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          cursor: selfTargetable ? "pointer" : "default",
          boxShadow: selfTargetSelected ? "0 0 14px rgba(217,165,49,.65)" : undefined,
        }}
      >
        <div style={{ height: 28, background: factionColor(me.faction), display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px" }}>
          <span style={{ fontFamily: "var(--font-glyph)", fontSize: 16, color: "rgba(255,255,255,.95)" }}>{generalDisplay(me.generalId).glyph}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: "rgba(255,255,255,.95)" }}>
            {role && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "rgba(0,0,0,.28)", borderRadius: 8, padding: "1px 7px", fontWeight: 700 }}>
                <span className={`seal ${role.cls}`} style={{ width: 14, height: 14, fontSize: 9 }}>{role.cn}</span>
                {role.name}
              </span>
            )}
            คุณ
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, padding: 10 }}>
          <div className="card-back" style={{ width: 56, height: 74, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: "var(--font-glyph)", fontSize: 24, color: "#5c4a2d" }}>{generalDisplay(me.generalId).glyph}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>{me.name}</div>
            <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{generalDisplay(me.generalId).name} · {factionLabel(me.faction)}</div>
            <div style={{ display: "flex", gap: 3, marginTop: 7, flexWrap: "wrap" }}>
              {Array.from({ length: me.maxHp }).map((_, i) => (
                <span key={i} className="hp-dot" style={{ width: 12, height: 12, background: i < me.hp ? "var(--red)" : "transparent" }} />
              ))}
            </div>
          </div>
        </div>
        {/* pending judgment cards (delayed tricks awaiting judgment) — attached
            to this panel, per bug list "Attach Delayed Tricks to target". */}
        {me.judgmentZone.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5, margin: "0 10px 8px" }}>
            <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>ไพ่ตัดสิน:</span>
            {me.judgmentZone.map((j) => (
              <span key={j.id} style={{ fontSize: 11, background: "#b0442f", color: "#f6ecd2", borderRadius: 5, padding: "3px 8px" }}>{cardDisplay(j.typeKey).name}</span>
            ))}
          </div>
        )}
        {/* skills */}
        <div style={{ flex: 1, margin: "0 10px 10px", background: "#f9f2dd", border: "1px solid #dccba0", borderRadius: 5, padding: "9px 10px" }}>
          {skills.length === 0 && <div style={{ fontSize: 11, color: "var(--ink-faint)", fontStyle: "italic" }}>ไม่มีสกิล</div>}
          {skills.map((s) => {
            const used = me.skillUsedThisTurn[s.id] ?? 0;
            const inlinePending = s.id === pendingActivateId && pendingActivateMode === "inline";
            const spentForTurn = s.active && used >= activeSkillSpec(s.id).maxPerTurn;
            return (
              <div
                key={s.id}
                style={{
                  marginBottom: 8,
                  ...(inlinePending ? { background: "rgba(217,165,49,.18)", border: "1px solid var(--gold)", borderRadius: 6, padding: "6px 7px" } : {}),
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: factionColor(me.faction) }}>{s.name}</span>
                  {s.lordOnly && <span style={{ fontSize: 8, background: "var(--gold)", color: "#5a3d0a", borderRadius: 6, padding: "0 5px" }}>主公</span>}
                  {used > 0 && <span style={{ fontSize: 9, color: "var(--ink-faint)" }}>ใช้แล้ว {used}</span>}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--ink-muted)", lineHeight: 1.4 }}>{s.description}</div>
                {inlinePending && (
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button onClick={() => onAnswerActivate(true)} disabled={busy} className="btn-primary" style={{ flex: 1, padding: 5, fontSize: 11.5, borderRadius: 5 }}>
                      ใช้เลย
                    </button>
                    <button onClick={() => onAnswerActivate(false)} disabled={busy} className="btn-secondary" style={{ flex: 1, padding: 5, fontSize: 11.5, borderRadius: 5 }}>
                      ไม่ใช้
                    </button>
                  </div>
                )}
                {!inlinePending && s.active && isMyDecision && isMainAction && (
                  <button
                    onClick={() => { if (!spentForTurn) onUseSkill(s.id); }}
                    disabled={busy || spentForTurn}
                    className="btn-primary"
                    style={{ marginTop: 5, width: "100%", padding: 6, fontSize: 11.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 5, opacity: skillMode === s.id ? 1 : 0.92, boxShadow: skillMode === s.id ? "0 0 10px rgba(217,165,49,.6)" : undefined }}
                  >
                    <span style={{ fontFamily: "var(--font-glyph)", fontSize: 13 }}>技</span>
                    {spentForTurn ? "ใช้ครบแล้วเทิร์นนี้" : skillMode === s.id ? "กำลังใช้..." : "ใช้สกิล"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {selfTargetable && <div className="glow-target" />}
      </div>

      {/* MIDDLE: hand */}
      <div style={{ flex: 1, minWidth: 0, background: "var(--panel-bg-2)", border: "1px solid var(--card-border-2)", borderRadius: 6, padding: "9px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>การ์ดในมือ · {myHand.length} ใบ</span>
          {selecting && selectingLabel && <span style={{ fontSize: 11, color: "var(--red)" }}>{selectingLabel}</span>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {myHand.map((c) => {
            const { tappable, dimmed } = getCardState(c);
            return (
              <HandCard
                key={c.id}
                card={c}
                selected={selectedCardIds.includes(c.id)}
                dimmed={dimmed}
                animateIn={drawnIds.has(c.id)}
                onClick={tappable ? () => onTapCard(c) : undefined}
              />
            );
          })}
          {myHand.length === 0 && <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>ไม่มีการ์ดในมือ</div>}
        </div>
      </div>

      {/* RIGHT: equipment zone + phase + end-turn */}
      <div style={{ width: 210, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-muted)", letterSpacing: 1, marginBottom: 5 }}>เขตอุปกรณ์</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {equipSlots.map(({ slot, label, glyph, card }) => (
              <EquipSlotTile key={slot} label={label} glyph={glyph} card={card} />
            ))}
          </div>
          {zhangbaAvailable && (
            <button
              onClick={onToggleZhangba}
              disabled={busy}
              className={zhangbaMode ? "btn-primary" : "btn-secondary"}
              style={{ marginTop: 8, width: "100%", padding: "7px 8px", fontSize: 11.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
            >
              <span style={{ fontFamily: "var(--font-glyph)", fontSize: 13 }}>蛇</span>
              {zhangbaMode ? "ยกเลิกทวน" : `ใช้ทวน (2 ใบ = ${cardDisplay("sha").name})`}
            </button>
          )}
        </div>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--ink-muted)", background: "var(--card-bg-2)", border: "1px solid var(--card-border-2)", borderRadius: 5, padding: "6px 10px", textAlign: "center" }}>
            {phaseLabel}
          </span>
          {showEndPhase && (
            <button onClick={onEndPhase} disabled={busy} className="btn-primary" style={{ padding: "9px 18px", fontSize: 13, width: "100%" }}>
              จบเทิร์น
            </button>
          )}
          <RulesButton label="วิธีเล่น & กติกา" style={{ width: "100%", padding: "7px 10px", fontSize: 12 }} />
          <button
            onClick={onLeave}
            style={{ width: "100%", padding: "6px 10px", fontSize: 11, background: "transparent", color: "var(--ink-faint)", border: "1px solid var(--card-border-2)", borderRadius: 5, cursor: "pointer" }}
          >
            ออกจากเกม
          </button>
        </div>
      </div>
    </div>
  );
}

function EquipSlotTile({ label, glyph, card }: { label: string; glyph: string; card: Card | undefined }) {
  const [hovered, setHovered] = useState(false);
  const filled = !!card;
  const range = card ? cardMeta(card.typeKey).attackRange : undefined;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: "100%",
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: filled ? "var(--panel-bg)" : "transparent",
        border: filled ? "1px solid var(--panel-border)" : "1px dashed var(--card-border-2)",
        borderRadius: 5,
        padding: "6px 8px",
        opacity: filled ? 1 : 0.6,
        cursor: filled ? "help" : "default",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 4,
          flexShrink: 0,
          background: filled ? "var(--red)" : "#e3d7b8",
          color: filled ? "#f6ecd2" : "#a99a70",
          fontFamily: "var(--font-glyph-2)",
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {glyph}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {filled ? cardDisplay(card.typeKey).name : label}
        </div>
        <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>{filled ? (range ? `ระยะ ${range}` : label) : "ว่าง"}</div>
      </div>
      {hovered && filled && card && cardInfo(card.typeKey) && (
        <CardTooltip name={cardDisplay(card.typeKey).name} info={cardInfo(card.typeKey)!} />
      )}
    </div>
  );
}
