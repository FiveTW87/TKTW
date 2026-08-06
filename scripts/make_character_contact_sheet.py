"""Build a compact QA contact sheet for transparent TKTW character assets."""

from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    parser.add_argument("inputs", nargs="+", type=Path)
    parser.add_argument("--columns", type=int, default=9)
    parser.add_argument("--cell-width", type=int, default=160)
    parser.add_argument("--cell-height", type=int, default=210)
    args = parser.parse_args()

    rows = math.ceil(len(args.inputs) / args.columns)
    sheet = Image.new(
        "RGB",
        (args.columns * args.cell_width, rows * args.cell_height),
        (18, 18, 20),
    )
    draw = ImageDraw.Draw(sheet)

    for index, path in enumerate(args.inputs):
        x = (index % args.columns) * args.cell_width
        y = (index // args.columns) * args.cell_height
        with Image.open(path) as source:
            rgba = source.convert("RGBA")
            thumb = ImageOps.contain(
                rgba,
                (args.cell_width - 8, args.cell_height - 26),
                Image.Resampling.LANCZOS,
            )
            tile = Image.new("RGBA", thumb.size, (18, 18, 20, 255))
            tile.alpha_composite(thumb)
            sheet.paste(tile.convert("RGB"), (x + (args.cell_width - thumb.width) // 2, y + 2))
        label = path.stem.replace("_head", "")
        draw.text((x + 4, y + args.cell_height - 20), label, fill=(235, 235, 235))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output, "JPEG", quality=92)


if __name__ == "__main__":
    main()
