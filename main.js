(function () {
  const BREATH_PERIOD = 24; // seconds, matches the drone LFO in sound.js
  const SIGNAL_LIFE = 3.5;  // seconds a signal keeps travelling
  const OPEN_TIME = 1.4;    // seconds for a colony's projects to spread out
  const CLOSE_TIME = 0.7;   // seconds for them to be drawn back in
  const ABANDON_TIME = 3;   // seconds an abandoned food source keeps pushing the network away
  const body = document.body;
  const canvas = document.getElementById("field");
  const coloniesEl = document.getElementById("colonies");
  const groupsEl = document.getElementById("groups");
  const groupNav = document.getElementById("group-nav");
  const hintEl = document.getElementById("hint");
  const win = document.getElementById("win");
  const winBody = document.getElementById("win-body");
  const chrome = [document.querySelector(".top"), document.querySelector("main"), document.querySelector(".foot")];
  const GLASS_RADIUS = 30;  // px, same as .win border-radius in style.css
  const viewBtn = document.getElementById("toggle-view");
  const soundBtn = document.getElementById("sound");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const groups = GROUPS.map(g => Object.assign({ items: [] }, g));
  PROJECTS.forEach((p, i) => {
    p.index = i;
    p.no = String(i + 1).padStart(2, "0");
    groups.find(g => g.id === p.group).items.push(p);
  });

  let open = -1;     // index of the open colony; -1 shows the three colonies
  let spread = 0;    // 0 = projects gathered at their colony, 1 = in place
  let tween = null;  // { from, to, t0, dur, done }
  let hoverColony = -1;
  let hoverProject = -1;
  let lastFocus = null;
  let signals = [];
  let abandoned = []; // { x, y, t0 }: food sources the organism has just left
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
  function posOf(p) {
    const g = groups.find(g => g.id === p.group);
    const k = ease(spread);
    return { x: g.x + (p.x - g.x) * k, y: g.y + (p.y - g.y) * k };
  }

  // ---------- Colonies ----------
  const colonyEls = groups.map((g, gi) => {
    const li = el("li", "colony-item" + (g.x > 0.72 ? " flip" : ""));
    li.style.left = g.x * 100 + "%";
    li.style.top = g.y * 100 + "%";
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
    return btn;
  });

  function hoverOnColony(gi) {
    if (gi === hoverColony) return;
    hoverColony = gi;
    if (gi >= 0) {
      const g = groups[gi];
      Sound.chime(gi * 3, false, g.x * 2 - 1);
      signal(g.x, g.y, 1, gi * 3);
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
      const li = el("li", "node-item" + (p.x > 0.72 ? " flip" : ""));
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

  // ---------- Opening and closing a colony ----------
  function abandon(points) {
    if (reduceMotion) return;
    const t = now();
    abandoned = abandoned.concat(points.map(q => ({ x: q.x, y: q.y, t0: t })));
  }

  function animate(to, dur, done) {
    if (reduceMotion) {
      spread = to;
      placeNodes();
      if (done) done();
      settle();
      return;
    }
    tween = { from: spread, to, t0: now(), dur: dur * Math.abs(to - spread) || 0.01, done };
  }

  function stepTween() {
    if (!tween) return;
    const k = Math.min(1, (now() - tween.t0) / tween.dur);
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
    abandon(open < 0 ? groups.filter((g, k) => k !== gi) : groups[open].items.map(posOf));
    open = gi;
    spread = 0;
    body.classList.add("colony-open");
    setShown(gi);
    placeNodes();
    updateNav();
    const g = groups[gi];
    Sound.chime(gi * 3, true, g.x * 2 - 1);
    signal(g.x, g.y, 1.6, gi * 3);
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
      ? "Move to disturb the network · select a colony to open it"
      : "Select a node to open a project · Esc returns to all colonies";
  }
  updateNav();

  // ---------- Floating glass window ----------
  // On the field the glass itself is drawn by the simulation (see setGlass in physarum.js),
  // so the window grows out of the clicked node and the rest of the interface fades away.
  // In the index view, or without WebGL, CSS frosted glass stands in.
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
    body.classList.toggle("gl-glass", !!sim && !isList());
    body.classList.add("modal");
    chrome.forEach(c => { c.inert = true; });
    win.style.setProperty("--fx", from.x - innerWidth / 2 + "px");
    win.style.setProperty("--fy", from.y - innerHeight / 2 + "px");
    win.classList.remove("leave");
    win.classList.add("enter");
    win.hidden = false;
    win.querySelector(".win-close").focus({ preventScroll: true });
    if (reduceMotion && sim) redraw();
  }

  function closeWin(instant) {
    if (win.hidden) return false;
    const done = () => {
      win.hidden = true;
      win.classList.remove("enter", "leave");
      body.classList.remove("modal");
      chrome.forEach(c => { c.inert = false; });
      if (lastFocus && !instant) lastFocus.focus({ preventScroll: true });
      if (reduceMotion && sim) redraw();
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
  }
  viewBtn.addEventListener("click", () => setList(!isList()));
  if (innerWidth < 720) setList(true);

  soundBtn.addEventListener("click", () => {
    const on = Sound.toggle();
    soundBtn.setAttribute("aria-pressed", on);
    soundBtn.textContent = on ? "Sound on" : "Sound off";
  });

  // ---------- Simulation ----------
  let sim = null;
  try { sim = Physarum.create(canvas); } catch (err) { console.error(err); }
  window.physarum = sim; // handy for tuning sim.params from the console
  if (!sim) {
    canvas.remove();
    setList(true);
    viewBtn.hidden = true;
    return;
  }

  // Food sources: the three colonies, or the projects of the open colony.
  function foodPoints() {
    if (open < 0) {
      return groups.map((g, gi) => ({ x: g.x, y: g.y, s: gi === hoverColony ? 3 : 1.6, tone: gi * 3 }));
    }
    return groups[open].items.map(p => {
      const q = posOf(p);
      return { x: q.x, y: q.y, s: p.index === hoverProject ? 2.5 : 0.9, tone: p.index };
    });
  }

  function resize() {
    const dpr = devicePixelRatio || 1;
    canvas.width = Math.round(innerWidth * Math.min(dpr, 2));
    canvas.height = Math.round(innerHeight * Math.min(dpr, 2));
    sim.resize(innerWidth, innerHeight, dpr, innerWidth < 720 ? 0.15 : 0.25, foodPoints());
    document.getElementById("foot-agents").textContent =
      "Physarum polycephalum · " + sim.agentCount.toLocaleString("en") + " agents";
  }
  let resizeTimer;
  addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 200); });
  resize();

  addEventListener("pointermove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  document.addEventListener("pointerleave", () => { mouse.x = -1; });

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
    sim.setGlass({
      x: r.left, y: r.top, w: r.width, h: r.height,
      r: GLASS_RADIUS * r.width / win.offsetWidth,
      a: parseFloat(getComputedStyle(win).opacity),
      lx: light.x, ly: light.y
    });
  }

  // Reduced motion: grow a still network for the current food instead of animating.
  function settle() {
    feed(0.5);
    for (let i = 0; i < 400; i++) sim.step();
    redraw();
  }

  function redraw() {
    updateGlass();
    sim.render(0.5);
  }

  // The organism fires a signal from a random food source every few seconds.
  let nextSignal = now() + 1.5;

  const t0 = now();
  function frame() {
    const t = now() - t0;
    const breath = 0.5 + 0.5 * Math.sin((t / BREATH_PERIOD) * Math.PI * 2);

    if (mouse.px >= 0 && mouse.x >= 0) {
      const d = Math.hypot(mouse.x - mouse.px, mouse.y - mouse.py);
      mouse.speed += (d - mouse.speed) * 0.2;
    } else mouse.speed *= 0.9;
    mouse.px = mouse.x; mouse.py = mouse.y;
    Sound.activity(mouse.speed, Math.max(0, mouse.x) / innerWidth);

    stepTween();

    if (now() > nextSignal) {
      const pts = foodPoints();
      const f = pts[Math.floor(Math.random() * pts.length)];
      signal(f.x, f.y, 0.7, f.tone);
      nextSignal = now() + 2.5 + Math.random() * 3;
    }

    feed(breath);
    sim.step();
    sim.step();
    updateGlass();
    sim.render(breath);
    requestAnimationFrame(frame);
  }

  if (reduceMotion) settle();
  else requestAnimationFrame(frame);
})();
