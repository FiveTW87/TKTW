"""Normalize a TKTW faction background to the locked opaque 1086x1448 canvas."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageOps


TARGET = (1086, 1448)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    with Image.open(args.input) as source:
        image = ImageOps.fit(
            source.convert("RGB"),
            TARGET,
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        )
        args.output.parent.mkdir(parents=True, exist_ok=True)
        image.save(args.output, "PNG", optimize=True)


if __name__ == "__main__":
    main()
