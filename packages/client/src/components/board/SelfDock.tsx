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
import { DelayedTrickList } from "./DelayedTrickCard";

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
  isMyTurn,
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
  isMyTurn: boolean;
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
          self-target when helping. Uses the same SeatTile.dc.html composition
          as opponents (portrait+badge / info / faction ribbon), sized larger
          for self, with delayed tricks as separate purple cards beside it —
          not the old faction-bar-header shape. */}
      <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
          <div
            onClick={selfTargetable ? onToggleSelfTarget : undefined}
            style={{
              position: "relative",
              width: 250,
              flexShrink: 0,
              background: "linear-gradient(#241a11,#160f09)",
              border: `1px solid ${selfTargetSelected ? "var(--gold)" : "var(--panel-border-3)"}`,
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: selfTargetSelected ? "0 0 14px rgba(217,165,49,.65)" : "0 10px 30px rgba(0,0,0,.6)",
              cursor: selfTargetable ? "pointer" : "default",
              padding: 8,
              display: "flex",
              gap: 8,
            }}
          >
            {isMyTurn && <div className="glow-turn" style={{ borderRadius: 12 }} />}
            {/* portrait, with the seat number badge (gold — self, per SeatTile.dc.html) */}
            <div
              className="card-back"
              style={{ width: 78, height: 96, borderRadius: 8, overflow: "hidden", border: "2px solid var(--panel-border-3)", flexShrink: 0, position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
            >
              <span style={{ fontFamily: "var(--font-glyph)", fontSize: 32, color: "rgba(240,220,180,.5)", lineHeight: 1.1 }}>{generalDisplay(me.generalId).glyph}</span>
              <span style={{ position: "absolute", top: 3, left: 3, width: 20, height: 20, borderRadius: "50%", background: "var(--gold)", color: "#3a2708", fontFamily: "var(--font-glyph-2)", fontWeight: 900, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,.5)" }}>
                {me.seat + 1}
              </span>
            </div>
            {/* info column */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", paddingTop: 2, paddingRight: 16 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontFamily: "var(--font-glyph)", fontSize: 20, color: "var(--ink)", lineHeight: 1 }}>{generalDisplay(me.generalId).glyph}</span>
                <span style={{ fontSize: 13, color: "var(--ink-faint)" }}>{me.name}</span>
              </div>
              {role && (
                <div style={{ marginTop: 4, display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 5, background: "linear-gradient(#243a2a,#16241a)", border: "1px solid var(--green)", borderRadius: 5, padding: "1px 8px", fontSize: 10, color: "var(--green-light)" }}>
                  <span className={`seal ${role.cls}`} style={{ width: 13, height: 13, fontSize: 8 }}>{role.cn}</span>
                  {role.name} · คุณ
                </div>
              )}
              <div style={{ display: "flex", gap: 3, marginTop: 6, flexWrap: "wrap" }}>
                {Array.from({ length: me.maxHp }).map((_, i) => (
                  <span key={i} className="hp-dot" style={{ width: 11, height: 11, background: i < me.hp ? "radial-gradient(circle at 40% 35%, var(--hp-green-light), var(--hp-green))" : "transparent" }} />
                ))}
              </div>
            </div>
            {/* faction ribbon — right edge */}
            <div style={{ position: "absolute", top: 0, right: 0, width: 22, height: "100%", background: factionColor(me.faction), opacity: 0.9, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--font-glyph)", fontSize: 14, color: "rgba(255,255,255,.9)", writingMode: "vertical-rl" }}>{factionLabel(me.faction).slice(0, 1)}</span>
            </div>
            {selfTargetable && <div className="glow-target" style={{ borderRadius: 12 }} />}
          </div>
          {/* pending judgment cards (delayed tricks awaiting judgment) — attached
              beside this panel, per bug list "Attach Delayed Tricks to target". */}
          <DelayedTrickList cards={me.judgmentZone} />
        </div>
        {/* skills */}
        <div style={{ background: "#1d140d", border: "1px solid var(--panel-border-2)", borderRadius: 8, padding: "9px 10px" }}>
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
                  {s.lordOnly && <span style={{ fontSize: 8, background: "var(--gold)", color: "#3a2708", borderRadius: 6, padding: "0 5px" }}>主公</span>}
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
          <div style={{ fontSize: 11, color: "var(--ink-muted)", letterSpacing: 1, marginBottom: 5, textAlign: "center" }}>ของสวมใส่</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 6 }}>
            {equipSlots.map(({ slot, label, glyph, card }) => (
              <EquipSlotCell key={slot} label={label} glyph={glyph} card={card} />
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
          <span style={{ fontSize: 12, color: "var(--ink-muted)", background: "var(--panel-bg)", border: "1px solid var(--panel-border-2)", borderRadius: 5, padding: "6px 10px", textAlign: "center" }}>
            {phaseLabel}
          </span>
          {showEndPhase && (
            <button onClick={onEndPhase} disabled={busy} className="btn-primary" style={{ padding: "9px 18px", fontSize: 13, width: "100%" }}>
              จบเทิร์น
            </button>
          )}
          <RulesButton label="วิธีเล่น & กติกา" style={{ width: "100%", padding: "7px 10px", fontSize: 12 }} />
          <button onClick={onLeave} className="btn-danger" style={{ width: "100%", padding: "6px 10px", fontSize: 11, borderRadius: 5 }}>
            ออกจากเกม
          </button>
        </div>
      </div>
    </div>
  );
}

// Mockup's RT equip grid: slot label on top, a colored icon square, item name
// below — replacing the old horizontal icon+label+desc row.
function EquipSlotCell({ label, glyph, card }: { label: string; glyph: string; card: Card | undefined }) {
  const [hovered, setHovered] = useState(false);
  const filled = !!card;
  const range = card ? cardMeta(card.typeKey).attackRange : undefined;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: "relative", textAlign: "center", cursor: filled ? "help" : "default" }}
    >
      <div style={{ fontSize: 9, color: "var(--ink-faint)", marginBottom: 3 }}>{label}</div>
      <div
        style={{
          height: 44,
          borderRadius: 6,
          background: filled ? "linear-gradient(var(--gold-deep),var(--gold-bronze))" : "#1c150e",
          border: filled ? "none" : "1px dashed var(--panel-border-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontFamily: "var(--font-glyph)", fontSize: 20, color: filled ? "#2e1f08" : "#5c4a2d" }}>{glyph}</span>
      </div>
      <div style={{ fontSize: 9, color: "var(--ink-muted)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {filled ? cardDisplay(card.typeKey).name : "ว่าง"}
      </div>
      {filled && range !== undefined && (
        <div style={{ fontSize: 8, color: "var(--ink-faint)" }}>ระยะ {range}</div>
      )}
      {hovered && filled && card && cardInfo(card.typeKey) && (
        <CardTooltip name={cardDisplay(card.typeKey).name} info={cardInfo(card.typeKey)!} />
      )}
    </div>
  );
}
