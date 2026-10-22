"""Gera as obras procedurais locais usadas pelo catálogo (determinístico).

Uso: python scripts/generate-art.py  (requer Pillow e numpy)
Saída: public/images/nfts/art-01..12.webp (600x600) e public/images/hero.webp (1200x1200).
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "images"
NFT_OUT = OUT / "nfts"

PALETTES = [
    ["#0B0706", "#3B1A0E", "#F26B1D", "#FFB36B", "#F8F0D8"],
    ["#120A12", "#4B1D3F", "#E2557B", "#FF9F6B", "#FCE7C8"],
    ["#06100F", "#0F3B3A", "#1FA39A", "#F2C14E", "#F8F0D8"],
    ["#0A0A14", "#1E2A5A", "#4F7CFF", "#FF7A1A", "#EDE6FF"],
    ["#100806", "#5A2410", "#C2410C", "#FBBF24", "#FFF7E6"],
    ["#0B0B0B", "#2B2B2B", "#A3A3A3", "#FF7A1A", "#FAFAFA"],
]


def hex_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def gradient(size: int, top: str, bottom: str, rng: np.random.Generator) -> Image.Image:
    t = np.linspace(0, 1, size)[:, None]
    a, b = np.array(hex_rgb(top)), np.array(hex_rgb(bottom))
    angle = rng.uniform(0, np.pi)
    xs = np.linspace(0, 1, size)[None, :]
    mix = np.clip(t * np.cos(angle) ** 2 + xs * np.sin(angle) ** 2, 0, 1)
    arr = a * (1 - mix[..., None]) + b * mix[..., None]
    return Image.fromarray(arr.astype(np.uint8), "RGB")


def grain(img: Image.Image, rng: np.random.Generator, amount: float = 2.5) -> Image.Image:
    arr = np.asarray(img).astype(np.float32)
    arr += rng.normal(0, amount, arr.shape[:2])[..., None]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def style_orbs(draw, size, pal, rng):
    for _ in range(9):
        r = rng.uniform(0.08, 0.32) * size
        x, y = rng.uniform(0, size, 2)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=pal[rng.integers(2, 5)])


def style_rings(draw, size, pal, rng):
    cx, cy = rng.uniform(0.3, 0.7, 2) * size
    for i, r in enumerate(np.linspace(size * 0.7, size * 0.05, 14)):
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=pal[1 + i % 4])


def style_waves(draw, size, pal, rng):
    freq = rng.uniform(1.5, 3.5)
    for i in range(12):
        base = size * (i + 1) / 13
        pts = [(x, base + np.sin(x / size * np.pi * freq + i) * size * 0.06) for x in range(0, size + 10, 10)]
        draw.line(pts, fill=pal[2 + i % 3], width=int(size * 0.025))


def style_blocks(draw, size, pal, rng):
    cells = 6
    step = size / cells
    for gx in range(cells):
        for gy in range(cells):
            if rng.random() < 0.55:
                x0, y0 = gx * step, gy * step
                shape = rng.integers(0, 3)
                color = pal[rng.integers(1, 5)]
                if shape == 0:
                    draw.rectangle([x0 + 4, y0 + 4, x0 + step - 4, y0 + step - 4], fill=color)
                elif shape == 1:
                    draw.ellipse([x0 + 6, y0 + 6, x0 + step - 6, y0 + step - 6], fill=color)
                else:
                    draw.pieslice([x0, y0, x0 + 2 * step, y0 + 2 * step], 180, 270, fill=color)


def style_sun(draw, size, pal, rng):
    horizon = size * rng.uniform(0.55, 0.7)
    r = size * 0.28
    cx = size / 2
    draw.ellipse([cx - r, horizon - r, cx + r, horizon + r], fill=pal[3])
    for i in range(7):
        y = horizon + i * size * 0.05
        draw.rectangle([0, y, size, y + size * 0.018], fill=pal[0])
    draw.rectangle([0, horizon + r * 0.15, size, size], fill=pal[1])
    for i in range(6):
        x = size * rng.uniform(0, 1)
        h = size * rng.uniform(0.1, 0.3)
        draw.polygon([(x - h * 0.6, horizon + r * 0.15), (x, horizon + r * 0.15 - h), (x + h * 0.6, horizon + r * 0.15)], fill=pal[0])


def style_mask(draw, size, pal, rng):
    cx, cy = size / 2, size * 0.52
    draw.ellipse([cx - size * 0.3, cy - size * 0.36, cx + size * 0.3, cy + size * 0.36], fill=pal[2])
    draw.ellipse([cx - size * 0.22, cy - size * 0.1, cx - size * 0.06, cy + size * 0.02], fill=pal[0])
    draw.ellipse([cx + size * 0.06, cy - size * 0.1, cx + size * 0.22, cy + size * 0.02], fill=pal[0])
    draw.ellipse([cx - size * 0.17, cy - size * 0.07, cx - size * 0.11, cy - size * 0.01], fill=pal[4])
    draw.ellipse([cx + size * 0.11, cy - size * 0.07, cx + size * 0.17, cy - size * 0.01], fill=pal[4])
    draw.arc([cx - size * 0.14, cy + size * 0.05, cx + size * 0.14, cy + size * 0.22], 20, 160, fill=pal[0], width=int(size * 0.025))
    for i in range(5):
        a = np.pi * (0.15 + 0.175 * i)
        draw.line([(cx, cy), (cx + np.cos(a + np.pi) * size, cy + np.sin(a + np.pi) * size)], fill=pal[3], width=int(size * 0.012))


STYLES = [style_orbs, style_rings, style_waves, style_blocks, style_sun, style_mask]


def artwork(index: int, size: int = 600) -> Image.Image:
    rng = np.random.default_rng(1000 + index)
    pal = PALETTES[index % len(PALETTES)]
    img = gradient(size, pal[0], pal[1], rng)
    layer = Image.new("RGB", (size, size))
    layer.paste(img)
    draw = ImageDraw.Draw(layer)
    STYLES[index % len(STYLES)](draw, size, pal, rng)
    blurred = layer.filter(ImageFilter.GaussianBlur(size * 0.004))
    return grain(blurred, rng)


def hero(size: int = 1200) -> Image.Image:
    rng = np.random.default_rng(7)
    pal = PALETTES[0]
    img = gradient(size, "#140C0A", "#3B1A0E", rng)
    draw = ImageDraw.Draw(img)
    cx, cy = size * 0.55, size * 0.45
    rings = ["#1C120E", "#3B1A0E", "#7A2E0E", "#C2410C", "#F26B1D", "#FF9A4D", "#FFC58F"]
    for i, r in enumerate(np.linspace(size * 0.62, size * 0.12, 16)):
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=rings[min(i // 2, len(rings) - 1)])
    horizon = size * 0.72
    draw.rectangle([0, horizon, size, size], fill="#0B0706")
    for i in range(10):
        y = horizon + (i + 1) ** 1.6 * size * 0.006
        draw.line([(0, y), (size, y)], fill="#F26B1D", width=2)
    for i in range(-8, 9):
        draw.line([(cx, horizon), (cx + i * size * 0.18, size)], fill="#7A2E0E", width=2)
    glow = Image.new("RGB", (size, size), (0, 0, 0))
    ImageDraw.Draw(glow).ellipse([size * 0.1, size * 0.1, size * 0.9, size * 0.9], fill=hex_rgb(pal[2]))
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.12))
    img = Image.blend(img, Image.composite(glow, img, glow.convert("L")), 0.25)
    return grain(img, rng, 2)


def main() -> None:
    NFT_OUT.mkdir(parents=True, exist_ok=True)
    for i in range(12):
        artwork(i).save(NFT_OUT / f"art-{i + 1:02d}.webp", "WEBP", quality=78, method=6)
    hero().save(OUT / "hero.webp", "WEBP", quality=74, method=6)
    hero().resize((640, 640), Image.LANCZOS).save(OUT / "hero-640.webp", "WEBP", quality=72, method=6)


if __name__ == "__main__":
    main()
