"""Erzeugt public/watermark.png (Kachel für das Wasserzeichen) und die PWA-Icons."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent / "public"
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
]


def font(size):
    for p in FONT_CANDIDATES:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default(size)


def watermark():
    # Kachel 520x300, Text schräg, weiß mit dunkler Kontur -> auf hellen und dunklen Bildern sichtbar.
    tile = Image.new("RGBA", (520, 300), (0, 0, 0, 0))
    layer = Image.new("RGBA", (640, 200), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.text((320, 70), "VORSCHAU", font=font(64), fill=(255, 255, 255, 235),
           stroke_width=4, stroke_fill=(0, 0, 0, 200), anchor="mm")
    d.text((320, 140), "innenleben · gratis", font=font(30), fill=(255, 255, 255, 220),
           stroke_width=3, stroke_fill=(0, 0, 0, 180), anchor="mm")
    layer = layer.rotate(25, expand=True, resample=Image.BICUBIC)
    tile.alpha_composite(layer, ((520 - layer.width) // 2, (300 - layer.height) // 2))
    tile.save(ROOT / "watermark.png", optimize=True)


def icon(size, maskable=False):
    img = Image.new("RGB", (size, size), (18, 16, 24))
    d = ImageDraw.Draw(img)
    pad = size * (0.22 if maskable else 0.12)
    box = [pad, pad, size - pad, size - pad]
    d.ellipse(box, outline=(232, 170, 90), width=max(2, size // 24))
    # angedeutetes Zahnrad / Blick ins Innere
    c = size / 2
    r = (size - 2 * pad) / 4
    d.ellipse([c - r, c - r, c + r, c + r], fill=(232, 170, 90))
    d.ellipse([c - r / 2.4, c - r / 2.4, c + r / 2.4, c + r / 2.4], fill=(18, 16, 24))
    name = f"icon-{size}{'-maskable' if maskable else ''}.png"
    img.save(ROOT / "icons" / name, optimize=True)


if __name__ == "__main__":
    (ROOT / "icons").mkdir(parents=True, exist_ok=True)
    watermark()
    for s in (192, 512):
        icon(s)
    icon(512, maskable=True)
    print("ok")
