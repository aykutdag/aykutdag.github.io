"""Stamp asset URLs in index.html with a hash of each file's content (style.css?v=1a2b3c4d).

Run before publishing: python stamp.py
A changed file gets a new URL, so a browser never pairs a fresh page with an old cached
script or stylesheet (GitHub Pages lets browsers cache files for about 10 minutes).
"""
import hashlib
import pathlib
import re

ROOT = pathlib.Path(__file__).parent
ASSETS = ["style.css", "projects.js", "glyphs.js", "sound.js", "physarum.js", "main.js"]

html_path = ROOT / "index.html"
html = html_path.read_text(encoding="utf-8")
for name in ASSETS:
    digest = hashlib.md5((ROOT / name).read_bytes()).hexdigest()[:8]
    html, count = re.subn(r'(["\'])' + re.escape(name) + r'(\?v=[0-9a-f]+)?\1', r"\g<1>" + name + "?v=" + digest + r"\g<1>", html)
    if count != 1:
        raise SystemExit(f"{name}: expected one reference in index.html, found {count}")
    print(f"{name}?v={digest}")
html_path.write_text(html, encoding="utf-8")
