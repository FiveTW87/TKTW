# TKTW Character Art Manifest

## Locked project rules

- Output filenames use English snake_case.
- Full body: 1086 x 1448 PNG with a real alpha channel.
- Head portrait: 1254 x 1254 PNG cropped from the matching full-body image; never redrawn.
- Final files must be immediately usable as isolated Unity assets: RGBA PNG, fully transparent outside the character silhouette, and no background-removal step after delivery.
- Every pixel outside the character or chest-up portrait silhouette must have alpha 0. No white, black, gray, checkerboard, gradient, studio, environment, sky, floor, shadow, fog, glow, frame, border, or backlight may be baked into the final asset.
- Flat chroma-key images are production intermediates only and must never be delivered in `image/`.
- Camera: standardized 3/4 front view, neutral standing pose, whole body and feet visible.
- Cao Cao is the baseline for apparent character height, camera distance, proportions, lighting, and material quality.
- Faction palettes: Wei = deep blue, Shu = deep green, Wu = deep red.
- Qun/Independent has no locked faction color; each character uses a personality-led palette.
- Faction animal motifs remain small armor, belt, or accessory accents.
- Shu faction animal lock: every Shu character carries one readable green-jade Chinese dragon roundel with a restrained metal rim, normally integrated into the belt, sash, or waist armor. Personal weapon symbols remain unchanged.

## Weapon rules

- Every character includes a recognizable signature weapon informed by Three Kingdoms tradition and established game portrayals.
- The weapon is part of the isolated character asset and uses the same painting quality, material response, and lighting.
- The complete weapon must remain visible inside the canvas with safe margin; no crop, clipping, body intersection, duplicate weapon, or malformed grip.
- The weapon is held, rested, or sheathed naturally according to personality and neutral idle posture.
- Closely related weapon types must still have clearly distinct silhouettes when reduced to card size.

## Filename normalization

| Existing filename | English filename |
| --- | --- |
| `chocho.png` | `cao_cao.png` |
| `chocho_head.png` | `cao_cao_head.png` |
| `กุยแก.png` | `guo_jia.png` |
| `สุมาอี้.png` | `sima_yi.png` |
| `เคาทู.png` | `xu_chu.png` |
| `เตียนอุย.png` | `dian_wei.png` |
| `เตียวเลี้ยว.png` | `zhang_liao.png` |
| `แฮหัวตุ้น.png` | `xiahou_dun.png` |

## Game roster (25)

- Wei: Cao Cao, Sima Yi, Xiahou Dun, Cao Ren, Zhang Liao, Guo Jia, Zhen Ji.
- Shu: Liu Bei, Guan Yu, Zhang Fei, Zhao Yun, Ma Chao, Zhuge Liang, Pang Tong.
- Wu: Sun Quan, Zhou Yu, Gan Ning, Lu Meng, Huang Gai, Da Qiao, Sun Shangxiang, Lu Xun.
- Qun/Independent: Lu Bu, Diao Chan, Hua Tuo.

## Existing bonus characters

- Xu Chu
- Dian Wei

## Signature weapon map

| Faction | Character | Final signature weapon / presentation |
| --- | --- | --- |
| Wei | Cao Cao | General's straight sword, point-down idle hold |
| Wei | Sima Yi | Black horsehair command whisk |
| Wei | Xiahou Dun | Heavy podao, original point-down pose, cutting curve outward |
| Wei | Cao Ren | Tower shield and sheathed commander sword |
| Wei | Zhang Liao | Intentional paired short crescent ji halberds |
| Wei | Guo Jia | Secured orb-and-scepter |
| Wei | Zhen Ji | Black-lacquer folding fan |
| Wei bonus | Xu Chu | Colossal cylindrical iron war club |
| Wei bonus | Dian Wei | Intentional paired war axes |
| Shu | Liu Bei | Intentional twin straight swords, one sheathed |
| Shu | Guan Yu | Green Dragon Crescent Blade, upright with blade above |
| Shu | Zhang Fei | Zhangba Serpent Spear with narrow wavy spearhead |
| Shu | Zhao Yun | Silver spear with white tassel |
| Shu | Ma Chao | Hooked cavalry lance |
| Shu | Zhuge Liang | White crane-feather command fan |
| Shu | Pang Tong | Phoenix-headed walking staff |
| Wu | Sun Quan | Flame-edged imperial dao, fully sheathed at hip |
| Wu | Zhou Yu | Elegant straight jian |
| Wu | Gan Ning | Chain-and-sickle assembly |
| Wu | Lu Meng | Hooked command pike, resting across shoulder |
| Wu | Huang Gai | Heavy anchor-headed iron war club |
| Wu | Da Qiao | Intentional paired war fans |
| Wu | Sun Shangxiang | Intentional paired ring blades |
| Wu | Lu Xun | Intentional paired short straight swords |
| Independent | Lu Bu | Fangtian halberd and iconic paired red cockscomb plumes |
| Independent | Diao Chan | Neatly looped chain whip |
| Independent | Hua Tuo | Medicinal staff with secured herb gourd |

## Final QA status

- 27 full-body assets: 1086 x 1448, RGBA PNG, transparent top corners.
- 27 identity-perfect chest-up crops: 1254 x 1254, RGBA PNG, derived only from the matching final full-body asset.
- Lu Bu uses an approved tighter head-and-shoulders crop so his face remains readable at table-avatar size; the long red plumes may leave the portrait frame.
- All final filenames are English snake_case.
- Full-body weapon silhouettes were checked together on a dark contact sheet for crop, margin, pose variety, and faction consistency.

## Faction backgrounds

- Backgrounds are separate opaque game assets at 1086 x 1448 PNG, with no character, text, logo, border, card frame, or UI.
- The central composition remains visually calm so a full-body character can be layered over the scene.
- `backgrounds/wei_background.png`: deep-blue imperial fortress courtyard with restrained tiger motifs.
- `backgrounds/shu_background.png`: deep-green mountain sanctuary with bamboo and distant pavilions.
- `backgrounds/wu_background.png`: deep-red riverfront palace terrace at sunset with restrained phoenix motifs.
- `backgrounds/independent_background.png`: color-independent ruined frontier crossroads and mountain pass.
- Plain variants keep the center empty and move faction identity into the ornamental perimeter.
- `backgrounds/wei_background_plain.png`: deep-blue plain panel with tiger relief border.
- `backgrounds/shu_background_plain.png`: deep-green plain panel with dragon and cloud border.
- `backgrounds/wu_background_plain.png`: deep-red plain panel with phoenix-feather border.
- `backgrounds/independent_background_plain.png`: neutral plain panel with rugged lone-wolf border and no locked faction color.
