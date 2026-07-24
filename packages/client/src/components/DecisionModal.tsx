import { useEffect, useState } from "react";
import type { Card, GameView, PendingDecision, PlayerAnswer } from "@tktw/shared";
import { ModalOverlay, ModalPanel, ModalGlyph } from "./Modal";
import { HandCard } from "./HandCard";
import { describeDecision } from "../data/decisionCopy";
import { clientCountsAs } from "../data/conversions";

const primaryBtn: React.CSSProperties = {
  background: "linear-gradient(#c0463a,#9a3128)",
  color: "#f6ecd2",
  border: "1px solid var(--gold-light)",
  borderRadius: 6,
  padding: "11px 22px",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(90,30,20,.2)",
};

const secondaryBtn: React.CSSProperties = {
  background: "var(--card-bg-2)",
  color: "var(--ink-muted)",
  border: "1px solid var(--panel-border-2)",
  borderRadius: 6,
  padding: "11px 20px",
  fontSize: 14,
  cursor: "pointer",
};

export function DecisionModal({
  pending,
  gameView,
  myHand,
  onAnswer,
}: {
  pending: PendingDecision;
  gameView: GameView;
  myHand: Card[];
  onAnswer: (fields: Omit<PlayerAnswer, "playerId">) => Promise<void>;
}) {
  const copy = describeDecision(pending, gameView);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [awaitingTarget, setAwaitingTarget] = useState(false);
  const [busy, setBusy] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setSelectedCardIds([]);
    setAwaitingTarget(false);
  }, [pending.id]);

  const submit = async (fields: Omit<PlayerAnswer, "playerId" | "decisionId">) => {
    setBusy(true);
    await onAnswer({ decisionId: pending.id, ...fields });
    setBusy(false);
  };

  const shape = copy.shape;

  return (
    <ModalOverlay>
      <ModalPanel width={shape.kind === "pickFromPlayer" || shape.kind === "anonymousPicker" || shape.kind === "pickFromRevealed" || shape.kind === "pickPlayers" ? 520 : 440}>
        <ModalGlyph>{copy.icon}</ModalGlyph>
        <div style={{ fontSize: 15, color: "var(--ink)", lineHeight: 1.5, marginBottom: copy.hint ? 4 : 18 }}>
          {copy.title}
        </div>
        {copy.hint && (
          <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 18 }}>{copy.hint}</div>
        )}

        {shape.kind === "card" && (
          <CardShape
            shape={shape}
            myHand={myHand}
            selectedCardIds={selectedCardIds}
            setSelectedCardIds={setSelectedCardIds}
            awaitingTarget={awaitingTarget}
            setAwaitingTarget={setAwaitingTarget}
            gameView={gameView}
            busy={busy}
            onSubmit={submit}
          />
        )}

        {shape.kind === "choice" && (
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {shape.options.map((opt) => (
              <button
                key={opt.value}
                disabled={busy}
                style={primaryBtn}
                onClick={() => void submit({ choice: opt.value })}
              >
                {opt.label}
              </button>
            ))}
            {shape.declineLabel && (
              <button disabled={busy} style={secondaryBtn} onClick={() => void submit({ pass: true })}>
                {shape.declineLabel}
              </button>
            )}
          </div>
        )}

        {shape.kind === "target" && (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {gameView.players
              .filter((p) => p.alive)
              .map((p) => (
                <button
                  key={p.id}
                  disabled={busy}
                  style={secondaryBtn}
                  onClick={() => void submit({ targetIds: [p.id] })}
                >
                  {p.id === gameView.viewerPlayerId ? `${p.name} (ตัวเอง)` : p.name}
                </button>
              ))}
          </div>
        )}

        {shape.kind === "pickFromPlayer" && (
          <PickFromPlayerShape data={pending.data} gameView={gameView} busy={busy} onSubmit={submit} />
        )}

        {shape.kind === "anonymousPicker" && (
          <OrderCardsShape
            data={pending.data}
            ordered={shape.ordered}
            busy={busy}
            onSubmit={submit}
          />
        )}

        {shape.kind === "pickFromRevealed" && (
          <PickFromRevealedShape data={pending.data} busy={busy} onSubmit={submit} />
        )}

        {shape.kind === "reveal" && (
          <button disabled={busy} style={primaryBtn} onClick={() => void submit({ choice: "reveal" })}>
            {shape.confirmLabel}
          </button>
        )}

        {shape.kind === "pickPlayers" && (
          <PickPlayersShape data={pending.data} gameView={gameView} min={shape.min} max={shape.max} busy={busy} onSubmit={submit} />
        )}
      </ModalPanel>
    </ModalOverlay>
  );
}

function CardShape({
  shape,
  myHand,
  selectedCardIds,
  setSelectedCardIds,
  awaitingTarget,
  setAwaitingTarget,
  gameView,
  busy,
  onSubmit,
}: {
  shape: Extract<ReturnType<typeof describeDecision>["shape"], { kind: "card" }>;
  myHand: Card[];
  selectedCardIds: string[];
  setSelectedCardIds: (ids: string[]) => void;
  awaitingTarget: boolean;
  setAwaitingTarget: (v: boolean) => void;
  gameView: GameView;
  busy: boolean;
  onSubmit: (fields: Omit<PlayerAnswer, "playerId" | "decisionId">) => Promise<void>;
}) {
  // A card-conversion general (e.g. Guan Yu red→สังหาร, Zhen Ji black→หลบ) may
  // answer with a card whose literal type differs — offer those too. The engine
  // derives the type itself for reactive responses, so we submit just the id.
  const me = gameView.players.find((p) => p.id === gameView.viewerPlayerId);
  const isOwnTurn = !!me && gameView.currentTurnPlayerId === me.id;
  const pool = shape.neededType
    ? myHand.filter((c) => clientCountsAs(c, shape.neededType!, me?.generalId ?? "", isOwnTurn))
    : myHand;
  const wantsExact = !!shape.requiredCount;
  const isFull = wantsExact && selectedCardIds.length >= (shape.requiredCount ?? 0);
  const canConfirmCards = wantsExact
    ? selectedCardIds.length === shape.requiredCount
    : selectedCardIds.length > 0;

  const toggle = (id: string) => {
    if (busy) return; // an answer is already in flight — ignore extra taps
    if (selectedCardIds.includes(id)) {
      setSelectedCardIds(selectedCardIds.filter((x) => x !== id));
      return;
    }
    if (!wantsExact && !shape.multi) {
      // single-tap-to-use cards submit immediately, no separate confirm step
      void onSubmit({ cardIds: [id], ...(shape.choiceOnConfirm ? { choice: shape.choiceOnConfirm } : {}) });
      return;
    }
    if (wantsExact && isFull) return;
    setSelectedCardIds([...selectedCardIds, id]);
  };

  const confirmCards = () => {
    if (shape.needsTarget) {
      setAwaitingTarget(true);
      return;
    }
    void onSubmit({
      cardIds: selectedCardIds,
      ...(shape.choiceOnConfirm ? { choice: shape.choiceOnConfirm } : {}),
    });
  };

  if (awaitingTarget) {
    const others = gameView.players.filter((p) => p.alive && p.id !== gameView.viewerPlayerId);
    return (
      <div>
        <div style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 12 }}>เลือกเป้าหมายใหม่</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {others.map((p) => (
            <button
              key={p.id}
              disabled={busy}
              style={secondaryBtn}
              onClick={() => void onSubmit({ cardIds: selectedCardIds, targetIds: [p.id] })}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {pool.length === 0 && shape.neededType ? (
        <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 14, fontStyle: "italic" }}>
          ไม่มีการ์ดที่ใช้ได้ในมือ
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
          {((shape.requiredCount || shape.multi) && !shape.neededType ? myHand : pool).map((c) => (
            <HandCard key={c.id} card={c} selected={selectedCardIds.includes(c.id)} onClick={() => toggle(c.id)} />
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        {(wantsExact || shape.multi) && (
          <button disabled={busy || !canConfirmCards} style={primaryBtn} onClick={confirmCards}>
            {shape.confirmLabel ?? "ยืนยัน"}
          </button>
        )}
        {!shape.noDecline && (
          <button disabled={busy} style={secondaryBtn} onClick={() => void onSubmit({ pass: true })}>
            {shape.declineLabel ?? "ปฏิเสธ"}
          </button>
        )}
      </div>
    </div>
  );
}

function PickFromPlayerShape({
  data,
  gameView,
  busy,
  onSubmit,
}: {
  data: Record<string, unknown>;
  gameView: GameView;
  busy: boolean;
  onSubmit: (fields: Omit<PlayerAnswer, "playerId" | "decisionId">) => Promise<void>;
}) {
  const targetId = typeof data.targetId === "string" ? data.targetId : undefined;
  const target = gameView.players.find((p) => p.id === targetId);
  const handCount = typeof data.handCount === "number" ? data.handCount : (target ? 0 : 0);
  const visible: Card[] = target
    ? [...(Object.values(target.equipment).filter(Boolean) as Card[]), ...target.judgmentZone]
    : [];

  return (
    <div>
      {visible.length > 0 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
          {visible.map((c) => (
            <HandCard key={c.id} card={c} selected={false} onClick={busy ? undefined : () => void onSubmit({ cardIds: [c.id] })} />
          ))}
        </div>
      )}
      <button disabled={busy} style={primaryBtn} onClick={() => void onSubmit({})}>
        สุ่มจากมือ ({handCount} ใบ)
      </button>
    </div>
  );
}

// wugu: the revealed cards' full faces are carried in data.options, so we can
// show real card faces (with hover details via HandCard) instead of blank
// slots. A tap picks that card immediately.
function PickFromRevealedShape({
  data,
  busy,
  onSubmit,
}: {
  data: Record<string, unknown>;
  busy: boolean;
  onSubmit: (fields: Omit<PlayerAnswer, "playerId" | "decisionId">) => Promise<void>;
}) {
  const options = (Array.isArray(data.options) ? data.options : []) as Card[];
  if (options.length === 0) {
    return (
      <button disabled={busy} style={primaryBtn} onClick={() => void onSubmit({})}>
        ผ่าน
      </button>
    );
  }
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
      {options.map((c) => (
        <HandCard
          key={c.id}
          card={c}
          selected={false}
          onClick={busy ? undefined : () => void onSubmit({ cardIds: [c.id] })}
        />
      ))}
    </div>
  );
}

// Choose up to `max` players from data.eligible (each { id, count }). Used by
// เตียวเลี้ยว's tuxi — pick whom to rob.
function PickPlayersShape({
  data,
  gameView,
  min,
  max,
  busy,
  onSubmit,
}: {
  data: Record<string, unknown>;
  gameView: GameView;
  min: number;
  max: number;
  busy: boolean;
  onSubmit: (fields: Omit<PlayerAnswer, "playerId" | "decisionId">) => Promise<void>;
}) {
  const eligible = (Array.isArray(data.eligible) ? data.eligible : []) as Array<{ id: string; count: number }>;
  const [picked, setPicked] = useState<string[]>([]);
  const name = (id: string) => gameView.players.find((p) => p.id === id)?.name ?? id;
  const toggle = (id: string) =>
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length < max) return [...prev, id];
      return [...prev.slice(1), id]; // at cap → drop oldest
    });

  return (
    <div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
        {eligible.map((e) => {
          const on = picked.includes(e.id);
          return (
            <button
              key={e.id}
              disabled={busy}
              onClick={() => toggle(e.id)}
              style={{ ...(on ? primaryBtn : secondaryBtn), display: "flex", flexDirection: "column", gap: 2 }}
            >
              <span>{name(e.id)}</span>
              <span style={{ fontSize: 11, opacity: 0.85 }}>{e.count} ใบ</span>
            </button>
          );
        })}
      </div>
      <button disabled={busy || picked.length < min} style={primaryBtn} onClick={() => void onSubmit({ targetIds: picked })}>
        {picked.length > 0 ? `ยืนยัน (${picked.length} คน)` : "ไม่ชิงใคร"}
      </button>
    </div>
  );
}

// ขงเบ้ง's guandou: the peeked cards' full faces arrive in data.options (an
// engine invariant shared with wugu — see zhugeliang.ts), redacted to {} for
// every non-owner viewer server-side, so it's safe to render real card faces
// here. Two interchangeable ways to set the new order (user's choice, not a
// forced default): drag a card to swap its position, or switch to tap mode
// and tap cards in the order they should end up in (numbered badges) — the
// same tap-to-append UX this screen always had, just with real card faces
// now instead of anonymous "ใบที่ N" slots.
function OrderCardsShape({
  data,
  ordered,
  busy,
  onSubmit,
}: {
  data: Record<string, unknown>;
  ordered?: boolean | undefined;
  busy: boolean;
  onSubmit: (fields: Omit<PlayerAnswer, "playerId" | "decisionId">) => Promise<void>;
}) {
  const options = (Array.isArray(data.options) ? data.options : []) as Card[];
  const byId = new Map(options.map((c) => [c.id, c]));
  const originalOrder = options.map((c) => c.id);
  const [order, setOrder] = useState<string[]>(originalOrder);
  const [tapMode, setTapMode] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  if (!ordered) {
    return (
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        {options.map((c) => (
          <HandCard key={c.id} card={c} selected={false} onClick={busy ? undefined : () => void onSubmit({ cardIds: [c.id] })} />
        ))}
      </div>
    );
  }

  const toggleMode = () => {
    setTapMode((v) => !v);
    setOrder(tapMode ? originalOrder : []); // → drag: reset to current deck order; → tap: start fresh
  };

  const tapCard = (id: string) => {
    if (busy) return;
    setOrder((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const moveOver = (overId: string) => {
    if (!dragId || dragId === overId) return;
    setOrder((prev) => {
      const from = prev.indexOf(dragId);
      const to = prev.indexOf(overId);
      if (from === -1 || to === -1) return prev;
      const next = prev.slice();
      next.splice(from, 1);
      next.splice(to, 0, dragId);
      return next;
    });
  };

  // Drag mode always shows the live-reordered `order`; tap mode keeps cards
  // in their fixed original layout (only the badge number changes) so tapped
  // cards don't jump around mid-selection.
  const cardsToShow = (tapMode ? originalOrder : order).map((id) => byId.get(id)).filter((c): c is Card => !!c);

  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 8, textAlign: "center" }}>
        {tapMode ? "แตะการ์ดตามลำดับที่ต้องการ" : "ลากการ์ดเพื่อสลับตำแหน่ง"}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
        {cardsToShow.map((c) => {
          const pos = order.indexOf(c.id);
          return (
            <div
              key={c.id}
              style={{ position: "relative", opacity: dragId === c.id ? 0.4 : 1, cursor: tapMode ? "pointer" : "grab" }}
              draggable={!tapMode && !busy}
              onDragStart={() => setDragId(c.id)}
              onDragOver={(e) => {
                e.preventDefault();
                moveOver(c.id);
              }}
              onDrop={(e) => e.preventDefault()}
              onDragEnd={() => setDragId(null)}
            >
              <HandCard card={c} selected={tapMode && pos >= 0} onClick={tapMode ? () => tapCard(c.id) : undefined} />
              {pos >= 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "var(--gold)",
                    color: "#5a3d0a",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  {pos + 1}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button disabled={busy} style={secondaryBtn} onClick={toggleMode}>
          {tapMode ? "🖱 สลับเป็นลากแทน" : "👆 สลับเป็นแตะเรียงแทน"}
        </button>
        <button disabled={busy} style={primaryBtn} onClick={() => void onSubmit({ cardIds: order })}>
          ยืนยันลำดับ
        </button>
        <button disabled={busy} style={secondaryBtn} onClick={() => void onSubmit({ pass: true })}>
          เรียงเดิม
        </button>
      </div>
    </div>
  );
}
