import { useState, type ReactNode } from "react";
import { ModalOverlay } from "./Modal";
import { cardDisplay, cardInfo } from "../data/cardNames";

// ── content tables ─────────────────────────────────────────────────────
const ROLES: Array<{ cn: string; cls: string; name: string; goal: string }> = [
  { cn: "主", cls: "seal-lord", name: "เจ้าเมือง", goal: "กำจัดกบฏและไส้ศึกทั้งหมด — ทุกคนรู้ว่าคุณเป็นใคร" },
  { cn: "忠", cls: "seal-loyalist", name: "ขุนนางภักดี", goal: "ปกป้องเจ้าเมืองให้รอด ช่วยกำจัดกบฏและไส้ศึก" },
  { cn: "反", cls: "seal-rebel", name: "กบฏ", goal: "ร่วมมือกับกบฏคนอื่น กำจัดเจ้าเมืองให้ได้" },
  { cn: "內", cls: "seal-traitor", name: "ไส้ศึก", goal: "เหลือรอดเป็นคนสุดท้าย (ต้องกำจัดทั้งเจ้าเมืองและกบฏ)" },
];

const PHASES = ["เตรียมพร้อม", "ตัดสิน", "จั่วการ์ด", "ลงการ์ด", "ทิ้งการ์ด", "จบเทิร์น"];

const BASIC = ["sha", "shan", "tao"];
const TRICKS = ["wuzhong", "guohe", "shunshou", "juedou", "jiedao", "nanman", "wanjian", "taoyuan", "wugu", "lebusishu", "shandian", "wuxie"];
const EQUIP = ["crossbow", "qinglong", "fangtian", "bagua", "renwang", "horse_chitu", "horse_jueying"];

const SUMMARY: Array<{ icon: string; title: string; body: string }> = [
  { icon: "⚔️", title: "ระยะ & การโจมตี", body: 'ระยะนับจากที่นั่ง (ตัวเลข ⟷ บน tile ศัตรู เขียว=ตีถึง) · อาวุธเพิ่มระยะ · ม้าปรับระยะเข้า/ออก 1' },
  { icon: "🩸", title: "ใกล้ตาย & เสียชีวิต", body: 'HP ถึง 0 → เปิดจังหวะให้ทุกคนลง "ท้อ" ช่วย · ไม่มีใครช่วย = ตาย และเปิดบทบาท' },
  { icon: "🏆", title: "เงื่อนไขชนะ", body: "เกมจบเมื่อฝ่ายใดบรรลุเป้าตามบทบาท (เจ้าเมืองตาย=กบฏ/ไส้ศึกได้เปรียบ ฯลฯ)" },
];

// ── little building blocks ─────────────────────────────────────────────
function SectionTitle({ glyph, children }: { glyph: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "18px 0 10px" }}>
      <span style={{ fontFamily: "var(--font-glyph)", fontSize: 18, color: "var(--red)" }}>{glyph}</span>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--ink)" }}>{children}</span>
    </div>
  );
}

const SQUARE_TINT: Record<string, string> = { basic: "#b23a2e", trick: "#7a5f27", equip: "#5c4a2d" };

function CardRow({ typeKey, kind }: { typeKey: string; kind: "basic" | "trick" | "equip" }) {
  const d = cardDisplay(typeKey);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#faf3de", border: "1px solid #e2d3aa", borderRadius: 6, padding: "7px 10px" }}>
      <span
        style={{
          width: 30,
          height: 30,
          flexShrink: 0,
          borderRadius: 5,
          background: SQUARE_TINT[kind],
          color: "#f6ecd2",
          fontFamily: "var(--font-glyph)",
          fontSize: 17,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {d.glyph}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>{d.name}</div>
        <div style={{ fontSize: 11.5, color: "var(--ink-muted)", lineHeight: 1.4 }}>{cardInfo(typeKey)}</div>
      </div>
    </div>
  );
}

// ── the modal ──────────────────────────────────────────────────────────
export function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 640,
          maxWidth: "94vw",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          background: "radial-gradient(120% 90% at 50% 0%, #f7f0dc, #efe3c6 55%, #e6d7b4 100%)",
          border: "1px solid var(--panel-border-2)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 22px 60px rgba(40,25,10,.55), inset 0 0 0 5px rgba(255,255,255,.28), inset 0 0 0 6px rgba(166,129,47,.35)",
        }}
      >
        {/* header bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "linear-gradient(90deg,#8f2a22,#b23a2e)", color: "#f6ecd2" }}>
          <span style={{ width: 38, height: 38, flexShrink: 0, borderRadius: "50%", background: "radial-gradient(circle at 38% 34%,#c0463a,#7c241d)", border: "2px solid #f2e7cf", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-glyph)", fontSize: 20 }}>卷</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, lineHeight: 1.1 }}>วิธีเล่น & กติกา</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>三國 · คู่มือฉบับย่อ — สวมบทบาทลับ 3–10 คน</div>
          </div>
          <button onClick={onClose} title="ปิด" style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid rgba(246,236,210,.5)", background: "rgba(0,0,0,.15)", color: "#f6ecd2", cursor: "pointer", fontSize: 15, lineHeight: 1 }}>✕</button>
        </div>

        {/* scroll body */}
        <div style={{ overflowY: "auto", padding: "10px 18px 6px", textAlign: "left" }}>
          {/* เป้าหมาย */}
          <div style={{ background: "rgba(178,58,46,.08)", border: "1px solid rgba(178,58,46,.3)", borderRadius: 8, padding: "10px 12px", fontSize: 13, lineHeight: 1.6, color: "var(--ink)" }}>
            <b>เป้าหมาย:</b> ทุกคนได้บทบาทลับ (เห็นแต่ของตัวเอง ยกเว้นเจ้าเมืองที่เปิดเผย) แล้วผลัดกันเล่นตามเข็มนาฬิกา
            ใช้การ์ดโจมตี/ป้องกัน/ฟื้น จนกว่าฝ่ายใดฝ่ายหนึ่งบรรลุเป้าของบทบาทตัวเอง
          </div>

          {/* บทบาท */}
          <SectionTitle glyph="爵">บทบาท & เงื่อนไขชนะ</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {ROLES.map((r) => (
              <div key={r.cn} style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#faf3de", border: "1px solid #e2d3aa", borderRadius: 7, padding: "8px 10px" }}>
                <span className={`seal ${r.cls}`} style={{ width: 22, height: 22, flexShrink: 0, fontSize: 13 }}>{r.cn}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-muted)", lineHeight: 1.4 }}>{r.goal}</div>
                </div>
              </div>
            ))}
          </div>

          {/* เทิร์น */}
          <SectionTitle glyph="回">โครงสร้างเทิร์น</SectionTitle>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PHASES.map((p, i) => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 5, background: "#faf3de", border: "1px solid #e2d3aa", borderRadius: 20, padding: "4px 10px 4px 4px" }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--red)", color: "#f6ecd2", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                <span style={{ fontSize: 12, color: "var(--ink)" }}>{p}</span>
              </div>
            ))}
          </div>

          {/* การ์ด */}
          <SectionTitle glyph="牌">ความหมายของการ์ด</SectionTitle>
          <div style={{ fontSize: 11.5, color: "var(--ink-muted)", marginBottom: 6 }}>การ์ดพื้นฐาน</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {BASIC.map((k) => <CardRow key={k} typeKey={k} kind="basic" />)}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-muted)", margin: "12px 0 6px" }}>กลอุบาย</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {TRICKS.map((k) => <CardRow key={k} typeKey={k} kind="trick" />)}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-muted)", margin: "12px 0 6px" }}>อุปกรณ์ (ชี้ดูรายละเอียดของทุกชิ้นได้ตอนติดตั้ง)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {EQUIP.map((k) => <CardRow key={k} typeKey={k} kind="equip" />)}
          </div>

          {/* สรุป */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margin: "16px 0 4px" }}>
            {SUMMARY.map((s) => (
              <div key={s.title} style={{ background: "#faf3de", border: "1px solid #e2d3aa", borderRadius: 7, padding: "9px 10px" }}>
                <div style={{ fontSize: 15, marginBottom: 3 }}>{s.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 12, color: "var(--ink)", marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: 10.5, color: "var(--ink-muted)", lineHeight: 1.4 }}>{s.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* footer */}
        <div style={{ padding: "10px 18px", borderTop: "1px solid #e2d3aa", textAlign: "center" }}>
          <button onClick={onClose} className="btn-primary" style={{ padding: "9px 30px", fontSize: 14 }}>เข้าใจแล้ว</button>
        </div>
      </div>
    </ModalOverlay>
  );
}

/** A "ดูกฎ" button + the modal, self-contained so any screen can drop it in. */
export function RulesButton({ style, label = "ดูกฎ" }: { style?: React.CSSProperties; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary"
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 13, padding: "7px 14px", ...style }}
      >
        📖 {label}
      </button>
      {open && <RulesModal onClose={() => setOpen(false)} />}
    </>
  );
}
