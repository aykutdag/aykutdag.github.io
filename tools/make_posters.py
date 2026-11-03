# Renders the poster images: the still network that stands in for the live field on devices
# that cannot run the simulation. Grows the home colonies' network on the GPU, with the entry
# screen and all interface hidden, and saves img/poster-wide.jpg and img/poster-tall.jpg.
# Usage: serve the site (python -m http.server 8765), then python tools/make_posters.py
# Run again after changing the field's look (brightness, colours) or the colony positions.
import pathlib
from playwright.sync_api import sync_playwright

OUT = pathlib.Path(__file__).resolve().parent.parent / "img"
GROW = """async () => {
  window.requestAnimationFrame = () => 0; await new Promise(r => setTimeout(r, 800));
  const food = [...document.querySelectorAll('.colony-item')].map(li => ({x: parseFloat(li.style.left) / 100, y: parseFloat(li.style.top) / 100, s: 1.6}));
  document.querySelectorAll('#gate, .top, main, .foot, .debug').forEach(e => e.style.display = 'none');
  const s = window.physarum; s.setMouse(0, 0, 0); s.setSignals([]); s.setGlass(null); s.setFood(food);
  for (let i = 0; i < 700; i++) { s.step(); if (i > 660) s.render(0.5); }
  return { size: s.size, tall: document.body.classList.contains('tall') };
}"""
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"])
    for name, w, h, dpr in [("poster-wide.jpg", 1600, 900, 1), ("poster-tall.jpg", 430, 932, 2)]:
        pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=dpr)
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.route("**/aykutdag.goatcounter.com/**", lambda r: r.fulfill(status=204))
        pg.goto("http://127.0.0.1:8765/?tier=0")
        pg.wait_for_timeout(1200)
        print(name, pg.evaluate(GROW), errs)
        pg.wait_for_timeout(600)
        pg.screenshot(path=str(OUT / name), type="jpeg", quality=80)
        pg.close()
    b.close()
