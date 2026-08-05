# TKTW Test Case Catalog

<!-- catalog-sync: 226 pass / 30 fail / 0 waived / 0 pending — 256 checkboxes, vitest @ 684f943, 2026-08-05 -->




อ้างอิง `FiveTW87/TKTW@677496b3a7b56d4104b5653ee4b623875c6df557`

สถานะเริ่มต้นของทุกเคสคือ `TODO` จนกว่าจะรันด้วย Vitest สำเร็จจริง ห้ามถือว่า implementation ผ่านจาก catalog นี้เพียงอย่างเดียว

## กติกากลางสำหรับทุก test

- ใช้ seed คงที่และจัดมือ/กองจั่วโดยตรงเพื่อให้ deterministic
- ตรวจทั้งผลลัพธ์, ตำแหน่งการ์ด, HP, usage counter, pending decision และ log/trigger
- ทุก invalid answer ต้อง `throw/reject` และ state ต้อง byte-identical กับก่อนตอบ
- ทุก optional skill ต้องมีทั้ง accept และ decline
- ทุก once-per-turn skill ต้องตรวจใช้ครั้งแรก, ครั้งที่สองถูกปฏิเสธ และ reset ในเทิร์นถัดไป
- ทุก lord skill ต้องตรวจทั้ง role=`lord` และ role อื่น
- ทุก conversion ต้องตรวจเจ้าของสกิล, ผู้เล่นอื่น, สี/ดอกที่ถูก และสี/ดอกที่ผิด

## นายพล 25 ตัว

### วุย

#### G-CAOCAO โจโฉ

> **พลิกภัยเป็นกล (`caocao_jianxiong`)** — เมื่อได้รับความเสียหาย สามารถนำการ์ดที่ทำร้ายตนเข้ามือ
>
> **ใต้ธงวุย (`caocao_hujia`)** — สกิลเจ้าเมือง: เมื่อจำเป็นต้องใช้หลบคม ให้ผู้เล่นวุยก๊กอื่นใช้แทนได้

- [x] [G-CAOCAO-01] `jianxiong`: ได้รับ damage จาก `sha` แล้วรับ physical source card จาก discard เข้ามือ
- [ ] ❌ [G-CAOCAO-02] `jianxiong`: ได้รับ damage จาก `juedou`, `nanman`, `wanjian` หรือการ์ดชนิดอื่นที่มี `sourceCardId` แล้วรับ physical source card ได้เช่นเดียวกัน <!-- FAIL: AssertionError: expected { zone: 'discardPile', …(1) } to deeply equal { zone: 'hand', ownerId: 'p0' } -->
- [x] [G-CAOCAO-03] `jianxiong`: เงื่อนไขคือ “damage มาจาก physical card” ไม่ใช่ “ต้องถูกโจมตีด้วย sha”
- [x] [G-CAOCAO-04] `jianxiong`: decline แล้วการ์ดยังคงอยู่ discard
- [x] [G-CAOCAO-05] `jianxiong`: damage ที่ไม่มี `sourceCardId` ไม่ trigger
- [x] [G-CAOCAO-06] `jianxiong`: source card ถูกย้ายออกจาก discard ก่อน trigger แล้วห้ามสร้างการ์ดซ้ำ
- [x] [G-CAOCAO-07] `jianxiong`: damage หลายจุดจาก card เดียวรับได้ไม่เกิน physical card ที่มีอยู่จริง
- [x] [G-CAOCAO-08] `hujia`: lord ถูกโจมตีและไม่มี `shan`; Wei ally ใช้ `shan` แทนแล้วไม่เสีย HP
- [x] [G-CAOCAO-09] `hujia`: ally คนแรกผ่าน คนถัดไปอาสา ลำดับต้องเป็น seat order
- [x] [G-CAOCAO-10] `hujia`: non-Wei, dead ally และตัวโจโฉเองไม่ถูกถาม
- [x] [G-CAOCAO-11] `hujia`: โจโฉไม่ใช่ lord หรือเป็น attacker แล้วไม่ trigger
- [x] [G-CAOCAO-12] `hujia`: รับ converted `shan` ที่ถูกกฎหมาย และ reject การ์ดที่ไม่ counts-as-`shan`

#### G-SIMAYI สุมาอี้

> **ชิงคืนหลังศึก (`simayi_fankui`)** — เมื่อได้รับความเสียหาย ชิงการ์ด 1 ใบจากผู้ที่ทำร้าย
>
> **พลิกชะตา (`simayi_guicai`)** — ก่อนผลไพ่ตัดสินของผู้เล่นใดมีผล สามารถใช้การ์ดในมือแทนไพ่ตัดสิน

- [x] [G-SIMAYI-01] `fankui`: หลังเสีย HP ขโมยหนึ่งใบจากผู้สร้าง damage
- [ ] ❌ [G-SIMAYI-02] `fankui`: เลือก card ID ที่มีจริง; invalid ID ต้อง atomic reject <!-- FAIL: AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined -->
- [x] [G-SIMAYI-03] `fankui`: source มือว่าง, source ตาย หรือไม่มี source แล้วไม่ trigger
- [x] [G-SIMAYI-04] `guicai`: เปลี่ยน judgment ของตนเองและของผู้อื่นด้วยการ์ดในมือ
- [x] [G-SIMAYI-05] `guicai`: ไพ่เดิมไป discard ไพ่ใหม่กลายเป็น judgment card
- [x] [G-SIMAYI-06] `guicai`: pass, มือว่าง และ invalid card ID ไม่ทำให้ judgment เปลี่ยน
- [x] [G-SIMAYI-07] `guicai`: มีสุมาอี้หลายคน ต้องเรียง trigger ตาม seat order โดย judgment ล่าสุดเป็นใบที่มีผล

#### G-XIAHOUDUN แฮหัวตุ้น

> **เนตรเดียวทวงแค้น (`xiahoudun_ganglie`)** — เมื่อได้รับความเสียหาย ตัดสินเพื่อบังคับผู้ทำร้ายทิ้ง 2 ใบหรือเสีย 1 พลังชีวิต

- [x] [G-XIAHOUDUN-01] `ganglie`: judgment heart แล้ว source ไม่ต้องจ่ายโทษ
- [x] [G-XIAHOUDUN-02] `ganglie`: non-heart แล้ว source เลือกทิ้งสองใบสำเร็จ
- [x] [G-XIAHOUDUN-03] `ganglie`: source เลือกเสียหนึ่ง HP
- [x] [G-XIAHOUDUN-04] `ganglie`: source มีการ์ดน้อยกว่าสองแล้วบังคับเสีย HP
- [x] [G-XIAHOUDUN-05] `ganglie`: duplicate/invalid discard IDs ต้อง atomic reject
- [x] [G-XIAHOUDUN-06] `ganglie`: damage ไม่มี source หรือ source ตายแล้วไม่ trigger

#### G-CAOREN เคาทู

> **เปลือยเกราะท้าศึก (`caoren_tuoyi`)** — จั่วน้อยลง 1 ใบ เพื่อเพิ่มความเสียหายจากจู่โจมหรือท้าศึกเดี่ยว 1 ในเทิร์นนั้น

- [x] [G-CAOREN-01] `tuoyi`: decline แล้วจั่วปกติและไม่มี damage bonus
- [x] [G-CAOREN-02] `tuoyi`: accept แล้วจั่วลดหนึ่ง
- [x] [G-CAOREN-03] `tuoyi`: `sha` และ `juedou` ที่ตนสร้างเพิ่ม damage หนึ่ง
- [x] [G-CAOREN-04] `tuoyi`: AOE, trick อื่น, equipment effect และ `loseHp` ต้องไม่รับ bonus
- [x] [G-CAOREN-05] `tuoyi`: bonus ไม่รั่วไปผู้เล่นอื่นและหมดเมื่อขึ้นเทิร์นใหม่
- [x] [G-CAOREN-06] `tuoyi`: damage หลายครั้งจาก `sha`/`juedou` ในเทิร์นเดียวใช้ bonus ตามข้อความสกิล

#### G-ZHANGLIAO เตียวเลี้ยว

> **แปดร้อยทลายค่าย (`zhangliao_tuxi`)** — สละการจั่ว เพื่อชิงการ์ดในมือจากผู้เล่นอื่นสูงสุด 2 คน คนละ 1 ใบ

- [x] [G-ZHANGLIAO-01] `tuxi`: decline แล้วจั่วสองตามปกติ
- [x] [G-ZHANGLIAO-02] `tuxi`: เลือกหนึ่งคน ขโมยหนึ่งใบและไม่จั่ว
- [x] [G-ZHANGLIAO-03] `tuxi`: เลือกสองคน ขโมยคนละหนึ่งใบและไม่จั่ว
- [x] [G-ZHANGLIAO-04] `tuxi`: ไม่มีผู้เล่นอื่นมีไพ่แล้วไม่ prompt และจั่วปกติ
- [ ] ❌ [G-ZHANGLIAO-05] `tuxi`: reject ตัวเอง, ผู้ตาย, คนมือว่าง, duplicate target และมากกว่าสองเป้าหมาย <!-- FAIL: AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined -->
- [x] [G-ZHANGLIAO-06] `tuxi`: hidden hand ต้องให้ผู้ใช้เลือกตาม visibility policy ที่กำหนด ไม่เปิดมือเป้าหมายเกินกฎ

#### G-GUOJIA กุยแก

> **เก็บลิขิตฟ้า (`guojia_yidu`)** — หลังไพ่ตัดสินของตนมีผล สามารถเก็บการ์ดใบนั้นเข้ามือ
>
> **กลฝากยามโรยแรง (`guojia_yiji`)** — ทุกครั้งที่เสีย 1 พลังชีวิต ดูการ์ดบนกอง 2 ใบแล้วแจกให้ผู้เล่นใดก็ได้

- [x] [G-GUOJIA-01] `yidu`: judgment ของตนเสร็จแล้ว accept เพื่อเก็บ judgment card
- [x] [G-GUOJIA-02] `yidu`: decline แล้วการ์ดไปตำแหน่งปกติ
- [x] [G-GUOJIA-03] `yidu`: judgment ของคนอื่นไม่ trigger
- [x] [G-GUOJIA-04] `yiji`: เสียหนึ่ง HP เปิดสองใบและแจกทั้งสองให้ตนเอง/คนเดียว/คนละคน
- [x] [G-GUOJIA-05] `yiji`: เสีย N HP ต้อง resolve N ชุด ชุดละสองใบ
- [x] [G-GUOJIA-06] `yiji`: ผู้รับตายระหว่าง distribution และกองจั่วมีการ์ดไม่พอ
- [ ] ❌ [G-GUOJIA-07] `yiji`: invalid target/duplicate assignment ต้อง atomic reject <!-- FAIL: AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined -->

#### G-ZHENJI เอียนสี

> **เงางามหลบคม (`zhenji_guose`)** — ใช้การ์ดสีดำแทนหลบคม
>
> **ร่ายระบำลั่วสุ่ย (`zhenji_luoshen`)** — เริ่มเทิร์นให้ตัดสิน หากเป็นสีดำเก็บการ์ดและตัดสินซ้ำจนออกสีแดง

- [x] [G-ZHENJI-01] `guose`: ไพ่ดำทุกดอก counts-as-`shan`; ไพ่แดงไม่ใช่
- [x] [G-ZHENJI-02] `guose`: ใช้ได้เฉพาะเจ้าของสกิลและเฉพาะ response ที่ต้องการ `shan`
- [x] [G-ZHENJI-03] `luoshen`: accept; black judgment เข้ามือและตัดสินต่อจนเจอ red
- [x] [G-ZHENJI-04] `luoshen`: red ใบแรกหยุดทันทีและไม่เข้ามือ
- [x] [G-ZHENJI-05] `luoshen`: decline แล้วไม่เริ่ม judgment loop
- [x] [G-ZHENJI-06] `luoshen`: ทำงานร่วมกับ `guicai` โดยใช้สีของ judgment ใบสุดท้าย
- [ ] ❌ [G-ZHENJI-07] `luoshen`: กองจั่วหมดต้องจบอย่างปลอดภัย ไม่ loop <!-- FAIL: Error: no cards left to judge with -->

### จ๊ก

#### G-LIUBEI เล่าปี่

> **ปันทรัพย์รวมใจ (`liubei_rende`)** — มอบการ์ดให้ผู้อื่นได้ และเมื่อมอบครบ 2 ใบในเทิร์น ฟื้น 1 พลังชีวิต
>
> **ธงจ๊กเรียกศึก (`liubei_hujia`)** — สกิลเจ้าเมือง: เมื่อจำเป็นต้องใช้จู่โจม ให้ผู้เล่นจ๊กก๊กอื่นใช้แทนได้

- [x] [G-LIUBEI-01] `rende`: ให้หนึ่งใบแก่ผู้เล่นอื่น การ์ดย้ายจริง
- [x] [G-LIUBEI-02] `rende`: ให้ครบสองใบในเทิร์นแล้วฟื้นหนึ่ง HP เพียงครั้งเดียว
- [x] [G-LIUBEI-03] `rende`: ให้สามใบขึ้นไปยังฟื้นรวมเพียงหนึ่งครั้ง
- [ ] ❌ [G-LIUBEI-04] `rende`: HP เต็ม, target ตาย, target เป็นตนเอง และ invalid/duplicate card ID <!-- FAIL: AssertionError: a rejected answer must leave state byte-identical: expected { seed: 1004, seq: 2, …(10) } to deeply equal { seed: 1004, seq: 2, …(10) } -->
- [x] [G-LIUBEI-05] `rende`: counter reset เมื่อขึ้นเทิร์นใหม่
- [x] [G-LIUBEI-06] lord skill: Shu ally ใช้ `sha` แทนเมื่อ lord ต้องตอบ `sha`
- [x] [G-LIUBEI-07] lord skill: ally หลายคนเรียง seat order; non-Shu/dead/self ไม่ถูกถาม
- [x] [G-LIUBEI-08] lord skill: รับ converted `sha` จากกวนอู/จูล่ง; reject non-`sha`
- [x] [G-LIUBEI-09] lord skill: ไม่ทำงานเมื่อเล่าปี่ไม่ใช่ lord

#### G-GUANYU กวนอู

> **คมง้าวชาด (`guanyu_wusheng`)** — ใช้การ์ดสีแดงแทนจู่โจม

- [x] [G-GUANYU-01] `wusheng`: heart/diamond ทุก category ใช้เป็น `sha` ใน main action
- [x] [G-GUANYU-02] `wusheng`: ใช้ไพ่แดงเป็น `sha` ใน reactive/lord-skill response
- [x] [G-GUANYU-03] `wusheng`: spade/club ถูกปฏิเสธ
- [x] [G-GUANYU-04] `wusheng`: conversion ไม่รั่วให้ผู้เล่นอื่นและยังติด range/usage limit

#### G-ZHANGFEI เตียวหุย

> **คำรามสะพานเตียงปัน (`zhangfei_paoxiao`)** — ใช้จู่โจมได้ไม่จำกัดจำนวน

- [x] [G-ZHANGFEI-01] `paoxiao`: ใช้ `sha` ครั้งที่ 2, 3 และมากกว่านั้นในเทิร์นเดียวได้
- [x] [G-ZHANGFEI-02] `paoxiao`: ยังติด range, target validity และต้องมี physical/converted `sha`
- [x] [G-ZHANGFEI-03] `paoxiao`: counter reset และไม่ทำให้ผู้เล่นอื่นใช้ `sha` ไม่จำกัด

#### G-ZHAOYUN จูล่ง

> **เจ็ดเข้าเจ็ดออก (`zhaoyun_longdan`)** — ใช้จู่โจมแทนหลบคม หรือใช้หลบคมแทนจู่โจมได้

- [x] [G-ZHAOYUN-01] `longdan`: `shan` counts-as-`sha` ใน main action และ response ที่ต้องใช้ `sha`
- [x] [G-ZHAOYUN-02] `longdan`: `sha` counts-as-`shan` เมื่อถูกโจมตี
- [x] [G-ZHAOYUN-03] `longdan`: การ์ดประเภทอื่นและ conversion ทิศทางผิดถูกปฏิเสธ
- [x] [G-ZHAOYUN-04] `longdan`: interaction กับ `hujia`, `nanman`, `wanjian`, `wushuang` และ usage limit

#### G-MACHAO ม้าเฉียว

> **อาชาเสเหลียง (`machao_qima`)** — ระยะที่ตนคำนวณไปยังผู้เล่นอื่นลดลง 1
>
> **ม้าเหล็กทะลวงค่าย (`machao_tieqi`)** — เมื่อเลือกเป้าหมายจู่โจม ให้ตัดสิน หากเป็นสีแดง เป้าหมายใช้หลบคมไม่ได้

- [x] [G-MACHAO-01] `qima`: ระยะจากม้าเฉียวไปทุกเป้าหมายลดหนึ่ง แต่ระยะย้อนกลับไม่เปลี่ยน
- [x] [G-MACHAO-02] `qima`: stack ถูกต้องกับ horseMinus, horsePlus และ weapon range
- [x] [G-MACHAO-03] `tieqi`: red judgment ทำให้เป้าหมายตอบ `shan` ไม่ได้
- [x] [G-MACHAO-04] `tieqi`: black judgment ยังตอบ `shan` ได้
- [x] [G-MACHAO-05] `tieqi`: trigger เฉพาะเมื่อม้าเฉียวเป็น source ของ `sha`
- [x] [G-MACHAO-06] `tieqi`: ใช้ judgment หลัง `guicai` replacement
- [x] [G-MACHAO-07] `tieqi`: interaction กับ `bagua`, `renwang`, `huibi` และหลายเป้าหมาย

#### G-ZHUGELIANG ขงเบ้ง

> **อ่านดาววางกล (`zhugeliang_guandou`)** — ดูการ์ดบนกองตามจำนวนที่กำหนด แล้วจัดเรียงไว้บนหรือใต้กอง
>
> **กลเมืองว่าง (`zhugeliang_kongcheng`)** — เมื่อไม่มีการ์ดในมือ ไม่สามารถตกเป็นเป้าหมายของจู่โจมหรือท้าศึกเดี่ยว

- [x] [G-ZHUGELIANG-01] `guandou`: เปิด min(5, alive count) ใบและไม่รั่วข้อมูลแก่ viewer อื่น
- [x] [G-ZHUGELIANG-02] `guandou`: จัดบางใบ/ทุกใบไว้บนกองตามลำดับที่เลือก ส่วนที่เหลือลงใต้กอง
- [x] [G-ZHUGELIANG-03] `guandou`: duplicate, unknown ID และ ID เกินชุดเปิดต้อง atomic reject
- [ ] ❌ [G-ZHUGELIANG-04] `guandou`: หากกองจั่วมีไม่พอ ให้เปิดการ์ดที่เหลือในกองจั่วก่อน จากนั้นสับกองทิ้งเป็นกองจั่วใหม่และเปิดเพิ่มจนได้ครบ min(5, alive count) <!-- FAIL: AssertionError: expected 1 to be 3 // Object.is equality -->
- [x] [G-ZHUGELIANG-05] `guandou`: การเติมจากกองทิ้งต้องใช้ RNG/seed แบบ deterministic, ห้ามทำ physical card ซ้ำหรือหาย และต้องไม่นำการ์ดที่กำลัง resolve/อยู่ zone อื่นมาสับรวม
- [x] [G-ZHUGELIANG-06] `guandou`: หากจำนวนการ์ดที่เหลือรวมทั้งกองจั่วและกองทิ้งยังไม่พอ ให้เปิดเท่าที่มีทั้งหมดและจบอย่างปลอดภัย
- [x] [G-ZHUGELIANG-07] `guandou`: หากทั้งกองจั่วและกองทิ้งว่าง ให้ไม่สร้าง decision เปล่าและดำเนิน turn ต่อได้
- [x] [G-ZHUGELIANG-08] `kongcheng`: มือว่างแล้ว `sha`/`juedou` เลือกเป็นเป้าหมายไม่ได้
- [x] [G-ZHUGELIANG-09] `kongcheng`: มือมีหนึ่งใบแล้วกลับเป็นเป้าหมายได้
- [x] [G-ZHUGELIANG-10] `kongcheng`: AOE, global และ trick ชนิดอื่นยังมีผลตามปกติ
- [x] [G-ZHUGELIANG-11] `kongcheng`: มือว่างระหว่าง target resolution ต้องใช้ timing ตามกฎที่กำหนด

#### G-PANGTONG หองหยิม

> **ปัญญากลจักร (`pangtong_juhui`)** — เมื่อใช้การ์ดอุบายธรรมดาจากมือ จั่ว 1 ใบ
>
> **เครื่องกลไร้พรมแดน (`pangtong_qicai`)** — ใช้การ์ดอุบายโดยไม่จำกัดระยะ

- [x] [G-PANGTONG-01] `juhui`: ใช้ instant trick จากมือแล้วจั่วหนึ่ง
- [x] [G-PANGTONG-02] `juhui`: delayed trick, equipment, basic และ converted trick ไม่ trigger
- [ ] ❌ [G-PANGTONG-03] `juhui`: trick ถูก `wuxie` ยังนับ “ใช้” เพียงครั้งเดียว <!-- FAIL: Error: expected decision {"kind":"activateSkill","skillId":"pangtong_juhui"}, got mainAction@p0 {} -->
- [x] [G-PANGTONG-04] `juhui`: multi-target trick trigger ครั้งเดียว ไม่ใช่ต่อเป้าหมาย
- [x] [G-PANGTONG-05] `qicai`: ข้ามเฉพาะ range restriction ของ trick
- [x] [G-PANGTONG-06] `qicai`: ไม่ข้าม immunity, duplicate delayed zone และ target validity อื่น

### ง่อ

#### G-SUNQUAN ซุนกวน

> **ชั่งดุลใต้หล้า (`sunquan_zhiheng`)** — หนึ่งครั้งต่อเทิร์น ทิ้งการ์ดกี่ใบก็ได้แล้วจั่วใหม่เท่าจำนวน
>
> **แคว้นง่อค้ำชู (`sunquan_jiujia`)** — สกิลเจ้าเมือง: เมื่อผู้เล่นง่อก๊กอื่นใช้ท้อคืนชีพกับตน ฟื้นเพิ่มอีก 1 พลังชีวิต

- [x] [G-SUNQUAN-01] `zhiheng`: ทิ้ง N ใบแล้วจั่ว N ใบ
- [ ] ❌ [G-SUNQUAN-02] `zhiheng`: zero cards ไม่ทำอะไร; duplicate/unknown IDs atomic reject <!-- FAIL: AssertionError: a rejected answer must leave state byte-identical: expected { seed: 1203, seq: 2, …(10) } to deeply equal { seed: 1203, seq: 2, …(10) } -->
- [x] [G-SUNQUAN-03] `zhiheng`: ใช้ครั้งที่สองในเทิร์นเดียวถูกปฏิเสธและ reset เทิร์นถัดไป
- [x] [G-SUNQUAN-04] `jiujia`: Wu ally คนอื่นใช้ `tao` ช่วย lord แล้วฟื้นเพิ่มหนึ่ง
- [x] [G-SUNQUAN-05] `jiujia`: ไม่ทำงานกับรักษาตนเอง, non-Wu healer, non-lord หรือ HP เต็ม
- [x] [G-SUNQUAN-06] `jiujia`: การรักษาไม่เกิน max HP และไม่ recurse จาก bonus heal ของตัวเอง

#### G-ZHOUYU จิวยี่

> **ปรีชาเจียงตง (`zhouyu_yingzi`)** — ในเฟสจั่ว จั่วเพิ่ม 1 ใบ
>
> **ไพ่ลวงซ่อนคม (`zhouyu_fanjian`)** — ผู้ใช้เลือกการ์ดในมือตนเอง 1 ใบก่อนโดยยังไม่เปิดเผย จากนั้นให้เป้าหมายทายดอก เปิดการ์ดที่เลือกให้ผู้ทายรับทราบหลังทาย มอบการ์ดใบนั้นแก่เป้าหมาย และเป้าหมายเสีย 1 พลังชีวิตหากทายผิด

- [x] [G-ZHOUYU-01] `yingzi`: draw phase จั่วเพิ่มหนึ่งและไม่รั่วให้คนอื่น
- [x] [G-ZHOUYU-02] `yingzi`: รวม modifier ถูกต้องกับ draw replacement เช่น `tuxi`
- [x] [G-ZHOUYU-03] `fanjian`: ผู้ใช้ต้องเลือก physical card จากมือ 1 ใบก่อนเป้าหมายทาย และห้ามเปิดหน้า/ดอกแก่เป้าหมายก่อนส่งคำตอบ
- [ ] ❌ [G-ZHOUYU-04] `fanjian`: หลังเป้าหมายทาย ต้องเปิด physical card ที่เลือกให้ผู้ทายรับทราบไม่ว่าทายถูกหรือผิด <!-- FAIL: AssertionError: expected a log entry matching {"eventType":"skillUse","skillId":"zhouyu_fanjian","cardId":"spade_11_2"}: expected 0 to be greater than 0 -->
- [x] [G-ZHOUYU-05] `fanjian`: target ทาย suit ถูก ได้การ์ดที่เปิดเผยและไม่เสีย HP
- [x] [G-ZHOUYU-06] `fanjian`: ทายผิด ได้การ์ดที่เปิดเผยและเสียหนึ่ง HP
- [x] [G-ZHOUYU-07] `fanjian`: target ตายจาก HP loss และเข้าสู่ dying flow ถูกต้อง
- [ ] ❌ [G-ZHOUYU-08] `fanjian`: invalid target/card, ใช้ซ้ำเทิร์นเดียว และ reset เทิร์นใหม่ <!-- FAIL: AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined -->
- [ ] ❌ [G-ZHOUYU-09] `fanjian`: suit ต้องดูจาก physical card ที่เลือกจริง; log/view ต้องเปิดเผย card ID, type, suit และ rank หลังทายโดยไม่รั่วก่อนตอบ <!-- FAIL: AssertionError: expected undefined to be 'heart_2_1' // Object.is equality -->

#### G-GANNING กำเหลง

> **ระฆังราตรีปล้นค่าย (`ganning_qixi`)** — ใช้การ์ดสีดำแทนข้ามน้ำรื้อสะพาน

- [x] [G-GANNING-01] `qixi`: spade/club ทุก category counts-as-`guohe`
- [x] [G-GANNING-02] `qixi`: heart/diamond ถูกปฏิเสธ
- [ ] ❌ [G-GANNING-03] `qixi`: ยังตรวจ target/zone และ `wuxie` ตาม `guohe` ปกติ <!-- FAIL: AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined -->
- [x] [G-GANNING-04] `qixi`: conversion ไม่รั่วให้คนอื่น

#### G-LUMENG ลิบอง

> **ซ่อนคมสะสมศึก (`lumeng_qinxue`)** — หากเฟสลงการ์ดไม่ได้ใช้จู่โจม ข้ามเฟสทิ้งการ์ด

- [x] [G-LUMENG-01] `qinxue`: ไม่ใช้ `sha` ใน play phase แล้วข้าม discard phase
- [x] [G-LUMENG-02] `qinxue`: ใช้ `sha` ที่ hit, miss, ถูก armor ป้องกัน หรือถูก redirect แล้วต้องไม่ข้าม discard
- [x] [G-LUMENG-03] `qinxue`: converted `sha` นับว่าใช้ `sha`
- [x] [G-LUMENG-04] `qinxue`: `sha` ที่ถูก reject ก่อน commit ต้องไม่นับ

#### G-HUANGGAI อุยกาย

> **โบยกายลวงศึก (`huanggai_kurou`)** — เสีย 1 พลังชีวิตของตนเพื่อจั่ว 2 ใบ ใช้ได้หลายครั้งในเฟสลงการ์ด

- [x] [G-HUANGGAI-01] `kurou`: เสียหนึ่ง HP แล้วจั่วสองใบ
- [x] [G-HUANGGAI-02] `kurou`: ใช้หลายครั้งใน play phase ได้
- [x] [G-HUANGGAI-03] `kurou`: HP=1 แล้วใช้ ต้องเข้า dying/death ก่อนและห้ามจั่วหากตาย
- [x] [G-HUANGGAI-04] `kurou`: ถูกช่วยจาก dying แล้วจั่วหรือไม่ตาม timing ที่ spec กำหนด
- [x] [G-HUANGGAI-05] `kurou`: ใช้นอก play phase หรือโดยผู้เล่นอื่นไม่ได้

#### G-DAIQIAO ไต้เกี้ยว

> **โฉมงามตรึงศึก (`daiqiao_guose`)** — ใช้การ์ดข้าวหลามตัดแทนสุขจนลืมจ๊ก
>
> **แพรพลิ้วเบี่ยงคม (`daiqiao_huibi`)** — เมื่อเป็นเป้าหมายจู่โจม ทิ้ง 1 ใบเพื่อโอนเป้าหมายไปยังผู้เล่นอื่นที่ถูกต้อง

- [x] [G-DAIQIAO-01] `guose`: diamond ทุก category counts-as-`lebusishu`; suit อื่นไม่ใช่
- [x] [G-DAIQIAO-02] `guose`: ห้ามวาง delayed trick ชนิดเดิมซ้ำใน judgment zone
- [x] [G-DAIQIAO-03] `huibi`: ถูก `sha` แล้วทิ้งหนึ่งใบ redirect ไปเป้าหมายมีชีวิตที่อยู่ในระยะ
- [x] [G-DAIQIAO-04] `huibi`: pass, มือว่าง, ไม่มี legal target แล้วไม่ redirect/ไม่ prompt
- [x] [G-DAIQIAO-05] `huibi`: ห้าม redirect กลับ attacker, ตนเอง, ผู้ตาย หรือนอกระยะ
- [x] [G-DAIQIAO-06] `huibi`: invalid card/target ต้อง atomic reject
- [x] [G-DAIQIAO-07] `huibi`: interaction กับ `tieqi`, armor, `wushuang` และ `fangtian`

#### G-SUNSHANGXIANG ซุนซางเซียง

> **ผูกวาสนาสองแคว้น (`sunshangxiang_jieyuan`)** — ทิ้ง 2 ใบ เลือกผู้เล่นที่บาดเจ็บ แล้วตนและเป้าหมายฟื้นคนละ 1 พลังชีวิต
>
> **ศาสตราไม่ขาดมือ (`sunshangxiang_jiehun`)** — เมื่อเสียอุปกรณ์ 1 ใบ จั่ว 2 ใบ

- [x] [G-SUNSHANGXIANG-01] `jieyuan`: ทิ้งสองใบแล้วตนและ injured target ฟื้นคนละหนึ่ง
- [ ] ❌ [G-SUNSHANGXIANG-02] `jieyuan`: target HP เต็ม, target ตาย, target=self และการ์ดไม่ครบสองใบถูกปฏิเสธ <!-- FAIL: AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined -->
- [ ] ❌ [G-SUNSHANGXIANG-03] `jieyuan`: duplicate/invalid IDs atomic reject และใช้ได้ครั้งเดียวต่อเทิร์น <!-- FAIL: AssertionError: a rejected answer must leave state byte-identical: expected { seed: 1296, seq: 2, …(10) } to deeply equal { seed: 1296, seq: 2, …(10) } -->
- [x] [G-SUNSHANGXIANG-04] `jiehun`: เสีย weapon/armor/horsePlus/horseMinus แต่ละใบแล้วจั่วสอง
- [ ] ❌ [G-SUNSHANGXIANG-05] `jiehun`: equipment ถูกขโมย, ทิ้ง, ทำลาย หรือถูกแทนที่ต้อง trigger ครั้งต่อ physical card <!-- FAIL: Error: expected decision {"kind":"activateSkill","skillId":"sunshangxiang_jiehun"}, got mainAction@p1 {} -->
- [x] [G-SUNSHANGXIANG-06] `jiehun`: การย้ายอุปกรณ์ที่ไม่ถือว่า “เสีย” ตามกฎต้องไม่ trigger

#### G-LUXUN ลกซุน

> **ถ่อมตนซ่อนคม (`luxun_qianxun`)** — ไม่สามารถตกเป็นเป้าหมายของฉกทรัพย์ตามน้ำและสุขจนลืมจ๊ก
>
> **กลค่ายไม่สิ้น (`luxun_lianying`)** — เมื่อเสียการ์ดใบสุดท้ายในมือ จั่ว 1 ใบ

- [x] [G-LUXUN-01] `qianxun`: ไม่เป็นเป้าหมาย `shunshou` และ `lebusishu`
- [x] [G-LUXUN-02] `qianxun`: card/trick ชนิดอื่นยังเลือกได้
- [x] [G-LUXUN-03] `lianying`: เล่น/ทิ้ง/ถูกขโมย/มอบการ์ดใบสุดท้ายแล้วจั่วหนึ่ง
- [ ] ❌ [G-LUXUN-04] `lianying`: เสียหลายใบพร้อมกัน trigger เมื่อ transition non-empty -> empty เพียงครั้งเดียว <!-- FAIL: AssertionError: log entries matching {"eventType":"skillUse","skillId":"luxun_lianying"}: expected +0 to be 1 // Object.is equality -->
- [x] [G-LUXUN-05] `lianying`: ไม่ trigger เมื่อมือว่างอยู่แล้วและไม่เกิด infinite loop

### ก๊กอื่น

#### G-LUBU ลิโป้

> **หอกฟางเทียนข่มทัพ (`lubu_wushuang`)** — จู่โจมบังคับเป้าหมายใช้หลบคม 2 ใบ และท้าศึกเดี่ยวบังคับคู่ต่อสู้ใช้จู่โจม 2 ใบในแต่ละครั้ง

- [x] [G-LUBU-01] `wushuang`: `sha` ต้องการ `shan` สองใบ; มี 0/1 ใบยังโดน damage มี 2 ใบรอด
- [x] [G-LUBU-02] `wushuang`: converted `shan` ใช้ตอบแต่ละใบได้
- [x] [G-LUBU-03] `wushuang`: `juedou` บังคับคู่ต่อสู้ตอบ `sha` สองใบในแต่ละรอบ
- [x] [G-LUBU-04] `wushuang`: ฝั่งลิโป้ตอบ duel ตามจำนวนปกติเมื่อถึงรอบของตน
- [x] [G-LUBU-05] `wushuang`: interaction กับ `hujia`, `longdan`, `bagua`, `renwang` และ `tieqi`

#### G-DIAOCHAN เตียวเสี้ยน

> **กลหญิงงามแตกสัมพันธ์ (`diaochan_lijian`)** — ทิ้ง 1 ใบ บังคับชาย 2 คนดวลกัน
>
> **จันทร์หลบโฉม (`diaochan_libu`)** — จบเทิร์น จั่ว 1 ใบ

- [x] [G-DIAOCHAN-01] `lijian`: ทิ้งหนึ่งใบ เลือกชายมีชีวิตสองคน แล้วเริ่ม duel ตาม source/target ที่กำหนด
- [ ] ❌ [G-DIAOCHAN-02] `lijian`: reject ผู้หญิง, ตนเอง, target ซ้ำ, ผู้ตาย, ไพ่ invalid และใช้ซ้ำในเทิร์น <!-- FAIL: AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined -->
- [x] [G-DIAOCHAN-03] `lijian`: duel ที่สร้างโดยสกิลไม่ต้องมี physical `juedou` และ interaction กับ `wushuang`
- [x] [G-DIAOCHAN-04] `libu`: จบเทิร์นแล้วจั่วหนึ่งใบตามเงื่อนไขข้อความสกิล
- [x] [G-DIAOCHAN-05] `libu`: trigger เฉพาะเจ้าของ, เพียงครั้งต่อ turn end และยังทำงานเมื่อมือว่าง

#### G-HUATUO ฮัวโต๋

> **คัมภีร์ถุงเขียว (`huatuo_qingnang`)** — ทิ้ง 1 ใบ รักษาผู้บาดเจ็บ 1 HP (1 ครั้ง/เทิร์น)
>
> **เข็มทองต่อชีพ (`huatuo_jiuxing`)** — นอกเทิร์นตัวเอง ใช้การ์ดสีแดงเป็นท้อคืนชีพได้

- [x] [G-HUATUO-01] `qingnang`: ทิ้งหนึ่งใบรักษาผู้บาดเจ็บหนึ่ง HP
- [ ] ❌ [G-HUATUO-02] `qingnang`: target HP เต็ม/ตาย, invalid card และใช้ซ้ำในเทิร์นถูกปฏิเสธ <!-- FAIL: AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined -->
- [x] [G-HUATUO-03] `qingnang`: รักษาตนเองและผู้อื่นตาม target rule
- [x] [G-HUATUO-04] `jiuxing`: นอกเทิร์นใช้ heart/diamond เป็น `tao` ช่วยผู้กำลัง dying
- [x] [G-HUATUO-05] `jiuxing`: spade/club และการใช้ในเทิร์นตนเองถูกปฏิเสธ
- [x] [G-HUATUO-06] `jiuxing`: ใช้ช่วยตนเอง/ผู้อื่นตาม dying order และไม่รั่วให้ผู้เล่นอื่น

## การ์ด 32 ชนิด

### Basic

#### C-SHA `sha`

- [ ] ❌ [C-SHA-01] เลือกหนึ่งเป้าหมายที่มีชีวิต อยู่ในระยะ และไม่ใช่ตนเอง <!-- FAIL: AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined -->
- [x] [C-SHA-02] ใช้ได้หนึ่งครั้งต่อเทิร์นโดยปกติ; usage counter commit หลัง validation สำเร็จเท่านั้น
- [x] [C-SHA-03] target ตอบ `shan` แล้วไม่เสีย HP; pass/ตอบไม่ได้แล้วเสียหนึ่ง HP
- [x] [C-SHA-04] invalid target/range/card ID/duplicate answer atomic reject
- [x] [C-SHA-05] ตรวจ armor, weapon riders, conversion, redirect, multi-dodge และ dying flow

#### C-SHAN `shan`

- [x] [C-SHAN-01] เล่นเป็น main action ไม่ได้
- [x] [C-SHAN-02] ใช้เฉพาะ decision ที่ต้องการ dodge และ physical card ไป discard
- [x] [C-SHAN-03] wrong owner, stale decision และ non-`shan` ถูกปฏิเสธแบบ atomic
- [x] [C-SHAN-04] conversion, `hujia`, `bagua`, multi-dodge ทำงานตาม contract

#### C-TAO `tao`

- [x] [C-TAO-01] ใช้ใน turn ตนเองรักษาตนเมื่อบาดเจ็บ
- [x] [C-TAO-02] ใช้ช่วยผู้เล่นใน dying window ตาม seat order
- [x] [C-TAO-03] ห้ามใช้กับ HP เต็ม/ผู้ตายนอก dying/เป้าหมายผิด
- [x] [C-TAO-04] ฟื้นไม่เกิน max HP และ interaction กับ Wu lord heal ถูกต้อง

### Instant tricks

#### C-WUZHONG `wuzhong`

- [x] [C-WUZHONG-01] ใช้กับตนเองแล้วจั่วสอง; ถูก `wuxie` แล้วไม่จั่ว
- [ ] ❌ [C-WUZHONG-02] ห้ามกำหนดเป้าหมายอื่น; กองจั่วเหลือน้อย/ว่างต้องปลอดภัย <!-- FAIL: AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined -->

#### C-GUOHE `guohe`

- [x] [C-GUOHE-01] เลือกผู้เล่นอื่นที่มีการ์ดใน hand/equipment/judgment แล้วทิ้งหนึ่งใบจาก zone ที่เลือก
- [ ] ❌ [C-GUOHE-02] target ไม่มีการ์ด, invalid/hidden card choice และ target=self ถูกปฏิเสธ <!-- FAIL: AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined -->
- [x] [C-GUOHE-03] ถูก `wuxie`; equipment loss/delayed removal triggers ถูกต้อง

#### C-SHUNSHOU `shunshou`

- [x] [C-SHUNSHOU-01] ขโมยหนึ่งใบจากเป้าหมายระยะหนึ่งเข้ามือผู้ใช้
- [ ] ❌ [C-SHUNSHOU-02] นอกระยะ, target ว่าง/self และ Lu Xun immunity ถูกปฏิเสธ <!-- FAIL: AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined -->
- [x] [C-SHUNSHOU-03] range modifier/horse/Qicai และ `wuxie` interaction

#### C-JUEDOU `juedou`

- [x] [C-JUEDOU-01] source/target สลับตอบ `sha` จนคนหนึ่งตอบไม่ได้และเสียหนึ่ง damage
- [x] [C-JUEDOU-02] wrong player/wrong card/stale answer atomic reject
- [ ] ❌ [C-JUEDOU-03] `wushuang`, converted `sha`, lord-supplied `sha`, death mid-loop และ `wuxie` <!-- FAIL: Error: expected decision {"kind":"activateSkill","skillId":"liubei_hujia"}, got respondSha@p1 {"opponentId":"p0","reason":"juedou","needed":1} -->

#### C-JIEDAO `jiedao`

- [x] [C-JIEDAO-01] เลือกผู้ถืออาวุธและ legal victim; ผู้ถือใช้ `sha` โจมตี victim
- [x] [C-JIEDAO-02] หากปฏิเสธ/โจมตีไม่ได้ อาวุธย้ายให้ผู้ใช้
- [x] [C-JIEDAO-03] ผู้ใช้มีอาวุธอยู่แล้ว ต้องยืนยัน swap และทิ้งใบที่ไม่เลือก
- [ ] ❌ [C-JIEDAO-04] unarmed source, illegal victim, range, death, `wuxie` และ atomicity <!-- FAIL: AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined -->

#### C-NANMAN `nanman`

- [x] [C-NANMAN-01] ผู้เล่นอื่นทุกคนตาม seat order ต้องตอบ `sha` หรือเสียหนึ่ง damage
- [x] [C-NANMAN-02] caster ไม่ถูกถาม; dead players ถูกข้าม
- [x] [C-NANMAN-03] `wuxie` รายเป้าหมาย/ทั้ง effect ตามกฎ และ Liu Bei lord skill/converted `sha`
- [x] [C-NANMAN-04] ผู้เล่นตายระหว่าง AOE แล้ว loop ดำเนินต่อถูกต้อง

#### C-WANJIAN `wanjian`

- [x] [C-WANJIAN-01] ผู้เล่นอื่นทุกคนตอบ `shan` หรือเสียหนึ่ง damage
- [ ] ❌ [C-WANJIAN-02] caster/dead skipped; ordering, `wuxie`, `hujia`, `bagua`, conversion และ death mid-loop <!-- FAIL: AssertionError: p1 hp: expected 3 to be 4 // Object.is equality -->

#### C-TAOYUAN `taoyuan`

- [x] [C-TAOYUAN-01] ผู้เล่นมีชีวิตทุกคนรวม caster ฟื้นหนึ่งแต่ไม่เกิน max HP
- [x] [C-TAOYUAN-02] ผู้เล่น HP เต็มไม่เปลี่ยน; dead players ไม่ฟื้น
- [x] [C-TAOYUAN-03] `wuxie` ต่อเป้าหมายและ heal triggers ไม่ recurse

#### C-WUGU `wugu`

- [x] [C-WUGU-01] เปิดการ์ดเท่าจำนวนผู้เล่นมีชีวิตและเลือกคนละหนึ่งตาม seat order
- [x] [C-WUGU-02] การ์ดที่เหลือไป discard; choices ไม่รั่วก่อนถึงคิว
- [ ] ❌ [C-WUGU-03] duplicate/unknown choice atomic reject, ผู้เล่นตายกลาง resolution และกองมีไม่พอ <!-- FAIL: AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined -->
- [x] [C-WUGU-04] `wuxie` interaction ไม่ทำให้จำนวน pool/state ผิด

#### C-WUXIE `wuxie`

- [x] [C-WUXIE-01] เล่นเป็น main action ไม่ได้และเปิดเฉพาะ trick window
- [x] [C-WUXIE-02] cancel trick, counter-`wuxie`, counter chain คู่/คี่ให้ผลถูกต้อง
- [x] [C-WUXIE-03] ผู้เล่นถูกถามตาม seat order; pass ทุกคนแล้ว trick ทำงาน
- [x] [C-WUXIE-04] wrong card/owner, stale window, repeated answer atomic reject
- [x] [C-WUXIE-05] source/target metadata ถูกต้องและไม่รั่ว hidden info

### Delayed tricks

#### C-LEBUSISHU `lebusishu`

- [x] [C-LEBUSISHU-01] วางใน judgment zone ของเป้าหมายและห้าม duplicate type
- [x] [C-LEBUSISHU-02] ถึง judge phase: heart ผ่าน; non-heart ข้าม play phase แล้วการ์ดไป discard
- [x] [C-LEBUSISHU-03] `wuxie`, `guicai`, `yidu`, Lu Xun immunity และ Da Qiao conversion
- [x] [C-LEBUSISHU-04] target ตายก่อน judgment ต้อง cleanup ถูกต้อง

#### C-SHANDIAN `shandian`

- [x] [C-SHANDIAN-01] วางที่ตนเอง; judgment spade 2–9 ทำสาม damage
- [x] [C-SHANDIAN-02] judgment ไม่เข้าเงื่อนไขส่งต่อผู้เล่นมีชีวิตคนถัดไป
- [x] [C-SHANDIAN-03] ข้ามผู้ตาย, ห้าม duplicate zone, วนครบโต๊ะอย่างปลอดภัย
- [x] [C-SHANDIAN-04] `wuxie`, `guicai`, death/dying และ damage triggers

### Weapons

#### E-CROSSBOW `crossbow`

- [x] [E-CROSSBOW-01] ผู้สวมใช้ `sha` ไม่จำกัด; ถอด/ถูกขโมยแล้ว limit กลับทันที
- [x] [E-CROSSBOW-02] equip replacement และ Zhang Fei interaction ไม่ stack ผิด

#### E-SWORD-YY `sword_yy`

- [x] [E-SWORD-YY-01] rider ทำงานเฉพาะผู้ถือ, เฉพาะ hit ที่เข้าเงื่อนไข และ optional decline
- [x] [E-SWORD-YY-02] ตรวจค่าใช้จ่าย/ผลของ rider, target ไม่มี resource และ atomic invalid answer

#### E-SWORD-ICE `sword_ice`

- [x] [E-SWORD-ICE-01] ก่อน damage เลือกยกเลิก damage เพื่อทิ้งการ์ดเป้าหมายสองใบ
- [x] [E-SWORD-ICE-02] เป้าหมายมี 0/1/2+ ใบ; เลือก duplicate/invalid ID atomic reject
- [x] [E-SWORD-ICE-03] ยกเลิก damage แล้วห้ามยิง OnDamaged แต่ equipment-loss triggers ต้องทำงาน

#### E-SWORD-QINGGANG `sword_qinggang`

- [x] [E-SWORD-QINGGANG-01] `sha` ของผู้ถือ ignore armor ของเป้าหมายเฉพาะ resolution นั้น
- [x] [E-SWORD-QINGGANG-02] ไม่ ignore skill immunity/other restrictions และไม่รั่วไปผู้เล่นอื่น

#### E-QINGLONG `qinglong`

- [x] [E-QINGLONG-01] เมื่อ target หลบสำเร็จ ผู้ถือเลือกใช้ `sha` ต่อเนื่องได้
- [x] [E-QINGLONG-02] decline/no second `sha` จบ; usage/range/target death และ conversion

#### E-ZHANGBA `zhangba`

- [ ] ❌ [E-ZHANGBA-01] ใช้การ์ดมือสองใบแทน `sha` ทั้ง main action และ response <!-- FAIL: Error: juedou: heart_2_2 does not count as sha -->
- [x] [E-ZHANGBA-02] ต้องเป็นสอง physical IDs ที่ต่างกันและอยู่ในมือ; invalid batch atomic reject
- [x] [E-ZHANGBA-03] counts-as interaction กับ usage limit/lord skill/duel

#### E-GUANSHI `guanshi`

- [x] [E-GUANSHI-01] หลัง target หลบ ผู้ถือทิ้งสองใบเพื่อบังคับ hit
- [x] [E-GUANSHI-02] decline/ไพ่ไม่พอ; duplicate/invalid discard atomic reject
- [x] [E-GUANSHI-03] damage/triggers เกิดครั้งเดียวและ interaction กับ multi-dodge

#### E-FANGTIAN `fangtian`

- [x] [E-FANGTIAN-01] เมื่อใช้การ์ดใบสุดท้ายในมือเป็น `sha` เลือกเป้าหมายเพิ่มตาม limit
- [x] [E-FANGTIAN-02] ไม่ใช่ใบสุดท้าย/converted batch แล้วไม่เพิ่มเป้า
- [ ] ❌ [E-FANGTIAN-03] target legality, duplicate targets, redirect และ AOE-like resolution order <!-- FAIL: AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined -->

#### E-QILIN `qilin`

- [x] [E-QILIN-01] เมื่อ `sha` ทำ damage เลือกทิ้ง horsePlus/horseMinus ของเป้าหมาย
- [x] [E-QILIN-02] target ไม่มีม้า/decline; เลือก slot ถูกต้อง
- [ ] ❌ [E-QILIN-03] equipment-loss triggers และ distance recalculation หลังม้าหาย <!-- FAIL: Error: expected decision {"kind":"activateSkill","skillId":"sunshangxiang_jiehun"}, got mainAction@p0 {} -->

### Armor

#### E-BAGUA `bagua`

- [x] [E-BAGUA-01] เมื่อจำเป็นต้อง `shan` เลือก judgment; red = auto dodge, black = ยังต้องตอบ
- [x] [E-BAGUA-02] decline แล้วตอบจากมือได้; `guicai` ใช้ผลใบสุดท้าย
- [x] [E-BAGUA-03] Qinggang ignore; multi-dodge ต้องตัดสินตามจำนวนที่กฎกำหนด

#### E-RENWANG `renwang`

- [x] [E-RENWANG-01] ป้องกัน black `sha`; red `sha` ยังเข้า resolution
- [x] [E-RENWANG-02] converted `sha` ใช้สีของ physical card
- [x] [E-RENWANG-03] Qinggang ignore และ armor ไม่ป้องกัน damage ชนิดอื่น

### Horses

#### E-HORSE-MINUS

- [x] [E-HORSE-MINUS-01] `horse_chitu`, `horse_dilu`, `horse_zhaohuang` แต่ละใบลดระยะจากผู้สวมหนึ่ง
- [x] [E-HORSE-MINUS-02] equip ได้ทีละหนึ่ง; replacement ทิ้งใบเดิมและคำนวณใหม่
- [x] [E-HORSE-MINUS-03] stack กับ weapon/Ma Chao และไม่เปลี่ยนระยะย้อนกลับ

#### E-HORSE-PLUS

- [x] [E-HORSE-PLUS-01] `horse_jueying`, `horse_dawan`, `horse_zixing` แต่ละใบเพิ่มระยะที่ผู้อื่นคำนวณมายังผู้สวมหนึ่ง
- [x] [E-HORSE-PLUS-02] equip ได้ทีละหนึ่ง; replacement และ Qilin removal คำนวณใหม่
- [x] [E-HORSE-PLUS-03] stack กับ horseMinus/weapon อย่างถูกทิศทาง

## Physical deck 104 ใบ: data-driven tests

ให้สร้าง `it.each(cards)` ครอบคลุมทุก record ใน `cards.json`:

- [x] [D-DECK-01] `cards.length === totalCards === 104`
- [x] [D-DECK-02] ทุก `id` unique และตรง `${suit}_${rank}_${copy}`
- [x] [D-DECK-03] `suit` อยู่ใน spade/heart/club/diamond และแต่ละดอกมี 26 ใบ
- [x] [D-DECK-04] `rank` เป็น integer 1–13 และแต่ละ suit/rank มีสอง physical cards
- [x] [D-DECK-05] ทุก `typeKey` มีใน `cardTypes`
- [x] [D-DECK-06] category/targetRule/slot/range/attackRange มี shape ถูกต้องตาม category
- [x] [D-DECK-07] physical card ทุกใบถูกสร้างใน initial deck เพียงหนึ่งครั้ง ไม่มีหายหรือซ้ำ
- [x] [D-DECK-08] shuffle ด้วย seed เดิมให้ลำดับเดิม; seed ต่างกันให้ permutation ที่ยังมีสมาชิกชุดเดิม
- [x] [D-DECK-09] draw/discard/move ไม่ clone physical ID และ invariant “หนึ่ง ID อยู่ได้หนึ่ง zone” เป็นจริงเสมอ
- [x] [D-DECK-10] balance snapshot ตรวจจำนวนต่อ `typeKey`, สี และหมวดการ์ดไม่เปลี่ยนโดยไม่ตั้งใจ

ตัวอย่าง Vitest skeleton:

```ts
import deck from "../src/data/cards.json";

describe("physical deck contract", () => {
  it("contains exactly 104 unique physical cards", () => {
    expect(deck.cards).toHaveLength(104);
    expect(new Set(deck.cards.map((c) => c.id)).size).toBe(104);
  });

  it.each(deck.cards)("$id has a valid immutable definition", (card) => {
    expect(["spade", "heart", "club", "diamond"]).toContain(card.suit);
    expect(card.rank).toBeGreaterThanOrEqual(1);
    expect(card.rank).toBeLessThanOrEqual(13);
    expect(deck.cardTypes).toHaveProperty(card.typeKey);
  });
});
```

## Suggested file split

- `tests/generals/wei.contract.test.ts`
- `tests/generals/shu.contract.test.ts`
- `tests/generals/wu.contract.test.ts`
- `tests/generals/qun.contract.test.ts`
- `tests/cards/basic.contract.test.ts`
- `tests/cards/tricks.contract.test.ts`
- `tests/cards/delayed.contract.test.ts`
- `tests/equipment/weapons.contract.test.ts`
- `tests/equipment/armor-horses.contract.test.ts`
- `tests/data/physicalDeck.contract.test.ts`
- `tests/interactions/highRisk.matrix.test.ts`

## Definition of done

- ทุก checkbox ถูกแปลงเป็น executable test หรือมี ADR/spec ระบุชัดว่าไม่ใช้
- ไม่มี `.skip`, `.todo` หรือ test ที่ assertion ไม่แตะผลลัพธ์หลัก
- full engine suite ผ่านอย่างน้อยสอง seed sets
- focused suites ผ่านพร้อม atomicity invariant
- fuzz 1,000 เกมและ identity 3–10 players ผ่านหลังเพิ่ม tests





## บั๊กที่พบใน engine (auto-generated)

เคสที่เขียนเทสตามข้อความใน catalog แล้ว engine ทำงานไม่ตรง — ปล่อยแดงไว้ตามนโยบาย ไม่แก้ `src/`

| Case | หัวข้อ | อาการ |
| --- | --- | --- |
| `G-CAOCAO-02` | `jianxiong`: ได้รับ damage จาก `juedou`, `nanman`, `wanjian` หรือการ์ดชนิดอื่นที่มี `sourceCardId` แล้วรับ phy | AssertionError: expected { zone: 'discardPile', …(1) } to deeply equal { zone: 'hand', ownerId: 'p0' } |
| `G-SIMAYI-02` | `fankui`: เลือก card ID ที่มีจริง; invalid ID ต้อง atomic reject | AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined |
| `G-ZHANGLIAO-05` | `tuxi`: reject ตัวเอง, ผู้ตาย, คนมือว่าง, duplicate target และมากกว่าสองเป้าหมาย | AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined |
| `G-GUOJIA-07` | `yiji`: invalid target/duplicate assignment ต้อง atomic reject | AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined |
| `G-ZHENJI-07` | `luoshen`: กองจั่วหมดต้องจบอย่างปลอดภัย ไม่ loop | Error: no cards left to judge with |
| `G-LIUBEI-04` | `rende`: HP เต็ม, target ตาย, target เป็นตนเอง และ invalid/duplicate card ID | AssertionError: a rejected answer must leave state byte-identical: expected { seed: 1004, seq: 2, …(10) } to d |
| `G-ZHUGELIANG-04` | `guandou`: หากกองจั่วมีไม่พอ ให้เปิดการ์ดที่เหลือในกองจั่วก่อน จากนั้นสับกองทิ้งเป็นกองจั่วใหม่และเปิดเพิ่มจนไ | AssertionError: expected 1 to be 3 // Object.is equality |
| `G-PANGTONG-03` | `juhui`: trick ถูก `wuxie` ยังนับ “ใช้” เพียงครั้งเดียว | Error: expected decision {"kind":"activateSkill","skillId":"pangtong_juhui"}, got mainAction@p0 {} |
| `G-SUNQUAN-02` | `zhiheng`: zero cards ไม่ทำอะไร; duplicate/unknown IDs atomic reject | AssertionError: a rejected answer must leave state byte-identical: expected { seed: 1203, seq: 2, …(10) } to d |
| `G-ZHOUYU-04` | `fanjian`: หลังเป้าหมายทาย ต้องเปิด physical card ที่เลือกให้ผู้ทายรับทราบไม่ว่าทายถูกหรือผิด | AssertionError: expected a log entry matching {"eventType":"skillUse","skillId":"zhouyu_fanjian","cardId":"spa |
| `G-ZHOUYU-08` | `fanjian`: invalid target/card, ใช้ซ้ำเทิร์นเดียว และ reset เทิร์นใหม่ | AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined |
| `G-ZHOUYU-09` | `fanjian`: suit ต้องดูจาก physical card ที่เลือกจริง; log/view ต้องเปิดเผย card ID, type, suit และ rank หลังทา | AssertionError: expected undefined to be 'heart_2_1' // Object.is equality |
| `G-GANNING-03` | `qixi`: ยังตรวจ target/zone และ `wuxie` ตาม `guohe` ปกติ | AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined |
| `G-SUNSHANGXIANG-02` | `jieyuan`: target HP เต็ม, target ตาย, target=self และการ์ดไม่ครบสองใบถูกปฏิเสธ | AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined |
| `G-SUNSHANGXIANG-03` | `jieyuan`: duplicate/invalid IDs atomic reject และใช้ได้ครั้งเดียวต่อเทิร์น | AssertionError: a rejected answer must leave state byte-identical: expected { seed: 1296, seq: 2, …(10) } to d |
| `G-SUNSHANGXIANG-05` | `jiehun`: equipment ถูกขโมย, ทิ้ง, ทำลาย หรือถูกแทนที่ต้อง trigger ครั้งต่อ physical card | Error: expected decision {"kind":"activateSkill","skillId":"sunshangxiang_jiehun"}, got mainAction@p1 {} |
| `G-LUXUN-04` | `lianying`: เสียหลายใบพร้อมกัน trigger เมื่อ transition non-empty -> empty เพียงครั้งเดียว | AssertionError: log entries matching {"eventType":"skillUse","skillId":"luxun_lianying"}: expected +0 to be 1  |
| `G-DIAOCHAN-02` | `lijian`: reject ผู้หญิง, ตนเอง, target ซ้ำ, ผู้ตาย, ไพ่ invalid และใช้ซ้ำในเทิร์น | AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined |
| `G-HUATUO-02` | `qingnang`: target HP เต็ม/ตาย, invalid card และใช้ซ้ำในเทิร์นถูกปฏิเสธ | AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined |
| `C-SHA-01` | เลือกหนึ่งเป้าหมายที่มีชีวิต อยู่ในระยะ และไม่ใช่ตนเอง | AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined |
| `C-WUZHONG-02` | ห้ามกำหนดเป้าหมายอื่น; กองจั่วเหลือน้อย/ว่างต้องปลอดภัย | AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined |
| `C-GUOHE-02` | target ไม่มีการ์ด, invalid/hidden card choice และ target=self ถูกปฏิเสธ | AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined |
| `C-SHUNSHOU-02` | นอกระยะ, target ว่าง/self และ Lu Xun immunity ถูกปฏิเสธ | AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined |
| `C-JUEDOU-03` | `wushuang`, converted `sha`, lord-supplied `sha`, death mid-loop และ `wuxie` | Error: expected decision {"kind":"activateSkill","skillId":"liubei_hujia"}, got respondSha@p1 {"opponentId":"p |
| `C-JIEDAO-04` | unarmed source, illegal victim, range, death, `wuxie` และ atomicity | AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined |
| `C-WANJIAN-02` | caster/dead skipped; ordering, `wuxie`, `hujia`, `bagua`, conversion และ death mid-loop | AssertionError: p1 hp: expected 3 to be 4 // Object.is equality |
| `C-WUGU-03` | duplicate/unknown choice atomic reject, ผู้เล่นตายกลาง resolution และกองมีไม่พอ | AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined |
| `E-ZHANGBA-01` | ใช้การ์ดมือสองใบแทน `sha` ทั้ง main action และ response | Error: juedou: heart_2_2 does not count as sha |
| `E-FANGTIAN-03` | target legality, duplicate targets, redirect และ AOE-like resolution order | AssertionError: expected this answer to be rejected, but it was accepted: expected undefined to be defined |
| `E-QILIN-03` | equipment-loss triggers และ distance recalculation หลังม้าหาย | Error: expected decision {"kind":"activateSkill","skillId":"sunshangxiang_jiehun"}, got mainAction@p0 {} |
