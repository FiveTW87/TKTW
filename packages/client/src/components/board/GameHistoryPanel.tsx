import { useEffect, useRef, useState } from "react";
import type { GameLogView, GameView } from "@tktw/shared";
import { resolveLogEntry } from "../../data/logResolver";
import { cardInfoByName } from "../../data/cardNames";
import { skillByName } from "../../data/generalSkills";
import { CardTooltipPortal } from "../HandCard";
import { ModalOverlay } from "../Modal";
import { useGameStore } from "../../store/gameStore";
import { useDeviceMode } from "../../lib/useDeviceMode";

// A quoted term ("จู่โจม", "ทวนอสรพิษจั้งปา", a skill name, ...) inside a log
// line — underlined, with the same hover-info card/skill players already
// know from hand cards and equipment.
function UnderlinedTerm({ label, info }: { label: string; info: string }) {
  const [hovered, setHovered] = useState(false);
  const termRef = useRef<HTMLSpanElement>(null);
  return (
    <span
      ref={termRef}
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
      {hovered && <CardTooltipPortal anchorRef={termRef} name={label.replace(/"/g, "")} info={info} />}
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

function TabButton({ active, label, onClick, badge }: { active: boolean; label: string; onClick: () => void; badge?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
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
      {badge && (
        <span style={{ position: "absolute", top: 2, right: "calc(50% - 26px)", width: 7, height: 7, borderRadius: "50%", background: "var(--target-red)", boxShadow: "0 0 4px rgba(0,0,0,.5)" }} />
      )}
    </button>
  );
}

// The tabbed log/chat content, shared by the desktop persistent column and
// the mobile-compact bottom sheet — only the outer chrome differs.
function HistoryChatContent({ gameView }: { gameView: GameView }) {
  const logs: GameLogView[] = gameView.gameLogs;
  const chatMessages = useGameStore((s) => s.chatMessages);
  const chatSeenCount = useGameStore((s) => s.chatSeenCount);
  const markChatSeen = useGameStore((s) => s.markChatSeen);
  const sendChat = useGameStore((s) => s.sendChat);
  const mySeatIndex = useGameStore((s) => s.seatIndex);
  const [tab, setTab] = useState<"log" | "chat">("log");
  const [draft, setDraft] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasUnreadChat = tab !== "chat" && chatMessages.length > chatSeenCount;

  useEffect(() => {
    if (tab !== "chat") return;
    markChatSeen();
    // jsdom (tests) doesn't implement scrollIntoView — guard for that env.
    chatEndRef.current?.scrollIntoView?.({ block: "end" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages.length, tab]);

  const submit = () => {
    if (!draft.trim()) return;
    void sendChat(draft);
    setDraft("");
  };

  return (
    <>
      <div style={{ display: "flex", marginBottom: 10, flexShrink: 0 }}>
        <TabButton active={tab === "log"} label="ประวัติการเล่น" onClick={() => setTab("log")} />
        <TabButton active={tab === "chat"} label="แชท" onClick={() => setTab("chat")} badge={hasUnreadChat} />
      </div>

      {tab === "log" ? (
        <>
          <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 8, flexShrink: 0 }}>ล่าสุดอยู่บนสุด · {logs.length} เหตุการณ์</div>
          <div className="history-chat-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
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
          <div className="history-chat-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
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
    </>
  );
}

// SPEC §12.2 — on a short mobile-landscape viewport there's no room for a
// persistent column, so history/chat becomes an on-demand bottom sheet
// instead: a small toggle button, opening the exact same tabbed content in a
// full-width panel anchored to the bottom edge.
function HistorySheet({ gameView }: { gameView: GameView }) {
  const [open, setOpen] = useState(false);
  const chatMessages = useGameStore((s) => s.chatMessages);
  const chatSeenCount = useGameStore((s) => s.chatSeenCount);
  const hasUnreadChat = !open && chatMessages.length > chatSeenCount;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="ประวัติการเล่น / แชท"
        style={{
          // top-left — the one fixed corner not already claimed by the 🐛
          // debug toggle (bottom-left), TurnPanel (top-center), or the
          // end-turn action cluster (bottom-right).
          position: "fixed",
          left: "calc(10px + env(safe-area-inset-left, 0px))",
          top: "calc(10px + env(safe-area-inset-top, 0px))",
          zIndex: 60,
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "linear-gradient(#241a11,#160f09)",
          border: "1px solid var(--panel-border-3)",
          color: "var(--gold)",
          fontSize: 18,
          cursor: "pointer",
        }}
      >
        💬
        {hasUnreadChat && (
          <span style={{ position: "absolute", top: 2, right: 2, width: 9, height: 9, borderRadius: "50%", background: "var(--target-red)", boxShadow: "0 0 4px rgba(0,0,0,.6)" }} />
        )}
      </button>
      {open && (
        <ModalOverlay onClose={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="panel-plain"
            style={{
              position: "fixed",
              inset: "auto 0 0 0",
              width: "100%",
              maxHeight: "70vh",
              display: "flex",
              flexDirection: "column",
              padding: "10px 16px calc(14px + env(safe-area-inset-bottom, 0px))",
              borderRadius: "12px 12px 0 0",
            }}
          >
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
              <button onClick={() => setOpen(false)} className="btn-secondary" style={{ padding: "4px 12px", fontSize: 11 }}>
                ปิด
              </button>
            </div>
            <HistoryChatContent gameView={gameView} />
          </div>
        </ModalOverlay>
      )}
    </>
  );
}

// SPEC §11.9 — game history + real-time chat, as two tabs sharing one panel
// (not stacked) so either can use the full available height. Not part of the
// seating ring (it's a fixed side panel, same as before the circular-board
// rewrite).
export function GameHistoryPanel({ gameView, narrow }: { gameView: GameView; narrow: boolean }) {
  const { compact } = useDeviceMode();
  const [open, setOpen] = useState(() => !(window.matchMedia?.("(max-width: 1400px) and (max-height: 700px)").matches ?? false));
  if (compact) return <HistorySheet gameView={gameView} />;

  if (!narrow && !open) {
    return (
      <button className="table-history-toggle" onClick={() => setOpen(true)} title="เปิดประวัติการเล่นและแชท">
        <span aria-hidden="true">💬</span>
        <span>ประวัติ</span>
      </button>
    );
  }

  return (
    <aside
      className="panel-plain table-history-panel"
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
        padding: narrow ? "10px 16px 14px" : "10px 16px 14px calc(16px + env(safe-area-inset-left, 0px))",
      }}
    >
      {!narrow && (
        <button className="table-history-close" onClick={() => setOpen(false)} aria-label="ย่อแผงประวัติและแชท">
          ‹
        </button>
      )}
      <HistoryChatContent gameView={gameView} />
    </aside>
  );
}
