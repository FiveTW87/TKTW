import { ModalOverlay, ModalPanel, ModalGlyph } from "./Modal";
import { roleDisplay } from "../data/roles";

// Bug list: "Add Death Dialog with spectate/leave actions". Shown once when
// the viewer's own PlayerView flips alive:false (Table.tsx watches for the
// transition so this doesn't re-open every re-render).
export function DeathDialog({
  role,
  onSpectate,
  onLeave,
}: {
  role: string | undefined;
  onSpectate: () => void;
  onLeave: () => void;
}) {
  const roleCopy = roleDisplay(role);
  return (
    <ModalOverlay onClose={onSpectate}>
      <ModalPanel width={380}>
        <ModalGlyph>陣亡</ModalGlyph>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>คุณเสียชีวิตแล้ว</div>
        {roleCopy && (
          <div style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 14 }}>
            บทบาทของคุณคือ <b>{roleCopy.name}</b>
          </div>
        )}
        <div style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 18 }}>
          คุณสามารถดูเกมต่อจนจบได้ หรือออกจากห้องตอนนี้
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onSpectate} className="btn-primary" style={{ padding: "10px 22px", fontSize: 14 }}>
            ดูเกมต่อ
          </button>
          <button onClick={onLeave} className="btn-secondary" style={{ padding: "10px 22px", fontSize: 14 }}>
            ออกจากห้อง
          </button>
        </div>
      </ModalPanel>
    </ModalOverlay>
  );
}
