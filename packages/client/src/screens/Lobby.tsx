import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { RulesButton } from "../components/RulesModal";

const panelStyle: React.CSSProperties = {
  width: 560,
  maxWidth: "100%",
  background: "radial-gradient(120% 90% at 50% 0%, #f7f0dc, #efe3c6 55%, #e6d7b4 100%)",
  border: "1px solid var(--panel-border-2)",
  borderRadius: 8,
  boxShadow: "0 22px 60px rgba(60,40,15,.28), inset 0 0 0 7px rgba(255,255,255,.28), inset 0 0 0 8px rgba(166,129,47,.35)",
  overflow: "hidden",
};

function Masthead() {
  return (
    <div style={{ padding: "48px 40px 32px", textAlign: "center", borderBottom: "1px solid var(--panel-border)" }}>
      <div
        style={{
          width: 84,
          height: 84,
          borderRadius: "50%",
          margin: "0 auto 16px",
          background: "radial-gradient(circle at 38% 34%, #c0463a, #8f2a22)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid #f2e7cf",
          boxShadow: "0 8px 22px rgba(90,30,20,.35)",
        }}
      >
        <span style={{ fontFamily: "var(--font-glyph)", fontSize: 42, color: "#f6ecd2" }}>殺</span>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 38, color: "var(--ink)" }}>Three Kingdoms</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--red)", marginTop: -4 }}>
        : Traitor Within
      </div>
    </div>
  );
}

function CreateJoinForm() {
  const createRoom = useGameStore((s) => s.createRoom);
  const joinRoom = useGameStore((s) => s.joinRoom);
  const quickstartWithBots = useGameStore((s) => s.quickstartWithBots);
  const error = useGameStore((s) => s.error);
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setBusy(true);
    await createRoom(name.trim());
    setBusy(false);
  };

  const handleJoin = async () => {
    if (!name.trim() || !roomCode.trim()) return;
    setBusy(true);
    await joinRoom(roomCode.trim(), name.trim());
    setBusy(false);
  };

  const handleQuickstart = async () => {
    setBusy(true);
    await quickstartWithBots(name.trim() || "ผู้เล่นทดสอบ", 2);
    setBusy(false);
  };

  return (
    <div style={panelStyle}>
      <Masthead />
      <div style={{ padding: "32px 40px 44px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label style={{ fontSize: 12, color: "var(--ink-muted)", letterSpacing: 1 }}>ชื่อผู้เล่น</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="ใส่ชื่อของคุณ"
            style={{
              display: "block",
              width: "100%",
              marginTop: 7,
              background: "#fbf6e6",
              border: "1px solid var(--card-border)",
              borderRadius: 6,
              padding: "13px 16px",
              fontSize: 16,
              color: "var(--ink)",
              fontFamily: "var(--font-body)",
            }}
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={busy || !name.trim()}
          style={{
            background: "linear-gradient(#c0463a,#9a3128)",
            color: "#f6ecd2",
            border: "1px solid var(--gold-light)",
            borderRadius: 7,
            padding: 16,
            fontSize: 17,
            fontWeight: 700,
            cursor: busy ? "wait" : "pointer",
            boxShadow: "0 6px 16px rgba(90,30,20,.3)",
            letterSpacing: 1,
          }}
        >
          สร้างห้องใหม่
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ink-faint)", fontSize: 12 }}>
          <span style={{ flex: 1, height: 1, background: "var(--panel-border-2)" }} />
          หรือ
          <span style={{ flex: 1, height: 1, background: "var(--panel-border-2)" }} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="รหัสห้อง 6 หลัก"
            style={{
              flex: 1,
              background: "#fbf6e6",
              border: "1px solid var(--card-border)",
              borderRadius: 6,
              padding: "13px 16px",
              fontSize: 16,
              letterSpacing: 3,
              textTransform: "uppercase",
              fontFamily: "var(--font-body)",
              color: "var(--ink)",
            }}
          />
          <button
            onClick={handleJoin}
            disabled={busy || !name.trim() || !roomCode.trim()}
            style={{
              background: "#f4ead0",
              color: "var(--ink-muted)",
              border: "1px solid var(--panel-border-2)",
              borderRadius: 7,
              padding: "0 22px",
              fontSize: 15,
              fontWeight: 600,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            เข้าห้อง
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ink-faint)", fontSize: 12 }}>
          <span style={{ flex: 1, height: 1, background: "var(--panel-border-2)" }} />
          หรือ
          <span style={{ flex: 1, height: 1, background: "var(--panel-border-2)" }} />
        </div>

        <button
          onClick={handleQuickstart}
          disabled={busy}
          style={{
            background: "var(--panel-bg)",
            color: "var(--red)",
            border: "1px solid var(--gold)",
            borderRadius: 7,
            padding: 14,
            fontSize: 15,
            fontWeight: 700,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          เล่นกับบอท (ทดสอบคนเดียว)
        </button>
        <div style={{ fontSize: 11, color: "var(--ink-faint)", textAlign: "center", marginTop: -10 }}>
          สร้างห้อง + บอท 2 ตัว แล้วเริ่มเกมทันที ไม่ต้องรอผู้เล่นคนอื่น
        </div>

        {error && <div style={{ color: "var(--target-red)", fontSize: 13 }}>{error}</div>}

        <RulesButton label="วิธีเล่น & กติกา" style={rulesBtnStyle} />
      </div>
    </div>
  );
}

const rulesBtnStyle: React.CSSProperties = { width: "100%", padding: "11px", fontSize: 14, borderRadius: 7 };

function WaitingRoom() {
  const roomCode = useGameStore((s) => s.roomCode);
  const seatIndex = useGameStore((s) => s.seatIndex);
  const roomState = useGameStore((s) => s.roomState);
  const startGame = useGameStore((s) => s.startGame);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const error = useGameStore((s) => s.error);
  const [starting, setStarting] = useState(false);

  const mySeat = seatIndex !== null ? roomState?.seats[seatIndex] : undefined;
  const canStart = !!mySeat?.isHost && (roomState?.seats.length ?? 0) >= 3;

  const handleStart = async () => {
    setStarting(true);
    await startGame();
    setStarting(false);
  };

  return (
    <div style={panelStyle}>
      <Masthead />
      <div style={{ padding: "32px 40px 44px" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 12, color: "var(--ink-muted)", letterSpacing: 1 }}>รหัสห้อง</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 34, color: "var(--red)", letterSpacing: 6 }}>
            {roomCode}
          </div>
        </div>

        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--ink)", marginBottom: 12 }}>
          ผู้เล่นในห้อง ({roomState?.seats.length ?? 0}/10)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {(roomState?.seats ?? []).map((seat, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                background: seat.connected ? "var(--panel-bg)" : "#eae0c4",
                border: "1px solid var(--panel-border)",
                borderRadius: 6,
                padding: "9px 13px",
                opacity: seat.connected ? 1 : 0.55,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--red-deep)",
                  color: "#f6ecd2",
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {seat.name.slice(0, 1).toUpperCase()}
              </div>
              <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>
                {seat.name}
                {!seat.connected && <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}> (หลุดการเชื่อมต่อ)</span>}
              </div>
              {seat.isHost && <span style={{ fontFamily: "var(--font-glyph)", fontSize: 18, color: "var(--gold)" }}>主</span>}
            </div>
          ))}
        </div>

        {mySeat?.isHost ? (
          <button
            onClick={handleStart}
            disabled={!canStart || starting}
            style={{
              width: "100%",
              background: canStart ? "linear-gradient(#c0463a,#9a3128)" : "#c9b789",
              color: "#f6ecd2",
              border: "1px solid var(--gold-light)",
              borderRadius: 7,
              padding: 16,
              fontSize: 18,
              fontWeight: 700,
              cursor: canStart ? "pointer" : "not-allowed",
              boxShadow: "0 6px 16px rgba(90,30,20,.3)",
              letterSpacing: 1,
            }}
          >
            เริ่มเกม ⚔ แจกบทบาท
          </button>
        ) : (
          <div style={{ textAlign: "center", color: "var(--ink-faint)", fontSize: 14 }}>
            รอเจ้าของห้องเริ่มเกม...
          </div>
        )}
        {!canStart && mySeat?.isHost && (
          <div style={{ textAlign: "center", color: "var(--ink-faint)", fontSize: 12, marginTop: 8 }}>
            ต้องมีผู้เล่นอย่างน้อย 3 คน
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <RulesButton label="วิธีเล่น & กติกา" style={rulesBtnStyle} />
        </div>

        <button
          onClick={() => {
            if (window.confirm("ออกจากห้องนี้?")) void leaveRoom();
          }}
          style={{
            display: "block",
            margin: "18px auto 0",
            background: "transparent",
            color: "var(--ink-faint)",
            border: "none",
            fontSize: 12,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          ออกจากห้อง
        </button>

        {error && <div style={{ color: "var(--target-red)", fontSize: 13, textAlign: "center", marginTop: 10 }}>{error}</div>}
      </div>
    </div>
  );
}

export function Lobby() {
  const roomCode = useGameStore((s) => s.roomCode);
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      {roomCode ? <WaitingRoom /> : <CreateJoinForm />}
    </div>
  );
}
