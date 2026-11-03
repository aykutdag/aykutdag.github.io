"""Build step before publishing: python tools/build.py

1. Stamps asset URLs in index.html (runs stamp.py).
2. Writes one page per project at projects/<slug>/index.html: the same site, with the
   project's own title, description, share image and structured data, and its text as plain
   HTML so search engines and link previews can read it. After Enter the page opens that project.
3. Writes sitemap.xml and small preview images (img/thumb/) for the index and cards.

Reads the project data from projects.js with Node (node must be on PATH).
"""
import datetime
import html
import json
import pathlib
import re
import subprocess
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://aykutdag.github.io"
THUMB_W = 720  # preview width in pixels (shown at up to 360 CSS px)


def load_data():
    js = ("global.window = {}; require('./projects.js'); require('./glyphs.js');"
          "process.stdout.write(JSON.stringify({ GROUPS: window.GROUPS, PROJECTS: window.PROJECTS,"
          " ABOUT: window.ABOUT, CONTACT: window.CONTACT }));")
    out = subprocess.run(["node", "-e", js], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", check=True)
    return json.loads(out.stdout)


def esc(s):
    return html.escape(str(s), quote=True)


def describe(p, limit=155):
    """First paragraph, cut at a word boundary."""
    text = (p.get("text") or [p["title"]])[0]
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0].rstrip(",;:—-")
    return cut + "…"


def image_size(src):
    with Image.open(ROOT / src) as im:
        return im.size


def share_image(p):
    src = (p.get("images") or [None])[0] or (p.get("film") or {}).get("poster") or "img/og.jpg"
    return src, image_size(src)


def year_of(p):
    m = re.search(r"\b(19|20)\d\d\b", p.get("meta", ""))
    return m.group(0) if m else None


def replace_once(doc, pattern, new, flags=0):
    doc, n = re.subn(pattern, lambda m: new, doc, count=0, flags=flags)
    if n != 1:
        raise SystemExit(f"build: expected one match for {pattern!r}, found {n}")
    return doc


def article(p, group_label):
    """The project window's content as static HTML (main.js rebuilds it the same way)."""
    out = ['<header class="win-head">',
           f'<div class="p-no">{esc(p["no"])} · {esc(group_label)}</div>',
           f'<h2 id="win-title">{esc(p["title"])}</h2></header>',
           '<div class="win-cols"><div class="win-info">']
    credits = [(k, v) for k, v in p.get("credits", []) if v]
    if credits:
        out.append('<dl class="credits">' + "".join(f"<dt>{esc(k)}</dt><dd>{esc(v)}</dd>" for k, v in credits) + "</dl>")
    out += [f"<p>{esc(t)}</p>" for t in (p.get("text") or [])]
    if p.get("duties"):
        out.append('<h3 class="sub">Responsibilities</h3><ul class="duties">' + "".join(f"<li>{esc(d)}</li>" for d in p["duties"]) + "</ul>")
    if p.get("credit"):
        out.append(f'<p class="credit">{esc(p["credit"])}</p>')
    links = list(p.get("links") or [])
    if p.get("video"):
        links.append({"label": "Watch on YouTube", "href": "https://www.youtube.com/watch?v=" + p["video"]})
    if links:
        out.append('<ul class="ext">' + "".join(f'<li><a href="{esc(l["href"])}" target="_blank" rel="noopener">{esc(l["label"])}</a></li>' for l in links) + "</ul>")
    out.append('</div><div class="win-media">')
    imgs = p.get("images") or []
    for k, src in enumerate(imgs):
        w, h = image_size(src)
        out.append(f'<img src="{esc(src)}" alt="{esc(p["title"])}, image {k + 1} of {len(imgs)}" width="{w}" height="{h}" loading="lazy" decoding="async">')
    out.append("</div></div>")
    return "".join(out)


def project_page(shell, p, group_label):
    url = f"{SITE}/projects/{p['slug']}/"
    title = f"{p['title']} — Aykut Dağ"
    desc = describe(p)
    img, (iw, ih) = share_image(p)
    ld = {
        "@context": "https://schema.org", "@type": "CreativeWork",
        "name": p["title"], "url": url, "description": desc, "genre": group_label,
        "image": [f"{SITE}/{src}" for src in (p.get("images") or [img])],
        "creator": {"@type": "Person", "name": "Aykut Dağ", "url": SITE + "/"},
    }
    if year_of(p):
        ld["dateCreated"] = year_of(p)
    doc = shell
    doc = replace_once(doc, r"<title>.*?</title>", f"<title>{esc(title)}</title>")
    doc = replace_once(doc, r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{esc(desc)}">')
    doc = replace_once(doc, r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{url}">')
    doc = replace_once(doc, r'<meta property="og:type" content="[^"]*">', '<meta property="og:type" content="article">')
    doc = replace_once(doc, r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{esc(title)}">')
    doc = replace_once(doc, r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{esc(desc)}">')
    doc = replace_once(doc, r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{url}">')
    doc = replace_once(doc, r'<meta property="og:image" content="[^"]*">', f'<meta property="og:image" content="{SITE}/{img}">')
    doc = replace_once(doc, r'<meta property="og:image:width" content="[^"]*">', f'<meta property="og:image:width" content="{iw}">')
    doc = replace_once(doc, r'<meta property="og:image:height" content="[^"]*">', f'<meta property="og:image:height" content="{ih}">')
    doc = replace_once(doc, r'<meta property="og:image:alt" content="[^"]*">', f'<meta property="og:image:alt" content="{esc(p["title"])}">')
    doc = replace_once(doc, r'<script type="application/ld\+json">.*?</script>',
                       '<script type="application/ld+json">\n  ' + json.dumps(ld, ensure_ascii=False, indent=2).replace("\n", "\n  ") + "\n  </script>", re.S)
    doc = replace_once(doc, r"<body>", f'<body data-project="{esc(p["slug"])}">')
    doc = replace_once(doc, r'<div id="win-body" class="win-body"></div>', f'<div id="win-body" class="win-body">{article(p, group_label)}</div>')
    return doc


def thumbs(projects):
    out_dir = ROOT / "img" / "thumb"
    out_dir.mkdir(exist_ok=True)
    made = 0
    for p in projects:
        src = (p.get("images") or [None])[0] or (p.get("film") or {}).get("poster")
        if not src:
            continue
        dst = out_dir / pathlib.Path(src).name
        if dst.exists() and dst.stat().st_mtime >= (ROOT / src).stat().st_mtime:
            continue
        with Image.open(ROOT / src) as im:
            im = im.convert("RGB")
            if im.width > THUMB_W:
                im = im.resize((THUMB_W, round(im.height * THUMB_W / im.width)), Image.LANCZOS)
            im.save(dst, "JPEG", quality=74, optimize=True, progressive=True)
        made += 1
    return made


def main():
    subprocess.run([sys.executable, str(ROOT / "stamp.py")], cwd=ROOT, check=True)
    data = load_data()
    groups = {g["id"]: g["label"] for g in data["GROUPS"]}
    shell = (ROOT / "index.html").read_text(encoding="utf-8")
    projects = data["PROJECTS"]
    for i, p in enumerate(projects):
        p["no"] = f"{i + 1:02d}"
    slugs = [p["slug"] for p in projects]
    if len(set(slugs)) != len(slugs):
        raise SystemExit("build: duplicate slugs")

    pages = ROOT / "projects"
    for old in pages.glob("*/index.html") if pages.exists() else []:
        if old.parent.name not in slugs:
            old.unlink()
            old.parent.rmdir()
    for p in projects:
        d = pages / p["slug"]
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(project_page(shell, p, groups[p["group"]]), encoding="utf-8")

    today = datetime.date.today().isoformat()
    urls = [SITE + "/"] + [f"{SITE}/projects/{s}/" for s in slugs]
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{u}</loc><lastmod>{today}</lastmod></url>\n" for u in urls)
        + "</urlset>\n", encoding="utf-8")
    print(f"{len(projects)} project pages, sitemap with {len(urls)} addresses, {thumbs(projects)} new previews")


if __name__ == "__main__":
    main()
