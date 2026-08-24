import { useState } from "react";
import {
  ROOM_PACING_LIMITS,
  ROOM_PACING_PRESETS,
  roomSettingsSelectionSchema,
  type NamedRoomPacingPreset,
  type ResolvedRoomSettings,
  type RoomSettingsSelection,
} from "@tktw/shared";

const PRESET_COPY: Record<NamedRoomPacingPreset, { label: string; description: string }> = {
  beginner: { label: "มือใหม่", description: "มีเวลาคิดและกลับเข้าเกมมากขึ้น" },
  standard: { label: "มาตรฐาน", description: "จังหวะสมดุลสำหรับเกมทั่วไป" },
  fast: { label: "รวดเร็ว", description: "เกมกระชับสำหรับผู้เล่นคุ้นเคย" },
};

const CUSTOM_LABEL = "กำหนดเอง";

interface CustomDraft {
  decisionTimeoutSec: string;
  reconnectGraceSec: string;
  revealDurationSec: string;
  botAnswerDelayMs: string;
}

const STANDARD_DRAFT: CustomDraft = {
  decisionTimeoutSec: String(ROOM_PACING_PRESETS.standard.decisionTimeoutSec),
  reconnectGraceSec: String(ROOM_PACING_PRESETS.standard.reconnectGraceSec),
  revealDurationSec: String(ROOM_PACING_PRESETS.standard.revealDurationSec),
  botAnswerDelayMs: String(ROOM_PACING_PRESETS.standard.botAnswerDelayMs),
};

const CUSTOM_FIELDS: ReadonlyArray<{
  key: keyof CustomDraft;
  label: string;
  unit: string;
  min: number;
  max: number;
}> = [
  { key: "decisionTimeoutSec", label: "เวลาตัดสินใจ (วินาที)", unit: "วิ", ...ROOM_PACING_LIMITS.decisionTimeoutSec },
  { key: "reconnectGraceSec", label: "เวลารอเชื่อมต่อกลับ (วินาที)", unit: "วิ", ...ROOM_PACING_LIMITS.reconnectGraceSec },
  { key: "revealDurationSec", label: "เวลาเปิดเผยบทบาท (วินาที)", unit: "วิ", ...ROOM_PACING_LIMITS.revealDurationSec },
  { key: "botAnswerDelayMs", label: "ความหน่วงบอท (มิลลิวินาที)", unit: "ms", ...ROOM_PACING_LIMITS.botAnswerDelayMs },
];

function selectionFromDraft(draft: CustomDraft): RoomSettingsSelection | null {
  const values = Object.fromEntries(
    Object.entries(draft).map(([key, raw]) => [key, raw.trim() === "" ? Number.NaN : Number(raw)]),
  );
  const parsed = roomSettingsSelectionSchema.safeParse({ preset: "custom", ...values });
  return parsed.success ? parsed.data : null;
}

export function roomPacingLabel(preset: ResolvedRoomSettings["preset"]): string {
  return preset === "custom" ? CUSTOM_LABEL : PRESET_COPY[preset].label;
}

export function RoomPacingPicker({
  value,
  onChange,
  compact,
}: {
  value: RoomSettingsSelection | null;
  onChange: (selection: RoomSettingsSelection | null) => void;
  compact: boolean;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [draft, setDraft] = useState<CustomDraft>(STANDARD_DRAFT);

  const updateCustom = (key: keyof CustomDraft, raw: string) => {
    const next = { ...draft, [key]: raw };
    setDraft(next);
    onChange(selectionFromDraft(next));
  };

  return (
    <section aria-label="เลือกรูปแบบเวลา" style={{ marginBottom: compact ? 12 : 18 }}>
      <div style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: 1, marginBottom: 7 }}>รูปแบบเวลาในห้อง</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: compact ? 4 : 6 }}>
        {(Object.keys(PRESET_COPY) as NamedRoomPacingPreset[]).map((preset) => {
          const copy = PRESET_COPY[preset];
          const selected = value?.preset === preset;
          const timing = ROOM_PACING_PRESETS[preset];
          return (
            <button
              type="button"
              key={preset}
              aria-pressed={selected}
              onClick={() => onChange({ preset })}
              className={selected ? "btn-primary" : "btn-secondary"}
              style={{ minWidth: 0, padding: compact ? "7px 3px" : "9px 5px", borderRadius: 8, lineHeight: 1.2 }}
              title={copy.description}
            >
              <span style={{ display: "block", fontSize: compact ? 10.5 : 12, fontWeight: 800 }}>{copy.label}</span>
              <span style={{ display: "block", marginTop: 3, fontSize: compact ? 8.5 : 9.5, opacity: .76 }}>{timing.decisionTimeoutSec} วิ/ตา</span>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: compact ? 9 : 10, color: "var(--ink-faint)", marginTop: 6, minHeight: 14 }}>
        {value?.preset && value.preset !== "custom" ? PRESET_COPY[value.preset].description : value?.preset === "custom" ? "ใช้เวลาที่กำหนดเองด้านล่าง" : "กรอกค่ากำหนดเองให้ครบและอยู่ในช่วงที่ระบุ"}
      </div>
      <button
        type="button"
        className="btn-secondary"
        aria-expanded={advancedOpen}
        aria-controls="room-pacing-advanced"
        onClick={() => setAdvancedOpen((open) => !open)}
        style={{ width: "100%", marginTop: 5, padding: compact ? "6px 8px" : "8px 10px", fontSize: compact ? 10.5 : 11.5, borderRadius: 8 }}
      >
        ตั้งค่าขั้นสูง <span aria-hidden="true">{advancedOpen ? "▴" : "▾"}</span>
      </button>
      {advancedOpen && (
        <div id="room-pacing-advanced" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: compact ? 6 : 8, marginTop: 8 }}>
          {CUSTOM_FIELDS.map((field) => {
            const id = `room-pacing-${field.key}`;
            return (
              <label key={field.key} htmlFor={id} style={{ minWidth: 0, fontSize: compact ? 8.5 : 9.5, color: "var(--ink-faint)" }}>
                <span style={{ display: "block", minHeight: compact ? 22 : 24 }}>{field.label}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input
                    id={id}
                    aria-label={field.label}
                    type="number"
                    inputMode="numeric"
                    min={field.min}
                    max={field.max}
                    step={1}
                    value={draft[field.key]}
                    onChange={(event) => updateCustom(field.key, event.target.value)}
                    style={{ width: "100%", minWidth: 0, background: "#140e08", border: `1px solid ${value === null ? "#8f4033" : "var(--panel-border-3)"}`, borderRadius: 7, padding: compact ? "6px" : "7px", color: "var(--ink)", fontFamily: "var(--font-body)" }}
                  />
                  <span aria-hidden="true">{field.unit}</span>
                </span>
                <span style={{ display: "block", marginTop: 2, opacity: .68 }}>{field.min}–{field.max}</span>
              </label>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function RoomPacingSummary({ settings, compact }: { settings: ResolvedRoomSettings; compact: boolean }) {
  const chips = [
    `ตัดสินใจ ${settings.decisionTimeoutSec} วิ`,
    `กลับเข้าเกม ${settings.reconnectGraceSec} วิ`,
    `เปิดบทบาท ${settings.revealDurationSec} วิ`,
    `บอท ${settings.botAnswerDelayMs} ms`,
  ];
  return (
    <section
      role="region"
      aria-label="กติกาห้อง"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: compact ? 5 : 8, maxWidth: "min(92vw,760px)", padding: compact ? "6px 9px" : "8px 12px", border: "1px solid var(--panel-border-2)", borderRadius: 10, background: "rgba(24,15,9,.82)", boxShadow: "0 6px 18px rgba(0,0,0,.28)" }}
    >
      <span style={{ fontSize: compact ? 9 : 10, color: "var(--ink-faint)", letterSpacing: 1 }}>กติกาห้อง</span>
      <strong style={{ fontSize: compact ? 11 : 13, color: "var(--gold-light)" }}>{roomPacingLabel(settings.preset)}</strong>
      {chips.map((chip) => <span key={chip} style={{ fontSize: compact ? 9 : 10.5, color: "var(--ink)", padding: "2px 6px", borderRadius: 8, background: "rgba(217,165,49,.08)" }}>{chip}</span>)}
    </section>
  );
}
