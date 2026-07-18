import type { ReactNode } from "react";
import { useGameStore } from "./store/gameStore";
import { Lobby } from "./screens/Lobby";
import { GeneralSelect } from "./screens/GeneralSelect";
import { Table } from "./screens/Table";

function Centered({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-muted)" }}>
      {children}
    </div>
  );
}

export default function App() {
  const initialized = useGameStore((s) => s.initialized);
  const connected = useGameStore((s) => s.connected);
  const roomCode = useGameStore((s) => s.roomCode);
  const gameView = useGameStore((s) => s.gameView);

  if (!connected) return <Centered>กำลังเชื่อมต่อเซิร์ฟเวอร์...</Centered>;
  if (!initialized) return <Centered>กำลังโหลด...</Centered>;

  if (!roomCode || !gameView) {
    return <Lobby />;
  }

  if (gameView.pendingDecision?.kind === "pickGeneral") {
    return <GeneralSelect />;
  }

  return <Table />;
}
