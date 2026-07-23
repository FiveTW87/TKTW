// Display-only Thai skill names + descriptions per general — the client-side
// mirror of the engine's skill definitions (packages/engine/src/generals/*.ts).
// Purely presentational: `active` marks skills the player can invoke via the
// "ใช้สกิล" button (they map to a choice:"useSkill" mainAction answer);
// `lordOnly` marks 主公技. The engine remains the source of truth for legality
// — if this table ever drifts, a rejected useSkill just re-prompts safely.
// Names/descriptions follow Naming Pass v1 (THAI_NAMING_CATALOG.md / ภาคผนวก E),
// matched to each skillId by position within its general (a few skills kept a
// different in-repo Thai name than the catalog's "old" name for the same
// mechanic, e.g. xiahoudun_ganglie/zhenji_guose/pangtong_qicai/etc — matched by
// mechanic + position, not literal old-name string, since each general has at
// most 2 skills and the order is unambiguous).
export interface SkillDisplay {
  id: string;
  name: string;
  description: string;
  active: boolean;
  lordOnly: boolean;
}

const S = (
  id: string,
  name: string,
  description: string,
  opts: { active?: boolean; lordOnly?: boolean } = {},
): SkillDisplay => ({
  id,
  name,
  description,
  active: opts.active ?? false,
  lordOnly: opts.lordOnly ?? false,
});

export const GENERAL_SKILLS: Record<string, SkillDisplay[]> = {
  none: [],

  // ── Wei ─────────────────────────────────────────────
  caocao: [
    S("caocao_jianxiong", "พลิกภัยเป็นกล", "เมื่อได้รับความเสียหาย สามารถนำการ์ดที่ทำร้ายตนเข้ามือ"),
    S("caocao_hujia", "ใต้ธงวุย", "สกิลเจ้าเมือง: เมื่อจำเป็นต้องใช้หลบคม ให้ผู้เล่นวุยก๊กอื่นใช้แทนได้", { lordOnly: true }),
  ],
  simayi: [
    S("simayi_fankui", "ชิงคืนหลังศึก", "เมื่อได้รับความเสียหาย ชิงการ์ด 1 ใบจากผู้ที่ทำร้าย"),
    S("simayi_guicai", "พลิกชะตา", "ก่อนผลไพ่ตัดสินของผู้เล่นใดมีผล สามารถใช้การ์ดในมือแทนไพ่ตัดสิน"),
  ],
  xiahoudun: [
    S("xiahoudun_ganglie", "เนตรเดียวทวงแค้น", "เมื่อได้รับความเสียหาย ตัดสินเพื่อบังคับผู้ทำร้ายทิ้ง 2 ใบหรือเสีย 1 พลังชีวิต"),
  ],
  caoren: [
    S("caoren_tuoyi", "เปลือยเกราะท้าศึก", "จั่วน้อยลง 1 ใบ เพื่อเพิ่มความเสียหายจากจู่โจมหรือท้าศึกเดี่ยว 1 ในเทิร์นนั้น"),
  ],
  zhangliao: [
    S("zhangliao_tuxi", "แปดร้อยทลายค่าย", "สละการจั่ว เพื่อชิงการ์ดในมือจากผู้เล่นอื่นสูงสุด 2 คน คนละ 1 ใบ"),
  ],
  guojia: [
    S("guojia_yidu", "เก็บลิขิตฟ้า", "หลังไพ่ตัดสินของตนมีผล สามารถเก็บการ์ดใบนั้นเข้ามือ"),
    S("guojia_yiji", "กลฝากยามโรยแรง", "ทุกครั้งที่เสีย 1 พลังชีวิต ดูการ์ดบนกอง 2 ใบแล้วแจกให้ผู้เล่นใดก็ได้"),
  ],
  zhenji: [
    S("zhenji_guose", "เงางามหลบคม", "ใช้การ์ดสีดำแทนหลบคม"),
    S("zhenji_luoshen", "ร่ายระบำลั่วสุ่ย", "เริ่มเทิร์นให้ตัดสิน หากเป็นสีดำเก็บการ์ดและตัดสินซ้ำจนออกสีแดง"),
  ],

  // ── Shu ─────────────────────────────────────────────
  liubei: [
    S("liubei_rende", "ปันทรัพย์รวมใจ", "มอบการ์ดให้ผู้อื่นได้ และเมื่อมอบครบ 2 ใบในเทิร์น ฟื้น 1 พลังชีวิต", { active: true }),
    S("liubei_hujia", "ธงจ๊กเรียกศึก", "สกิลเจ้าเมือง: เมื่อจำเป็นต้องใช้จู่โจม ให้ผู้เล่นจ๊กก๊กอื่นใช้แทนได้", { lordOnly: true }),
  ],
  guanyu: [
    S("guanyu_wusheng", "คมง้าวชาด", "ใช้การ์ดสีแดงแทนจู่โจม"),
  ],
  zhangfei: [
    S("zhangfei_paoxiao", "คำรามสะพานเตียงปัน", "ใช้จู่โจมได้ไม่จำกัดจำนวน"),
  ],
  zhaoyun: [
    S("zhaoyun_longdan", "เจ็ดเข้าเจ็ดออก", "ใช้จู่โจมแทนหลบคม หรือใช้หลบคมแทนจู่โจมได้"),
  ],
  machao: [
    S("machao_qima", "อาชาเสเหลียง", "ระยะที่ตนคำนวณไปยังผู้เล่นอื่นลดลง 1"),
    S("machao_tieqi", "ม้าเหล็กทะลวงค่าย", "เมื่อเลือกเป้าหมายจู่โจม ให้ตัดสิน หากเป็นสีแดง เป้าหมายใช้หลบคมไม่ได้"),
  ],
  zhugeliang: [
    S("zhugeliang_guandou", "อ่านดาววางกล", "ดูการ์ดบนกองตามจำนวนที่กำหนด แล้วจัดเรียงไว้บนหรือใต้กอง"),
    S("zhugeliang_kongcheng", "กลเมืองว่าง", "เมื่อไม่มีการ์ดในมือ ไม่สามารถตกเป็นเป้าหมายของจู่โจมหรือท้าศึกเดี่ยว"),
  ],
  pangtong: [
    S("pangtong_juhui", "ปัญญากลจักร", "เมื่อใช้การ์ดอุบายธรรมดาจากมือ จั่ว 1 ใบ"),
    S("pangtong_qicai", "เครื่องกลไร้พรมแดน", "ใช้การ์ดอุบายโดยไม่จำกัดระยะ"),
  ],

  // ── Wu ──────────────────────────────────────────────
  sunquan: [
    S("sunquan_zhiheng", "ชั่งดุลใต้หล้า", "หนึ่งครั้งต่อเทิร์น ทิ้งการ์ดกี่ใบก็ได้แล้วจั่วใหม่เท่าจำนวน", { active: true }),
    S("sunquan_jiujia", "แคว้นง่อค้ำชู", "สกิลเจ้าเมือง: เมื่อผู้เล่นง่อก๊กอื่นใช้ท้อคืนชีพกับตน ฟื้นเพิ่มอีก 1 พลังชีวิต", { lordOnly: true }),
  ],
  zhouyu: [
    S("zhouyu_yingzi", "ปรีชาเจียงตง", "ในเฟสจั่ว จั่วเพิ่ม 1 ใบ"),
    S("zhouyu_fanjian", "ไพ่ลวงซ่อนคม", "ให้เป้าหมายทายดอก รับการ์ดที่ผู้ใช้เลือก และเสีย 1 พลังชีวิตหากทายผิด", { active: true }),
  ],
  ganning: [
    S("ganning_qixi", "ระฆังราตรีปล้นค่าย", "ใช้การ์ดสีดำแทนข้ามน้ำรื้อสะพาน"),
  ],
  lumeng: [
    S("lumeng_qinxue", "ซ่อนคมสะสมศึก", "หากเฟสลงการ์ดไม่ได้ใช้จู่โจม ข้ามเฟสทิ้งการ์ด"),
  ],
  huanggai: [
    S("huanggai_kurou", "โบยกายลวงศึก", "เสีย 1 พลังชีวิตของตนเพื่อจั่ว 2 ใบ ใช้ได้หลายครั้งในเฟสลงการ์ด", { active: true }),
  ],
  daiqiao: [
    S("daiqiao_guose", "โฉมงามตรึงศึก", "ใช้การ์ดข้าวหลามตัดแทนสุขจนลืมจ๊ก"),
    S("daiqiao_huibi", "แพรพลิ้วเบี่ยงคม", "เมื่อเป็นเป้าหมายจู่โจม ทิ้ง 1 ใบเพื่อโอนเป้าหมายไปยังผู้เล่นอื่นที่ถูกต้อง"),
  ],
  sunshangxiang: [
    S("sunshangxiang_jieyuan", "ผูกวาสนาสองแคว้น", "ทิ้ง 2 ใบ เลือกผู้เล่นที่บาดเจ็บ แล้วตนและเป้าหมายฟื้นคนละ 1 พลังชีวิต", { active: true }),
    S("sunshangxiang_jiehun", "ศาสตราไม่ขาดมือ", "เมื่อเสียอุปกรณ์ 1 ใบ จั่ว 2 ใบ"),
  ],
  luxun: [
    S("luxun_qianxun", "ถ่อมตนซ่อนคม", "ไม่สามารถตกเป็นเป้าหมายของฉกทรัพย์ตามน้ำและสุขจนลืมจ๊ก"),
    S("luxun_lianying", "กลค่ายไม่สิ้น", "เมื่อเสียการ์ดใบสุดท้ายในมือ จั่ว 1 ใบ"),
  ],

  // ── Qun ─────────────────────────────────────────────
  lubu: [
    S("lubu_wushuang", "หอกฟางเทียนข่มทัพ", "จู่โจมบังคับเป้าหมายใช้หลบคม 2 ใบ และท้าศึกเดี่ยวบังคับคู่ต่อสู้ใช้จู่โจม 2 ใบในแต่ละครั้ง"),
  ],
  diaochan: [
    S("diaochan_lijian", "กลหญิงงามแตกสัมพันธ์", "ทิ้ง 1 ใบ บังคับชาย 2 คนดวลกัน", { active: true }),
    S("diaochan_libu", "จันทร์หลบโฉม", "จบเทิร์น จั่ว 1 ใบ"),
  ],
  huatuo: [
    S("huatuo_qingnang", "คัมภีร์ถุงเขียว", "ทิ้ง 1 ใบ รักษาผู้บาดเจ็บ 1 HP (1 ครั้ง/เทิร์น)", { active: true }),
    S("huatuo_jiuxing", "เข็มทองต่อชีพ", "นอกเทิร์นตัวเอง ใช้การ์ดสีแดงเป็นท้อคืนชีพได้"),
  ],
};

export function generalSkills(generalId: string): SkillDisplay[] {
  return GENERAL_SKILLS[generalId] ?? [];
}

// Flat skillId -> SkillDisplay lookup, so anywhere holding only a skillId
// (e.g. the engine's activateSkill decision) can show the Thai name/desc.
const SKILL_BY_ID: Record<string, SkillDisplay> = Object.fromEntries(
  Object.values(GENERAL_SKILLS).flatMap((skills) => skills.map((s) => [s.id, s])),
);

export function skillById(skillId: string): SkillDisplay | undefined {
  return SKILL_BY_ID[skillId];
}
