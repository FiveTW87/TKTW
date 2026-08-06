"""Create actual-size player-card mockups for testing head portrait readability."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


CHARACTERS = [
    "cao_cao",
    "sima_yi",
    "cao_ren",
    "zhang_liao",
    "liu_bei",
    "pang_tong",
    "sun_quan",
    "zhou_yu",
    "lu_xun",
    "lu_bu",
]


def crop_head(path: Path) -> Image.Image:
    with Image.open(path) as source:
        image = source.convert("RGBA")

    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError(f"No visible portrait pixels in {path}")

    left, top, right, bottom = bbox
    height = bottom - top
    side = max(1, round(height * 0.52))
    center_x = (left + right) // 2
    crop_left = max(0, min(image.width - side, center_x - side // 2))
    crop_top = max(0, min(image.height - side, top - round(side * 0.02)))
    return image.crop((crop_left, crop_top, crop_left + side, crop_top + side))


def paste_portrait(
    target: Image.Image,
    portrait_path: Path,
    box: tuple[int, int, int, int],
    radius: int = 5,
) -> None:
    x0, y0, x1, y1 = box
    size = (x1 - x0, y1 - y0)
    portrait = ImageOps.fit(
        crop_head(portrait_path),
        size,
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.44),
    )
    tile = Image.new("RGBA", size, (43, 29, 19, 255))
    tile.alpha_composite(portrait)
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius, fill=255)
    target.paste(tile, (x0, y0), mask)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    filename = "arialbd.ttf" if bold else "arial.ttf"
    path = Path("C:/Windows/Fonts") / filename
    try:
        return ImageFont.truetype(path, size=size)
    except OSError:
        return ImageFont.load_default()


def make_screen_preview(screen_path: Path, image_dir: Path, output: Path) -> None:
    with Image.open(screen_path) as source:
        screen = source.convert("RGBA")

    placements = [
        ("cao_cao", (814, 20, 858, 72)),
        ("sima_yi", (550, 146, 609, 213)),
        ("sun_quan", (1492, 146, 1550, 213)),
        ("liu_bei", (486, 694, 560, 787)),
    ]
    for name, box in placements:
        paste_portrait(screen, image_dir / f"{name}_head.png", box)

    output.parent.mkdir(parents=True, exist_ok=True)
    screen.convert("RGB").save(output, "PNG", optimize=True)


def make_ten_player_grid(card_path: Path, image_dir: Path, output: Path) -> None:
    with Image.open(card_path) as source:
        template = source.convert("RGBA")

    card_width, card_height = template.size
    label_height = 24
    padding = 8
    columns = 5
    rows = 2
    canvas = Image.new(
        "RGB",
        (
            padding + columns * (card_width + padding),
            padding + rows * (card_height + label_height + padding),
        ),
        (18, 12, 8),
    )
    draw = ImageDraw.Draw(canvas)
    label_font = load_font(13, bold=True)

    for index, name in enumerate(CHARACTERS):
        card = template.copy()
        paste_portrait(card, image_dir / f"{name}_head.png", (25, 19, 88, 90), radius=6)

        # Restore the rank badge and green distance badge above the portrait.
        card.alpha_composite(template.crop((27, 20, 50, 44)), (27, 20))
        card.alpha_composite(template.crop((23, 78, 65, 96)), (23, 78))

        column = index % columns
        row = index // columns
        x = padding + column * (card_width + padding)
        y = padding + row * (card_height + label_height + padding)
        canvas.paste(card.convert("RGB"), (x, y))
        label = name.replace("_", " ").title()
        draw.text((x + 4, y + card_height + 3), label, font=label_font, fill=(245, 222, 165))

    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, "PNG", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("screen", type=Path)
    parser.add_argument("card", type=Path)
    parser.add_argument("image_dir", type=Path)
    parser.add_argument("screen_output", type=Path)
    parser.add_argument("grid_output", type=Path)
    args = parser.parse_args()

    make_screen_preview(args.screen, args.image_dir, args.screen_output)
    make_ten_player_grid(args.card, args.image_dir, args.grid_output)


if __name__ == "__main__":
    main()
