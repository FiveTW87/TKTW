import { useRef, useState } from "react";
import type { Card, PlayerView } from "@tktw/shared";
import { HandCard, CardTooltip } from "../HandCard";
import { cardDisplay, cardInfo } from "../../data/cardNames";
import { generalDisplay, factionColor } from "../../data/generalNames";
import { roleDisplay } from "../../data/roles";
import { activeSkillSpec } from "../../data/skillInteraction";
import { cardMeta } from "../../data/cardMeta";
import type { SkillDisplay } from "../../data/generalSkills";
import { DelayedTrickList } from "./DelayedTrickCard";
import { useDeviceMode } from "../../lib/useDeviceMode";
import { useSfxStore } from "../../store/sfxStore";
import { GeneralPortrait } from "../GeneralPortrait";
import { FactionBadge } from "../FactionBadge";
import { cardArtUrl } from "../../data/cardArt";

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
  onInspectCard,
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
  onInspect,
  equipSlots,
  showHero = true,
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
  onInspectCard: (card: Card, canChoose: boolean) => void;
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
  onInspect: () => void;
  equipSlots: { slot: string; label: string; glyph: string; card: Card | undefined }[];
  showHero?: boolean;
}) {
  const role = roleDisplay(me.role);
  const { compact } = useDeviceMode();

  return (
    <div className="table-self-dock" style={{ display: "flex", flexDirection: "row", justifyContent: "flex-start", gap: compact ? 6 : 14, alignItems: "stretch", width: compact ? "auto" : "100%", maxWidth: 1040 }}>
      {/* LEFT: character details (+ pending judgment cards) — also a ท้อ
          self-target when helping. Uses the same SeatTile.dc.html composition
          as opponents (portrait+badge / info / faction ribbon), sized larger
          for self, with delayed tricks as separate purple cards beside it —
          not the old faction-bar-header shape. */}
      <div style={{ width: compact ? 175 : 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: compact ? 4 : 8 }}>
        {showHero && <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
          <div
            className="table-self-hero"
            data-player-anchor={me.id}
            onClick={selfTargetable ? onToggleSelfTarget : undefined}
            onKeyDown={selfTargetable ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onToggleSelfTarget();
              }
            } : undefined}
            role={selfTargetable ? "button" : undefined}
            tabIndex={selfTargetable ? 0 : undefined}
            aria-label={selfTargetable ? `เลือกตัวเอง ${me.name}` : undefined}
            style={{
              position: "relative",
              width: compact ? 140 : 250,
              flexShrink: 0,
              background: "linear-gradient(#241a11,#160f09)",
              border: "1px solid var(--panel-border-3)",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(0,0,0,.6)",
              cursor: selfTargetable ? "pointer" : "default",
              padding: compact ? 4 : 8,
              display: "flex",
              gap: compact ? 4 : 8,
            }}
          >
            {isMyTurn && <div className="glow-turn" style={{ borderRadius: 12 }} />}
            {/* portrait, with the seat number badge (gold — self, per SeatTile.dc.html) */}
            <div
              className="card-back"
              style={{ width: compact ? 40 : 78, height: compact ? 46 : 96, borderRadius: 8, overflow: "hidden", border: "2px solid var(--panel-border-3)", flexShrink: 0, position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
            >
              <GeneralPortrait generalId={me.generalId} faction={me.faction} />
              <span style={{ position: "absolute", top: 3, left: 3, width: compact ? 14 : 20, height: compact ? 14 : 20, borderRadius: "50%", background: "var(--gold)", color: "#3a2708", fontFamily: "var(--font-glyph-2)", fontWeight: 900, fontSize: compact ? 9 : 11, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,.5)" }}>
                {me.seat + 1}
              </span>
              <button
                type="button"
                className="portrait-inspect-button"
                onClick={(event) => {
                  event.stopPropagation();
                  onInspect();
                }}
                aria-label={`ดูรายละเอียด ${generalDisplay(me.generalId).name}`}
                title="ดูรายละเอียดขุนพล"
              >
                ⤢
              </button>
            </div>
            {/* info column */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", paddingTop: 2, paddingRight: compact ? 34 : 50 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: compact ? 12 : 15, fontWeight: 700, color: "var(--ink)", lineHeight: 1.2 }}>{generalDisplay(me.generalId).name}</span>
                <span style={{ fontSize: compact ? 9.5 : 11, color: "var(--ink-faint)" }}>{me.name}</span>
              </div>
              {role && (
                <div style={{ marginTop: 4, display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 5, background: "linear-gradient(#243a2a,#16241a)", border: "1px solid var(--green)", borderRadius: 5, padding: "1px 8px", fontSize: compact ? 9 : 10, color: "var(--green-light)" }}>
                  <span className={`seal ${role.cls}`} style={{ width: 13, height: 13, fontSize: 8 }}>{role.cn}</span>
                  {role.name} · คุณ
                </div>
              )}
              <div style={{ display: "flex", gap: 3, marginTop: compact ? 3 : 6, flexWrap: "wrap" }}>
                {Array.from({ length: me.maxHp }).map((_, i) => (
                  <span key={i} className="hp-dot" style={{ width: compact ? 8 : 11, height: compact ? 8 : 11, background: i < me.hp ? "radial-gradient(circle at 40% 35%, var(--hp-green-light), var(--hp-green))" : "transparent" }} />
                ))}
              </div>
            </div>
            <FactionBadge faction={me.faction} compact={compact} />
            {selfTargetable && <div className={selfTargetSelected ? "glow-target-selected" : "glow-target"} style={{ borderRadius: 12 }} />}
            {selfTargetable && selfTargetSelected && (
              <div
                aria-label="เลือกแล้ว"
                style={{
                  position: "absolute",
                  top: 4,
                  right: compact ? 20 : 26,
                  zIndex: 2,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "var(--gold)",
                  color: "#2e1f08",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 900,
                  boxShadow: "0 1px 4px rgba(0,0,0,.5)",
                }}
              >
                ✓
              </div>
            )}
          </div>
          {/* pending judgment cards (delayed tricks awaiting judgment) — attached
              beside this panel, per bug list "Attach Delayed Tricks to target". */}
          <DelayedTrickList cards={me.judgmentZone} />
        </div>}
        {/* While compact target-picking shows the self portrait in this same
            slot, temporarily replace the skill list so both controls remain
            large enough to tap instead of stacking beyond the short dock. */}
        {!(compact && showHero && selfTargetable) && <div className="table-self-skills" style={{ background: "#1d140d", border: "1px solid var(--panel-border-2)", borderRadius: 8, padding: compact ? "4px 6px" : "9px 10px", overflowY: compact ? "auto" : undefined, maxHeight: compact ? 64 : undefined }}>
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
        </div>}
      </div>

      {/* MIDDLE: hand — capped narrower (not flex:1) in compact mode so the
          dock's total width stays clear of the fixed end-turn button that
          floats over the bottom-right corner of the viewport; extra cards
          past the visible width scroll horizontally instead. */}
      <div className="table-hand-zone" style={{ flex: compact ? "0 1 auto" : 1, width: compact ? 190 : undefined, minWidth: 0, background: "var(--panel-bg-2)", border: "1px solid var(--card-border-2)", borderRadius: 6, padding: compact ? "4px 6px" : "9px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: compact ? 3 : 8 }}>
          <span style={{ fontSize: compact ? 10.5 : 12, color: "var(--ink-muted)" }}>การ์ดในมือ · {myHand.length} ใบ</span>
          {selecting && selectingLabel && <span style={{ fontSize: 11, color: "var(--red)" }}>{selectingLabel}</span>}
        </div>
        <div
          className="table-hand-scroll"
          style={{
            display: "flex",
            gap: compact ? 5 : 8,
            flexWrap: "nowrap",
            overflowX: "auto",
            overflowY: "hidden",
            paddingTop: compact ? 10 : 16,
            paddingBottom: 4,
          }}
        >
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
                onInspect={() => onInspectCard(c, tappable)}
                compact={compact}
              />
            );
          })}
          {myHand.length === 0 && <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>ไม่มีการ์ดในมือ</div>}
        </div>
      </div>

      {/* RIGHT: equipment only. Global table controls live in the top-right
          utility rail so this dock can spend its limited height on play. */}
      <div style={{ width: compact ? 140 : 210, flexShrink: 0, display: "flex", flexDirection: "column", gap: compact ? 4 : 10 }}>
        <div>
          <div style={{ fontSize: compact ? 9.5 : 11, color: "var(--ink-muted)", letterSpacing: 1, marginBottom: compact ? 3 : 5, textAlign: "center" }}>ของสวมใส่</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: compact ? 3 : 6 }}>
            {equipSlots.map(({ slot, label, glyph, card }) => (
              <EquipSlotCell
                key={slot}
                label={label}
                glyph={glyph}
                card={card}
                compact={compact}
                {...(card ? { onInspect: () => onInspectCard(card, false) } : {})}
              />
            ))}
          </div>
          {zhangbaAvailable && (
            <button
              onClick={onToggleZhangba}
              disabled={busy}
              className={zhangbaMode ? "btn-primary" : "btn-secondary"}
              style={{ marginTop: compact ? 5 : 8, width: "100%", padding: compact ? "5px 6px" : "7px 8px", fontSize: compact ? 10 : 11.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
            >
              <span style={{ fontFamily: "var(--font-glyph)", fontSize: 13 }}>蛇</span>
              {zhangbaMode ? "ยกเลิกทวน" : `ใช้ทวน (2 ใบ = ${cardDisplay("sha").name})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Mute toggle + volume slider for the synthesized sound effects (Web Audio,
// see lib/sfx.ts) — the app's only local UI preference, so it lives in its
// own tiny popover instead of a full settings screen.
export function SfxControl({ compact, iconOnly = false }: { compact: boolean; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const muted = useSfxStore((s) => s.muted);
  const volume = useSfxStore((s) => s.volume);
  const setMuted = useSfxStore((s) => s.setMuted);
  const setVolume = useSfxStore((s) => s.setVolume);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn-secondary"
        style={{ width: iconOnly ? 44 : "100%", height: iconOnly ? 44 : undefined, padding: iconOnly ? 0 : compact ? "5px 8px" : "7px 10px", fontSize: iconOnly ? 17 : compact ? 10.5 : 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
        aria-label="ตั้งค่าเสียง"
        title="เสียง"
      >
        <span>{muted || volume === 0 ? "🔇" : "🔊"}</span>
        {!iconOnly && "เสียง"}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: iconOnly ? "calc(100% + 6px)" : undefined,
            right: iconOnly ? 0 : undefined,
            bottom: iconOnly ? undefined : "calc(100% + 6px)",
            left: iconOnly ? undefined : "50%",
            transform: iconOnly ? undefined : "translateX(-50%)",
            width: 160,
            zIndex: 80,
            background: "rgba(28,22,14,.96)",
            border: "1px solid var(--gold)",
            borderRadius: 8,
            padding: "10px 12px",
            boxShadow: "0 10px 26px rgba(0,0,0,.45)",
          }}
        >
          <button
            onClick={() => setMuted(!muted)}
            className={muted ? "btn-secondary" : "btn-primary"}
            style={{ width: "100%", padding: "5px 8px", fontSize: 11, marginBottom: 8 }}
          >
            {muted ? "เปิดเสียง" : "ปิดเสียง"}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            style={{ width: "100%" }}
            aria-label="ระดับเสียง"
          />
        </div>
      )}
    </div>
  );
}

// Mockup's RT equip grid: slot label on top, a colored icon square, item name
// below — replacing the old horizontal icon+label+desc row.
function EquipSlotCell({ label, glyph, card, compact, onInspect }: { label: string; glyph: string; card: Card | undefined; compact?: boolean; onInspect?: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [failedArtKey, setFailedArtKey] = useState<string | null>(null);
  const filled = !!card;
  const range = card ? cardMeta(card.typeKey).attackRange : undefined;
  const artUrl = card ? cardArtUrl(card.typeKey) : undefined;
  const showArt = !!card && !!artUrl && failedArtKey !== card.typeKey;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startHold = () => {
    holdTimer.current = setTimeout(() => setHovered(true), 400);
  };
  const endHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHovered(false);
  };
  return (
    <div
      onClick={onInspect}
      onKeyDown={(event) => {
        if (onInspect && (event.key === "Enter" || event.key === " ")) onInspect();
      }}
      role={onInspect ? "button" : undefined}
      tabIndex={onInspect ? 0 : undefined}
      aria-label={card ? `ดูรายละเอียด ${cardDisplay(card.typeKey).name}` : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={startHold}
      onTouchEnd={endHold}
      onTouchCancel={endHold}
      style={{ position: "relative", textAlign: "center", cursor: filled ? "zoom-in" : "default" }}
    >
      <div style={{ fontSize: compact ? 8 : 9, color: "var(--ink-faint)", marginBottom: compact ? 2 : 3 }}>{label}</div>
      <div
        style={{
          height: compact ? 34 : 64,
          borderRadius: 6,
          background: showArt ? "linear-gradient(145deg,#e5d8b7,#bda676)" : filled ? "linear-gradient(var(--gold-deep),var(--gold-bronze))" : "#1c150e",
          border: filled ? "none" : "1px dashed var(--panel-border-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {showArt ? (
          <img
            src={artUrl}
            alt={`ภาพการ์ด ${cardDisplay(card.typeKey).name}`}
            onError={() => setFailedArtKey(card.typeKey)}
            style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", filter: "drop-shadow(0 2px 3px rgba(45,28,10,.28))" }}
          />
        ) : (
          <span style={{ fontFamily: "var(--font-glyph)", fontSize: compact ? 14 : 20, color: filled ? "#2e1f08" : "#5c4a2d" }}>{glyph}</span>
        )}
      </div>
      {!compact && (
        <div style={{ fontSize: 9, color: "var(--ink-muted)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {filled ? cardDisplay(card.typeKey).name : "ว่าง"}
        </div>
      )}
      {!compact && filled && range !== undefined && (
        <div style={{ fontSize: 8, color: "var(--ink-faint)" }}>ระยะ {range}</div>
      )}
      {hovered && filled && card && cardInfo(card.typeKey) && (
        <CardTooltip name={cardDisplay(card.typeKey).name} info={cardInfo(card.typeKey)!} />
      )}
    </div>
  );
}
