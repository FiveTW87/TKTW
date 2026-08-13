import type { PlayerView } from "@tktw/shared";
import { ModalOverlay } from "./Modal";
import { generalDisplay } from "../data/generalNames";
import { useDeviceMode } from "../lib/useDeviceMode";
import { roleDisplay } from "../data/roles";

const ROLE_INFO: Record<string, { cn: string; name: string; goal: string }> = {
  lord: {
    cn: "主",
    name: "เจ้าเมือง",
    goal: "กำจัดกบฏและไส้ศึกทั้งหมดให้ได้ ถึงจะชนะ — ทุกคนรู้ว่าคุณเป็นใคร",
  },
  loyalist: {
    cn: "忠",
    name: "ขุนนางภักดี",
    goal: "ปกป้องเจ้าเมืองให้รอด และช่วยกำจัดกบฏกับไส้ศึก",
  },
  rebel: {
    cn: "反",
    name: "กบฏ",
    goal: "ร่วมมือกับกบฏคนอื่น (ถ้ามี) กำจัดเจ้าเมืองให้ได้",
  },
  traitor: {
    cn: "內",
    name: "ไส้ศึก",
    goal: "รอให้ทุกคนตายจนเหลือคุณคนเดียว (ต้องกำจัดทั้งเจ้าเมืองและกบฏ)",
  },
};

export function RoleRevealModal({ me }: { me: PlayerView }) {
  const info = ROLE_INFO[me.role ?? ""] ?? { cn: "?", name: me.role ?? "?", goal: "" };
  const general = generalDisplay(me.generalId);
  const role = roleDisplay(me.role);
  const { compact } = useDeviceMode();

  return (
    <ModalOverlay>
      <div
        className={`anim-pop role-reveal-modal ${role?.cls ?? "seal-unknown"}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: compact ? 300 : 440,
          maxWidth: "90vw",
          maxHeight: compact ? "94vh" : "85vh",
          overflowY: "auto",
          background: "linear-gradient(#241a11,#160f09)",
          border: "1px solid var(--role-accent, var(--panel-border-3))",
          borderRadius: 12,
          padding: compact ? "16px 18px" : "34px 40px",
          textAlign: "center",
          boxShadow: "0 22px 60px rgba(0,0,0,.7), inset 0 0 40px var(--role-glow, transparent)",
        }}
      >
        <div style={{ fontSize: compact ? 10.5 : 12, letterSpacing: 3, color: "var(--ink-faint)" }}>บทบาทของคุณ</div>
        <div
          className="role-reveal-seal"
          style={{
            width: compact ? 66 : 104,
            height: compact ? 66 : 104,
            borderRadius: "50%",
            margin: compact ? "10px auto 10px" : "16px auto 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontFamily: "var(--font-glyph)", fontSize: compact ? 34 : 56 }}>{info.cn}</span>
        </div>
        <div className="role-reveal-name" style={{ fontFamily: "var(--font-display)", fontSize: compact ? 20 : 30, fontWeight: 900 }}>{info.name}</div>
        <div style={{ fontSize: compact ? 11.5 : 13, color: "var(--ink-faint)", marginTop: 4 }}>
          รับบทโดย {general.name}
        </div>
        <div
          style={{
            fontSize: compact ? 11.5 : 13.5,
            color: "var(--ink-muted)",
            lineHeight: 1.5,
            background: "var(--panel-bg)",
            border: "1px solid var(--panel-border)",
            borderRadius: 8,
            padding: compact ? "10px 12px" : "14px 16px",
            margin: compact ? "12px 0 2px" : "20px 0 4px",
            textAlign: "left",
          }}
        >
          {info.goal}
        </div>
      </div>
    </ModalOverlay>
  );
}
