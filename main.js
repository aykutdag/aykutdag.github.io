(function () {
  // ?debug shows a diagnosis readout; ?tier=N forces a quality tier; ?gl=1 runs the
  // simulation even on a software renderer (for testing).
  const params = new URLSearchParams(location.search);
  // What the ?debug readout reports: why the simulation is not running (if so), how many
  // frames it has drawn, a hash of the drawn pixels (it changes while the field moves),
  // lost WebGL contexts and any errors.
  const status = { why: "", frames: 0, lost: 0, hash: "", errors: [] };
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
  const chrome = [topEl, document.querySelector("main"), document.querySelector(".foot")];
  const viewBtn = document.getElementById("toggle-view");
  const soundBtn = document.getElementById("sound");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = matchMedia("(pointer: coarse)").matches ||
    (navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) < 900);

  const groups = GROUPS.map(g => Object.assign({ items: [] }, g));
  PROJECTS.forEach((p, i) => {
    p.index = i;
    p.no = String(i + 1).padStart(2, "0");
    groups.find(g => g.id === p.group).items.push(p);
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
  const now = () => performance.now() / 1000;
  const ease = t => 1 - Math.pow(1 - t, 3);
  const isList = () => body.classList.contains("list");

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
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
      btn.innerHTML = '<span class="mark">' + glyphSVG(p.glyph) + '</span><span class="label"><span class="no"></span><span class="title"></span><span class="meta"></span></span>';
      btn.querySelector(".no").textContent = p.no;
      btn.querySelector(".title").textContent = p.title;
      btn.querySelector(".meta").textContent = p.meta;
      btn.addEventListener("mouseenter", () => hoverOnProject(p.index));
      btn.addEventListener("focus", () => hoverOnProject(p.index));
      btn.addEventListener("mouseleave", () => hoverOnProject(-1));
      btn.addEventListener("blur", () => hoverOnProject(-1));
      btn.addEventListener("click", () => {
        const q = posOf(p);
        Sound.chime(p.index, true, q.x * 2 - 1);
        signal(q.x, q.y, 1.6, p.index);
        openProject(p);
      });
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

  function layout() {
    const tall = innerHeight > innerWidth * 1.15;
    const short = !tall && innerHeight < 560;
    body.classList.toggle("tall", tall);
    body.classList.toggle("short", short);
    document.documentElement.style.setProperty("--top-h", topEl.offsetHeight + "px");
    const top = Math.min(0.5, Math.max(0.3, (topEl.offsetHeight + 56) / innerHeight));
    const bottom = short ? 0.82 : 0.88;
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
        nodeEls[p.index].li.classList.toggle("flip", tall ? p.fx > 0.5 : !short && p.fx > 0.72);
      });
    });
    // short screens: a node's label may use its column's width
    document.documentElement.style.setProperty("--col-w", Math.round(innerWidth * 0.22 - 56) + "px");
    placeNodes();
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
    if (isList()) {
      sections[gi].scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      return;
    }
    if (gi === open) return;
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
    if (isList()) {
      document.querySelector("main").scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      return;
    }
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
  // fades away. In the index view, on a still field or without WebGL, CSS frosted glass stands in.
  function centerOf(elem) {
    const r = elem.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function openWin(build, from, small) {
    if (!win.hidden) closeWin(true);
    lastFocus = document.activeElement;
    winBody.replaceChildren();
    build(winBody);
    win.classList.toggle("small", !!small);
    body.classList.toggle("gl-glass", !!sim && !still && !isList());
    body.classList.add("modal");
    chrome.forEach(c => { c.inert = true; });
    win.style.setProperty("--fx", from.x - innerWidth / 2 + "px");
    win.style.setProperty("--fy", from.y - innerHeight / 2 + "px");
    win.classList.remove("leave");
    win.classList.add("enter");
    win.hidden = false;
    win.querySelector(".win-close").focus({ preventScroll: true });
  }

  function closeWin(instant) {
    if (win.hidden) return false;
    const done = () => {
      win.hidden = true;
      win.classList.remove("enter", "leave");
      body.classList.remove("modal");
      chrome.forEach(c => { c.inert = false; });
      if (lastFocus && !instant) lastFocus.focus({ preventScroll: true });
    };
    if (instant || reduceMotion) {
      done();
      return true;
    }
    win.classList.remove("enter");
    win.classList.add("leave");
    win.addEventListener("animationend", function end(e) {
      if (e.target !== win) return;
      win.removeEventListener("animationend", end);
      if (win.classList.contains("leave")) done();
    });
    return true;
  }

  function openProject(p) {
    openWin(root => {
      const head = el("header", "win-head");
      head.append(el("div", "p-no", p.no + " · " + groups.find(g => g.id === p.group).label));
      const h = el("h2", null, p.title); h.id = "win-title"; head.append(h);
      const info = el("div", "win-info");
      const dl = el("dl");
      [["Location", p.place], ["Year", p.year], ["Type", p.type], ["Context", p.office], ["Role", p.role]]
        .filter(([, v]) => v)
        .forEach(([k, v]) => { dl.append(el("dt", null, k), el("dd", null, v)); });
      info.append(dl, el("p", null, p.text));
      if (p.credit) info.append(el("p", "credit", p.credit));
      const media = el("div", "win-media");
      if (p.images && p.images.length) {
        p.images.forEach((src, k) => {
          const img = el("img");
          img.src = src;
          img.alt = p.title + ", image " + (k + 1);
          img.loading = "lazy";
          img.decoding = "async";
          media.append(img);
        });
      } else {
        media.append(el("div", "img-slot", "Images to come"));
      }
      const cols = el("div", "win-cols");
      cols.append(info, media);
      root.append(head, cols);
    }, centerOf(nodeEls[p.index].btn));
  }

  document.querySelectorAll("[data-panel]").forEach(b => b.addEventListener("click", () => {
    const which = b.dataset.panel;
    openWin(root => {
      const h = el("h2", null, which === "about" ? "About" : "Contact"); h.id = "win-title";
      root.append(h);
      if (which === "about") {
        ABOUT.text.forEach(t => root.append(el("p", null, t)));
      } else {
        const ul = el("ul", "links");
        CONTACT.forEach(c => {
          const a = el("a", null, c.label); a.href = c.href;
          if (!c.href.startsWith("mailto:")) { a.target = "_blank"; a.rel = "noopener"; }
          const li = el("li"); li.append(a); ul.append(li);
        });
        root.append(ul);
      }
    }, centerOf(b), true);
  }));

  win.querySelector(".win-close").addEventListener("click", () => closeWin());
  addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (!closeWin() && !isList()) closeGroup();
  });

  // ---------- View + sound toggles ----------
  function setList(on) {
    body.classList.toggle("list", on);
    viewBtn.setAttribute("aria-pressed", on);
    viewBtn.textContent = on ? "Field" : "Index";
    layout();
  }
  viewBtn.addEventListener("click", () => setList(!isList()));

  soundBtn.addEventListener("click", () => {
    const on = Sound.toggle();
    soundBtn.setAttribute("aria-pressed", on);
    soundBtn.textContent = on ? "Sound on" : "Sound off";
  });

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
    const b = 0.85 + 0.3 * breath;
    sim.setFood(foodPoints().map(f => ({ x: f.x, y: f.y, s: f.s * b })).concat(repellents()));
    const active = mouse.x >= 0 && !isList() && win.hidden;
    sim.setMouse(
      Math.max(0, mouse.x) / innerWidth, Math.max(0, mouse.y) / innerHeight,
      active ? Math.min(1, 0.15 + mouse.speed * 0.06) : 0
    );
    const t = now();
    signals = signals.filter(g => t - g.t0 < SIGNAL_LIFE);
    sim.setSignals(signals.map(g => ({ x: g.x, y: g.y, age: t - g.t0, s: g.s })));
  }

  // The glass follows the window's on-screen box, so it tracks the CSS open/close animation.
  // Its rim light turns toward the pointer.
  const light = { x: -0.6, y: 0.8 };
  function updateGlass() {
    if (win.hidden || !body.classList.contains("gl-glass")) { sim.setGlass(null); return; }
    const r = win.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (mouse.x >= 0) {
      light.x += (mouse.x - cx - light.x) * 0.15;
      light.y += (cy - mouse.y - light.y) * 0.15;
    }
    const cs = getComputedStyle(win);
    sim.setGlass({
      x: r.left, y: r.top, w: r.width, h: r.height,
      r: (parseFloat(cs.borderTopLeftRadius) || 30) * r.width / win.offsetWidth,
      a: parseFloat(cs.opacity),
      lx: light.x, ly: light.y
    });
  }

  // Still mode: grow a network for the current food and draw it once.
  function settle() {
    if (!sim || lost) return;
    feed(0.5);
    for (let i = 0; i < 400; i++) sim.step();
    sim.setGlass(null);
    sim.render(0.5);
  }

  function goStill() {
    still = true;
    running = false;
    stepTween(true);
    abandoned = [];
    settle();
  }

  function showPoster(on) {
    body.classList.toggle("poster", on);
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

  function frame(ts) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = lastTs ? ts - lastTs : 0;
    lastTs = ts;
    if (lost || !sim) return;
    // In the index view the field is only a dim backdrop: half the frames are enough.
    if (isList() && (tick++ & 1)) return;
    try {
      if (!isList()) gov.add(dt);
      if (!running) return; // the governor switched to still

      const t = now() - t0;
      const breath = 0.5 + 0.5 * Math.sin((t / BREATH_PERIOD) * Math.PI * 2);
      if (mouse.px >= 0 && mouse.x >= 0) {
        const d = Math.hypot(mouse.x - mouse.px, mouse.y - mouse.py);
        mouse.speed += (d - mouse.speed) * 0.2;
      } else mouse.speed *= 0.9;
      mouse.px = mouse.x; mouse.py = mouse.y;
      Sound.activity(mouse.speed, Math.max(0, mouse.x) / innerWidth);

      stepTween();

      if (!reduceMotion && now() > nextSignal) {
        const pts = foodPoints();
        const f = pts[Math.floor(Math.random() * pts.length)];
        signal(f.x, f.y, 0.7, f.tone);
        nextSignal = now() + 2.5 + Math.random() * 3;
      }

      feed(breath);
      sim.step();
      if (!reduceMotion) sim.step();
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
    let raf = 0, last = performance.now(), simLast = 0;
    (function count() { raf++; requestAnimationFrame(count); })();
    setInterval(() => {
      try {
        const t = performance.now(), sec = (t - last) / 1000;
        const fps = Math.round(raf / sec), simFps = Math.round((status.frames - simLast) / sec);
        raf = 0; simLast = status.frames; last = t;
        box.textContent = [
          fps + " fps (sim " + simFps + ")",
          "frames " + status.frames + (status.hash ? " #" + status.hash : ""),
          sim ? "tier " + tier + " " + sim.size.join("×") : "poster",
          sim ? sim.agentCount.toLocaleString("en") + " agents" : "",
          still ? "still" : (running ? "live" : "stopped"),
          reduceMotion ? "reduce motion" : "",
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
  startSim();
})();
