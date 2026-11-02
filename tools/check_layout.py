# Layout QA: at many screen sizes, open every colony and every project window and report
# any two elements that overlap, anything outside the screen, and any horizontal overflow.
# Usage: python tools/check_layout.py [base_url] [chromium|webkit] [viewport filter, comma separated]
# Needs Playwright (pip install playwright; playwright install). Run before publishing layout changes.
from playwright.sync_api import sync_playwright
import sys, json
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765/"
ENGINE = sys.argv[2] if len(sys.argv) > 2 else "chromium"
ONLY = sys.argv[3].split(",") if len(sys.argv) > 3 else None
VIEWPORTS = [
    ("1920x1080", 1920, 1080, 1, False), ("1536x864", 1536, 864, 1.25, False), ("1440x900", 1440, 900, 2, False),
    ("1366x768", 1366, 768, 1, False), ("1280x720", 1280, 720, 1, False), ("1024x768", 1024, 768, 1, False),
    ("956x669", 956, 669, 1, False), ("tablet 820x1180", 820, 1180, 2, True), ("phone 390x844", 390, 844, 3, True),
    ("phone 360x640", 360, 640, 2, True), ("landscape 844x390", 844, 390, 3, True),
]

CHECK_JS = r"""(mode) => {
  const out = [];
  const R = e => e.getBoundingClientRect();
  const name = e => (e.id ? '#' + e.id : '') + '.' + String(e.className).split(' ')[0] + (e.textContent ? ' "' + e.textContent.trim().slice(0, 28) + '"' : '');
  const hit = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  const visible = e => { const r = R(e); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const vw = innerWidth, vh = innerHeight;
  const outside = (e, label) => { const r = R(e); if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) out.push(label + ' outside screen: ' + name(e) + ' ' + [r.left, r.top, r.right, r.bottom].map(Math.round)); };
  const pairs = (list, label) => { for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (hit(R(list[i]), R(list[j]))) out.push(label + ': ' + name(list[i]) + ' × ' + name(list[j])); };
  const chrome = [...document.querySelectorAll('.name, .role, .tags, .group-nav button, .nav > *, #foot-agents, .hint')].filter(visible);

  if (mode === 'field') {
    // every visible node / colony: its marker and its label, against each other and the page chrome
    const parts = [];
    document.querySelectorAll('.colony-item, .node-item.shown').forEach(li => {
      if (!visible(li)) return;
      li.querySelectorAll('.ring, .mark, .label').forEach(e => { if (visible(e)) parts.push(e); });
    });
    for (let i = 0; i < parts.length; i++) {
      outside(parts[i], 'field');
      for (let j = i + 1; j < parts.length; j++)
        if (parts[i].closest('li') !== parts[j].closest('li') && hit(R(parts[i]), R(parts[j]))) out.push('field: ' + name(parts[i]) + ' × ' + name(parts[j]));
      chrome.forEach(c => { if (hit(R(parts[i]), R(c))) out.push('field × header/footer: ' + name(parts[i]) + ' × ' + name(c)); });
    }
  } else {
    const win = document.getElementById('win');
    outside(win, 'window');
    const head = win.querySelector('.win-head'), close = win.querySelector('.win-close');
    const title = win.querySelector('h2');
    if (close && title && hit(R(close), R(title))) out.push('window: close button × title');
    const cols = win.querySelector('.win-cols');
    if (head && cols && hit(R(head), R(cols))) out.push('window: header × columns');
    ['.win-body', '.win-info', '.win-media', '.win-cols'].forEach(s => { const e = win.querySelector(s); if (e && e.scrollWidth > e.clientWidth + 1) out.push('window: horizontal overflow in ' + s + ' (' + e.scrollWidth + ' > ' + e.clientWidth + ')'); });
    const info = win.querySelector('.win-info'), media = win.querySelector('.win-media');
    if (info) pairs([...info.children].filter(visible), 'window info');
    if (media) pairs([...media.children].filter(visible), 'window media');
    if (info && media) [...info.children].forEach(a => [...media.children].forEach(b => { if (hit(R(a), R(b))) out.push('window: info × media ' + name(a)); }));
    const dts = [...win.querySelectorAll('dl dt, dl dd')].filter(visible);
    pairs(dts, 'window credits');
    win.querySelectorAll('dd, dt, p, h2').forEach(e => { if (e.scrollWidth > e.clientWidth + 1) out.push('window: text overflows ' + name(e)); });
  }
  return [...new Set(out)];
}"""

def run(pg, label, mode, problems):
    for p in pg.evaluate(CHECK_JS, mode):
        problems.append(f"{label}: {p}")

with sync_playwright() as p:
    b = p.webkit.launch() if ENGINE == "webkit" else p.chromium.launch(args=["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"])
    total = []
    for vname, w, h, dpr, mobile in VIEWPORTS:
        if ONLY and not any(o in vname for o in ONLY): continue
        ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=dpr, is_mobile=mobile, has_touch=mobile, reduced_motion="reduce")
        ctx.route("**/goatcounter.com/**", lambda r: r.abort())
        ctx.route("**/gc.zgo.at/**", lambda r: r.abort())
        pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(BASE); pg.wait_for_timeout(1500)
        problems = []
        run(pg, "home", "field", problems)
        n_groups = pg.locator(".colony").count()
        for gi in range(n_groups):
            pg.evaluate(f"document.querySelectorAll('#group-nav button')[{gi + 1}].click()"); pg.wait_for_timeout(500)
            gname = pg.evaluate(f"GROUPS[{gi}].id")
            run(pg, f"colony {gname}", "field", problems)
            n = pg.locator(".node-item.shown").count()
            for k in range(n):
                pg.evaluate(f"document.querySelectorAll('.node-item.shown .node')[{k}].click()")
                pg.wait_for_timeout(400)
                pg.wait_for_function("[...document.querySelectorAll('#win img')].every(i => i.complete)", timeout=20000)
                pg.wait_for_timeout(150)
                title = pg.evaluate("document.getElementById('win-title').textContent").split("|")[0].strip()[:24]
                run(pg, f"window {title}", "window", problems)
                pg.evaluate("document.querySelector('.win-close').click()"); pg.wait_for_timeout(250)
        for which in ["about", "contact"]:
            pg.evaluate(f"document.querySelector('[data-panel={which}]').click()"); pg.wait_for_timeout(350)
            run(pg, f"window {which}", "window", problems)
            pg.evaluate("document.querySelector('.win-close').click()"); pg.wait_for_timeout(250)
        print(f"== {vname}: {len(problems)} problems" + (f", errors {errs}" if errs else ""), flush=True)
        for pr in problems: print("   ", pr)
        total += problems
        ctx.close()
    b.close()
    print("TOTAL", len(total))
