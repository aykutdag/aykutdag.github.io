// Generative sound layer (Web Audio). Nothing plays until the visitor turns it on.
// - Drone: a low A chord whose filter "breathes" with the network's shuttle-streaming rhythm.
// - Rustle: filtered noise that follows cursor speed (pitch follows cursor x).
// - Chimes: each project node has its own bell tone from an A minor pentatonic scale.
window.Sound = (function () {
  const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99];
  let ctx, master, bus, droneFilter, rustleFilter, rustleGain;
  let on = false;

  function impulse(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return buf;
  }

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const reverb = ctx.createConvolver();
    reverb.buffer = impulse(3.5);
    const wet = ctx.createGain(); wet.gain.value = 0.45;
    const dry = ctx.createGain(); dry.gain.value = 0.75;
    reverb.connect(wet).connect(master);
    dry.connect(master);
    bus = ctx.createGain();
    bus.connect(dry); bus.connect(reverb);

    // Drone
    droneFilter = ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 320;
    droneFilter.Q.value = 0.8;
    const droneGain = ctx.createGain(); droneGain.gain.value = 0.10;
    droneFilter.connect(droneGain).connect(bus);
    [[55, "sawtooth", 0.35], [55.4, "sawtooth", 0.35], [82.41, "sine", 0.6], [110, "triangle", 0.4], [164.81, "sine", 0.15]]
      .forEach(([f, type, g]) => {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
        const og = ctx.createGain(); og.gain.value = g;
        o.connect(og).connect(droneFilter); o.start();
      });
    // Breathing: slow LFO on the drone filter (same period as the visual breath)
    const lfo = ctx.createOscillator(); lfo.frequency.value = 1 / 24;
    const lfoDepth = ctx.createGain(); lfoDepth.gain.value = 140;
    lfo.connect(lfoDepth).connect(droneFilter.frequency); lfo.start();

    // Rustle
    const noise = ctx.createBufferSource();
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    noise.buffer = nb; noise.loop = true;
    rustleFilter = ctx.createBiquadFilter();
    rustleFilter.type = "bandpass"; rustleFilter.frequency.value = 900; rustleFilter.Q.value = 3;
    rustleGain = ctx.createGain(); rustleGain.gain.value = 0;
    noise.connect(rustleFilter).connect(rustleGain).connect(bus);
    noise.start();
  }

  function toggle() {
    if (!ctx) build();
    on = !on;
    const now = ctx.currentTime;
    if (on) {
      ctx.resume();
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(0.9, now, 0.6);
    } else {
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(0, now, 0.25);
    }
    return on;
  }

  // speed: cursor speed in px/frame, x01: cursor x in 0–1
  function activity(speed, x01) {
    if (!on) return;
    const now = ctx.currentTime;
    rustleGain.gain.setTargetAtTime(Math.min(0.06, speed * 0.0012), now, 0.08);
    rustleFilter.frequency.setTargetAtTime(350 + x01 * 2600, now, 0.12);
    droneFilter.frequency.setTargetAtTime(300 + Math.min(speed, 40) * 9, now, 0.4);
  }

  // pan: -1 (left) … 1 (right), usually from the node's x position
  function panner(pan) {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan || 0));
    p.connect(bus);
    return p;
  }

  function chime(index, strong, pan) {
    if (!on) return;
    const f = SCALE[index % SCALE.length];
    const now = ctx.currentTime;
    const peak = strong ? 0.16 : 0.07;
    const decay = strong ? 3.2 : 1.8;
    const out = panner(pan);
    // Bell: fundamental + inharmonic partials
    [[1, 1], [2.76, 0.35], [5.4, 0.12]].forEach(([ratio, g]) => {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f * ratio;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(peak * g, now + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, now + decay / ratio);
      o.connect(env).connect(out);
      o.start(now); o.stop(now + decay + 0.1);
    });
  }

  // Electric signal leaving a node: a short falling blip and a crackle of filtered noise.
  function blip(index, strength, pan) {
    if (!on) return;
    const now = ctx.currentTime;
    const out = panner(pan);
    const g = 0.035 * strength;
    const o = ctx.createOscillator(); o.type = "square";
    const f0 = SCALE[index % SCALE.length] * 8;
    o.frequency.setValueAtTime(f0, now);
    o.frequency.exponentialRampToValueAtTime(f0 / 6, now + 0.09);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3500;
    const env = ctx.createGain();
    env.gain.setValueAtTime(g, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    o.connect(lp).connect(env).connect(out);
    o.start(now); o.stop(now + 0.15);

    const len = Math.floor(ctx.sampleRate * 0.25);
    const nb = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() < 0.02 ? (Math.random() * 2 - 1) : 0;
    const n = ctx.createBufferSource(); n.buffer = nb;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2500;
    const ng = ctx.createGain(); ng.gain.value = g * 2.5;
    n.connect(hp).connect(ng).connect(out);
    n.start(now);
  }

  return { toggle, activity, chime, blip, get on() { return on; } };
})();
