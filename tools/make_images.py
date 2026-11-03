# Renders the share image (img/og.jpg, 1200x630) and the PNG icons from favicon.svg.
# Usage: python tools/make_images.py  (needs Playwright; run again after changing the
# poster or the icon). The share image is the poster of the network with the name on it.
import base64
import pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
# inlined: a page made with set_content may not load local files
poster = "data:image/jpeg;base64," + base64.b64encode((ROOT / "img" / "poster-wide.jpg").read_bytes()).decode()
svg = (ROOT / "favicon.svg").read_text(encoding="utf-8")

OG = f"""<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@500&family=JetBrains+Mono&display=block" rel="stylesheet">
<style>
  html, body {{ margin: 0; width: 1200px; height: 630px; background: #05070a; overflow: hidden; }}
  .bg {{ position: absolute; inset: 0; background: url("{poster}") center / cover; opacity: 0.8; }}
  .shade {{ position: absolute; inset: 0; background: radial-gradient(ellipse at 18% 78%, rgba(5,7,10,0.92) 0%, rgba(5,7,10,0.55) 42%, transparent 72%); }}
  .t {{ position: absolute; left: 72px; bottom: 76px; color: #e9eef1; font-family: "Instrument Sans", sans-serif; }}
  h1 {{ margin: 0; font-size: 92px; font-weight: 500; letter-spacing: -0.03em; line-height: 0.95; }}
  p {{ margin: 18px 0 0; font-size: 30px; font-weight: 500; }}
  small {{ display: block; margin-top: 12px; font: 20px "JetBrains Mono", monospace; color: #bfe3f2; letter-spacing: 0.04em; }}
</style></head><body><div class="bg"></div><div class="shade"></div>
<div class="t"><h1>Aykut Dağ</h1><p>Architectural &amp; Computational Designer</p>
<small>Space · Computation · Material · Interaction</small></div></body></html>"""

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1200, "height": 630})
    pg.set_content(OG, wait_until="networkidle")
    pg.evaluate("document.fonts.ready")
    pg.screenshot(path=str(ROOT / "img" / "og.jpg"), type="jpeg", quality=88)
    for size, name in [(32, "favicon-32.png"), (180, "apple-touch-icon.png")]:
        pg.set_viewport_size({"width": size, "height": size})
        pg.set_content(f'<html><body style="margin:0;background:#05070a">{svg.replace("<svg ", f"<svg width={size} height={size} ", 1)}</body></html>')
        pg.screenshot(path=str(ROOT / name))
    b.close()
print("img/og.jpg, favicon-32.png, apple-touch-icon.png")
