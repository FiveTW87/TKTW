import { useState } from "react";
import { ModalGlyph, ModalOverlay, ModalPanel } from "./Modal";
import { useAssistStore, type AssistanceLevel } from "../store/assistStore";

const LEVEL_OPTIONS: readonly { level: AssistanceLevel; title: string; description: string }[] = [
  { level: "off", title: "ปิด", description: "เล่นโดยไม่แสดงคำแนะนำเพิ่มเติม" },
  { level: "basic", title: "พื้นฐาน", description: "แนะนำส่วนสำคัญของโต๊ะสำหรับผู้เล่นทั่วไป" },
  { level: "detailed", title: "ละเอียด", description: "อธิบายทีละขั้น เหมาะกับผู้เล่นใหม่" },
];

export function AssistPreferencesButton({
  recommendedDetailed = false,
  iconOnly = false,
  style,
}: {
  recommendedDetailed?: boolean;
  iconOnly?: boolean;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const level = useAssistStore((state) => state.level);
  const setLevel = useAssistStore((state) => state.setLevel);
  const replayWalkthrough = useAssistStore((state) => state.replayWalkthrough);

  return (
    <>
      <button
        className="btn-secondary"
        type="button"
        onClick={() => setOpen(true)}
        aria-label="ตั้งค่าคำแนะนำ"
        title="ตั้งค่าคำแนะนำ"
        style={style}
      >
        {iconOnly ? "導" : "ตั้งค่าคำแนะนำ"}
      </button>
      {open && (
        <ModalOverlay onClose={() => setOpen(false)}>
          <ModalPanel width={440} ariaLabel="ตั้งค่าคำแนะนำ">
            <ModalGlyph>導</ModalGlyph>
            <h2 style={{ margin: "0 0 6px", fontSize: 21, color: "var(--ink)" }}>ระดับคำแนะนำ</h2>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--ink-faint)" }}>
              เลือกได้ตามความคุ้นเคย ระบบจะอธิบายเท่านั้นและไม่เลือกการ์ดหรือเป้าหมายแทนคุณ
            </p>
            {recommendedDetailed && (
              <div style={{ marginBottom: 12, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(91,159,98,.5)", color: "var(--green-light)", fontSize: 12 }}>
                ห้องผู้เริ่มต้นแนะนำระดับ “ละเอียด” แต่จะไม่เปลี่ยนค่าของคุณอัตโนมัติ
              </div>
            )}
            <div style={{ display: "grid", gap: 8, textAlign: "left" }}>
              {LEVEL_OPTIONS.map((option) => (
                <label
                  key={option.level}
                  style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 9, border: `1px solid ${level === option.level ? "var(--gold)" : "var(--panel-border-2)"}`, background: level === option.level ? "rgba(217,165,49,.1)" : "rgba(12,8,5,.25)", cursor: "pointer" }}
                >
                  <input type="radio" name="assistance-level" checked={level === option.level} onChange={() => setLevel(option.level)} />
                  <span>
                    <strong style={{ display: "block", color: "var(--ink)", fontSize: 14 }}>{option.title}</strong>
                    <span style={{ color: "var(--ink-faint)", fontSize: 11 }}>{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={level === "off"}
                onClick={() => {
                  replayWalkthrough();
                  setOpen(false);
                }}
                style={{ padding: "9px 14px", minHeight: 40 }}
              >
                ดูคำแนะนำโต๊ะอีกครั้ง
              </button>
              <button type="button" className="btn-primary" onClick={() => setOpen(false)} style={{ padding: "9px 26px", minHeight: 40 }}>
                เสร็จสิ้น
              </button>
            </div>
          </ModalPanel>
        </ModalOverlay>
      )}
    </>
  );
}
