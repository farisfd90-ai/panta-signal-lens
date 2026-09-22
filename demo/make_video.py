from pathlib import Path
import sys

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE.parent.parent / "panta-video-runtime"))

from PIL import Image, ImageDraw, ImageFont, ImageOps
from moviepy import AudioFileClip, ImageClip, concatenate_videoclips

SIZE = (1280, 720)
BG = "#f3f0e9"
INK = "#171719"
VIOLET = "#635bff"
LIME = "#c8ff42"

def font(size, bold=False):
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()

def wrapped(draw, text, xy, width, size, color=INK, bold=False, spacing=12):
    f = font(size, bold)
    words, lines, line = text.split(), [], ""
    for word in words:
        trial = f"{line} {word}".strip()
        if draw.textbbox((0, 0), trial, font=f)[2] <= width:
            line = trial
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    draw.multiline_text(xy, "\n".join(lines), font=f, fill=color, spacing=spacing)

def card(path, eyebrow, title, body, accent=LIME):
    im = Image.new("RGB", SIZE, BG)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((70, 64, 1210, 656), 28, fill="#fffdfa", outline="#d9d4ca", width=2)
    d.rounded_rectangle((106, 104, 255, 142), 19, fill=accent)
    d.text((128, 112), eyebrow.upper(), font=font(15, True), fill=INK)
    wrapped(d, title, (108, 190), 990, 64, bold=True, spacing=8)
    wrapped(d, body, (112, 420), 930, 28, color="#5d5a56", spacing=13)
    d.text((1090, 602), "PANTA", font=font(18, True), fill=VIOLET)
    d.rectangle((108, 594, 380, 602), fill=VIOLET)
    im.save(path)

def screenshot_slide(source, target, label, detail):
    source_im = Image.open(source).convert("RGB")
    fitted = ImageOps.fit(source_im, SIZE, method=Image.Resampling.LANCZOS)
    overlay = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.rounded_rectangle((44, 555, 1236, 684), 22, fill=(20, 20, 22, 230))
    d.text((78, 579), label, font=font(24, True), fill=LIME)
    wrapped(d, detail, (78, 618), 1080, 20, color="white", spacing=5)
    Image.alpha_composite(fitted.convert("RGBA"), overlay).convert("RGB").save(target)

card(HERE / "slide_01.png", "Panta API Sidetrack", "Panta Signal Lens", "Explainable prediction-market intelligence for researchers, traders, and newsrooms.")
card(HERE / "slide_02.png", "The problem", "A market catalog is not yet a signal.", "Signal Lens ranks attention with transparent conviction, liquidity, and market-phase weights.", VIOLET)
screenshot_slide(HERE / "01-public-demo.png", HERE / "slide_03.png", "PUBLIC JUDGE DEMO", "A polished, filterable signal feed that remains reviewable without sharing credentials.")
screenshot_slide(HERE / "02-live-overview.png", HERE / "slide_04.png", "LIVE PANTA API", "The same interface switches automatically to Panta's live catalog and category taxonomy.")
screenshot_slide(HERE / "03-live-detail.png", HERE / "slide_05.png", "MARKET EVIDENCE", "Market detail and recent trades become probability, volume, and directional flow.")
card(HERE / "slide_06.png", "Integration", "Four Panta routes. One focused workflow.", "Markets · Categories · Market detail · Recent trades\n\nServer-side key protection · Visible attribution · Public source", LIME)
card(HERE / "slide_07.png", "Try it", "Built, tested, and public.", "Demo: farisfd90-ai.github.io/panta-signal-lens\nCode: github.com/farisfd90-ai/panta-signal-lens", VIOLET)

audio = AudioFileClip(str(HERE / "narration.mp3"))
durations = [8, 11, 13, 13, 14, 13]
durations.append(max(8, audio.duration - sum(durations)))
clips = [ImageClip(str(HERE / f"slide_{i:02}.png")).with_duration(d) for i, d in enumerate(durations, 1)]
video = concatenate_videoclips(clips, method="compose").with_audio(audio)
video.write_videofile(str(HERE / "panta-signal-lens-demo.mp4"), fps=30, codec="libx264", audio_codec="aac", preset="medium", logger=None)
print(f"Created {HERE / 'panta-signal-lens-demo.mp4'} ({video.duration:.1f}s)")
