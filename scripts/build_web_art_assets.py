"""Build lightweight web derivatives from the approved character PNGs."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "image"
PUBLIC = ROOT / "packages" / "client" / "public" / "assets"


def save_webp(source: Path, destination: Path, max_size: tuple[int, int], quality: int) -> None:
    if destination.exists() and destination.stat().st_size > 0:
        return
    with Image.open(source) as opened:
        image = opened.convert("RGBA")
        image.thumbnail(max_size, Image.Resampling.LANCZOS)
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, "WEBP", quality=quality, method=4, exact=True)


def main() -> None:
    generals_dir = PUBLIC / "generals"
    for source in sorted(SOURCE.glob("*.png")):
        is_head = source.stem.endswith("_head")
        max_size = (512, 512) if is_head else (900, 1200)
        save_webp(source, generals_dir / f"{source.stem}.webp", max_size, quality=88)

    factions_dir = PUBLIC / "factions"
    for source in sorted((SOURCE / "backgrounds").glob("*_background.png")):
        save_webp(source, factions_dir / f"{source.stem}.webp", (1280, 1707), quality=84)


if __name__ == "__main__":
    main()
