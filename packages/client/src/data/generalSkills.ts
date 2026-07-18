// Display-only Thai skill names + descriptions per general — the client-side
// mirror of the engine's skill definitions (packages/engine/src/generals/*.ts).
// Purely presentational: `active` marks skills the player can invoke via the
// "ใช้สกิล" button (they map to a choice:"useSkill" mainAction answer);
// `lordOnly` marks 主公技. The engine remains the source of truth for legality
// — if this table ever drifts, a rejected useSkill just re-prompts safely.
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
    S("caocao_jianxiong", "วีรบุรุษเจ้าเล่ห์", "เมื่อได้รับดาเมจ เก็บการ์ดที่ทำร้ายคุณเข้ามือ"),
    S("caocao_hujia", "คุ้มกันราชา", "เมื่อต้องลง 'หลบ' ให้ขอ Wei คนอื่นลงแทนได้", { lordOnly: true }),
  ],
  simayi: [
    S("simayi_fankui", "โต้กลับ", "เมื่อได้รับดาเมจ ชิงการ์ด 1 ใบจากผู้ทำร้าย"),
    S("simayi_guicai", "อัจฉริยะปีศาจ", "แทนที่ไพ่ตัดสินของใครก็ได้ด้วยการ์ดในมือ"),
  ],
  xiahoudun: [
    S("xiahoudun_ganglie", "แข็งกร้าว", "เมื่อโดนดาเมจ ตัดสิน ถ้าไม่ใช่โพแดง ผู้ทำร้ายต้องทิ้ง 2 ใบ หรือเสีย 1 HP"),
  ],
  caoren: [
    S("caoren_tuoyi", "ถอดเสื้อรบ", "เฟสจั่ว: จั่วน้อยลง 1 ใบ แลกดาเมจ +1 ทั้งเทิร์น"),
  ],
  zhangliao: [
    S("zhangliao_tuxi", "จู่โจมสายฟ้าแลบ", "แทนการจั่ว: ชิงการ์ด 1 ใบจากผู้เล่นถัดไปสูงสุด 2 คน"),
  ],
  guojia: [
    S("guojia_yidu", "ริษยาฟ้า", "เมื่อไพ่ตัดสินของคุณเสร็จ เก็บมันเข้ามือ"),
    S("guojia_yiji", "แผนสุดท้าย", "เมื่อเสีย HP เปิดการ์ด 2 ใบต่อ 1 HP แล้วแจกให้ใครก็ได้"),
  ],
  zhenji: [
    S("zhenji_guose", "โฉมงาม", "ใช้การ์ดดอกดำเป็น 'หลบ' ได้"),
    S("zhenji_luoshen", "เทพีลั่วสุ่ย", "ต้นเทิร์น: ตัดสินซ้ำเรื่อยๆ ตราบที่ได้ดอกดำ เก็บเข้ามือ"),
  ],

  // ── Shu ─────────────────────────────────────────────
  liubei: [
    S("liubei_rende", "เมตตาธรรม", "ให้การ์ดในมือแก่คนอื่น ให้ครบ 2 ใบในเทิร์นได้ฟื้น 1 HP", { active: true }),
    S("liubei_hujia", "ปลุกใจนักรบ", "เมื่อต้องลง 'สังหาร' ให้ขอ Shu คนอื่นลงแทนได้", { lordOnly: true }),
  ],
  guanyu: [
    S("guanyu_wusheng", "เทพศาสตรา", "ใช้การ์ดสีแดงเป็น 'สังหาร' ได้"),
  ],
  zhangfei: [
    S("zhangfei_paoxiao", "คำรามสิงห์", "ลง 'สังหาร' ได้ไม่จำกัดจำนวนต่อเทิร์น"),
  ],
  zhaoyun: [
    S("zhaoyun_longdan", "ใจมังกร", "ใช้ 'สังหาร' เป็น 'หลบ' และ 'หลบ' เป็น 'สังหาร' ได้"),
  ],
  machao: [
    S("machao_qima", "วิชาขี่ม้า", "ระยะจากคุณไปหาคนอื่นลด 1 (เหมือนม้าลบ)"),
    S("machao_tieqi", "ทหารม้าเหล็ก", "เมื่อลง 'สังหาร' ตัดสิน ถ้าแดง เป้าลง 'หลบ' ไม่ได้"),
  ],
  zhugeliang: [
    S("zhugeliang_guandou", "ดูดาว", "ต้นเทิร์น: เปิดการ์ดบนกองมาจัดเรียงลำดับใหม่"),
    S("zhugeliang_kongcheng", "กลเมืองร้าง", "เมื่อไม่มีการ์ดในมือ จะโดน 'สังหาร'/'ดวล' ไม่ได้"),
  ],
  pangtong: [
    S("pangtong_juhui", "รวบรวมปัญญา", "เมื่อใช้กลอุบายปกติ (ไม่ใช่แปลง) จั่ว 1 ใบ"),
    S("pangtong_qicai", "อัจฉริยะ", "กลอุบายของคุณไม่มีข้อจำกัดระยะ"),
  ],

  // ── Wu ──────────────────────────────────────────────
  sunquan: [
    S("sunquan_zhiheng", "ถ่วงดุลอำนาจ", "ทิ้งการ์ดกี่ใบก็ได้ แล้วจั่วใหม่เท่าเดิม (1 ครั้ง/เทิร์น)", { active: true }),
    S("sunquan_jiujia", "ผนึกกำลัง", "เมื่อ Wu คนอื่นใช้ 'ท้อ' รักษาคุณ ฟื้นเพิ่ม 1 HP", { lordOnly: true }),
  ],
  zhouyu: [
    S("zhouyu_yingzi", "สง่างามผงาด", "เฟสจั่ว จั่วเพิ่ม 1 ใบ"),
    S("zhouyu_fanjian", "กลไส้ศึก", "ให้เป้าดูการ์ด 1 ใบแล้วทายดอก ทายผิดเสีย 1 HP", { active: true }),
  ],
  ganning: [
    S("ganning_qixi", "จู่โจมยามวิกาล", "ใช้การ์ดดอกดำเป็น 'ข้ามสะพานแล้วรื้อทิ้ง' ได้"),
  ],
  lumeng: [
    S("lumeng_qinxue", "หมั่นเพียร", "ถ้าเทิร์นนี้ไม่ได้ลง 'สังหาร' ข้ามเฟสทิ้งการ์ด"),
  ],
  huanggai: [
    S("huanggai_kurou", "กลลวงทรมานตน", "เสีย 1 HP เพื่อจั่ว 2 ใบ (ใช้ได้หลายครั้ง)", { active: true }),
  ],
  daiqiao: [
    S("daiqiao_guose", "โฉมสคราญ", "ใช้การ์ดข้าวหลามตัดเป็น 'เพลินจนลืมแคว้นสู่' ได้"),
    S("daiqiao_huibi", "หลบลี้ภัย", "เมื่อโดน 'สังหาร' ทิ้งการ์ดโอนเป้าไปคนอื่นได้"),
  ],
  sunshangxiang: [
    S("sunshangxiang_jieyuan", "ผูกสัมพันธ์", "ทิ้ง 2 ใบ ฟื้นคุณและเป้าที่บาดเจ็บคนละ 1 HP", { active: true }),
    S("sunshangxiang_jiehun", "สตรีอาจหาญ", "เมื่อเสียอุปกรณ์ จั่ว 2 ใบ"),
  ],
  luxun: [
    S("luxun_qianxun", "ถ่อมตน", "จะโดน 'ฉวยลักแกะ'/'เพลินจนลืมแคว้นสู่' ไม่ได้"),
    S("luxun_lianying", "ค่ายเรียงราย", "เมื่อการ์ดในมือหมด จั่ว 1 ใบ"),
  ],

  // ── Qun ─────────────────────────────────────────────
  lubu: [
    S("lubu_wushuang", "ไร้เทียมทาน", "'สังหาร' ของคุณต้องลง 'หลบ' 2 ใบ; 'ดวล' ต้องตอบ 2 'สังหาร'"),
  ],
  diaochan: [
    S("diaochan_lijian", "ยุแยงตะแคงรั่ว", "ทิ้ง 1 ใบ บังคับชาย 2 คนดวลกัน", { active: true }),
    S("diaochan_libu", "จันทร์อำพราง", "จบเทิร์น จั่ว 1 ใบ"),
  ],
  huatuo: [
    S("huatuo_qingnang", "ถุงยาเขียว", "ทิ้ง 1 ใบ รักษาผู้บาดเจ็บ 1 HP (1 ครั้ง/เทิร์น)", { active: true }),
    S("huatuo_jiuxing", "ปีศาจแพทย์", "นอกเทิร์นตัวเอง ใช้การ์ดสีแดงเป็น 'ท้อ' ได้"),
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
