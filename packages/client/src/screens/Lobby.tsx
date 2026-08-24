import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { RulesButton } from "../components/RulesModal";
import { lobbyRingPosition } from "../lib/seatLayout";
import { ModalOverlay, ModalPanel, ModalGlyph } from "../components/Modal";
import { useDeviceMode } from "../lib/useDeviceMode";
import { RoomPacingPicker, RoomPacingSummary } from "../components/RoomPacingControls";
import type { RoomSettingsSelection } from "@tktw/shared";

function LeaveConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <ModalOverlay onClose={onCancel}>
      <ModalPanel width={340}>
        <ModalGlyph>退</ModalGlyph>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 18 }}>ออกจากห้องนี้?</div>
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

const panelStyle: React.CSSProperties = {
  width: 560,
  maxWidth: "100%",
  background: "linear-gradient(#241a11,#160f09)",
  border: "1px solid var(--panel-border-3)",
  borderRadius: 8,
  boxShadow: "0 22px 60px rgba(0,0,0,.7)",
  overflow: "hidden",
};

function Masthead({ compact }: { compact: boolean }) {
  return (
    <div style={{ padding: compact ? "20px 24px 16px" : "48px 40px 32px", textAlign: "center", borderBottom: "1px solid var(--panel-border)" }}>
      <div
        style={{
          width: compact ? 52 : 84,
          height: compact ? 52 : 84,
          borderRadius: "50%",
          margin: compact ? "0 auto 8px" : "0 auto 16px",
          background: "radial-gradient(circle at 38% 34%, #caa24e, #7a5222)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "3px solid var(--gold-light)",
          boxShadow: "0 10px 34px rgba(0,0,0,.6)",
        }}
      >
        <span style={{ fontFamily: "var(--font-glyph)", fontSize: compact ? 26 : 42, color: "#2e1f08" }}>殺</span>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: compact ? 24 : 38, color: "var(--ink)", fontWeight: 900 }}>Three Kingdoms</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6, justifyContent: "center" }}>
        <span style={{ width: 48, height: 1, background: "linear-gradient(90deg,transparent,#8a6a3c)" }} />
        <span style={{ fontFamily: "var(--font-display)", fontSize: compact ? 14 : 20, letterSpacing: 5, color: "var(--gold)", fontWeight: 900 }}>TRAITOR WITHIN</span>
        <span style={{ width: 48, height: 1, background: "linear-gradient(90deg,#8a6a3c,transparent)" }} />
      </div>
    </div>
  );
}

// R0 — pure landing: logo + two entry buttons, no form yet.
function Home({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  const { compact } = useDeviceMode();
  return (
    <div style={panelStyle}>
      <Masthead compact={compact} />
      <div style={{ padding: compact ? "16px 24px 20px" : "32px 40px 44px", display: "flex", flexDirection: "column", gap: compact ? 8 : 14, alignItems: "center" }}>
        <div style={{ fontSize: compact ? 12 : 14, color: "var(--ink-faint)", marginBottom: compact ? 2 : 6 }}>เกมการ์ดสวมบทบาทลับ · 3–10 คน</div>
        <div style={{ display: "flex", gap: 14 }}>
          <button onClick={onCreate} className="btn-primary" style={{ padding: compact ? "10px 24px" : "16px 40px", fontSize: compact ? 14 : 18, borderRadius: 12 }}>
            สร้างห้องใหม่
          </button>
          <button onClick={onJoin} className="btn-secondary" style={{ padding: compact ? "10px 24px" : "16px 40px", fontSize: compact ? 14 : 18, borderRadius: 12 }}>
            เข้าร่วมห้อง
          </button>
        </div>
        <RulesButton label="วิธีเล่น & กติกา" style={{ marginTop: compact ? 4 : 10, padding: compact ? "8px" : "11px", fontSize: compact ? 12 : 14, width: "100%" }} />
      </div>
    </div>
  );
}

// R0D — the create/join entry dialog (name + room code), shown once the
// player picks a path from Home. Keeps the "เล่นกับบอท" quickstart button
// even though the source mockup omits it — real dev/test value.
const MIN_TOTAL_PLAYERS = 3;
const MAX_TOTAL_PLAYERS = 10;

function EntryDialog({ initialTab, onClose }: { initialTab: "create" | "join"; onClose: () => void }) {
  const createRoom = useGameStore((s) => s.createRoom);
  const joinRoom = useGameStore((s) => s.joinRoom);
  const quickstartWithBots = useGameStore((s) => s.quickstartWithBots);
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [totalPlayers, setTotalPlayers] = useState(3);
  const [settings, setSettings] = useState<RoomSettingsSelection | null>({ preset: "standard" });
  const { compact } = useDeviceMode();

  const handleCreate = async () => {
    if (!name.trim() || !settings) return;
    setBusy(true);
    await createRoom(name.trim(), settings);
    setBusy(false);
  };
  const handleJoin = async () => {
    if (!name.trim() || !roomCode.trim()) return;
    setBusy(true);
    await joinRoom(roomCode.trim(), name.trim());
    setBusy(false);
  };
  const handleQuickstart = async () => {
    if (!settings) return;
    setBusy(true);
    await quickstartWithBots(name.trim() || "ผู้เล่นทดสอบ", totalPlayers - 1, settings);
    setBusy(false);
  };

  const inputStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    marginTop: 7,
    background: "#140e08",
    border: "1px solid var(--panel-border-3)",
    borderRadius: 8,
    padding: compact ? "9px 11px" : "12px 14px",
    fontSize: compact ? 13 : 15,
    color: "var(--ink)",
    fontFamily: "var(--font-body)",
    boxShadow: "inset 0 0 10px rgba(217,165,49,.12)",
  };

  const panelBoxStyle: React.CSSProperties = {
    width: compact ? 300 : 380,
    maxHeight: compact ? "94vh" : undefined,
    overflowY: compact ? "auto" : undefined,
    background: "linear-gradient(#241a11,#160f09)",
    border: "1px solid var(--panel-border-3)",
    borderRadius: 14,
    padding: compact ? "16px 16px" : "24px 26px",
    boxShadow: "0 20px 50px rgba(0,0,0,.7)",
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(12,8,5,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}
    >
      {initialTab === "create" ? (
        <div role="dialog" aria-modal="true" aria-label="สร้างห้องใหม่" onClick={(e) => e.stopPropagation()} style={panelBoxStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: compact ? 6 : 10, marginBottom: 4 }}>
            <span style={{ fontFamily: "var(--font-glyph)", fontSize: compact ? 18 : 24, color: "var(--gold)" }}>創</span>
            <span style={{ fontSize: compact ? 15 : 20, fontWeight: 700, color: "var(--ink)" }}>สร้างห้องใหม่</span>
          </div>
          <div style={{ fontSize: compact ? 10.5 : 12, color: "var(--ink-faint)", marginBottom: compact ? 12 : 20 }}>ตั้งชื่อผู้เล่นเพื่อเริ่มเป็นเจ้าของห้อง</div>
          <label style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: 1 }}>ชื่อผู้เล่น</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="ใส่ชื่อของคุณ"
            style={{ ...inputStyle, marginBottom: compact ? 12 : 18 }}
          />
          <RoomPacingPicker value={settings} onChange={setSettings} compact={compact} />
          <button onClick={handleCreate} disabled={busy || !name.trim() || !settings} className="btn-primary" style={{ width: "100%", padding: compact ? 10 : 14, fontSize: compact ? 14 : 16, borderRadius: 10 }}>
            สร้างห้อง
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ink-faint)", fontSize: 12, margin: compact ? "12px 0 8px" : "18px 0 12px" }}>
            <span style={{ flex: 1, height: 1, background: "var(--panel-border-2)" }} />
            หรือ
            <span style={{ flex: 1, height: 1, background: "var(--panel-border-2)" }} />
          </div>
          <label style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: 1 }}>จำนวนผู้เล่นทั้งหมด (รวมคุณ)</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, marginBottom: compact ? 10 : 14 }}>
            <button
              onClick={() => setTotalPlayers((n) => Math.max(MIN_TOTAL_PLAYERS, n - 1))}
              disabled={totalPlayers <= MIN_TOTAL_PLAYERS}
              className="btn-secondary"
              style={{ width: compact ? 32 : 38, height: compact ? 32 : 38, padding: 0, fontSize: 16, borderRadius: 8 }}
            >
              −
            </button>
            <span style={{ flex: 1, textAlign: "center", fontSize: compact ? 15 : 17, fontWeight: 700, color: "var(--ink)" }}>
              {totalPlayers} คน
            </span>
            <button
              onClick={() => setTotalPlayers((n) => Math.min(MAX_TOTAL_PLAYERS, n + 1))}
              disabled={totalPlayers >= MAX_TOTAL_PLAYERS}
              className="btn-secondary"
              style={{ width: compact ? 32 : 38, height: compact ? 32 : 38, padding: 0, fontSize: 16, borderRadius: 8 }}
            >
              +
            </button>
          </div>
          <button onClick={handleQuickstart} disabled={busy || !settings} className="btn-secondary" style={{ width: "100%", padding: compact ? 9 : 12, fontSize: compact ? 12.5 : 14, borderColor: "var(--gold)" }}>
            เล่นกับบอท (ทดสอบคนเดียว)
          </button>
          <div style={{ fontSize: compact ? 9.5 : 10.5, color: "var(--ink-faint)", textAlign: "center", marginTop: 8 }}>
            สร้างห้อง + บอท {totalPlayers - 1} ตัว แล้วเริ่มเกมทันที ไม่ต้องรอผู้เล่นคนอื่น
          </div>
        </div>
      ) : (
        <div role="dialog" aria-modal="true" aria-label="เข้าร่วมห้อง" onClick={(e) => e.stopPropagation()} style={panelBoxStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: compact ? 6 : 10, marginBottom: 4 }}>
            <span style={{ fontFamily: "var(--font-glyph)", fontSize: compact ? 18 : 24, color: "var(--gold)" }}>入</span>
            <span style={{ fontSize: compact ? 15 : 20, fontWeight: 700, color: "var(--ink)" }}>เข้าร่วมห้อง</span>
          </div>
          <div style={{ fontSize: compact ? 10.5 : 12, color: "var(--ink-faint)", marginBottom: compact ? 12 : 20 }}>ใส่ชื่อและรหัสห้องที่เพื่อนแชร์มา</div>
          <label style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: 1 }}>ชื่อผู้เล่น</label>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="ใส่ชื่อของคุณ" style={{ ...inputStyle, marginBottom: compact ? 10 : 16 }} />
          <label style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: 1 }}>รหัสห้อง</label>
          <input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="รหัสห้อง 6 หลัก"
            style={{ ...inputStyle, marginBottom: compact ? 14 : 22, letterSpacing: 3, textTransform: "uppercase" }}
          />
          <button onClick={handleJoin} disabled={busy || !name.trim() || !roomCode.trim()} className="btn-secondary" style={{ width: "100%", padding: compact ? 10 : 14, fontSize: compact ? 14 : 16, borderRadius: 10 }}>
            เข้าร่วมห้อง
          </button>

        </div>
      )}
    </div>
  );
}

function WaitingRoom() {
  const roomCode = useGameStore((s) => s.roomCode);
  const seatIndex = useGameStore((s) => s.seatIndex);
  const roomState = useGameStore((s) => s.roomState);
  const startGame = useGameStore((s) => s.startGame);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const [starting, setStarting] = useState(false);
  const { compact } = useDeviceMode();

  const seats = roomState?.seats ?? [];
  const mySeat = seatIndex !== null ? seats[seatIndex] : undefined;
  const canStart = !!mySeat?.isHost && seats.length >= 3;
  // The ring shows real seats plus exactly one "รอผู้เล่น" invitation slot
  // (none once the room is full) — not a fixed 10-slot circle — so it grows
  // organically as people join instead of leaving a wall of empty boxes.
  const placeholderCount = seats.length < 10 ? 1 : 0;
  const ringSize = Math.max(seats.length + placeholderCount, 1);
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  const handleStart = async () => {
    setStarting(true);
    await startGame();
    setStarting(false);
  };

  return (
    <div className="campaign-screen lobby-waiting-screen" style={{ position: "relative", width: "100%", height: "100dvh", display: "flex", flexDirection: "column" }}>
      <div className="war-table-rays" />

      {/* header row — normal flow, so it never competes for space with the footer */}
      <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 28px 0" }}>
        <div style={{ background: "linear-gradient(#241a11,#180f09)", border: "1px solid var(--panel-border-2)", borderRadius: 11, padding: "10px 15px" }}>
          <div style={{ fontSize: 10, color: "var(--ink-faint)", letterSpacing: 1 }}>รหัสห้อง</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: "var(--gold)", letterSpacing: 3 }}>{roomCode}</div>
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: "var(--ink)", position: "absolute", left: 0, right: 0, top: 26, textAlign: "center", pointerEvents: "none" }}>
          ห้องรอ · <span style={{ color: "var(--gold)" }}>รวมพลก่อนออกศึก</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "inline-block", background: "linear-gradient(#243a2a,#16241a)", border: "1px solid var(--green)", borderRadius: 18, padding: "7px 16px", fontSize: 14, fontWeight: 700, color: "var(--green-light)" }}>
            {seats.length} / 10 คน
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 6 }}>เริ่มได้เมื่อครบ 3 คน</div>
        </div>
      </div>

      {/* ring area — fills remaining space; footer below is a flow sibling, so
          the self-seat tile (bottom of the ellipse) can never overlap it. */}
      <div style={{ position: "relative", flex: "1 1 auto", minHeight: 0 }}>
        {/* seats are positioned by lobbyRingPosition's cx/cy/rx/ry (44%/42%
            of THIS box) — the decorative ellipse below is sized to exactly
            2*rx / 2*ry of the same box so its border passes through every
            seat instead of being a differently-proportioned circle drawn
            behind them. */}
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(94%, 900px)", height: "88%" }}>
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "88%", height: "84%", borderRadius: "50%", border: "2px solid rgba(150,110,50,.16)", boxShadow: "inset 0 0 70px rgba(0,0,0,.5)" }} />
        {seats.map((seat, i) => {
          const relSeat = seatIndex !== null ? ((i - seatIndex) % ringSize + ringSize) % ringSize : i;
          const pos = lobbyRingPosition(relSeat, ringSize);
          const isSelf = seatIndex === i;
          return (
            <div key={i} style={{ position: "absolute", left: `${pos.leftPct}%`, top: `${pos.topPct}%`, transform: "translate(-50%,-50%)" }}>
              <div
                style={{
                  width: 168,
                  background: "linear-gradient(#241a11,#180f09)",
                  border: `1px solid ${isSelf ? "var(--panel-border-3)" : "var(--panel-border-2)"}`,
                  borderRadius: 12,
                  padding: "9px 11px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  boxShadow: isSelf ? "0 10px 26px rgba(0,0,0,.6), inset 0 0 0 1px rgba(217,165,49,.18)" : "0 6px 16px rgba(0,0,0,.5)",
                  position: "relative",
                }}
              >
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(150deg,#4a3628,#241811)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2px solid rgba(255,240,200,.25)" }}>
                  <span style={{ fontFamily: "var(--font-glyph)", fontSize: 22, color: "rgba(255,245,225,.92)" }}>{seat.name.slice(0, 1)}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{seat.name}</div>
                  <div style={{ fontSize: 11, color: seat.connected ? "var(--green-light)" : "var(--gold)" }}>
                    {seat.connected ? (isSelf ? "พร้อม · คุณ" : "พร้อม") : "กำลังเชื่อมต่อ…"}
                  </div>
                </div>
                {seat.isHost && (
                  <div style={{ position: "absolute", top: -9, right: 12, background: "linear-gradient(var(--gold-deep),var(--gold-bronze))", border: "1px solid var(--gold-light)", borderRadius: 9, padding: "1px 8px", fontSize: 9, fontWeight: 700, color: "#2e1f08" }}>
                    👑 เจ้าของห้อง
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {placeholderCount > 0 && (() => {
          const relSeat = seatIndex !== null ? ((seats.length - seatIndex) % ringSize + ringSize) % ringSize : seats.length;
          const pos = lobbyRingPosition(relSeat, ringSize);
          return (
            <div style={{ position: "absolute", left: `${pos.leftPct}%`, top: `${pos.topPct}%`, transform: "translate(-50%,-50%)" }}>
              <div style={{ width: 140, height: 54, borderRadius: 12, border: "1px dashed rgba(150,110,50,.35)", background: "rgba(20,14,9,.25)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--ink-dim)" }}>
                <span style={{ fontSize: 15 }}>＋</span>
                <span style={{ fontSize: 10.5 }}>รอผู้เล่น</span>
              </div>
            </div>
          );
        })()}
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
          <div style={{ fontFamily: "var(--font-glyph)", fontSize: 52, color: "rgba(217,165,49,.28)" }}>桃園</div>
          <div style={{ fontSize: 11, color: "var(--ink-dim)", letterSpacing: 2 }}>สาบานร่วมรบ</div>
        </div>
        </div>
      </div>

      {/* footer — normal flow, below the ring area; never overlaps the self seat tile */}
      <div style={{ position: "relative", flexShrink: 0, display: "flex", gap: 10, flexDirection: "column", alignItems: "center", padding: "16px 20px 26px" }}>
        {roomState?.settings && <RoomPacingSummary settings={roomState.settings} compact={compact} />}
        <div style={{ display: "flex", gap: 14 }}>
          <button onClick={() => setConfirmingLeave(true)} className="btn-danger" style={{ padding: "13px 26px", fontSize: 14, borderRadius: 11 }}>
            ออกจากห้อง
          </button>
          {mySeat?.isHost ? (
            <button onClick={handleStart} disabled={!canStart || starting} className="btn-primary" style={{ padding: "14px 48px", fontSize: 17, borderRadius: 11 }}>
              เริ่มศึก ⚔
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", color: "var(--ink-faint)", fontSize: 14 }}>รอเจ้าของห้องเริ่มเกม...</div>
          )}
        </div>
        {!canStart && mySeat?.isHost && (
          <div style={{ color: "var(--ink-faint)", fontSize: 12 }}>ต้องมีผู้เล่นอย่างน้อย 3 คน</div>
        )}
        <RulesButton label="วิธีเล่น & กติกา" style={{ padding: "9px 20px", fontSize: 12 }} />
      </div>

      {confirmingLeave && (
        <LeaveConfirmDialog
          onConfirm={() => { setConfirmingLeave(false); void leaveRoom(); }}
          onCancel={() => setConfirmingLeave(false)}
        />
      )}
    </div>
  );
}

export function Lobby() {
  const roomCode = useGameStore((s) => s.roomCode);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState<"create" | "join">("create");

  if (roomCode) {
    return (
      <div className="war-table-bg campaign-screen" style={{ minHeight: "100dvh" }}>
        <WaitingRoom />
      </div>
    );
  }

  return (
    <div className="war-table-bg campaign-screen campaign-home" style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto" }}>
      <Home onCreate={() => { setDialogTab("create"); setDialogOpen(true); }} onJoin={() => { setDialogTab("join"); setDialogOpen(true); }} />
      {dialogOpen && <EntryDialog initialTab={dialogTab} onClose={() => setDialogOpen(false)} />}
    </div>
  );
}
