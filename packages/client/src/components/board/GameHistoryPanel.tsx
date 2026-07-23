import type { GameLogView, GameView } from "@tktw/shared";
import { resolveLogEntry } from "../../data/logResolver";

// SPEC §11.9 — game history sidebar. Not part of the seating ring (it's a
// fixed side panel, same as before the circular-board rewrite).
export function GameHistoryPanel({ gameView, narrow }: { gameView: GameView; narrow: boolean }) {
  const logs: GameLogView[] = gameView.gameLogs;
  return (
    <aside
      className="panel-plain"
      style={{ width: narrow ? "100%" : 300, flexShrink: 0, maxHeight: narrow ? "40vh" : "82vh", display: "flex", flexDirection: "column", padding: "14px 16px" }}
    >
      <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--ink)", marginBottom: 4 }}>ประวัติการเล่น</div>
      <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 10 }}>ล่าสุดอยู่บนสุด · {logs.length} เหตุการณ์</div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
        {logs.length === 0 && <div style={{ fontSize: 12, color: "var(--ink-faint)", fontStyle: "italic" }}>ยังไม่มีเหตุการณ์</div>}
        {[...logs].reverse().map((entry, i) => (
          <div key={logs.length - i} style={{ fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.45, borderLeft: "2px solid var(--card-border-2)", paddingLeft: 8 }}>
            <span style={{ fontSize: 10, color: "var(--ink-faint)", marginRight: 5 }}>รอบ {entry.turn}</span>
            {resolveLogEntry(entry, gameView)}
          </div>
        ))}
      </div>
    </aside>
  );
}
