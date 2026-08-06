"""Create an identity-perfect square head portrait from a TKTW full-body PNG."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--crop-size", type=int, default=600)
    parser.add_argument("--left", type=int)
    parser.add_argument("--top", type=int, default=0)
    parser.add_argument("--output-size", type=int, default=1254)
    args = parser.parse_args()

    with Image.open(args.input) as source:
        image = source.convert("RGBA")
        crop_size = min(args.crop_size, image.width, image.height - args.top)
        centered_left = (image.width - crop_size) // 2
        left = centered_left if args.left is None else args.left
        left = max(0, min(left, image.width - crop_size))
        box = (left, args.top, left + crop_size, args.top + crop_size)
        portrait = image.crop(box).resize(
            (args.output_size, args.output_size), Image.Resampling.LANCZOS
        )
        args.output.parent.mkdir(parents=True, exist_ok=True)
        portrait.save(args.output, "PNG", optimize=True)


if __name__ == "__main__":
    main()
