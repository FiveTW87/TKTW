"""Remove the edge-connected light checkerboard baked into legacy TKTW art."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


def is_background(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, _ = pixel
    return min(red, green, blue) >= 225 and max(red, green, blue) - min(red, green, blue) <= 14


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    with Image.open(args.input) as source:
        image = source.convert("RGBA")
        width, height = image.size
        pixels = image.load()
        visited = bytearray(width * height)
        queue: deque[tuple[int, int]] = deque()

        def enqueue(x: int, y: int) -> None:
            index = y * width + x
            if not visited[index] and is_background(pixels[x, y]):
                visited[index] = 1
                queue.append((x, y))

        for x in range(width):
            enqueue(x, 0)
            enqueue(x, height - 1)
        for y in range(height):
            enqueue(0, y)
            enqueue(width - 1, y)

        while queue:
            x, y = queue.popleft()
            if x > 0:
                enqueue(x - 1, y)
            if x + 1 < width:
                enqueue(x + 1, y)
            if y > 0:
                enqueue(x, y - 1)
            if y + 1 < height:
                enqueue(x, y + 1)

        background = Image.new("L", (width, height), 0)
        background.putdata([255 if value else 0 for value in visited])
        # A slight blur preserves antialiased silhouette edges without retaining
        # the checkerboard as a visible fringe.
        background = background.filter(ImageFilter.GaussianBlur(0.45))
        alpha = background.point(lambda value: 255 - value)
        image.putalpha(alpha)

        args.output.parent.mkdir(parents=True, exist_ok=True)
        image.save(args.output, "PNG", optimize=True)


if __name__ == "__main__":
    main()
