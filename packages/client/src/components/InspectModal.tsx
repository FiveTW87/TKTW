import { useEffect, useState, type CSSProperties } from "react";
import type { Card, PlayerView } from "@tktw/shared";
import { ModalOverlay } from "./Modal";
import { generalDisplay, factionColor, factionLabel } from "../data/generalNames";
import { generalArt } from "../data/generalArt";
import { cardDisplay } from "../data/cardNames";
import { generalSkills } from "../data/generalSkills";
import { roleDisplay } from "../data/roles";
import { cardArtUrl } from "../data/cardArt";

const SLOT_LABEL: Record<string, string> = {
  weapon: "อาวุธ",
  armor: "เกราะ",
  horseMinus: "ม้า −1",
  horsePlus: "ม้า +1",
};

export function InspectModal({ player, onClose, onInspectCard }: { player: PlayerView; onClose: () => void; onInspectCard?: (card: Card) => void }) {
  const display = generalDisplay(player.generalId);
  const art = generalArt(player.generalId, player.faction);
  const color = factionColor(player.faction);
  const handCount = Array.isArray(player.hand) ? player.hand.length : player.hand.count;
  const equipment = Object.entries(player.equipment).filter((entry) => entry[1]);
  const skills = player.generalId ? generalSkills(player.generalId) : [];
  const role = roleDisplay(player.role);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <ModalOverlay onClose={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`รายละเอียด ${display.name}`}
        className="general-detail-modal anim-pop"
        onClick={(event) => event.stopPropagation()}
        style={{
          "--general-faction": color,
          backgroundImage: `url(${art.background})`,
        } as CSSProperties}
      >
        <div className="general-detail-shade" aria-hidden="true" />

        <header className="general-detail-header">
          <div>
            <div className="general-detail-kicker">{factionLabel(player.faction)} · นายพลประจำที่นั่ง {player.seat + 1}</div>
            <h2>{display.name}</h2>
            <div className="general-detail-player">ผู้เล่น {player.name}</div>
          </div>
          <div className="general-detail-header-actions">
            <span className="general-detail-role">{role?.name ?? "บทบาทปกปิด"}</span>
            <button type="button" className="general-detail-close" onClick={onClose} aria-label="ปิดรายละเอียดขุนพล">×</button>
          </div>
        </header>

        <div className="general-detail-layout">
          <div className="general-detail-hero" aria-hidden={!art.fullBody}>
            {art.fullBody ? (
              <img src={art.fullBody} alt={`ภาพเต็มตัว ${display.name}`} draggable={false} />
            ) : (
              <span>{display.glyph}</span>
            )}
          </div>

          <div className="general-detail-sheet">
            <div className="general-detail-stats">
              <Stat value={`${player.hp}/${player.maxHp}`} label="พลังชีวิต" accent />
              <Stat value={String(handCount)} label="การ์ดในมือ" />
              <Stat value={player.alive ? "พร้อมรบ" : "สิ้นชีพ"} label="สถานะ" />
            </div>

            <DetailSection title="เขตอุปกรณ์">
              {equipment.length ? (
                <div className="general-detail-equipment">
                  {equipment.map(([slot, card]) => (
                    <button type="button" className="general-detail-item" key={slot} disabled={!onInspectCard} onClick={() => onInspectCard?.(card!)}>
                      <EquipmentThumbnail card={card!} />
                      <span>
                        <small>{SLOT_LABEL[slot] ?? slot}</small>
                        <b>{cardDisplay(card!.typeKey).name}</b>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="general-detail-empty">ยังไม่มีอุปกรณ์</div>
              )}
            </DetailSection>

            {player.judgmentZone.length > 0 && (
              <DetailSection title="เขตไพ่ตัดสิน">
                <div className="general-detail-equipment">
                  {player.judgmentZone.map((card) => (
                    <button type="button" className="general-detail-item is-danger" key={card.id} disabled={!onInspectCard} onClick={() => onInspectCard?.(card)}>
                      <span className="general-detail-item-glyph">{cardDisplay(card.typeKey).glyph}</span>
                      <b>{cardDisplay(card.typeKey).name}</b>
                    </button>
                  ))}
                </div>
              </DetailSection>
            )}

            <DetailSection title="สกิลประจำตัว">
              {skills.length ? (
                <div className="general-detail-skills">
                  {skills.map((skill) => {
                    const used = player.skillUsedThisTurn[skill.id] ?? 0;
                    return (
                      <article key={skill.id}>
                        <div>
                          <b>{skill.name}</b>
                          {skill.lordOnly && <span>主公</span>}
                          {skill.active && <span>技</span>}
                          {used > 0 && <small>ใช้แล้ว {used}</small>}
                        </div>
                        <p>{skill.description}</p>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="general-detail-empty">ไม่มีข้อมูลสกิลที่เปิดเผย</div>
              )}
            </DetailSection>

            <button type="button" className="btn-secondary general-detail-bottom-close" onClick={onClose}>ปิดรายละเอียด</button>
          </div>
        </div>
      </section>
    </ModalOverlay>
  );
}

function EquipmentThumbnail({ card }: { card: Card }) {
  const artUrl = cardArtUrl(card.typeKey);
  const [artFailed, setArtFailed] = useState(false);
  const display = cardDisplay(card.typeKey);

  if (artUrl && !artFailed) {
    return (
      <img
        className="general-detail-item-art"
        src={artUrl}
        alt={`ภาพการ์ด ${display.name}`}
        onError={() => setArtFailed(true)}
      />
    );
  }

  return <span className="general-detail-item-glyph">{display.glyph}</span>;
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className={accent ? "is-accent" : undefined}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="general-detail-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
