import type { ReactNode } from "react";
import { useGameStore } from "./store/gameStore";
import { Lobby } from "./screens/Lobby";
import { GeneralSelect } from "./screens/GeneralSelect";
import { Table } from "./screens/Table";
import { Result } from "./screens/Result";
import { RoleRevealModal } from "./components/RoleRevealModal";

function Centered({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-muted)" }}>
      {children}
    </div>
  );
}

/** Semi-transparent overlay shown over the live board while the socket is
 *  dropped mid-room — the game stays visible underneath (SPEC 6.4/6.6). */
function ReconnectingOverlay() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(30,20,10,.55)" }}>
      <div className="panel" style={{ padding: "22px 30px", textAlign: "center", color: "var(--ink)" }}>
        <div style={{ fontSize: 26, marginBottom: 8 }}>🔌</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>กำลังเชื่อมต่อกลับเข้าสู่ห้อง...</div>
        <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 6 }}>ที่นั่งของคุณถูกจองไว้ชั่วครู่</div>
      </div>
    </div>
  );
}

function Abandoned({ onHome }: { onHome: () => void }) {
  return (
    <Centered>
      <div className="panel" style={{ padding: "28px 34px", textAlign: "center", maxWidth: 420, color: "var(--ink)" }}>
        <div style={{ fontSize: 30, marginBottom: 10 }}>🚪</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 8 }}>เกมถูกยกเลิก</div>
        <div style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.6, marginBottom: 18 }}>
          ผู้เล่นคนอื่นออกจากเกมทั้งหมด แมตช์นี้จึงจบลงโดยไม่มีผลแพ้ชนะ
        </div>
        <button className="btn-primary" style={{ padding: "10px 26px", fontSize: 14 }} onClick={onHome}>
          กลับหน้าหลัก
        </button>
      </div>
    </Centered>
  );
}

function SessionExpired({ onHome }: { onHome: () => void }) {
  return (
    <Centered>
      <div className="panel" style={{ padding: "28px 34px", textAlign: "center", maxWidth: 420, color: "var(--ink)" }}>
        <div style={{ fontSize: 30, marginBottom: 10 }}>⌛</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 8 }}>ไม่สามารถกลับเข้าสู่เกมเดิมได้</div>
        <div style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.6, marginBottom: 18 }}>
          เซสชันหมดอายุหรือถูกยกเลิก กำลังนำคุณกลับไปยังหน้าหลัก
        </div>
        <button className="btn-primary" style={{ padding: "10px 26px", fontSize: 14 }} onClick={onHome}>
          กลับหน้าหลัก
        </button>
      </div>
    </Centered>
  );
}

export default function App() {
  const initialized = useGameStore((s) => s.initialized);
  const connected = useGameStore((s) => s.connected);
  const roomCode = useGameStore((s) => s.roomCode);
  const gameView = useGameStore((s) => s.gameView);
  const roomState = useGameStore((s) => s.roomState);
  const matchResult = useGameStore((s) => s.matchResult);
  const sessionExpired = useGameStore((s) => s.sessionExpired);
  const dismissSessionExpired = useGameStore((s) => s.dismissSessionExpired);
  const leaveRoom = useGameStore((s) => s.leaveRoom);

  // Initial connect (no room yet) — a full-screen wait. A mid-room drop keeps
  // the board and shows the overlay instead (below).
  if (!connected && !roomCode) return <Centered>กำลังเชื่อมต่อเซิร์ฟเวอร์...</Centered>;
  if (!initialized) return <Centered>กำลังโหลด...</Centered>;
  if (sessionExpired) return <SessionExpired onHome={dismissSessionExpired} />;
  // The match ended because everyone else left (seen on reconnect into an
  // already-abandoned room). Take the player home.
  if (roomState?.phase === "abandoned") return <Abandoned onHome={() => void leaveRoom()} />;

  // SPEC 7.2: the role-reveal screen gates general selection behind a
  // server-timed phase — checked ahead of pendingDecision.kind so a lord's
  // already-live pickGeneral decision doesn't jump straight to GeneralSelect
  // before the reveal window elapses.
  const me = gameView?.players.find((p) => p.id === gameView.viewerPlayerId);
  const content =
    !roomCode || !gameView ? (
      <Lobby />
    ) : matchResult ? (
      // SPEC 8.4: a finished match's result screen takes priority over
      // everything else — including a rejoin that lands on "ended" with a
      // stale pendingDecision still sitting in the last GameView.
      <Result />
    ) : roomState?.phase === "revealing" && me ? (
      <RoleRevealModal me={me} onClose={() => {}} />
    ) : gameView.pendingDecision?.kind === "pickGeneral" ? (
      <GeneralSelect />
    ) : (
      <Table />
    );

  return (
    <>
      {content}
      {!connected && roomCode && <ReconnectingOverlay />}
    </>
  );
}
