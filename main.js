(function () {
  // ?debug shows a diagnosis readout; ?tier=N forces a quality tier; ?gl=1 runs the
  // simulation even on a software renderer (for testing).
  const params = new URLSearchParams(location.search);
  // What the ?debug readout reports: why the simulation is not running (if so), how many
  // frames it has drawn, a hash of the drawn pixels (it changes while the field moves),
  // lost WebGL contexts and any errors.
  const status = { why: "", frames: 0, steps: 0, lost: 0, hash: "", errors: [] };
  if (params.has("debug")) {
    addEventListener("error", e => status.errors.push((e.message || "error") + " @" + String(e.filename || "").split("/").pop() + ":" + e.lineno));
    addEventListener("unhandledrejection", e => status.errors.push("promise: " + e.reason));
    const logError = console.error;
    console.error = function (...a) { status.errors.push(a.map(String).join(" ")); logError.apply(console, a); };
  }

  const BREATH_PERIOD = 24; // seconds, matches the drone LFO in sound.js
  const SIGNAL_LIFE = 3.5;  // seconds a signal keeps travelling
  const OPEN_TIME = 1.4;    // seconds for a colony's projects to spread out
  const CLOSE_TIME = 0.7;   // seconds for them to be drawn back in
  const ABANDON_TIME = 3;   // seconds an abandoned food source keeps pushing the network away
  const body = document.body;
  const canvas = document.getElementById("field");
  const topEl = document.querySelector(".top");
  const coloniesEl = document.getElementById("colonies");
  const groupsEl = document.getElementById("groups");
  const groupNav = document.getElementById("group-nav");
  const hintEl = document.getElementById("hint");
  const win = document.getElementById("win");
  const winBody = document.getElementById("win-body");
  const sheet = document.getElementById("sheet");
  const sheetScroll = document.getElementById("sheet-scroll");
  const chrome = [topEl, document.querySelector("main"), document.querySelector(".foot")];
  const viewBtn = document.getElementById("toggle-view");
  const soundBtn = document.getElementById("sound");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = matchMedia("(pointer: coarse)").matches ||
    (navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) < 900);

  const groups = GROUPS.map(g => Object.assign({ items: [] }, g));
  const bySlug = {};
  PROJECTS.forEach((p, i) => {
    p.index = i;
    p.no = String(i + 1).padStart(2, "0");
    groups.find(g => g.id === p.group).items.push(p);
    bySlug[p.slug] = p;
  });

  let sim = null;            // the live simulation; null shows the poster image instead
  // Reduce Motion keeps the organism alive but calm: half speed, no travelling pulses, and
  // nodes and windows appear in place instead of flying out.
  let still = false;         // true: the network is drawn once per change instead of animating
  let open = -1;             // index of the open colony; -1 shows the three colonies
  let spread = 0;            // 0 = projects gathered at their colony, 1 = in place
  let tween = null;          // { from, to, t0, dur, done }
  let hoverColony = -1;
  let hoverProject = -1;
  let lastFocus = null;
  let signals = [];
  let abandoned = [];        // { x, y, t0 }: food sources the organism has just left
  const mouse = { x: -1, y: -1, px: -1, py: -1, speed: 0 };
  let sheetOpen = false;     // the portfolio sheet is up (see "Second layer")
  let sheetMoving = false;   // it is rising, falling or following a finger
  const now = () => performance.now() / 1000;
  const ease = t => 1 - Math.pow(1 - t, 3);

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  // ---------- Visitor statistics ----------
  // GoatCounter's script in index.html counts page views; these events count what visitors
  // open (projects, colonies, CV, contact links). Nothing is sent if the script is blocked.
  function track(path, title) {
    try {
      if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path, title: title || path, event: true });
    } catch (e) { /* statistics are optional */ }
  }

  // ---------- Signals (electric pulses leaving a food source) ----------
  function signal(x, y, strength, tone) {
    signals.push({ x, y, t0: now(), s: strength });
    if (signals.length > 8) signals.shift();
    Sound.blip(tone, strength, x * 2 - 1);
  }

  // Where a project node sits right now: drawn out of its colony as `spread` goes 0 → 1.
  // fx / fy are the field positions for the current screen shape (see layout()).
  function posOf(p) {
    const g = groups.find(g => g.id === p.group);
    const k = ease(spread);
    return { x: g.fx + (p.fx - g.fx) * k, y: g.fy + (p.fy - g.fy) * k };
  }

  // ---------- Colonies ----------
  const colonyItems = [];
  const colonyEls = groups.map((g, gi) => {
    const li = el("li", "colony-item");
    const btn = el("button", "colony");
    btn.type = "button";
    btn.innerHTML = '<span class="ring"><span class="count"></span></span><span class="label"><span class="title"></span><span class="meta"></span></span>';
    btn.querySelector(".count").textContent = g.items.length;
    btn.querySelector(".title").textContent = g.label;
    btn.querySelector(".meta").textContent = g.note + " · " + g.items.length + " projects";
    btn.addEventListener("mouseenter", () => hoverOnColony(gi));
    btn.addEventListener("focus", () => hoverOnColony(gi));
    btn.addEventListener("mouseleave", () => hoverOnColony(-1));
    btn.addEventListener("blur", () => hoverOnColony(-1));
    btn.addEventListener("click", e => openGroup(gi, e.detail === 0));
    li.append(btn);
    coloniesEl.append(li);
    colonyItems.push(li);
    return btn;
  });

  function hoverOnColony(gi) {
    if (gi === hoverColony) return;
    hoverColony = gi;
    if (gi >= 0) {
      const g = groups[gi];
      Sound.chime(gi * 3, false, g.fx * 2 - 1);
      signal(g.fx, g.fy, 1, gi * 3);
    }
  }

  // ---------- Project nodes, one list per colony ----------
  const nodeEls = [];
  const sections = groups.map(g => {
    const section = el("section", "group");
    const h = el("h3", "group-title", g.label + " ");
    h.append(el("span", "count", String(g.items.length)));
    const ol = el("ol", "nodes");
    g.items.forEach(p => {
      const li = el("li", "node-item");
      const btn = el("button", "node");
      btn.type = "button";
      btn.innerHTML = '<span class="mark">' + glyphSVG(p.glyph) + '</span><span class="label"><span class="no"></span><span class="title"></span><span class="short"></span><span class="meta"></span></span>';
      btn.querySelector(".no").textContent = p.no;
      btn.querySelector(".title").textContent = p.title;
      btn.querySelector(".short").textContent = p.short || p.title;
      btn.querySelector(".meta").textContent = p.meta;
      btn.addEventListener("mouseenter", () => hoverOnProject(p.index));
      btn.addEventListener("focus", () => hoverOnProject(p.index));
      btn.addEventListener("mouseleave", () => hoverOnProject(-1));
      btn.addEventListener("blur", () => hoverOnProject(-1));
      btn.addEventListener("click", () => chooseProject(p));
      li.append(btn);
      ol.append(li);
      nodeEls[p.index] = { li, btn };
    });
    section.append(h, ol);
    groupsEl.append(section);
    return section;
  });

  function hoverOnProject(i) {
    if (i === hoverProject) return;
    if (hoverProject >= 0) nodeEls[hoverProject].btn.classList.remove("active");
    hoverProject = i;
    if (i >= 0) {
      nodeEls[i].btn.classList.add("active");
      const q = posOf(PROJECTS[i]);
      Sound.chime(i, false, q.x * 2 - 1);
      signal(q.x, q.y, 1, i);
    }
  }

  function placeNodes() {
    if (open < 0) return;
    groups[open].items.forEach(p => {
      const q = posOf(p);
      nodeEls[p.index].li.style.left = q.x * 100 + "%";
      nodeEls[p.index].li.style.top = q.y * 100 + "%";
    });
  }

  function setShown(gi) {
    PROJECTS.forEach(p => nodeEls[p.index].li.classList.toggle("shown", gi >= 0 && p.group === groups[gi].id));
  }

  // ---------- Layout for the screen shape ----------
  // The data's x / y are drawn for landscape screens. Tall screens (phones) get the colonies
  // stacked and each colony's projects in a two-column zig-zag below the header, so labels
  // fit beside their nodes. Short landscape screens (phones turned sideways) get the colonies
  // side by side and the projects in rows of up to four.
  const TALL_COLONIES = [[0.30, 0.12], [0.70, 0.48], [0.34, 0.84]]; // x, and y within the free area
  const SHORT_COLONIES = [[0.2, 0.15], [0.5, 0.6], [0.8, 0.15]];

  // The name, the role and the tagline end on one vertical line, as they start on one. The
  // name sets the width (on narrow screens the role does, kept at a readable size, and the
  // name grows to match); the role is sized to it and the tagline tracked out to it, and
  // what font sizes cannot reach exactly goes into the word spaces.
  const LINE_MIN = 11; // px: the smallest the role and the tagline may get
  function fitIdent() {
    const name = topEl.querySelector(".name"), role = topEl.querySelector(".role"), tags = topEl.querySelector(".tags");
    [name, role, tags].forEach(e => { e.style.fontSize = e.style.letterSpacing = e.style.wordSpacing = ""; });
    const width = e => { const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect().width; };
    const size = e => parseFloat(getComputedStyle(e).fontSize);
    const spaces = e => (e.textContent.match(/ /g) || []).length;
    const shown = getComputedStyle(tags).display !== "none";
    const W = Math.min(innerWidth - 48, Math.max(width(name), width(role) * LINE_MIN / size(role),
      shown ? width(tags) * LINE_MIN / (size(tags) * 0.96) : 0)); // (0.96: room left for its tracking)
    if (width(name) < W) name.style.fontSize = size(name) * W / width(name) + "px";
    role.style.fontSize = size(role) * W / width(role) + "px";
    [name, role].forEach(e => {
      const gap = W - width(e);
      if (Math.abs(gap) > 0.3 && spaces(e)) e.style.wordSpacing = gap / spaces(e) + "px";
    });
    if (shown) {
      if (width(tags) > W) tags.style.fontSize = size(tags) * W * 0.96 / width(tags) + "px";
      // tracking after every character but the last, so the last one ends at the line
      tags.style.letterSpacing = (W - width(tags)) / (tags.textContent.length - 1) + "px";
    }
  }

  function layout() {
    fitIdent(); // first: it sets the header's height
    // where the organism feeds now, to compare once the places are recomputed
    const fedBefore = sim && groups[0].fx !== undefined ? foodPoints() : null;
    const tall = innerHeight > innerWidth * 1.15;
    const short = !tall && innerHeight < 560;
    body.classList.toggle("tall", tall);
    body.classList.toggle("short", short);
    document.documentElement.style.setProperty("--top-h", topEl.offsetHeight + "px");
    const top = Math.min(0.5, Math.max(0.3, (topEl.offsetHeight + 56) / innerHeight));
    // nodes stay above the footer and its cue (two rows on phones)
    const footTop = document.querySelector(".foot").getBoundingClientRect().top;
    const bottom = Math.min(short ? 0.82 : 0.88, (footTop - 26) / innerHeight);
    groups.forEach((g, gi) => {
      if (tall || short) {
        const c = (tall ? TALL_COLONIES : SHORT_COLONIES)[gi];
        g.fx = c[0];
        g.fy = top + (bottom - 0.1 - top) * c[1];
      } else {
        g.fx = g.x;
        g.fy = g.y;
      }
      colonyItems[gi].style.left = g.fx * 100 + "%";
      colonyItems[gi].style.top = g.fy * 100 + "%";
      colonyItems[gi].classList.toggle("flip", !tall && !short && g.fx > 0.72);
      const n = g.items.length;
      const cols = Math.min(4, n), rows = Math.ceil(n / cols);
      g.items.forEach((p, i) => {
        if (tall) {
          const inset = 0.05 * ((i >> 1) & 1);
          p.fx = i % 2 ? 0.84 - inset : 0.16 + inset;
          p.fy = n === 1 ? (top + bottom) / 2 : top + (bottom - top) * i / (n - 1);
        } else if (short) {
          const row = Math.floor(i / cols), col = i % cols;
          p.fx = 0.06 + 0.88 * col / cols;
          p.fy = rows === 1 ? (top + bottom) / 2 : top + (bottom - top) * row / (rows - 1);
        } else {
          p.fx = p.x;
          p.fy = p.y;
        }
      });
    });
    // short screens: a node's label may use its column's width
    document.documentElement.style.setProperty("--col-w", Math.round(innerWidth * 0.22 - 56) + "px");
    groups.forEach(g => placeLabels(g, tall, short));
    placeNodes();
    // When the places move (a browser toolbar showing or hiding, the phone turning, late
    // fonts), the food at the new places is richer for a few seconds, so the network
    // gathers under the rings again instead of lingering beside them. (Repelling the old
    // places would also clear the new ones: they are closer than the repellent's reach.)
    if (fedBefore) {
      const fedNow = foodPoints();
      if (fedBefore.some((f, i) => fedNow[i] && Math.hypot((f.x - fedNow[i].x) * innerWidth, (f.y - fedNow[i].y) * innerHeight) > 6)) {
        regather = now();
      }
    }
  }
  let regather = -1e9; // when the food last moved
  const REGATHER_TIME = 6; // seconds the moved food stays richer

  // Labels must never cover each other, a node or the header and footer. For each node (at
  // its final position) try the preferred side first, then the other side, then the same
  // sides nudged up or down, and keep the first spot that is free and on screen.
  function placeLabels(g, tall, short) {
    const W = innerWidth, H = innerHeight;
    const hit = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
    const taken = [...document.querySelectorAll(".name, .role, .tags, .group-nav, .nav, #foot-agents, .sheet-cue, .hint")]
      .map(e => e.getBoundingClientRect())
      .filter(r => r.width > 0 && r.height > 0)
      .map(r => ({ l: r.left - 4, r: r.right + 4, t: r.top - 4, b: r.bottom + 4 }));
    g.items.forEach(p => {
      const x = p.fx * W, y = p.fy * H;
      taken.push({ l: x - 20, r: x + 20, t: y - 20, b: y + 20 });
    });
    g.items.forEach(p => {
      const li = nodeEls[p.index].li, lab = li.querySelector(".label");
      const w = lab.offsetWidth, h = lab.offsetHeight;
      const x = p.fx * W, y = p.fy * H, gap = 32; // .label sits 50px from the 36px node's edge
      const prefer = tall ? (p.fx > 0.5 ? "left" : "right") : short ? "right" : (p.fx > 0.72 ? "left" : "right");
      const sides = tall || short ? [prefer] : [prefer, prefer === "right" ? "left" : "right"];
      const rectFor = (side, dy) => {
        const l = side === "right" ? x + gap : x - gap - w;
        return { l, r: l + w, t: y - h / 2 + dy, b: y + h / 2 + dy };
      };
      let best = null;
      for (const dy of [0, -0.6 * h, 0.6 * h, -1.2 * h, 1.2 * h]) {
        for (const side of sides) {
          const r = rectFor(side, dy);
          if (r.l < 6 || r.r > W - 6 || r.t < 6 || r.b > H - 6) continue;
          if (taken.some(o => hit(r, o))) continue;
          best = { side, dy, r };
          break;
        }
        if (best) break;
      }
      if (!best) best = { side: sides[0], dy: 0, r: rectFor(sides[0], 0) }; // no free spot: keep the default
      taken.push(best.r);
      li.classList.toggle("flip", best.side === "left");
      lab.style.setProperty("--dy", Math.round(best.dy) + "px");
    });
  }
  layout();
  // The header's height (and so the tall layout) settles once the web fonts arrive.
  if (document.fonts) document.fonts.ready.then(() => { layout(); if (still) settle(); });

  // ---------- Opening and closing a colony ----------
  function abandon(points) {
    if (still) return;
    const t = now();
    abandoned = abandoned.concat(points.map(q => ({ x: q.x, y: q.y, t0: t })));
  }

  function animate(to, dur, done) {
    if (still || reduceMotion) {
      tween = null;
      spread = to;
      placeNodes();
      if (done) done();
      if (still) settle();
      return;
    }
    tween = { from: spread, to, t0: now(), dur: dur * Math.abs(to - spread) || 0.01, done };
  }

  function stepTween(finish) {
    if (!tween) return;
    const k = finish ? 1 : Math.min(1, (now() - tween.t0) / tween.dur);
    spread = tween.from + (tween.to - tween.from) * k;
    placeNodes();
    if (k >= 1) {
      const done = tween.done;
      tween = null;
      if (done) done();
    }
  }

  function openGroup(gi, viaKeyboard) {
    if (gi === open) return;
    track("colony/" + groups[gi].id, groups[gi].label);
    hoverOnColony(-1);
    hoverOnProject(-1);
    abandon(open < 0 ? groups.filter((g, k) => k !== gi).map(g => ({ x: g.fx, y: g.fy })) : groups[open].items.map(posOf));
    open = gi;
    spread = 0;
    body.classList.add("colony-open");
    setShown(gi);
    placeNodes();
    updateNav();
    const g = groups[gi];
    Sound.chime(gi * 3, true, g.fx * 2 - 1);
    signal(g.fx, g.fy, 1.6, gi * 3);
    animate(1, OPEN_TIME);
    if (viaKeyboard) nodeEls[g.items[0].index].btn.focus();
  }

  function closeGroup() {
    if (open < 0) return;
    const gi = open;
    const hadFocus = groupsEl.contains(document.activeElement);
    hoverOnProject(-1);
    abandon(groups[gi].items.map(posOf));
    animate(0, CLOSE_TIME, () => {
      open = -1;
      setShown(-1);
      body.classList.remove("colony-open");
      updateNav();
      if (hadFocus) colonyEls[gi].focus();
    });
  }

  // ---------- Group navigation in the header ----------
  const navBtns = [{ label: "All work" }].concat(groups).map((g, k) => {
    const b = el("button", null, g.label);
    b.type = "button";
    if (k > 0) b.append(el("span", "count", String(g.items.length)));
    b.addEventListener("click", e => (k === 0 ? closeGroup() : openGroup(k - 1, e.detail === 0)));
    groupNav.append(b);
    return b;
  });

  function updateNav() {
    navBtns.forEach((b, k) => b.setAttribute("aria-pressed", k === open + 1));
    hintEl.textContent = open < 0
      ? (touch ? "Drag to disturb the network · tap a colony to open it" : "Move to disturb the network · select a colony to open it")
      : (touch ? "Tap a node to open a project" : "Select a node to open a project · Esc returns to all colonies");
  }
  updateNav();

  // ---------- Floating glass window ----------
  // On the animated field the glass itself is drawn by the simulation (see setGlass in
  // physarum.js), so the window grows out of the clicked node and the rest of the interface
  // fades away. On a still field or without WebGL, CSS frosted glass stands in.
  function centerOf(elem) {
    const r = elem.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  // Only what is in front can be reached by keyboard and screen readers: the entry screen,
  // else an open window, else the sheet, else the field and its header and footer.
  function syncInert() {
    const blocked = gateOpen || body.classList.contains("modal");
    chrome.forEach(c => { c.inert = blocked || sheetOpen; });
    sheet.inert = blocked || !sheetOpen;
  }

  // The simulation draws the glass while it animates; otherwise CSS frosted glass.
  function glassMode() {
    body.classList.toggle("gl-glass", !!sim && !still && !lost && !body.classList.contains("poster"));
  }

  function openWin(build, from) {
    if (!win.hidden) closeWin(true);
    lastFocus = document.activeElement;
    winBody.replaceChildren();
    build(winBody);
    glassMode();
    body.classList.add("modal");
    syncInert();
    winMovingUntil = now() + 0.85; // its grow animation (0.62 s) and the content fading in
    win.style.setProperty("--fx", from.x - innerWidth / 2 + "px");
    win.style.setProperty("--fy", from.y - innerHeight / 2 + "px");
    win.classList.remove("leave");
    win.classList.add("enter");
    win.hidden = false;
    win.querySelector(".win-close").focus({ preventScroll: true });
  }

  function closeWin(instant) {
    if (win.hidden) return false;
    closeLightbox(true);
    openSlug = null;
    const done = () => {
      win.hidden = true;
      winBody.replaceChildren(); // also stops a playing video
      Sound.duck(false);
      win.classList.remove("enter", "leave");
      body.classList.remove("modal");
      syncInert();
      if (lastFocus && !instant) lastFocus.focus({ preventScroll: true });
    };
    if (instant || reduceMotion) {
      done();
      return true;
    }
    win.classList.remove("enter");
    win.classList.add("leave");
    winMovingUntil = now() + 0.4; // its shrink animation (0.26 s)
    win.addEventListener("animationend", function end(e) {
      if (e.target !== win) return;
      win.removeEventListener("animationend", end);
      if (win.classList.contains("leave")) done();
    });
    return true;
  }

  const ICONS = {
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="0.9"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.2L15 12L10 14.8Z"/></svg>',
    external: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 4.5H19.5V10.5M19.5 4.5L11 13M17 14V19.5H4.5V7H10"/></svg>'
  };

  // ---------- Project addresses ----------
  // Each project also has its own page (projects/<slug>/, written by tools/build.py). Opening
  // a project moves the address bar there, so it can be shared, bookmarked and left with the
  // back button; closing it returns to the home address.
  const HOME_TITLE = "Aykut Dağ — Architectural & Computational Designer";
  const projectUrl = p => "/projects/" + p.slug + "/";
  let pushedProject = false; // the open project's address was added to the history here
  let openSlug = null;       // the project in the window, if any

  // The window grows out of the project's node, or out of the middle when it is not on screen.
  function originOf(p) {
    const shown = nodeEls[p.index].li.classList.contains("shown");
    return shown ? centerOf(nodeEls[p.index].btn) : { x: innerWidth / 2, y: innerHeight / 2 };
  }

  // Choosing a project (its node, or its row or card on the sheet): the node chimes and
  // sends a signal, as it always has, and the window opens from where it was chosen.
  function chooseProject(p, from) {
    const q = posOf(p);
    Sound.chime(p.index, true, q.x * 2 - 1);
    signal(q.x, q.y, 1.6, p.index);
    openProject(p, from);
  }

  // A project window: credits, description and responsibilities on the left; video and
  // images on the right. While a video is open the site's own sound steps aside.
  // viaHistory: opened by the address (back / forward, a project page), so nothing is pushed.
  function openProject(p, from, viaHistory) {
    track("project/" + p.glyph, p.title);
    openWin(root => {
      const head = el("header", "win-head");
      head.append(el("div", "p-no", p.no + " · " + groups.find(g => g.id === p.group).label));
      const h = el("h2", null, p.title); h.id = "win-title"; head.append(h);

      const info = el("div", "win-info");
      const dl = el("dl", "credits");
      p.credits.filter(([, v]) => v).forEach(([k, v]) => { dl.append(el("dt", null, k), el("dd", null, v)); });
      info.append(dl);
      [].concat(p.text || []).forEach(t => info.append(el("p", null, t)));
      if (p.duties && p.duties.length) {
        const ul = el("ul", "duties");
        p.duties.forEach(d => ul.append(el("li", null, d)));
        info.append(el("h3", "sub", "Responsibilities"), ul);
      }
      if (p.credit) info.append(el("p", "credit", p.credit));
      const links = (p.links || []).concat(p.video ? [{ label: "Watch on YouTube", href: "https://www.youtube.com/watch?v=" + p.video, icon: "youtube" }] : []);
      if (links.length) {
        const ul = el("ul", "ext");
        links.forEach(l => {
          const a = el("a");
          a.href = l.href; a.target = "_blank"; a.rel = "noopener";
          a.innerHTML = ICONS[l.icon] || "";
          a.append(el("span", null, l.label));
          a.addEventListener("click", () => track("link/" + (l.icon || "external") + "/" + p.glyph, l.label));
          const li = el("li"); li.append(a); ul.append(li);
        });
        info.append(ul);
      }

      const media = el("div", "win-media");
      if (p.video) {
        const box = el("div", "video");
        const f = document.createElement("iframe");
        f.src = "https://www.youtube-nocookie.com/embed/" + p.video + "?rel=0&playsinline=1";
        f.title = p.title + " (video)";
        f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        f.allowFullscreen = true;
        f.referrerPolicy = "strict-origin-when-cross-origin"; // YouTube refuses embeds without a referrer
        box.append(f);
        media.append(box);
      }
      const films = [].concat(p.film || []);
      films.forEach((fm, k) => {
        const box = el("div", "video" + (fm.portrait ? " portrait" : "") + (fm.tall ? " tall" : ""));
        const v = document.createElement("video");
        v.controls = true;
        v.playsInline = true;
        v.preload = "none"; // nothing downloads until the visitor presses play
        v.poster = fm.poster;
        v.src = fm.src;
        v.setAttribute("aria-label", p.title + " (video" + (films.length > 1 ? " " + (k + 1) + " of " + films.length : "") + ")");
        box.append(v);
        media.append(box);
      });
      // each image enlarges into the viewer
      const shots = p.images || [];
      shots.forEach((src, k) => {
        const btn = el("button", "shot");
        btn.type = "button";
        btn.setAttribute("aria-label", "Enlarge image " + (k + 1) + " of " + shots.length);
        const img = el("img");
        img.src = src;
        img.alt = p.title + ", image " + (k + 1) + " of " + shots.length;
        img.loading = "lazy";
        img.decoding = "async";
        btn.append(img);
        btn.addEventListener("click", () => openLightbox(shots, k, p.title, btn));
        media.append(btn);
      });
      if (!p.video && !p.film && !(p.images && p.images.length)) media.append(el("div", "img-slot", "Images to come"));
      const cols = el("div", "win-cols");
      cols.append(info, media);
      root.append(head, cols);
    }, from || originOf(p));
    openSlug = p.slug;
    if (p.video || p.film) Sound.duck(true);
    document.title = p.title + " — Aykut Dağ";
    if (viaHistory) {
      pushedProject = !!(history.state && history.state.pushed);
    } else if (location.pathname !== projectUrl(p)) {
      history.pushState({ project: p.slug, pushed: true }, "", projectUrl(p));
      pushedProject = true;
    }
  }

  // The visitor closes the window: a project's address goes back to the home address.
  function dismiss() {
    if (win.hidden) return false;
    if (location.pathname.startsWith("/projects/")) {
      document.title = HOME_TITLE;
      if (pushedProject) {
        pushedProject = false;
        history.back(); // popstate closes the window
        return true;
      }
      history.replaceState(null, "", "/");
    }
    return closeWin();
  }

  // Back and forward: a project address opens that project; otherwise the window closes and
  // the sheet shows or hides as it was at that point of the history.
  addEventListener("popstate", () => {
    if (closeLightbox(true)) return; // back from the viewer: the window stays
    const m = location.pathname.match(/^\/projects\/([^/]+)\/?$/);
    const p = m && bySlug[m[1]];
    if (p) {
      if (!gateOpen && openSlug !== p.slug) openProject(p, null, true);
      return;
    }
    pushedProject = false;
    document.title = HOME_TITLE;
    closeWin();
    if (history.state && history.state.sheet) openSheet(null, true);
    else closeSheet(true);
  });

  win.querySelector(".win-close").addEventListener("click", () => dismiss());
  addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (!closeLightbox() && !dismiss() && !closeSheet()) closeGroup();
  });

  // ---------- Image viewer ----------
  // A project's images full screen, on a plain dark ground so their colours stay true.
  // Arrows, the arrow keys and a sideways swipe step through them; Esc, the ×, a tap beside
  // the image or the back button return to the window.
  const lb = document.getElementById("lightbox");
  const lbImg = lb.querySelector(".lb-img");
  const lbCount = lb.querySelector(".lb-count");
  let lbList = [], lbAt = 0, lbTitle = "", lbFrom = null;

  function showShot(k) {
    lbAt = (k + lbList.length) % lbList.length;
    lbImg.src = lbList[lbAt];
    lbImg.alt = lbTitle + ", image " + (lbAt + 1) + " of " + lbList.length;
    lbCount.textContent = (lbAt + 1) + " / " + lbList.length;
    [lbAt - 1, lbAt + 1].forEach(j => { new Image().src = lbList[(j + lbList.length) % lbList.length]; });
  }

  function openLightbox(list, k, title, from) {
    lbList = list; lbTitle = title; lbFrom = from;
    lb.classList.toggle("single", list.length < 2);
    showShot(k);
    lb.hidden = false;
    win.inert = true;
    history.pushState(Object.assign({}, history.state, { viewer: true }), "", location.href);
    lb.querySelector(".lb-close").focus({ preventScroll: true });
  }

  // Returns true when the viewer was open. The visitor's close steps back over its history
  // entry (popstate then closes it).
  function closeLightbox(viaHistory) {
    if (lb.hidden) return false;
    if (!viaHistory && history.state && history.state.viewer) {
      history.back();
      return true;
    }
    lb.hidden = true;
    lbImg.removeAttribute("src");
    win.inert = false;
    if (lbFrom && document.contains(lbFrom)) lbFrom.focus({ preventScroll: true });
    return true;
  }

  lb.querySelector(".lb-prev").addEventListener("click", () => showShot(lbAt - 1));
  lb.querySelector(".lb-next").addEventListener("click", () => showShot(lbAt + 1));
  lb.querySelector(".lb-close").addEventListener("click", () => closeLightbox());
  lb.addEventListener("click", e => { if (e.target === lb) closeLightbox(); });
  addEventListener("keydown", e => {
    if (lb.hidden || lbList.length < 2) return;
    if (e.key === "ArrowLeft") showShot(lbAt - 1);
    else if (e.key === "ArrowRight") showShot(lbAt + 1);
  });
  let swipe = null;
  lb.addEventListener("pointerdown", e => { swipe = e.pointerType === "mouse" ? null : { x: e.clientX, y: e.clientY }; });
  lb.addEventListener("pointerup", e => {
    if (!swipe || lbList.length < 2) return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) showShot(lbAt + (dx < 0 ? 1 : -1));
  });

  // ---------- Second layer: the portfolio sheet ----------
  // Scrolling down on the field (the wheel, PageDown / ↓ / Space, or the cue at the bottom,
  // tapped or dragged up) raises a glass sheet with the portfolio as a document: intro,
  // selected work, every project, about and contact. Its sections
  // are plain HTML written by tools/build.py. The sheet stays put while its content scrolls,
  // so the glass the simulation draws behind it never lags the text. It has its own history
  // entry, so the back button lowers it again.
  const cue = document.getElementById("sheet-cue");
  const tabs = [...sheet.querySelectorAll(".sheet-tabs [data-to]")];
  const PULL = 90;      // px of wheel or finger travel that raises or lowers the sheet
  const PEEK_MAX = 150; // px the sheet's edge follows before it rises
  let sheetFocus = null;

  const sectionEl = name => sheetScroll.querySelector('[data-section="' + name + '"]');

  function goToSection(name, instant) {
    const s = sectionEl(name);
    if (!s) return;
    sheetScroll.scrollTo({ top: s.offsetTop - 4, behavior: instant || reduceMotion ? "auto" : "smooth" });
    s.querySelector(".s-head").focus({ preventScroll: true });
  }

  function moving() {
    sheetMoving = true;
    clearTimeout(moving.t);
    moving.t = setTimeout(() => { sheetMoving = false; }, 700); // the rise or fall (0.6 s)
  }

  // The sheet's edge follows a wheel or a finger before it rises (px above its rest).
  function peek(px) {
    glassMode();
    sheet.classList.toggle("dragging", px > 0);
    if (px > 0) sheet.style.setProperty("--peek", Math.min(PEEK_MAX, px) + "px");
    else sheet.style.removeProperty("--peek");
    moving();
  }

  function openSheet(section, viaHistory) {
    if (gateOpen || !win.hidden) return;
    const was = sheetOpen;
    if (!was) {
      sheetOpen = true;
      sheetFocus = document.activeElement;
      hoverOnColony(-1);
      hoverOnProject(-1);
      sheet.classList.remove("dragging");
      sheet.style.removeProperty("--peek");
      sheet.style.removeProperty("--drag");
      glassMode();
      body.classList.add("sheet-open");
      syncInert();
      moving();
      if (!viaHistory && !(history.state && history.state.sheet)) history.pushState({ sheet: true }, "", location.pathname);
    }
    if (section) goToSection(section, !was);
    else if (!was) {
      sheetScroll.scrollTop = 0; // scrolling down from the field starts at the beginning
      sheet.querySelector(".sheet-close").focus({ preventScroll: true });
    }
    markTab(); // also when nothing scrolls (already at the place)
  }

  // Returns true when the sheet was up. The visitor's close goes back in the history when
  // the sheet added an entry there (popstate then lowers it).
  function closeSheet(viaHistory) {
    if (!sheetOpen) return false;
    if (!viaHistory && history.state && history.state.sheet) {
      history.back();
      return true;
    }
    sheetOpen = false;
    sheet.style.removeProperty("--drag");
    body.classList.remove("sheet-open");
    syncInert();
    moving();
    hidePeekImg();
    if (sheet.contains(document.activeElement)) (sheetFocus && document.contains(sheetFocus) ? sheetFocus : viewBtn).focus({ preventScroll: true });
    return true;
  }

  sheet.querySelector(".sheet-close").addEventListener("click", () => closeSheet());
  viewBtn.addEventListener("click", () => { openSheet("projects"); track("index", "Index view opened"); });
  document.querySelectorAll("[data-panel]").forEach(b => b.addEventListener("click", () => {
    const which = b.dataset.panel;
    openSheet(which);
    track(which, which === "about" ? "About opened" : "Contact opened");
  }));
  // The header's CV opens the sheet's CV section (it offers the PDF); with a modifier key,
  // or without scripts, the link opens the PDF itself.
  document.getElementById("cv-link").addEventListener("click", e => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button) { track("cv", "CV opened"); return; }
    e.preventDefault();
    openSheet("cv");
    track("cv/section", "CV section opened");
  });

  // The wheel on the field: the sheet's edge follows, then the sheet rises. On the sheet,
  // pulling further up at the top of its content lowers it again. A pull counts only within
  // one wheel gesture that started at the top, so scrolling up to the top does not close it.
  let pull = 0, pullTimer = 0, lastWheel = 0, gestureFromTop = false;
  addEventListener("wheel", e => {
    if (gateOpen || !win.hidden) return;
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
    const t = now();
    const fresh = t - lastWheel > 0.25;
    lastWheel = t;
    clearTimeout(pullTimer);
    pullTimer = setTimeout(() => { pull = 0; if (!sheetOpen) peek(0); }, 220);
    if (!sheetOpen) {
      if (dy <= 0) return;
      pull += dy;
      if (pull >= PULL) { pull = 0; openSheet(null); track("sheet", "Portfolio sheet opened"); }
      else peek(pull * PEEK_MAX / PULL);
      return;
    }
    if (fresh) { pull = 0; gestureFromTop = sheetScroll.scrollTop <= 0; }
    if (dy >= 0 || !gestureFromTop || sheetScroll.scrollTop > 0) { pull = 0; return; }
    pull -= dy;
    if (pull >= PULL) { pull = 0; closeSheet(); }
  }, { passive: true });

  addEventListener("keydown", e => {
    if (gateOpen || sheetOpen || !win.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    const onPage = !document.activeElement || document.activeElement === body;
    if (e.key === "PageDown" || e.key === "ArrowDown" || (e.key === " " && onPage)) {
      e.preventDefault();
      openSheet(null);
      track("sheet", "Portfolio sheet opened");
    }
  });

  // Dragging: the cue up raises the sheet, the sheet's top bar down lowers it. A short move
  // springs back; a tap on the cue simply opens.
  function dragger(handle, onMove, onEnd) {
    let d = null;
    handle.addEventListener("pointerdown", e => {
      if (e.button) return;
      d = { y0: e.clientY, dy: 0, id: e.pointerId };
    });
    handle.addEventListener("pointermove", e => {
      if (!d || e.pointerId !== d.id) return;
      d.dy = e.clientY - d.y0;
      if (Math.abs(d.dy) > 6 && !handle.hasPointerCapture(d.id)) handle.setPointerCapture(d.id);
      if (Math.abs(d.dy) > 6) onMove(d.dy);
    });
    const end = e => {
      if (!d || e.pointerId !== d.id) return;
      const dy = d.dy;
      d = null;
      if (Math.abs(dy) > 6) { handle.dataset.dragged = "1"; onEnd(dy); }
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }

  dragger(cue, dy => peek(-dy), dy => {
    if (-dy > PULL * 0.8) { openSheet(null); track("sheet", "Portfolio sheet opened"); }
    else peek(0);
  });
  cue.addEventListener("click", () => {
    if (cue.dataset.dragged) { delete cue.dataset.dragged; return; }
    openSheet(null);
    track("sheet", "Portfolio sheet opened");
  });

  const bar = sheet.querySelector(".sheet-bar");
  dragger(bar, dy => {
    sheet.classList.add("dragging");
    sheet.style.setProperty("--drag", Math.max(0, dy) + "px");
    moving();
  }, dy => {
    sheet.classList.remove("dragging");
    sheet.style.removeProperty("--drag");
    if (dy > PULL) closeSheet();
    else moving();
  });
  bar.addEventListener("click", e => { if (bar.dataset.dragged) { delete bar.dataset.dragged; e.stopPropagation(); } }, true);

  // Section tabs, and the tab of the section in view.
  tabs.forEach(b => b.addEventListener("click", () => goToSection(b.dataset.to)));
  let tabRaf = 0;
  function markTab() {
    tabRaf = 0;
    const y = sheetScroll.scrollTop + 120;
    let cur = tabs[0];
    tabs.forEach(b => { const s = sectionEl(b.dataset.to); if (s && s.offsetTop <= y) cur = b; });
    if (sheetScroll.scrollTop > 0 && sheetScroll.scrollTop + sheetScroll.clientHeight >= sheetScroll.scrollHeight - 4) cur = tabs[tabs.length - 1];
    tabs.forEach(b => { if (b === cur) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); });
    const nav = cur.parentElement;
    if (nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: cur.offsetLeft - nav.clientWidth / 2 + cur.offsetWidth / 2, behavior: "smooth" });
  }
  sheetScroll.addEventListener("scroll", () => { if (!tabRaf) tabRaf = requestAnimationFrame(markTab); }, { passive: true });

  // Projects: filter by colony, order by colony or by year (newest first).
  const rowList = sheet.querySelector(".rows");
  const filterBtns = [...sheet.querySelectorAll("[data-filter]")];
  filterBtns.forEach(b => b.addEventListener("click", () => {
    filterBtns.forEach(x => x.setAttribute("aria-pressed", x === b));
    [...rowList.children].forEach(li => { li.hidden = b.dataset.filter !== "all" && li.dataset.group !== b.dataset.filter; });
  }));
  const sortBtns = [...sheet.querySelectorAll("[data-sort]")];
  sortBtns.forEach(b => b.addEventListener("click", () => {
    sortBtns.forEach(x => x.setAttribute("aria-pressed", x === b));
    const byYear = b.dataset.sort === "year";
    [...rowList.children]
      .sort((x, y) => (byYear ? y.dataset.year - x.dataset.year : 0) || x.dataset.order - y.dataset.order)
      .forEach(li => rowList.append(li));
  }));

  // Links to projects (rows and cards) open the project window here; with a
  // modifier key or the middle button they open the project's page in a new tab.
  sheet.addEventListener("click", e => {
    const a = e.target.closest("a[data-slug]");
    if (a && !(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button)) {
      e.preventDefault();
      hidePeekImg();
      chooseProject(bySlug[a.dataset.slug], centerOf(a));
      return;
    }
    const to = e.target.closest(".s [data-to]");
    if (to) goToSection(to.dataset.to);
    const t = e.target.closest("[data-track]");
    if (t) track(t.dataset.track, t.dataset.trackTitle || t.dataset.track);
  });

  // Pointing at a project on the sheet does what pointing at its node does; on desktops a row
  // also shows its preview image beside the pointer.
  const peekImg = el("img", "peek-img");
  peekImg.alt = "";
  peekImg.setAttribute("aria-hidden", "true");
  sheet.append(peekImg);
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  function hidePeekImg() { peekImg.classList.remove("on"); }
  sheet.querySelectorAll("a[data-slug]").forEach(a => {
    const p = bySlug[a.dataset.slug];
    a.addEventListener("mouseenter", () => {
      hoverOnProject(p.index);
      if (finePointer && a.dataset.thumb) { peekImg.src = a.dataset.thumb; peekImg.classList.add("on"); }
    });
    a.addEventListener("mousemove", e => {
      if (!peekImg.classList.contains("on")) return;
      const w = 260, h = peekImg.naturalHeight ? w * peekImg.naturalHeight / peekImg.naturalWidth : 180;
      peekImg.style.transform = "translate(" + Math.min(e.clientX + 28, innerWidth - w - 16) + "px," +
        Math.max(16, Math.min(e.clientY - h / 2, innerHeight - h - 16)) + "px)";
    });
    a.addEventListener("mouseleave", () => { hoverOnProject(-1); hidePeekImg(); });
    a.addEventListener("focus", () => hoverOnProject(p.index));
    a.addEventListener("blur", () => hoverOnProject(-1));
  });

  // ---------- Sound toggle ----------
  // Sound is on; it starts with the entry click, since browsers block audio until a click,
  // tap or key press. The button turns it off and on for this visit only.
  function showSound(on) {
    soundBtn.setAttribute("aria-pressed", on);
    soundBtn.textContent = on ? "Sound on" : "Sound off";
  }
  Sound.set(true, false);
  showSound(true);
  soundBtn.addEventListener("click", () => showSound(Sound.set(!Sound.on)));
  ["pointerdown", "pointerup", "touchend", "keydown", "click"].forEach(type =>
    addEventListener(type, () => { if (!gateOpen) Sound.unlock(); }, { capture: true, passive: true }));
  document.addEventListener("visibilitychange", () => Sound.setHidden(document.hidden));

  // ---------- Entry screen ----------
  // The site opens behind an entry screen; its click (anywhere) starts the sound, since
  // browsers allow audio only after a click, tap or key press.
  const gate = document.getElementById("gate");
  let gateOpen = true;

  // "Welcome" changes language every second, through a short glitch
  const WELCOME = [
    ["en", "Welcome"], ["tr", "Hoş geldiniz"], ["de", "Willkommen"], ["fr", "Bienvenue"],
    ["es", "Bienvenidos"], ["ja", "ようこそ"], ["it", "Benvenuti"], ["ar", "أهلاً وسهلاً"],
    ["el", "Καλώς ήρθατε"], ["ko", "환영합니다"], ["pt", "Boas-vindas"], ["ru", "Добро пожаловать"],
    ["hi", "स्वागत है"], ["nl", "Welkom"], ["zh", "欢迎"], ["sw", "Karibu"], ["he", "ברוכים הבאים"], ["sv", "Välkommen"],
  ];
  const gateName = document.getElementById("gate-name");
  let welcomeAt = 0;
  const welcomeTimer = setInterval(() => {
    welcomeAt = (welcomeAt + 1) % WELCOME.length;
    const [lang, word] = WELCOME[welcomeAt];
    gateName.lang = lang;
    gateName.dataset.text = word; // the glitch slices show the next word first
    gateName.classList.remove("glitch");
    void gateName.offsetWidth; // restart the animation
    gateName.classList.add("glitch");
    setTimeout(() => { gateName.textContent = word; }, 120);
  }, 1000);

  function enter() {
    if (!gateOpen) return;
    gateOpen = false;
    clearInterval(welcomeTimer);
    Sound.set(true);
    body.classList.remove("gated");
    syncInert();
    gate.classList.add("out");
    setTimeout(() => { gate.hidden = true; }, 900);
    track("enter", "Entered the site");
    Sound.chime(5, true, 0);
    signal(0.5, 0.5, 1.6, 5);
    // a project's own page (projects/<slug>/) opens that project once the visitor is in
    const linked = bySlug[body.dataset.project];
    if (linked) openProject(linked, null, true);
  }

  gate.hidden = false;
  body.classList.add("gated");
  syncInert();
  document.getElementById("gate-enter").focus({ preventScroll: true });
  gate.addEventListener("click", enter);

  // ---------- Pointer and touch ----------
  // A finger disturbs the network only while it is down; a mouse while it is over the page.
  addEventListener("pointermove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  addEventListener("pointerdown", e => { mouse.x = mouse.px = e.clientX; mouse.y = mouse.py = e.clientY; });
  const lift = e => { if (e.pointerType !== "mouse") mouse.x = -1; };
  addEventListener("pointerup", lift);
  addEventListener("pointercancel", lift);
  document.documentElement.addEventListener("mouseleave", () => { mouse.x = -1; });

  // ---------- Simulation and quality ----------
  // Tiers are trail sizes in megapixels; the canvas renders at the same size. A device starts
  // at a tier that suits it, and while frames take too long the governor steps down. Below the
  // last tier the network stops animating and is drawn once per change (still). Devices that
  // cannot run it at all, or render in software, show a poster image of the network instead.
  const TIERS = [4, 2.4, 1.4, 0.9, 0.55, 0.32, 0.2];
  const SLOW_MS = 30;     // median frame time that counts as too slow (about 33 fps)
  const TARGET_MS = 20;   // what a step down aims for
  const DENSITY = 0.22;   // agents per trail pixel
  let tier = 0;
  let running = false;
  let lost = false;

  function startTier() {
    const forced = parseInt(params.get("tier"), 10);
    if (forced >= 0 && forced < TIERS.length) return forced;
    if (!touch) return 0;
    // Phones with 3x screens (an iPhone 16 Pro ran tier 3 at a steady 60 fps) start one tier
    // sharper; other phones at 0.9 MP, tablets at 1.4 MP. The governor steps down if needed.
    if (Math.min(innerWidth, innerHeight) >= 600) return TIERS.indexOf(1.4);
    return TIERS.indexOf((devicePixelRatio || 1) >= 3 ? 1.4 : 0.9);
  }

  function scaleFor(t) { // trail pixels per CSS pixel
    return Math.min(devicePixelRatio || 1, 2, Math.sqrt(TIERS[t] * 1e6 / (innerWidth * innerHeight)));
  }

  function applyTier() {
    // phones: a dimmer field, since small labels sit closer to bright filaments
    sim.params.brightness = innerWidth < 720 || innerHeight < 560 ? 0.5 : 0.72;
    sim.resize(innerWidth, innerHeight, scaleFor(tier), DENSITY, foodPoints());
    gov.reset();
    document.getElementById("foot-agents").textContent =
      "Physarum polycephalum · " + sim.agentCount.toLocaleString("en") + " agents";
  }

  // Frame-time governor. Frame times include waiting for the GPU, so a slow GPU shows up as
  // long frames. If stepping down does not make frames shorter, the frame rate is capped by
  // something else (a 30 Hz power-saving mode, for example) and it stops stepping down.
  const gov = {
    deltas: [], t0: 0, skip: 0, prev: 0, locked: false,
    reset() { this.deltas = []; this.skip = 12; this.t0 = 0; },
    add(dt) {
      if (this.locked || still || params.has("tier")) return;
      if (dt <= 0 || dt > 250) return; // tab hidden or the page stalled: not rendering cost
      if (this.skip > 0) { this.skip--; return; }
      if (!this.t0) this.t0 = now();
      this.deltas.push(dt);
      if (this.deltas.length < 40 && !(this.deltas.length >= 8 && now() - this.t0 > 1.5)) return;
      const m = this.deltas.slice().sort((a, b) => a - b)[this.deltas.length >> 1];
      this.deltas = []; this.t0 = 0;
      if (m <= SLOW_MS) { this.prev = 0; return; }
      if (this.prev && m > this.prev * 0.9) { this.locked = true; return; }
      this.prev = m;
      // cost is roughly proportional to pixels: jump as far down as the slowdown suggests
      const want = TIERS[tier] * TARGET_MS / m;
      let next = tier + 1;
      while (next < TIERS.length - 1 && TIERS[next] > want) next++;
      if (tier === TIERS.length - 1) goStill();
      else { tier = next; applyTier(); }
    }
  };

  // Food sources: the three colonies, or the projects of the open colony.
  function foodPoints() {
    if (open < 0) {
      return groups.map((g, gi) => ({ x: g.fx, y: g.fy, s: gi === hoverColony ? 3 : 1.6, tone: gi * 3 }));
    }
    return groups[open].items.map(p => {
      const q = posOf(p);
      return { x: q.x, y: q.y, s: p.index === hoverProject ? 2.5 : 0.9, tone: p.index };
    });
  }

  // Abandoned sources repel (negative strength), fading out over ABANDON_TIME.
  function repellents() {
    const t = now();
    abandoned = abandoned.filter(a => t - a.t0 < ABANDON_TIME);
    return abandoned.map(a => ({ x: a.x, y: a.y, s: -0.12 * (1 - (t - a.t0) / ABANDON_TIME) }));
  }

  function feed(breath) {
    // breathing, and up to three times richer just after the food has moved (see layout)
    const b = (0.85 + 0.3 * breath) * (1 + 2 * Math.max(0, 1 - (now() - regather) / REGATHER_TIME));
    sim.setFood(foodPoints().map(f => ({ x: f.x, y: f.y, s: f.s * b })).concat(repellents()));
    const active = mouse.x >= 0 && !sheetOpen && win.hidden;
    sim.setMouse(
      Math.max(0, mouse.x) / innerWidth, Math.max(0, mouse.y) / innerHeight,
      active ? Math.min(1, 0.15 + mouse.speed * 0.06) : 0
    );
    const t = now();
    signals = signals.filter(g => t - g.t0 < SIGNAL_LIFE);
    sim.setSignals(signals.map(g => ({ x: g.x, y: g.y, age: t - g.t0, s: g.s })));
  }

  // The glass follows the on-screen box of the window, or else of the sheet, so it tracks
  // their CSS animations; a second pane sits under the header's name block and fades with the
  // header. The rim light turns toward the pointer.
  const light = { x: -0.6, y: 0.8 };
  const identCard = topEl.querySelector(".ident-card");
  function paneGlass(el, alpha, dim) {
    const r = el.getBoundingClientRect();
    if (alpha < 0.01 || r.width < 1 || r.top >= innerHeight) return null;
    const cs = getComputedStyle(el);
    return {
      x: r.left, y: r.top, w: r.width, h: r.height,
      r: (parseFloat(cs.borderTopLeftRadius) || 30) * r.width / el.offsetWidth,
      a: alpha * parseFloat(cs.opacity), dim
    };
  }
  function updateGlass() {
    const glassy = body.classList.contains("gl-glass");
    const pane = !win.hidden ? win : (sheetOpen || sheetMoving) ? sheet : null;
    const main = glassy && pane ? paneGlass(pane, 1, 0.22) : null;
    const ident = glassy ? paneGlass(identCard, parseFloat(getComputedStyle(topEl).opacity), 0) : null;
    const lit = main || ident; // the light turns around the pane in front
    if (lit && mouse.x >= 0) {
      light.x += (mouse.x - (lit.x + lit.w / 2) - light.x) * 0.15;
      light.y += ((lit.y + lit.h / 2) - mouse.y - light.y) * 0.15;
    }
    if (main) { main.lx = light.x; main.ly = light.y; }
    if (ident) { ident.lx = light.x; ident.ly = light.y; }
    sim.setGlass(main, 0);
    sim.setGlass(ident, 1);
  }

  // Still mode: grow a network for the current food and draw it once (CSS glass then).
  function settle() {
    if (!sim || lost) return;
    feed(0.5);
    for (let i = 0; i < 400; i++) sim.step();
    sim.setGlass(null, 0);
    sim.setGlass(null, 1);
    sim.render(0.5);
  }

  function goStill() {
    still = true;
    running = false;
    stepTween(true);
    abandoned = [];
    glassMode();
    settle();
  }

  function showPoster(on) {
    body.classList.toggle("poster", on);
    glassMode();
  }

  function startSim() {
    status.why = "";
    try {
      sim = Physarum.create(canvas);
      if (!sim) status.why = Physarum.failure;
    } catch (err) {
      console.error(err);
      status.why = "create: " + err.message;
      sim = null;
    }
    if (sim && sim.info.software && !params.has("gl")) { status.why = "software renderer"; sim = null; }
    window.physarum = sim; // handy for tuning sim.params from the console
    if (!sim) {
      still = true;
      showPoster(true);
      return;
    }
    showPoster(false);
    try {
      applyTier();
    } catch (err) {
      console.error(err);
      status.why = "resize: " + err.message;
      sim = null;
      still = true;
      showPoster(true);
      return;
    }
    if (still) settle();
    else if (!running) { running = true; requestAnimationFrame(frame); }
  }

  // Mobile browsers drop WebGL contexts under memory pressure or in the background.
  canvas.addEventListener("webglcontextlost", e => {
    e.preventDefault();
    lost = true;
    status.lost++;
    status.why = "context lost";
    showPoster(true);
  });
  canvas.addEventListener("webglcontextrestored", () => {
    lost = false;
    startSim();
  });

  let resizeTimer;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      layout();
      if (sim && !lost) {
        applyTier();
        if (still) settle();
      }
    }, 200);
  });

  // The organism fires a signal from a random food source every few seconds.
  let nextSignal = now() + 1.5;
  let lastTs = 0;
  let tick = 0;
  const t0 = now();

  // The organism takes STEP_RATE steps a second on every screen, as on a 60 Hz phone. (It
  // used to take two steps per frame, so a 144 Hz monitor ran it nearly five times faster
  // and the network scattered.) It is drawn after its steps, so its hair-thin trails look
  // the same at any refresh rate; while the glass of a window or the sheet moves, every
  // frame, so the glass keeps up with the box. Behind the resting sheet the field is only a
  // frosted backdrop and goes at half the rate.
  const STEP_RATE = 60;
  let stepDebt = 0;          // steps owed for the time that has passed
  let drawnAt = 0;           // when the field was last drawn (the governor's frame time)
  let winMovingUntil = 0;    // the window is growing or shrinking until then (s)

  function frame(ts) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = lastTs ? ts - lastTs : 0;
    lastTs = ts;
    if (lost || !sim) return;
    const backdrop = sheetOpen && !sheetMoving;
    try {
      // the pointer is sampled as it always was (every frame, every other behind the sheet)
      if (!(backdrop && (tick++ & 1))) {
        if (mouse.px >= 0 && mouse.x >= 0) {
          const d = Math.hypot(mouse.x - mouse.px, mouse.y - mouse.py);
          mouse.speed += (d - mouse.speed) * 0.2;
        } else mouse.speed *= 0.9;
        mouse.px = mouse.x; mouse.py = mouse.y;
        Sound.activity(mouse.speed, Math.max(0, mouse.x) / innerWidth);
      }
      stepTween(); // the nodes' spread follows the display

      // at most 3 steps at once, so a stall does not make the network lurch
      stepDebt = Math.min(stepDebt + dt * (backdrop ? STEP_RATE / 2 : STEP_RATE) / 1000, 3);
      const steps = Math.floor(stepDebt);
      if (!steps && !sheetMoving && now() >= winMovingUntil) return; // nothing new to draw
      stepDebt -= steps;
      if (!backdrop) gov.add(drawnAt ? ts - drawnAt : 0);
      drawnAt = ts;
      if (!running) return; // the governor switched to still

      const t = now() - t0;
      const breath = 0.5 + 0.5 * Math.sin((t / BREATH_PERIOD) * Math.PI * 2);

      if (!reduceMotion && now() > nextSignal) {
        const pts = foodPoints();
        const f = pts[Math.floor(Math.random() * pts.length)];
        signal(f.x, f.y, 0.7, f.tone);
        nextSignal = now() + 2.5 + Math.random() * 3;
      }

      feed(breath);
      for (let i = 0; i < steps; i++) sim.step();
      status.steps += steps;
      updateGlass();
      sim.render(breath);
      status.frames++;
      if (debugGl && status.frames % 30 === 0) status.hash = pixelHash();
    } catch (err) {
      // Never leave a broken canvas on screen: fall back to the poster image.
      console.error(err);
      status.why = "frame: " + err.message;
      running = false;
      sim = null;
      still = true;
      showPoster(true);
    }
  }

  // ---------- ?debug readout ----------
  // A hash of a block of drawn pixels, read right after rendering: if it keeps changing the
  // simulation is drawing new frames, so a still screen would mean the browser is not showing them.
  const debugGl = params.has("debug");
  function pixelHash() {
    const gl = canvas.getContext("webgl2"); // the simulation's context (created with its own attributes)
    const n = 32, px = new Uint8Array(n * n * 4);
    gl.readPixels((canvas.width - n) >> 1, (canvas.height - n) >> 1, n, n, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let h = 0;
    for (let i = 0; i < px.length; i++) h = (h * 31 + px[i]) >>> 0;
    return h.toString(16).slice(-5);
  }

  if (params.has("debug")) {
    const box = el("div", "debug");
    body.append(box);
    let raf = 0, last = performance.now(), simLast = 0, stepsLast = 0;
    (function count() { raf++; requestAnimationFrame(count); })();
    setInterval(() => {
      try {
        const t = performance.now(), sec = (t - last) / 1000;
        const fps = Math.round(raf / sec), simFps = Math.round((status.frames - simLast) / sec);
        const stepsPerSec = Math.round((status.steps - stepsLast) / sec);
        raf = 0; simLast = status.frames; stepsLast = status.steps; last = t;
        box.textContent = [
          fps + " fps (sim " + simFps + ", " + stepsPerSec + " steps/s)",
          "frames " + status.frames + (status.hash ? " #" + status.hash : ""),
          sim ? "tier " + tier + " " + sim.size.join("×") : "poster",
          sim ? sim.agentCount.toLocaleString("en") + " agents" : "",
          still ? "still" : (running ? "live" : "stopped"),
          reduceMotion ? "reduce motion" : "",
          "sound " + (Sound.on ? "on" : "off") + " (" + Sound.state + ")",
          gov.locked ? "locked" : "",
          status.why ? "why: " + status.why : "",
          status.lost ? "lost " + status.lost : "",
          status.errors.length ? "error: " + status.errors[status.errors.length - 1].slice(0, 120) : "",
          sim ? sim.info.renderer : "",
          innerWidth + "×" + innerHeight + " @" + (devicePixelRatio || 1)
        ].filter(Boolean).join(" · ");
      } catch (err) {
        box.textContent = "debug: " + err.message + " · " + status.errors.join(" | ");
      }
    }, 500);
  }

  tier = startTier();
  // The first network grows where the colonies finally sit. Their places depend on the
  // header's height, which settles once the web fonts arrive, so wait for those (at most
  // 1.2 s, while the entry screen is up). Otherwise it would grow beside the rings.
  const fontsIn = document.fonts
    ? Promise.all(['400 13px "Instrument Sans"', '500 30px "Instrument Sans"', '11px "JetBrains Mono"']
        .map(f => document.fonts.load(f))).catch(() => {})
    : Promise.resolve();
  Promise.race([fontsIn, new Promise(r => setTimeout(r, 1200))]).then(() => {
    layout();
    startSim();
  });
})();
