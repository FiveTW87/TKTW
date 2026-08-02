import { useState, type ReactNode } from "react";
import { ModalOverlay } from "./Modal";
import { cardDisplay, cardInfo } from "../data/cardNames";
import { GENERAL_DISPLAY, generalDisplay, generalFaction, factionColor, factionLabel } from "../data/generalNames";
import { generalSkills } from "../data/generalSkills";
import { GeneralPortrait } from "./GeneralPortrait";

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

const GENERAL_IDS = Object.keys(GENERAL_DISPLAY).filter((id) => id !== "none");
const FACTIONS: Array<{ key: string; label: string }> = [
  { key: "wei", label: factionLabel("wei") },
  { key: "shu", label: factionLabel("shu") },
  { key: "wu", label: factionLabel("wu") },
  { key: "qun", label: factionLabel("qun") },
];

const SUMMARY: Array<{ icon: string; title: string; body: string }> = [
  { icon: "⚔️", title: "ระยะ & การโจมตี", body: 'ระยะนับจากที่นั่ง (ตัวเลข ⟷ บน tile ศัตรู เขียว=ตีถึง) · อาวุธเพิ่มระยะ · ม้าปรับระยะเข้า/ออก 1' },
  { icon: "🩸", title: "ใกล้ตาย & เสียชีวิต", body: `HP ถึง 0 → เปิดจังหวะให้ทุกคนลง "${cardDisplay("tao").name}" ช่วย · ไม่มีใครช่วย = ตาย และเปิดบทบาท` },
  { icon: "🏆", title: "เงื่อนไขชนะ", body: "เกมจบเมื่อฝ่ายใดบรรลุเป้าตามบทบาท (เจ้าเมืองตาย=กบฏ/ไส้ศึกได้เปรียบ ฯลฯ)" },
];

// ── little building blocks ─────────────────────────────────────────────
function SectionTitle({ glyph, children }: { glyph: string; children: ReactNode }) {
  return (
    <h2 className="rules-section-title">
      <span aria-hidden="true">{glyph}</span>
      {children}
    </h2>
  );
}

const SQUARE_TINT: Record<string, string> = { basic: "#b23a2e", trick: "#7a5f27", equip: "#5c4a2d" };

function CardRow({ typeKey, kind }: { typeKey: string; kind: "basic" | "trick" | "equip" }) {
  const d = cardDisplay(typeKey);
  return (
    <div className="rules-card-row">
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

function GeneralRow({ generalId }: { generalId: string }) {
  const d = generalDisplay(generalId);
  const faction = generalFaction(generalId);
  const color = factionColor(faction);
  const skills = generalSkills(generalId);
  return (
    <div className="rules-general-row">
      <div className="rules-general-portrait">
        <GeneralPortrait generalId={generalId} faction={faction} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>{d.name}</span>
          <div style={{ display: "flex", gap: 2 }}>
            {Array.from({ length: d.maxHp }).map((_, i) => (
              <span key={i} className="hp-dot" style={{ width: 6, height: 6, background: "radial-gradient(circle at 40% 35%, var(--hp-green-light), var(--hp-green))" }} />
            ))}
          </div>
        </div>
        {skills.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--ink-faint)", fontStyle: "italic" }}>ไม่มีสกิล</div>
        ) : (
          skills.map((s) => (
            <div key={s.id} style={{ marginBottom: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color }}>{s.name}</span>
                {s.lordOnly && <span style={{ fontSize: 8, background: "var(--gold)", color: "#3a2708", borderRadius: 6, padding: "0 5px" }}>主公</span>}
                {s.active && <span style={{ fontSize: 8, background: "var(--red)", color: "#f6ecd2", borderRadius: 6, padding: "0 5px" }}>技</span>}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-muted)", lineHeight: 1.4 }}>{s.description}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── the modal ──────────────────────────────────────────────────────────
type RulesTab = "overview" | "cards" | "generals";

const RULE_TABS: Array<{ id: RulesTab; glyph: string; label: string; hint: string }> = [
  { id: "overview", glyph: "始", label: "เริ่มเล่น", hint: "บทบาทและลำดับเทิร์น" },
  { id: "cards", glyph: "牌", label: "คู่มือการ์ด", hint: "การ์ดทุกประเภท" },
  { id: "generals", glyph: "將", label: "นายพล", hint: "ความสามารถทุกก๊ก" },
];

export function RulesModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<RulesTab>("overview");

  return (
    <ModalOverlay onClose={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-modal-title"
        className="rules-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="rules-header">
          <span className="rules-header-seal" aria-hidden="true">卷</span>
          <div className="rules-header-copy">
            <div id="rules-modal-title" className="rules-title">วิธีเล่น & กติกา</div>
            <div className="rules-subtitle">三國 · คู่มือฉบับย่อสำหรับศึกบทบาทลับ 3–10 คน</div>
          </div>
          <button onClick={onClose} className="rules-close" aria-label="ปิดวิธีเล่นและกติกา">✕</button>
        </header>

        <nav className="rules-tabs" role="tablist" aria-label="หมวดคู่มือ">
          {RULE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-label={tab.label}
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "is-active" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="rules-tab-glyph" aria-hidden="true">{tab.glyph}</span>
              <span><b>{tab.label}</b><small>{tab.hint}</small></span>
            </button>
          ))}
        </nav>

        <div className="rules-body">
          {activeTab === "overview" && (
            <div role="tabpanel" className="rules-panel">
              <div className="rules-hero">
                <div>
                  <span className="rules-eyebrow">เป้าหมายของเกม</span>
                  <p>รับบทบาทลับ วางแผนจากตัวตนของนายพล และผลัดกันใช้การ์ดจนฝ่ายของคุณบรรลุเงื่อนไขชนะ</p>
                </div>
                <div className="rules-hero-stats" aria-label="ข้อมูลเกมโดยย่อ">
                  <span><b>3–10</b> ผู้เล่น</span>
                  <span><b>6</b> ช่วงต่อเทิร์น</span>
                  <span><b>4</b> บทบาท</span>
                </div>
              </div>

              <SectionTitle glyph="爵">บทบาท & เงื่อนไขชนะ</SectionTitle>
              <div className="rules-role-grid">
                {ROLES.map((role) => (
                  <div key={role.cn} className="rules-role-card">
                    <span className={`seal ${role.cls}`}>{role.cn}</span>
                    <div><b>{role.name}</b><p>{role.goal}</p></div>
                  </div>
                ))}
              </div>

              <SectionTitle glyph="回">โครงสร้างเทิร์น</SectionTitle>
              <div className="rules-phase-track">
                {PHASES.map((phase, index) => (
                  <div key={phase} className="rules-phase">
                    <span>{index + 1}</span><b>{phase}</b>
                  </div>
                ))}
              </div>

              <div className="rules-summary-grid">
                {SUMMARY.map((summary) => (
                  <div key={summary.title} className="rules-summary-card">
                    <span aria-hidden="true">{summary.icon}</span>
                    <div><b>{summary.title}</b><p>{summary.body}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "cards" && (
            <div role="tabpanel" className="rules-panel">
              <SectionTitle glyph="牌">ความหมายของการ์ด</SectionTitle>
              <p className="rules-lead">ดูชื่อ สัญลักษณ์ และหน้าที่ของการ์ดก่อนตัดสินใจเล่น—อุปกรณ์ที่ติดตั้งแล้วสามารถชี้เพื่อดูรายละเอียดซ้ำได้</p>
              <h3 className="rules-category-title">การ์ดพื้นฐาน</h3>
              <div className="rules-item-grid">{BASIC.map((key) => <CardRow key={key} typeKey={key} kind="basic" />)}</div>
              <h3 className="rules-category-title">กลอุบาย</h3>
              <div className="rules-item-grid">{TRICKS.map((key) => <CardRow key={key} typeKey={key} kind="trick" />)}</div>
              <h3 className="rules-category-title">อุปกรณ์</h3>
              <div className="rules-item-grid">{EQUIP.map((key) => <CardRow key={key} typeKey={key} kind="equip" />)}</div>
            </div>
          )}

          {activeTab === "generals" && (
            <div role="tabpanel" className="rules-panel">
              <SectionTitle glyph="將">นายพล & ความสามารถ</SectionTitle>
              <p className="rules-lead">สีของป้ายบอกก๊ก จุดสีเขียวคือพลังชีวิตพื้นฐาน ส่วนป้าย 主公 และ 技 บอกสกิลเจ้าเมืองหรือสกิลกดใช้</p>
              {FACTIONS.map(({ key, label }) => {
                const ids = GENERAL_IDS.filter((id) => generalFaction(id) === key);
                if (ids.length === 0) return null;
                return (
                  <section key={key} className="rules-faction-section" style={{ "--rules-faction": factionColor(key) } as React.CSSProperties}>
                    <h3><span aria-hidden="true" />{label}<small>{ids.length} นายพล</small></h3>
                    <div className="rules-general-grid">{ids.map((id) => <GeneralRow key={id} generalId={id} />)}</div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        <footer className="rules-footer">
          <span>เลือกหมวดด้านบนเพื่อเปิดดูระหว่างเล่นได้ทุกเวลา</span>
          <button onClick={onClose} className="btn-primary">เข้าใจแล้ว</button>
        </footer>
      </section>
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
