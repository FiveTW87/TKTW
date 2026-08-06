"""Extract a generated character from a baked light checkerboard, including holes."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path
from statistics import pstdev

from PIL import Image, ImageFilter


def is_candidate(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, _ = pixel
    return min(red, green, blue) >= 232 and max(red, green, blue) - min(red, green, blue) <= 12


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    with Image.open(args.input) as source:
        image = source.convert("RGBA")
        width, height = image.size
        pixels = image.load()
        seen = bytearray(width * height)
        remove = bytearray(width * height)

        for start_y in range(height):
            for start_x in range(width):
                start_index = start_y * width + start_x
                if seen[start_index] or not is_candidate(pixels[start_x, start_y]):
                    continue

                queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
                seen[start_index] = 1
                component: list[int] = []
                values: list[float] = []
                touches_edge = False

                while queue:
                    x, y = queue.popleft()
                    index = y * width + x
                    component.append(index)
                    red, green, blue, _ = pixels[x, y]
                    values.append((red + green + blue) / 3)
                    touches_edge |= x == 0 or y == 0 or x == width - 1 or y == height - 1
                    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                        if nx < 0 or ny < 0 or nx >= width or ny >= height:
                            continue
                        neighbor = ny * width + nx
                        if not seen[neighbor] and is_candidate(pixels[nx, ny]):
                            seen[neighbor] = 1
                            queue.append((nx, ny))

                # The main exterior always touches an edge. Enclosed checkerboard
                # holes are broad, nearly neutral, low-variance regions. Bright
                # silk/metal highlights fragment into smaller or higher-variance
                # components and remain opaque.
                mean = sum(values) / len(values)
                background_hole = len(component) >= 80 and mean >= 241 and pstdev(values) <= 5.5
                if touches_edge or background_hole:
                    for index in component:
                        remove[index] = 1

        mask = Image.new("L", (width, height), 0)
        mask.putdata([255 if value else 0 for value in remove])
        # Contract the silhouette edge by one pixel to eliminate the pale
        # checkerboard fringe, then retain a narrow antialiased transition.
        mask = mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.35))
        image.putalpha(mask.point(lambda value: 255 - value))
        args.output.parent.mkdir(parents=True, exist_ok=True)
        image.save(args.output, "PNG", optimize=True)


if __name__ == "__main__":
    main()
