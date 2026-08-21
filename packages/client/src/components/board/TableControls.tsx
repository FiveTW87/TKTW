import { useState } from "react";
import { RulesButton } from "../RulesModal";
import { useSfxStore } from "../../store/sfxStore";

export type TableActionViewModel =
  | { kind: "hidden" }
  | {
      kind: "confirm";
      caption: string;
      busy: boolean;
      enabled: boolean;
      onCancel: () => void;
      onConfirm: () => void;
    }
  | {
      kind: "discard";
      selectedCount: number;
      requiredCount: number;
      busy: boolean;
      onSubmit: () => void;
    }
  | {
      kind: "endPhase";
      turnNumber: number;
      busy: boolean;
      onSubmit: () => void;
    };

function SfxControl() {
  const [open, setOpen] = useState(false);
  const muted = useSfxStore((state) => state.muted);
  const volume = useSfxStore((state) => state.volume);
  const setMuted = useSfxStore((state) => state.setMuted);
  const setVolume = useSfxStore((state) => state.setVolume);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((current) => !current)}
        className="btn-secondary"
        style={{ width: 44, height: 44, padding: 0, fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
        aria-label="ตั้งค่าเสียง"
        title="เสียง"
      >
        <span>{muted || volume === 0 ? "🔇" : "🔊"}</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 160,
            zIndex: 80,
            background: "rgba(28,22,14,.96)",
            border: "1px solid var(--gold)",
            borderRadius: 8,
            padding: "10px 12px",
            boxShadow: "0 10px 26px rgba(0,0,0,.45)",
          }}
        >
          <button
            onClick={() => setMuted(!muted)}
            className={muted ? "btn-secondary" : "btn-primary"}
            style={{ width: "100%", padding: "5px 8px", fontSize: 11, marginBottom: 8 }}
          >
            {muted ? "เปิดเสียง" : "ปิดเสียง"}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            style={{ width: "100%" }}
            aria-label="ระดับเสียง"
          />
        </div>
      )}
    </div>
  );
}

export function TableUtilityRail({ onRequestLeave }: { onRequestLeave: () => void }) {
  return (
    <nav className="table-utility-rail" aria-label="เมนูโต๊ะเล่น">
      <div title="วิธีเล่นและกติกา">
        <RulesButton label="วิธีเล่น & กติกา" iconOnly style={{ width: 44, height: 44, padding: 0, fontSize: 17 }} />
      </div>
      <SfxControl />
      <button className="table-utility-leave" onClick={onRequestLeave} aria-label="ออกจากเกม" title="ออกจากเกม">
        退
      </button>
    </nav>
  );
}

export function TableActionCluster({ action }: { action: TableActionViewModel }) {
  if (action.kind === "hidden") return null;

  const isConfirm = action.kind === "confirm";
  const isDiscard = action.kind === "discard";
  const caption = isConfirm
    ? action.caption
    : isDiscard
      ? `การ์ดเกินมือ — ทิ้ง ${action.selectedCount}/${action.requiredCount} ใบ`
      : `เทิร์นที่ ${action.turnNumber}`;

  return (
    <div
      className="table-action-cluster"
      style={{
        position: "fixed",
        right: "calc(24px + env(safe-area-inset-right, 0px))",
        bottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
        zIndex: 60,
        textAlign: "center",
      }}
    >
      <div
        className="anim-rise"
        style={{
          marginBottom: 10,
          maxWidth: 260,
          fontSize: 12,
          fontWeight: 600,
          color: isConfirm || isDiscard ? "var(--ink)" : "var(--ink-muted)",
          background: "rgba(20,14,9,.9)",
          border: "1px solid var(--panel-border-2)",
          borderRadius: 10,
          padding: "6px 12px",
          lineHeight: 1.4,
        }}
      >
        {caption}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
        {isConfirm && (
          <button onClick={action.onCancel} disabled={action.busy} className="btn-secondary table-action-cancel" style={{ width: 60, height: 60, borderRadius: "50%", fontSize: 11, fontWeight: 700 }}>
            ยกเลิก
          </button>
        )}
        {isConfirm ? (
          <button onClick={action.onConfirm} disabled={action.busy || !action.enabled} className="btn-primary table-action-primary" style={{ width: 92, height: 92, borderRadius: "50%", fontSize: 15, fontWeight: 700, boxShadow: "0 10px 30px rgba(0,0,0,.6)" }}>
            ยืนยัน
          </button>
        ) : isDiscard ? (
          <button onClick={action.onSubmit} disabled={action.busy || action.selectedCount !== action.requiredCount} className="btn-primary table-action-primary" style={{ width: 92, height: 92, borderRadius: "50%", fontSize: 14, fontWeight: 700, boxShadow: "0 10px 30px rgba(0,0,0,.6)" }}>
            ทิ้ง {action.selectedCount}/{action.requiredCount}
          </button>
        ) : (
          <button onClick={action.onSubmit} disabled={action.busy} className="btn-primary table-action-primary table-end-turn" style={{ width: 92, height: 92, borderRadius: "50%", fontSize: 15, fontWeight: 700, boxShadow: "0 10px 30px rgba(0,0,0,.6)" }}>
            จบเทิร์น
          </button>
        )}
      </div>
    </div>
  );
}
