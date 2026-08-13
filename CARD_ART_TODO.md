# Card Art TODO

## Style masters — check these four first

Before generating, approving, or integrating any card artwork, compare it with the master for its card type.

- [x] Basic card master: `packages/client/public/assets/cards/sha.png`
- [x] Trick card master: `packages/client/public/assets/cards/wuzhong.png`
- [x] Weapon card master: `packages/client/public/assets/cards/qinglong.png`
- [x] Horse card master: `packages/client/public/assets/cards/horse_chitu.png`
- [x] Armor master: `packages/client/public/assets/cards/bagua.png` approved

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
- [x] `shan` — approved; paired visual response to `sha`
- [x] `tao` — approved; three ink-painted peaches in a woven basket

## Trick cards

- [x] `wuzhong` — master approved
- [x] `guohe` — approved; ink-silhouette commander cuts the bridge behind him
- [x] `shunshou` — approved; clean-robed ink thief flees carrying a whole lamb and tied loot sack
- [x] `juedou` — approved; Guan Yu-inspired decisive duel beside a still-warm cup of wine
- [x] `jiedao` — approved; two-scene Zhou Yu deception flowing into Cao Cao's execution order
- [x] `nanman` — approved; Meng Huo leads a southern elephant charge with rattan-shield warriors
- [x] `wanjian` — approved
- [x] `taoyuan` — approved; three sworn companions raise cups beneath a peach tree
- [x] `wugu` — approved; grain stores distribute five harvests to the people
- [x] `wuxie` — approved
- [x] `lebusishu` — approved
- [x] `shandian` — approved

## Weapon cards

- [x] `qinglong` — master approved
- [x] `crossbow` — approved repeating crossbow with visible magazine and lever
- [x] `sword_yy` — approved paired dark-and-silver jian
- [x] `sword_ice` — approved cold-forged jian with restrained frost
- [x] `sword_qinggang` — approved armor-piercing Qinggang sword
- [x] `zhangba` — approved serpent spear with one coiling ink snake
- [x] `guanshi` — approved stone-cleaving axe splitting a natural boulder
- [x] `fangtian` — approved full polearm with exactly three primary ink strokes; no Lu Bu figure
- [x] `qilin` — approved Qilin bow

## Armor cards

- [x] `bagua` — armor master approved
- [x] `renwang` — approved; massive royal lamellar armor with a colossal guardian silhouette

## Horse cards

- [x] `horse_chitu` — master approved
- [x] `horse_dilu` — approved pale Dilu leaping a stream
- [x] `horse_zhaohuang` — approved golden Zhaohuang at dawn
- [x] `horse_jueying` — approved black Jueying shedding its shadow
- [x] `horse_dawan` — approved chestnut Dayuan horse on the western road
- [x] `horse_zixing` — approved purple-black steed at dusk

## Integration and validation

- [x] Generate and approve all remaining canonical card images
- [ ] Optimize file sizes while preserving card-display quality
- [x] Add the canonical artwork mapping to the client
- [ ] Verify crop and readability in hand, discard pile, equipment slots, dialogs, and enlarged preview
- [ ] Test at 1280 × 630 and common desktop resolutions
- [x] Run client tests and production build
- [x] Commit only approved canonical artwork and required mapping changes
