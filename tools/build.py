"""Build step before publishing: python tools/build.py

1. Writes the sheet's sections (intro, selected work, projects, research, about, contact) into
   index.html as plain HTML, between <!-- build:sheet --> and <!-- /build:sheet -->, then stamps
   asset URLs (runs stamp.py).
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
          " ABOUT: window.ABOUT, CONTACT: window.CONTACT,"
          " GLYPH: Object.fromEntries(window.PROJECTS.map(p => [p.glyph, window.glyphSVG(p.glyph)])) }));")
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


def preview(p):
    """The project's preview image in img/thumb/ (made by thumbs()), or None."""
    src = (p.get("images") or [None])[0] or (p.get("film") or {}).get("poster")
    return "img/thumb/" + pathlib.Path(src).name if src else None


def meta_parts(meta):
    """'Seoul · 2023–2025 · Shortlisted finalist' -> place, years, kind."""
    bits = meta.split(" · ")
    years = next((b for b in bits if re.search(r"\d{4}", b)), "")
    rest = [b for b in bits if b != years]
    return (rest[0] if rest else ""), years, " · ".join(rest[1:])


def sheet_html(data):
    groups = {g["id"]: g for g in data["GROUPS"]}
    projects, about, contact, glyph = data["PROJECTS"], data["ABOUT"], data["CONTACT"], data["GLYPH"]

    def head(no, title, name):
        return f'<h2 class="s-head" id="h-{name}" tabindex="-1"><span class="s-no">{no}</span>{esc(title)}</h2>'

    def card(p, kicker=True):
        src = preview(p)
        if src:
            w, h = image_size(src)
            pic = f'<img class="card-img" src="{src}" alt="" width="{w}" height="{h}" loading="lazy" decoding="async">'
        else:
            pic = f'<span class="card-img card-blank">{glyph[p["glyph"]]}</span>'
        label = esc(groups[p["group"]]["label"]) if kicker else ""  # not repeated inside its own section
        return (f'<li><a class="card" href="/projects/{p["slug"]}/" data-slug="{p["slug"]}">{pic}'
                f'<span class="card-body"><span class="card-kicker"><span class="mark">{glyph[p["glyph"]]}</span>'
                f'{label}</span>'
                f'<span class="card-title">{esc(p["title"])}</span><span class="card-sub">{esc(p["meta"])}</span></span></a></li>')

    def row(order, p):
        place, years, kind = meta_parts(p.get("meta", ""))
        newest = max(re.findall(r"\d{4}", years) or ["0"])
        src = preview(p)
        if src:
            w, h = image_size(src)
            pic = f'<img class="row-thumb" src="{src}" alt="" width="{w}" height="{h}" loading="lazy" decoding="async">'
        else:
            pic = '<span class="row-thumb row-blank"></span>'
        thumb_attr = f' data-thumb="{src}"' if src else ""  # the hover preview on desktops
        return (f'<li data-group="{p["group"]}" data-year="{newest}" data-order="{order}">'
                f'<a class="row" href="/projects/{p["slug"]}/" data-slug="{p["slug"]}"{thumb_attr}>'
                f'{pic}<span class="mark">{glyph[p["glyph"]]}</span><span class="row-no">{esc(p["no"])}</span>'
                f'<span class="row-title">{esc(p["title"])}</span><span class="row-meta">'
                f'<span class="row-kind">{esc(kind)}</span><span class="row-place">{esc(place)}</span>'
                f'<span class="row-year">{esc(years or "—")}</span></span></a></li>')

    def timeline(items):
        out = []
        for it in items:
            when, title, what = it[0], it[1], it[2]
            where = f'<span class="tl-where">{esc(it[3])}</span>' if len(it) > 3 else ""
            out.append(f'<li><span class="tl-when">{esc(when)}</span><span class="tl-body"><strong>{esc(title)}</strong>'
                       f'<span>{esc(what)}</span>{where}</span></li>')
        return '<ul class="tl">' + "".join(out) + "</ul>"

    cv = '<a class="pill" href="Aykut_Dag_CV.pdf" target="_blank" rel="noopener" data-track="cv" data-track-title="CV opened">'
    s = []
    s.append(f'<section class="s s-intro" data-section="intro" aria-labelledby="h-intro">{head("01", "Intro", "intro")}'
             f'<p class="lede">{esc(about["intro"])}</p>'
             f'<p class="now"><span class="now-k">Currently</span>{esc(about["now"])}</p>'
             '<ul class="areas">' + "".join(f"<li><h3>{esc(t)}</h3><p>{esc(d)}</p></li>" for t, d in about["areas"]) + "</ul>"
             '<p class="quick"><button type="button" class="pill" data-to="work">Selected work</button>'
             f'{cv}CV (PDF)</a><button type="button" class="pill" data-to="contact">Contact</button></p></section>')
    s.append(f'<section class="s" data-section="work" aria-labelledby="h-work">{head("02", "Selected work", "work")}'
             '<ul class="cards">' + "".join(card(p) for p in projects if p.get("featured")) + "</ul></section>")

    counts = {g: sum(1 for p in projects if p["group"] == g) for g in groups}
    filters = (f'<button type="button" class="pill" data-filter="all" aria-pressed="true">All <span class="count">{len(projects)}</span></button>'
               + "".join(f'<button type="button" class="pill" data-filter="{g}" aria-pressed="false">{esc(groups[g]["label"])} '
                         f'<span class="count">{counts[g]}</span></button>' for g in groups))
    s.append(f'<section class="s" data-section="projects" aria-labelledby="h-projects">{head("03", "Projects", "projects")}'
             f'<div class="tools"><div class="filters" role="group" aria-label="Show">{filters}</div>'
             '<div class="sort" role="group" aria-label="Order"><span>Order</span>'
             '<button type="button" data-sort="group" aria-pressed="true">Category</button>'
             '<button type="button" data-sort="year" aria-pressed="false">Year</button></div></div>'
             '<ol class="rows">' + "".join(row(i, p) for i, p in enumerate(projects)) + "</ol></section>")

    pubs = []
    for it in about["publications"]:
        year, title, where = it[0], it[1], it[2]
        name = (f'<a href="/projects/{it[3]}/" data-slug="{it[3]}">{esc(title)}</a>' if len(it) > 3 else esc(title))
        pubs.append(f'<li><span class="pub-year">{esc(year)}</span><span class="pub-body"><span class="pub-title">{name}</span>'
                    f'<span class="pub-where">{esc(where)}</span></span></li>')
    s.append(f'<section class="s" data-section="research" aria-labelledby="h-research">{head("04", "Research & Lab", "research")}'
             f'<p class="s-note">{esc(about["research"])}</p>'
             '<ul class="cards cards-small">' + "".join(card(p, kicker=False) for p in projects if p["group"] == "research") + "</ul>"
             '<h3 class="s-sub">Publications &amp; exhibitions</h3><ul class="pubs">' + "".join(pubs) + "</ul></section>")

    pw, ph = image_size(about["photo"])
    s.append(f'<section class="s s-about" data-section="about" aria-labelledby="h-about">{head("05", "About", "about")}'
             f'<div class="about-cols"><img class="portrait" src="{about["photo"]}" alt="Portrait of Aykut Dağ" width="{pw}" height="{ph}" loading="lazy" decoding="async">'
             '<dl class="axes">' + "".join(f"<dt>{esc(t)}</dt><dd>{esc(d)}</dd>" for t, d in about["axes"]) + "</dl></div>"
             '<div class="cv-cols">'
             f'<div><h3 class="s-sub">Experience</h3>{timeline(about["experience"])}</div>'
             f'<div><h3 class="s-sub">Education</h3>{timeline(about["education"])}</div>'
             f'<div><h3 class="s-sub">Honors</h3>{timeline(about["honors"])}</div></div>'
             f'<p class="quick">{cv}Full CV (PDF)</a></p></section>')

    links = []
    for c in contact:
        mail = c["href"].startswith("mailto:")
        what = "email" if mail else c["label"].lower()
        extra = "" if mail else ' target="_blank" rel="noopener"'
        links.append(f'<li><a href="{esc(c["href"])}"{extra} data-track="contact/{what}" data-track-title="Contact: {esc(c["label"] if not mail else "email")}">{esc(c["label"])}</a></li>')
    links.append('<li><a href="Aykut_Dag_CV.pdf" target="_blank" rel="noopener" data-track="cv" data-track-title="CV opened">CV (PDF)</a></li>')
    s.append(f'<section class="s s-contact" data-section="contact" aria-labelledby="h-contact">{head("06", "Contact", "contact")}'
             '<ul class="contact-links">' + "".join(links) + f'</ul><p class="s-note">{esc(about["location"])}</p></section>')
    s.append(f'<footer class="sheet-foot"><span>© {datetime.date.today().year} Aykut Dağ</span>'
             '<span>The field: <i>Physarum polycephalum</i>, after Jones (2010)</span></footer>')
    return "\n      ".join(s)


def write_sheet(data):
    path = ROOT / "index.html"
    doc = path.read_text(encoding="utf-8")
    doc = replace_once(doc, r"<!-- build:sheet -->.*?<!-- /build:sheet -->",
                       "<!-- build:sheet -->\n      " + sheet_html(data) + "\n      <!-- /build:sheet -->", re.S)
    path.write_text(doc, encoding="utf-8")


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
    data = load_data()
    projects = data["PROJECTS"]
    for i, p in enumerate(projects):
        p["no"] = f"{i + 1:02d}"
    new_previews = thumbs(projects)  # before the sheet, which reads their sizes
    write_sheet(data)
    subprocess.run([sys.executable, str(ROOT / "stamp.py")], cwd=ROOT, check=True)
    groups = {g["id"]: g["label"] for g in data["GROUPS"]}
    shell = (ROOT / "index.html").read_text(encoding="utf-8")
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
    print(f"sheet written, {len(projects)} project pages, sitemap with {len(urls)} addresses, {new_previews} new previews")


if __name__ == "__main__":
    main()
