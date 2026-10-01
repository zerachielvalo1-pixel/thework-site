"""Regenerate The Work's brand logo assets at display-appropriate sizes.

The source logo-tw.png is 2534x1560 but is rendered at 26-30 CSS px in the
header/footer, so serving the original wastes ~100 KB of bandwidth and ~15 MB
of decoded bitmap memory on every mobile page load.

Outputs:
  logo-tw-64.webp / logo-tw-64.png    header + footer mark (30px @2x, 26px @2x)
  logo-tw-128.webp / logo-tw-128.png  high-DPI / large-brand usage
  logo-tw.png                          recompressed 1200px OG / schema.org asset
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "logo-tw.png")

# Keep a pristine copy the first time this runs so the script is re-runnable.
MASTER = os.path.join(HERE, "logo-tw.master.png")


def report(path):
    px = Image.open(path).size
    print(f"  {os.path.basename(path):<22} {px[0]:>5}x{px[1]:<5} {os.path.getsize(path):>7,} bytes")


def main():
    if not os.path.exists(MASTER):
        Image.open(SRC).save(MASTER)
        print(f"Saved master -> {os.path.relpath(MASTER, ROOT)}")

    master = Image.open(MASTER).convert("RGBA")

    # Trim uniform transparent margins so the mark fills its box exactly.
    bbox = master.split()[-1].getbbox()
    if bbox:
        trimmed = master.crop(bbox)
        print(f"Trimmed transparent margin: {master.size} -> {trimmed.size}")
        master = trimmed

    print("\nGenerated:")
    for width in (64, 128):
        height = round(master.height * width / master.width)
        resized = master.resize((width, height), Image.LANCZOS)

        png_path = os.path.join(ROOT, f"logo-tw-{width}.png")
        # optimize=True + max compression squeezes flat line art hard.
        resized.save(png_path, "PNG", optimize=True, compress_level=9)
        report(png_path)

        webp_path = os.path.join(ROOT, f"logo-tw-{width}.webp")
        resized.save(webp_path, "WEBP", quality=88, method=6)
        report(webp_path)

    # The original path is referenced by og:image, JSON-LD and the prerender
    # worker, so keep the filename but shrink it to a sane social-card size.
    og = master.resize((1200, round(master.height * 1200 / master.width)), Image.LANCZOS)
    og.save(SRC, "PNG", optimize=True, compress_level=9)
    report(SRC)

    make_app_icons(master)


def make_app_icons(master):
    """Home-screen / PWA icons: white mark on the brand purple, like the favicon."""
    from PIL import ImageDraw

    print("\nApp icons:")
    # Invert the black line art to white so it reads on the purple field.
    white = Image.new("RGBA", master.size, (0, 0, 0, 0))
    white.paste(master)
    alpha = master.split()[-1]
    white_mark = Image.new("RGBA", master.size, (250, 248, 255, 255))
    white_mark.putalpha(alpha)

    for size in (192, 512):
        # `maskable` icons get cropped to a circle by Android, so the glyph is
        # kept inside the inner 60% safe zone.
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        draw.rounded_rectangle(
            [(0, 0), (size - 1, size - 1)],
            radius=round(size * 0.18),
            fill=(124, 58, 237, 255),
        )

        glyph_w = round(size * 0.58)
        glyph_h = round(master.height * glyph_w / master.width)
        glyph = white_mark.resize((glyph_w, glyph_h), Image.LANCZOS)
        canvas.alpha_composite(glyph, ((size - glyph_w) // 2, (size - glyph_h) // 2))

        path = os.path.join(ROOT, f"icon-{size}.png")
        canvas.save(path, "PNG", optimize=True, compress_level=9)
        report(path)


if __name__ == "__main__":
    main()
