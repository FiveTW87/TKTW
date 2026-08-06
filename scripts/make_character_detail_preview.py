"""Composite an unchanged transparent character onto a 3:4 detail backdrop."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageOps


TARGET = (1536, 2048)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("background", type=Path)
    parser.add_argument("character", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    with Image.open(args.background) as source:
        backdrop = ImageOps.fit(
            source.convert("RGB"),
            TARGET,
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        ).convert("RGBA")

    with Image.open(args.character) as source:
        character = source.convert("RGBA")

    left = (TARGET[0] - character.width) // 2
    top = (TARGET[1] - character.height) // 2
    backdrop.alpha_composite(character, (left, top))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    backdrop.convert("RGB").save(args.output, "PNG", optimize=True)


if __name__ == "__main__":
    main()
