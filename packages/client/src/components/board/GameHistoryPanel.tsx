import { useEffect, useRef, useState } from "react";
import type { GameLogView, GameView } from "@tktw/shared";
import { resolveLogEntry } from "../../data/logResolver";
import { cardInfoByName } from "../../data/cardNames";
import { skillByName } from "../../data/generalSkills";
import { CardTooltip } from "../HandCard";
import { useGameStore } from "../../store/gameStore";

// A quoted term ("จู่โจม", "ทวนอสรพิษจั้งปา", a skill name, ...) inside a log
// line — underlined, with the same hover-info card/skill players already
// know from hand cards and equipment.
function UnderlinedTerm({ label, info }: { label: string; info: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        display: "inline-block",
        textDecoration: "underline",
        textDecorationStyle: "dotted",
        textDecorationColor: "var(--gold)",
        textUnderlineOffset: 2,
        cursor: "help",
      }}
    >
      {label}
      {hovered && <CardTooltip name={label.replace(/"/g, "")} info={info} />}
    </span>
  );
}

// Splits a resolved log line on its quoted segments ("...") and underlines
// whichever ones match a known card or skill name, with a hover tooltip —
// the log is still plain text from resolveLogEntry(), this only decorates it.
function LogLine({ text }: { text: string }) {
  const segments = text.split(/("[^"]+")/g);
  return (
    <>
      {segments.map((seg, i) => {
        const m = /^"([^"]+)"$/.exec(seg);
        const term = m?.[1];
        const info = term ? (cardInfoByName(term)?.info ?? skillByName(term)?.description) : undefined;
        if (!term || !info) return <span key={i}>{seg}</span>;
        return <UnderlinedTerm key={i} label={seg} info={info} />;
      })}
    </>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "7px 0",
        fontSize: 12.5,
        fontWeight: 700,
        color: active ? "var(--gold)" : "var(--ink-faint)",
        background: "transparent",
        border: "none",
        borderBottom: `2px solid ${active ? "var(--gold)" : "transparent"}`,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

// SPEC §11.9 — game history + real-time chat, as two tabs sharing one panel
// (not stacked) so either can use the full available height. Not part of the
// seating ring (it's a fixed side panel, same as before the circular-board
// rewrite).
export function GameHistoryPanel({ gameView, narrow }: { gameView: GameView; narrow: boolean }) {
  const logs: GameLogView[] = gameView.gameLogs;
  const chatMessages = useGameStore((s) => s.chatMessages);
  const sendChat = useGameStore((s) => s.sendChat);
  const mySeatIndex = useGameStore((s) => s.seatIndex);
  const [tab, setTab] = useState<"log" | "chat">("log");
  const [draft, setDraft] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tab !== "chat") return;
    // jsdom (tests) doesn't implement scrollIntoView — guard for that env.
    chatEndRef.current?.scrollIntoView?.({ block: "end" });
  }, [chatMessages.length, tab]);

  const submit = () => {
    if (!draft.trim()) return;
    void sendChat(draft);
    setDraft("");
  };

  return (
    <aside
      className="panel-plain"
      style={{
        width: narrow ? "100%" : 300,
        flexShrink: 0,
        // Capped to the viewport (not the row's own height, which can grow
        // taller than 100vh when the board's content is tall) so the panel
        // scrolls its own list instead of pushing the page past the screen;
        // sticky keeps it in view while the board scrolls under it.
        maxHeight: narrow ? "60vh" : "100vh",
        position: narrow ? undefined : "sticky",
        top: narrow ? undefined : 0,
        display: "flex",
        flexDirection: "column",
        padding: "10px 16px 14px",
      }}
    >
      <div style={{ display: "flex", marginBottom: 10, flexShrink: 0 }}>
        <TabButton active={tab === "log"} label="ประวัติการเล่น" onClick={() => setTab("log")} />
        <TabButton active={tab === "chat"} label="แชท" onClick={() => setTab("chat")} />
      </div>

      {tab === "log" ? (
        <>
          <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 8, flexShrink: 0 }}>ล่าสุดอยู่บนสุด · {logs.length} เหตุการณ์</div>
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {logs.length === 0 && <div style={{ fontSize: 12, color: "var(--ink-faint)", fontStyle: "italic" }}>ยังไม่มีเหตุการณ์</div>}
            {[...logs].reverse().map((entry, i) => (
              <div key={logs.length - i} style={{ fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.45, borderLeft: "2px solid var(--card-border-2)", paddingLeft: 8 }}>
                <span style={{ fontSize: 10, color: "var(--ink-faint)", marginRight: 5 }}>รอบ {entry.turn}</span>
                <LogLine text={resolveLogEntry(entry, gameView)} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {chatMessages.length === 0 && <div style={{ fontSize: 12, color: "var(--ink-faint)", fontStyle: "italic" }}>ยังไม่มีข้อความ</div>}
            {chatMessages.map((m) => {
              const isMe = m.seat === mySeatIndex;
              return (
                <div key={m.id} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "88%" }}>
                  <div style={{ fontSize: 10, color: "var(--ink-faint)", marginBottom: 1, textAlign: isMe ? "right" : "left" }}>{isMe ? "คุณ" : m.playerName}</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--ink)",
                      lineHeight: 1.4,
                      background: isMe ? "linear-gradient(#3a2a12,#241a0c)" : "var(--panel-bg-2)",
                      border: `1px solid ${isMe ? "var(--gold)" : "var(--card-border-2)"}`,
                      borderRadius: 8,
                      padding: "5px 9px",
                      wordBreak: "break-word",
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexShrink: 0 }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              maxLength={300}
              placeholder="พิมพ์ข้อความ..."
              style={{
                flex: 1,
                minWidth: 0,
                background: "#140e08",
                border: "1px solid var(--panel-border-3)",
                borderRadius: 6,
                padding: "7px 10px",
                fontSize: 12,
                color: "var(--ink)",
                fontFamily: "var(--font-body)",
              }}
            />
            <button onClick={submit} disabled={!draft.trim()} className="btn-primary" style={{ padding: "0 14px", fontSize: 12 }}>
              ส่ง
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
