// GPU slime-mold (Physarum polycephalum) simulation, after Jeff Jones (2010).
// Behaviour is the classic biological model: agents sense the trail ahead,
// turn towards it, move and deposit; the trail diffuses and decays; food
// sources (project nodes) keep feeding it. The cursor disturbs the organism:
// it scatters agents and tears the trail, and the network grows back.
// The "digital" look comes only from rendering (see FS_RENDER).
window.Physarum = (function () {
  const MAX_FOOD = 16;
  const MAX_SIGNALS = 8;

  // Long sensors, small turns, slow decay and little diffusion give the
  // fine, hair-like strands of the reference images.
  const P = {
    sensorAngle: 0.5,    // radians (~29°)
    sensorDist: 14,      // CSS px
    turn: 0.3,           // radians per step
    speed: 1.2,          // CSS px per step
    deposit: 0.2,
    decay: 0.95,
    diffuse: 0.08,       // 0 = no blur, 1 = full 3x3 mean
    exposure: 0.13,      // trail value -> brightness
    streakFade: 0.9,     // how long agent paths stay visible as hairs
    relief: 6.0,         // height-field strength for the lighting
    disturbRadius: 80,   // CSS px
    signalSpeed: 520     // CSS px per second
  };

  const VS_QUAD = `#version 300 es
in vec2 p;
out vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

  const FS_UPDATE = `#version 300 es
precision highp float;
uniform sampler2D agents;
uniform sampler2D trail;
uniform vec2 res;
uniform float sa, sd, ra, speed, time, disturbR;
uniform vec3 mouse;
out vec4 o;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float sense(vec2 pos, float a) {
  return textureLod(trail, (pos + vec2(cos(a), sin(a)) * sd) / res, 0.0).r;
}
void main() {
  vec4 s = texelFetch(agents, ivec2(gl_FragCoord.xy), 0);
  vec2 pos = s.xy;
  float a = s.z;
  float rnd = hash(gl_FragCoord.xy + fract(time) * 97.0);
  float f = sense(pos, a), l = sense(pos, a + sa), r = sense(pos, a - sa);
  if (f < l && f < r) a += (rnd - 0.5) * 2.0 * ra;
  else if (l > r && l > f) a += ra;
  else if (r > l && r > f) a -= ra;

  vec2 dm = pos - mouse.xy;
  float dd = length(dm);
  if (mouse.z > 0.0 && dd < disturbR) {
    float k = 1.0 - dd / disturbR;
    a = atan(dm.y, dm.x) + (rnd - 0.5) * 2.4;
    pos += dm / max(dd, 1.0) * k * mouse.z * 5.0 * speed;
  }

  pos += vec2(cos(a), sin(a)) * speed;
  if (pos.x < 1.0 || pos.x > res.x - 1.0) { a = 3.14159265 - a; pos.x = clamp(pos.x, 1.0, res.x - 1.0); }
  if (pos.y < 1.0 || pos.y > res.y - 1.0) { a = -a; pos.y = clamp(pos.y, 1.0, res.y - 1.0); }
  o = vec4(pos, a, s.w);
}`;

  const VS_DEPOSIT = `#version 300 es
precision highp float;
uniform sampler2D agents;
uniform vec2 res;
uniform int aw;
void main() {
  vec2 pos = texelFetch(agents, ivec2(gl_VertexID % aw, gl_VertexID / aw), 0).xy;
  gl_Position = vec4(pos / res * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = 1.0;
}`;

  const FS_DEPOSIT = `#version 300 es
precision highp float;
uniform float dep;
out vec4 o;
void main() { o = vec4(dep, 0.0, 0.0, 1.0); }`;

  const FS_DIFFUSE = `#version 300 es
precision highp float;
uniform sampler2D trail;
uniform vec2 res;
uniform float decay, diffuse, disturbR, foodR;
uniform vec3 food[${MAX_FOOD}];
uniform int nFood;
uniform vec3 mouse;
out vec4 o;
void main() {
  vec2 px = 1.0 / res;
  vec2 uv = gl_FragCoord.xy * px;
  float c = textureLod(trail, uv, 0.0).r;
  float s = 0.0;
  for (int i = -1; i <= 1; i++)
    for (int j = -1; j <= 1; j++)
      s += textureLod(trail, uv + vec2(i, j) * px, 0.0).r;
  s = mix(c, s / 9.0, diffuse) * decay;
  for (int k = 0; k < ${MAX_FOOD}; k++) {
    if (k >= nFood) break;
    float d = distance(gl_FragCoord.xy, food[k].xy);
    // Negative strength marks a source the organism has abandoned: like the slime it
    // leaves behind, it is avoided, so the network there thins out instead of persisting.
    if (food[k].z < 0.0) s *= 1.0 + food[k].z * smoothstep(disturbR, 0.0, d);
    else s += food[k].z * smoothstep(foodR, 0.0, d);
  }
  if (mouse.z > 0.0)
    s *= 1.0 - mouse.z * 0.3 * smoothstep(disturbR, 0.0, distance(gl_FragCoord.xy, mouse.xy));
  o = vec4(s, 0.0, 0.0, 1.0);
}`;

  // Rendering in the look of a lit specimen under a microscope: the trail map is
  // treated as a height field (relief lighting), filaments are white on steel blue,
  // single agents show up as sparkling dust, plus film grain and a vignette.
  const FS_RENDER = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D trail;
uniform sampler2D dust;
uniform vec2 res;
uniform float exposure, relief, breath, time, signalSpeed;
uniform vec4 sig[${MAX_SIGNALS}];
out vec4 o;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float tone(float v) { return 1.0 - exp(-v * exposure); }
float T(vec2 o, float lod) { return tone(textureLod(trail, uv + o / res, lod).r); }
void main() {
  vec2 p = uv * res;
  float t = T(vec2(0.0), 0.0);

  // relief: normal from the trail gradient, light from the upper left
  float hx = T(vec2(1.0, 0.0), 0.4) - T(vec2(-1.0, 0.0), 0.4);
  float hy = T(vec2(0.0, 1.0), 0.4) - T(vec2(0.0, -1.0), 0.4);
  vec3 n = normalize(vec3(-hx * relief, -hy * relief, 1.0));
  vec3 L = normalize(vec3(-0.55, 0.65, 0.55));
  float diffuseL = max(dot(n, L), 0.0);
  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 28.0);

  // soft glow from coarse mip levels (ring of taps avoids blocky texels)
  float g = T(vec2(0.0), 2.0) * 0.4;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.785398 + 0.39;
    vec2 d = vec2(cos(a), sin(a));
    g += T(d * 10.0, 3.0) * 0.05 + T(d * 26.0, 4.5) * 0.05;
  }

  // agent paths of the last few frames: sharp 1px hairs inside the veins, sparkles outside
  float hair = 1.0 - exp(-texture(dust, uv).r * 0.35);

  // signals travelling outward from project nodes, visible only on the organism
  float s = 0.0;
  for (int k = 0; k < ${MAX_SIGNALS}; k++) {
    if (sig[k].w <= 0.0) continue;
    float r = sig[k].z * signalSpeed;
    float d = distance(p, sig[k].xy);
    s += exp(-pow((d - r) / (8.0 + r * 0.015), 2.0)) * exp(-sig[k].z * 0.6) * sig[k].w;
  }
  s = min(s, 1.5);

  vec3 bg = vec3(0.020, 0.026, 0.031);
  vec3 steel = vec3(0.34, 0.47, 0.56);
  vec3 silver = vec3(0.80, 0.87, 0.90);
  vec3 white = vec3(0.98, 0.99, 1.0);

  vec3 c = bg;
  c += steel * g * (0.45 + 0.25 * breath);
  c += mix(steel * 0.6, silver, smoothstep(0.1, 0.8, t)) * t * (0.35 + 0.85 * diffuseL);
  c += white * spec * smoothstep(0.05, 0.4, t) * 0.7;
  c += white * smoothstep(0.75, 1.0, t) * 0.35;
  c += mix(silver * 0.8, white, t) * hair * (0.35 + 0.5 * diffuseL);
  c += vec3(0.75, 0.92, 1.0) * s * smoothstep(0.08, 0.5, t) * 1.3;

  // vignette + film grain
  vec2 q = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  c *= smoothstep(1.15, 0.25, length(q));
  c += (hash(p + fract(time) * 311.0) - 0.5) * 0.035;
  o = vec4(pow(max(c, 0.0), vec3(0.95)), 1.0);
}`;

  // A floating window of "liquid glass" over the rendered field: the backdrop is frosted
  // (blurred mip taps) and tinted, the rounded slab's bevel bends it inward like a lens with
  // a little dispersion, and a hairline of light runs along the rim, brightest where the edge
  // faces the light (the pointer). Everything outside dims slightly under a soft shadow.
  const FS_GLASS = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D scene;
uniform vec2 res;
uniform vec4 rect;   // glass center (xy) and half size (zw), scene pixels, y up
uniform float radius, alpha, k;
uniform vec2 light;
out vec4 o;
float box(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
vec3 frost(vec2 p) {
  vec3 c = textureLod(scene, p / res, 3.5).rgb * 0.28;
  for (int i = 0; i < 6; i++) {
    float a = float(i) * 1.0472 + 0.3;
    c += textureLod(scene, (p + vec2(cos(a), sin(a)) * 14.0 * k) / res, 3.0).rgb * 0.12;
  }
  return c;
}
void main() {
  vec2 p = uv * res;
  vec3 base = texture(scene, uv).rgb;
  vec2 q = p - rect.xy;
  float d = box(q, rect.zw, radius);
  float sh = box(q + vec2(0.0, 18.0 * k), rect.zw, radius);
  base *= 1.0 - alpha * (0.22 + 0.45 * (1.0 - smoothstep(0.0, 70.0 * k, sh)));
  if (d > 1.5) { o = vec4(base, 1.0); return; }

  vec2 e = vec2(1.0, 0.0);
  vec2 n = normalize(vec2(box(q + e.xy, rect.zw, radius) - box(q - e.xy, rect.zw, radius),
                          box(q + e.yx, rect.zw, radius) - box(q - e.yx, rect.zw, radius)) + 1e-5);
  float x = clamp(-d / (26.0 * k), 0.0, 1.0);   // 0 at the rim, 1 where the slab turns flat
  float slope = pow(1.0 - x, 2.5);
  vec2 off = -n * slope * 38.0 * k;
  vec3 c = frost(p + off);
  if (slope > 0.01) {
    c.r = frost(p + off * 1.15).r;
    c.b = frost(p + off * 0.85).b;
  }
  c = c * 0.62 + vec3(0.030, 0.038, 0.046);

  vec2 L = length(light) > 1e-3 ? normalize(light) : vec2(-0.6, 0.8);
  float facing = abs(dot(n, L));
  float rim = exp(-pow((d + 1.2 * k) / (0.9 * k), 2.0));
  float sheen = pow(1.0 - x, 4.0);
  c += vec3(0.92, 0.97, 1.0) * (rim * (0.25 + 0.75 * facing * facing) * 0.9 + sheen * (0.05 + 0.12 * facing));
  c += vec3(0.6, 0.7, 0.8) * 0.035 * smoothstep(-rect.w, rect.w, q.y);

  o = vec4(mix(base, c, smoothstep(0.75, -0.75, d) * alpha), 1.0);
}`;

  const FS_FADE = `#version 300 es
precision highp float;
uniform sampler2D src;
uniform float fade;
out vec4 o;
void main() { o = vec4(texelFetch(src, ivec2(gl_FragCoord.xy), 0).r * fade, 0.0, 0.0, 1.0); }`;

  const FS_DUST = `#version 300 es
precision highp float;
out vec4 o;
void main() { o = vec4(1.0, 0.0, 0.0, 1.0); }`;

  function create(canvas) {
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
    if (!gl || !gl.getExtension("EXT_color_buffer_float")) return null;

    function shader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    function program(vs, fs) {
      const p = gl.createProgram();
      gl.attachShader(p, shader(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
      gl.bindAttribLocation(p, 0, "p");
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const name = gl.getActiveUniform(p, i).name.replace("[0]", "");
        u[name] = gl.getUniformLocation(p, name);
      }
      return { p, u };
    }

    const prog = {
      update: program(VS_QUAD, FS_UPDATE),
      deposit: program(VS_DEPOSIT, FS_DEPOSIT),
      diffuse: program(VS_QUAD, FS_DIFFUSE),
      dust: program(VS_DEPOSIT, FS_DUST),
      fade: program(VS_QUAD, FS_FADE),
      render: program(VS_QUAD, FS_RENDER),
      glass: program(VS_QUAD, FS_GLASS)
    };

    const quadVao = gl.createVertexArray();
    gl.bindVertexArray(quadVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const emptyVao = gl.createVertexArray();

    function target(w, h, internal, format, type, mip, data) {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, data || null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mip ? gl.LINEAR : gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      if (mip) {
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.generateMipmap(gl.TEXTURE_2D); // allocate levels so the texture is complete
      }
      return { t, fb };
    }

    let tw, th, k, aw, ah, agents, trail, dust, scene;
    const glass = { rect: new Float32Array(4), radius: 0, alpha: 0, light: new Float32Array([-0.6, 0.8]) };
    const food = new Float32Array(MAX_FOOD * 3);
    const sig = new Float32Array(MAX_SIGNALS * 4);
    const mouse = new Float32Array(3);
    let nFood = 0, time = 0;

    // seeds: [{x, y}] in 0–1 screen space; agents start around them (plus some scattered).
    // density: agents per trail pixel.
    function resize(cssW, cssH, dpr, density, seeds) {
      // Trail map at device-pixel resolution for sharp filaments, capped at ~4 MP.
      k = Math.min(dpr, 2, Math.sqrt(4e6 / (cssW * cssH)));
      tw = Math.round(cssW * k);
      th = Math.round(cssH * k);
      aw = 512;
      ah = Math.round(Math.min(524288, Math.max(65536, tw * th * density)) / aw);

      const data = new Float32Array(aw * ah * 4);
      const r0 = 40 * k;
      for (let i = 0; i < aw * ah; i++) {
        const a = Math.random() * Math.PI * 2;
        if (seeds && seeds.length && Math.random() < 0.6) {
          const s = seeds[i % seeds.length];
          const r = Math.sqrt(Math.random()) * r0;
          data[i * 4] = s.x * tw + Math.cos(a) * r;
          data[i * 4 + 1] = (1 - s.y) * th + Math.sin(a) * r;
        } else {
          data[i * 4] = Math.random() * tw;
          data[i * 4 + 1] = Math.random() * th;
        }
        data[i * 4 + 2] = a;
      }
      [agents, trail, dust, scene && [scene]].forEach(pair => pair && pair.forEach(x => { gl.deleteTexture(x.t); gl.deleteFramebuffer(x.fb); }));
      agents = [0, 1].map(() => target(aw, ah, gl.RGBA32F, gl.RGBA, gl.FLOAT, false, data));
      trail = [0, 1].map(() => target(tw, th, gl.R16F, gl.RED, gl.HALF_FLOAT, true));
      dust = [0, 1].map(() => target(tw, th, gl.R16F, gl.RED, gl.HALF_FLOAT, false));
      scene = target(tw, th, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, true); // field image seen through the glass
      dust.forEach(d => { gl.bindFramebuffer(gl.FRAMEBUFFER, d.fb); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); });
    }

    // Positions arrive in 0–1 screen space (y down); convert to trail pixels (y up).
    function setFood(list) {
      nFood = Math.min(MAX_FOOD, list.length);
      for (let i = 0; i < nFood; i++) {
        food[i * 3] = list[i].x * tw;
        food[i * 3 + 1] = (1 - list[i].y) * th;
        food[i * 3 + 2] = list[i].s;
      }
    }

    function setMouse(x, y, strength) {
      mouse[0] = x * tw; mouse[1] = (1 - y) * th; mouse[2] = strength;
    }

    // g: {x, y, w, h, r (corner radius), a (opacity), lx, ly (light direction, y up)} in CSS
    // pixels, y down; or null when no window is open.
    function setGlass(g) {
      glass.alpha = g ? g.a : 0;
      if (!g) return;
      glass.rect[0] = (g.x + g.w / 2) * k; glass.rect[1] = th - (g.y + g.h / 2) * k;
      glass.rect[2] = g.w / 2 * k; glass.rect[3] = g.h / 2 * k;
      glass.radius = g.r * k;
      glass.light[0] = g.lx; glass.light[1] = g.ly;
    }

    // list: [{x, y, age (s), s (strength)}]
    function setSignals(list) {
      sig.fill(0);
      list.slice(0, MAX_SIGNALS).forEach((g, i) => {
        sig[i * 4] = g.x * tw; sig[i * 4 + 1] = (1 - g.y) * th; sig[i * 4 + 2] = g.age; sig[i * 4 + 3] = g.s;
      });
    }

    function step() {
      time += 0.016;
      gl.disable(gl.BLEND);

      // 1. agents sense trail[0] and move: agents[0] -> agents[1]
      gl.bindVertexArray(quadVao);
      gl.useProgram(prog.update.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, agents[1].fb);
      gl.viewport(0, 0, aw, ah);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, agents[0].t);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, trail[0].t);
      const uu = prog.update.u;
      gl.uniform1i(uu.agents, 0); gl.uniform1i(uu.trail, 1);
      gl.uniform2f(uu.res, tw, th);
      gl.uniform1f(uu.sa, P.sensorAngle); gl.uniform1f(uu.sd, P.sensorDist * k);
      gl.uniform1f(uu.ra, P.turn); gl.uniform1f(uu.speed, P.speed * k); gl.uniform1f(uu.time, time);
      gl.uniform1f(uu.disturbR, P.disturbRadius * k); gl.uniform3fv(uu.mouse, mouse);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      agents.reverse();

      // 2. agents deposit into trail[0] (additive points)
      gl.bindVertexArray(emptyVao);
      gl.useProgram(prog.deposit.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, trail[0].fb);
      gl.viewport(0, 0, tw, th);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, agents[0].t);
      const ud = prog.deposit.u;
      gl.uniform1i(ud.agents, 0); gl.uniform2f(ud.res, tw, th);
      gl.uniform1i(ud.aw, aw); gl.uniform1f(ud.dep, P.deposit);
      gl.drawArrays(gl.POINTS, 0, aw * ah);
      gl.disable(gl.BLEND);

      // 3. diffuse + decay + food + disturbance: trail[0] -> trail[1]
      gl.bindVertexArray(quadVao);
      gl.useProgram(prog.diffuse.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, trail[1].fb);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, trail[0].t);
      const uf = prog.diffuse.u;
      gl.uniform1i(uf.trail, 0); gl.uniform2f(uf.res, tw, th);
      gl.uniform1f(uf.decay, P.decay); gl.uniform1f(uf.diffuse, P.diffuse);
      gl.uniform1f(uf.foodR, 4.5 * k); gl.uniform1f(uf.disturbR, P.disturbRadius * k);
      gl.uniform3fv(uf.food, food); gl.uniform1i(uf.nFood, nFood);
      gl.uniform3fv(uf.mouse, mouse);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      trail.reverse();
    }

    function render(breath) {
      // agent paths: fade the previous streak map, then add current positions (no blur)
      gl.bindVertexArray(quadVao);
      gl.useProgram(prog.fade.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, dust[1].fb);
      gl.viewport(0, 0, tw, th);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, dust[0].t);
      gl.uniform1i(prog.fade.u.src, 0); gl.uniform1f(prog.fade.u.fade, P.streakFade);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      dust.reverse();

      gl.bindVertexArray(emptyVao);
      gl.useProgram(prog.dust.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, dust[0].fb);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, agents[0].t);
      const ux = prog.dust.u;
      gl.uniform1i(ux.agents, 0); gl.uniform2f(ux.res, tw, th); gl.uniform1i(ux.aw, aw);
      gl.drawArrays(gl.POINTS, 0, aw * ah);
      gl.disable(gl.BLEND);

      gl.bindTexture(gl.TEXTURE_2D, trail[0].t);
      gl.generateMipmap(gl.TEXTURE_2D); // for the glow
      // With a glass window open the field renders into `scene` first, then through the glass.
      const glassOn = glass.alpha > 0.001;
      gl.bindFramebuffer(gl.FRAMEBUFFER, glassOn ? scene.fb : null);
      gl.viewport(0, 0, glassOn ? tw : canvas.width, glassOn ? th : canvas.height);
      gl.bindVertexArray(quadVao);
      gl.useProgram(prog.render.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, trail[0].t);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, dust[0].t);
      const ur = prog.render.u;
      gl.uniform1i(ur.trail, 0);
      gl.uniform1i(ur.dust, 1);
      gl.uniform2f(ur.res, tw, th);
      gl.uniform1f(ur.exposure, P.exposure);
      gl.uniform1f(ur.relief, P.relief);
      gl.uniform1f(ur.breath, breath);
      gl.uniform1f(ur.time, time);
      gl.uniform1f(ur.signalSpeed, P.signalSpeed * k);
      gl.uniform4fv(ur.sig, sig);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!glassOn) return;

      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, scene.t);
      gl.generateMipmap(gl.TEXTURE_2D); // blur levels for the frost
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(prog.glass.p);
      const ug = prog.glass.u;
      gl.uniform1i(ug.scene, 0);
      gl.uniform2f(ug.res, tw, th);
      gl.uniform4fv(ug.rect, glass.rect);
      gl.uniform1f(ug.radius, glass.radius);
      gl.uniform1f(ug.alpha, glass.alpha);
      gl.uniform1f(ug.k, k);
      gl.uniform2fv(ug.light, glass.light);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    return {
      resize, setFood, setMouse, setSignals, setGlass, step, render, params: P,
      get agentCount() { return aw * ah; }
    };
  }

  return { create };
})();
