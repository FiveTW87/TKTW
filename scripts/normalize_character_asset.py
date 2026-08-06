"""Normalize a transparent TKTW full-body asset to the locked 1086x1448 canvas."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


TARGET = (1086, 1448)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    with Image.open(args.input) as source:
        image = source.convert("RGBA")
        image.thumbnail(TARGET, Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", TARGET, (0, 0, 0, 0))
        left = (TARGET[0] - image.width) // 2
        top = (TARGET[1] - image.height) // 2
        canvas.alpha_composite(image, (left, top))
        args.output.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(args.output, "PNG", optimize=True)


if __name__ == "__main__":
    main()
