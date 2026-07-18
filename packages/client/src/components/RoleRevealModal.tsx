import type { PlayerView } from "@tktw/shared";
import { ModalOverlay } from "./Modal";
import { generalDisplay } from "../data/generalNames";

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

export function RoleRevealModal({ me, onClose }: { me: PlayerView; onClose: () => void }) {
  const info = ROLE_INFO[me.role ?? ""] ?? { cn: "?", name: me.role ?? "?", goal: "" };
  const general = generalDisplay(me.generalId);

  return (
    <ModalOverlay>
      <div
        className="anim-pop"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440,
          maxWidth: "90vw",
          background: "radial-gradient(120% 90% at 50% 0%, #f7f0dc, #efe3c6)",
          border: "1px solid var(--panel-border-2)",
          borderRadius: 12,
          padding: "34px 40px",
          textAlign: "center",
          boxShadow:
            "0 22px 60px rgba(40,25,10,.6), inset 0 0 0 6px rgba(255,255,255,.28), inset 0 0 0 7px rgba(166,129,47,.4)",
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: 3, color: "var(--ink-faint)" }}>บทบาทของคุณ</div>
        <div
          style={{
            width: 104,
            height: 104,
            borderRadius: "50%",
            margin: "16px auto 18px",
            background: "radial-gradient(circle at 38% 34%, #e0b64a, #c88f1e)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "3px solid #f2e7cf",
            boxShadow: "0 8px 24px rgba(150,110,20,.45)",
          }}
        >
          <span style={{ fontFamily: "var(--font-glyph)", fontSize: 56, color: "#5a3d0a" }}>{info.cn}</span>
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 30, color: "var(--red)" }}>{info.name}</div>
        <div style={{ fontSize: 13, color: "var(--ink-faint)", marginTop: 4 }}>
          รับบทโดย {general.name}
        </div>
        <div
          style={{
            fontSize: 13.5,
            color: "#4a3c28",
            lineHeight: 1.6,
            background: "var(--panel-bg-2)",
            border: "1px solid var(--panel-border)",
            borderRadius: 8,
            padding: "14px 16px",
            margin: "20px 0 24px",
            textAlign: "left",
          }}
        >
          {info.goal}
        </div>
        <button
          onClick={onClose}
          style={{
            background: "linear-gradient(#c0463a,#9a3128)",
            color: "#f6ecd2",
            border: "1px solid var(--gold-light)",
            borderRadius: 7,
            padding: "13px 48px",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 6px 16px rgba(90,30,20,.3)",
            letterSpacing: 1,
          }}
        >
          เริ่มศึก ⚔
        </button>
      </div>
    </ModalOverlay>
  );
}
