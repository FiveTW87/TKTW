# Card Art TODO

## Style masters — check these four first

Before generating, approving, or integrating any card artwork, compare it with the master for its card type.

- [x] Basic card master: `packages/client/public/assets/cards/sha.png`
- [x] Trick card master: `packages/client/public/assets/cards/wuzhong.png`
- [x] Weapon card master: `packages/client/public/assets/cards/qinglong.png`
- [x] Horse card master: `packages/client/public/assets/cards/horse_chitu.png`
- [ ] Armor master: create and approve the first armor artwork before producing the second armor card

### Review checklist for every artwork

- [ ] Matches the appropriate master: aged warm rice paper, sumi ink, restrained accent color, flowing calligraphic motion
- [ ] Main subject and card effect remain readable at approximately 76 × 108 px
- [ ] Full subject is visible with safe space for rank, suit, title, and rules UI
- [ ] Anatomy or weapon construction is believable; no extra limbs, objects, or malformed joins
- [ ] Contains no card frame, UI, text, numbers, suit marks, logo, or watermark
- [ ] Approved version is copied to the canonical `<card_key>.png` filename
- [ ] Draft versions are not committed unless specifically needed for review history

## Basic cards

- [x] `sha` — master approved
- [ ] `shan`
- [ ] `tao`

## Trick cards

- [x] `wuzhong` — master approved
- [ ] `guohe`
- [ ] `shunshou`
- [ ] `juedou`
- [ ] `jiedao`
- [ ] `nanman`
- [ ] `wanjian`
- [ ] `taoyuan`
- [ ] `wugu`
- [ ] `wuxie`
- [ ] `lebusishu`
- [ ] `shandian`

## Weapon cards

- [x] `qinglong` — master approved
- [ ] `crossbow`
- [ ] `sword_yy`
- [ ] `sword_ice`
- [ ] `sword_qinggang`
- [ ] `zhangba`
- [ ] `guanshi`
- [ ] `fangtian`
- [ ] `qilin`

## Armor cards

- [ ] `bagua` — use to establish the armor master
- [ ] `renwang`

## Horse cards

- [x] `horse_chitu` — master approved
- [ ] `horse_dilu`
- [ ] `horse_zhaohuang`
- [ ] `horse_jueying`
- [ ] `horse_dawan`
- [ ] `horse_zixing`

## Integration and validation

- [ ] Generate and approve all remaining canonical card images
- [ ] Optimize file sizes while preserving card-display quality
- [ ] Add the canonical artwork mapping to the client
- [ ] Verify crop and readability in hand, discard pile, equipment slots, dialogs, and enlarged preview
- [ ] Test at 1280 × 630 and common desktop resolutions
- [ ] Run client tests and production build
- [ ] Commit only approved canonical artwork and required mapping changes
