import type { TimedHit, TimedNote } from "@/lib/music/composer/timeline";

/**
 * Synthesised voices. These are APPROXIMATIONS, labelled as such in the UI:
 * plucked-string tones (oud-like, qanun-like), a breathy flute (nay-like), a
 * bowed string (violin-like), a soft drone, and synthesised dum/tak strokes —
 * not recordings. Every voice sets its frequency directly in Hz, so microtones
 * are exact; vibrato starts only after the attack. Works on AudioContext and
 * OfflineAudioContext alike.
 */

type Ctx = BaseAudioContext;

/** Plucked string: bright attack, filter closes as the note decays. */
export function pluck(ctx: Ctx, out: AudioNode, n: TimedNote) {
  const t = n.time;
  const end = t + Math.max(0.08, n.duration);
  const ring = Math.min(1.6, Math.max(0.35, n.duration * 1.15)); // natural decay, not longer than ~1.6 s

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.28 * n.velocity, t + 0.004);
  amp.gain.exponentialRampToValueAtTime(0.06 * n.velocity, t + ring * 0.45);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + ring);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 2;
  filter.frequency.setValueAtTime(Math.min(9000, n.frequency * 12), t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(300, n.frequency * 2), t + ring * 0.6);

  const body = ctx.createOscillator();
  body.type = "sawtooth";
  body.frequency.setValueAtTime(n.frequency, t);
  const fundamental = ctx.createOscillator();
  fundamental.type = "triangle";
  fundamental.frequency.setValueAtTime(n.frequency, t);
  const mix = ctx.createGain();
  mix.gain.value = 0.5;

  body.connect(mix);
  fundamental.connect(mix);
  mix.connect(filter).connect(amp).connect(out);
  const stopAt = Math.max(end, t + ring) + 0.02;
  for (const osc of [body, fundamental]) {
    osc.start(t);
    osc.stop(stopAt);
  }
  return { stopAt, nodes: [body, fundamental] as AudioScheduledSourceNode[], amp };
}

/** Qanun-like pluck: brighter and shorter than the oud voice; three strings per course, a hair apart. */
export function qanun(ctx: Ctx, out: AudioNode, n: TimedNote) {
  const t = n.time;
  const ring = Math.min(1.3, Math.max(0.3, n.duration * 1.1));
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.2 * n.velocity, t + 0.002);
  amp.gain.exponentialRampToValueAtTime(0.045 * n.velocity, t + ring * 0.35);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + ring);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(Math.min(12000, n.frequency * 18), t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(500, n.frequency * 3), t + ring * 0.5);
  const mix = ctx.createGain();
  mix.gain.value = 0.36;
  mix.connect(filter).connect(amp).connect(out);

  const nodes: AudioScheduledSourceNode[] = [];
  for (const detune of [-1.5, 0, 1.5]) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(n.frequency, t);
    osc.detune.setValueAtTime(detune, t);
    osc.connect(mix);
    nodes.push(osc);
  }
  const stopAt = t + ring + 0.02;
  for (const osc of nodes) {
    osc.start(t);
    osc.stop(stopAt);
  }
  return { stopAt, nodes, amp };
}

/** Sustain envelope shared by the nay and violin voices. */
function sustainEnvelope(ctx: Ctx, t: number, end: number, level: number, attack: number, release: number) {
  const amp = ctx.createGain();
  const hold = Math.max(t + attack, end - release);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(level, t + attack);
  amp.gain.setValueAtTime(level, hold);
  amp.gain.linearRampToValueAtTime(0, hold + release);
  return { amp, stopAt: hold + release + 0.02 };
}

/** Vibrato in cents that fades in after `delay` seconds (so the onset pitch is exact). */
function delayedVibrato(ctx: Ctx, t: number, rate: number, cents: number, delay: number, targets: AudioParam[]) {
  const lfo = ctx.createOscillator();
  lfo.frequency.value = rate;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, t);
  depth.gain.setValueAtTime(0, t + delay);
  depth.gain.linearRampToValueAtTime(cents, t + delay + 0.3);
  lfo.connect(depth);
  for (const p of targets) depth.connect(p);
  return lfo;
}

/** Nay-like flute: soft sine partials, band-passed breath strongest at the attack, slow vibrato. */
export function nay(ctx: Ctx, out: AudioNode, n: TimedNote) {
  const t = n.time;
  const end = t + Math.max(0.12, n.duration);
  const { amp, stopAt } = sustainEnvelope(ctx, t, end, 0.17 * n.velocity, 0.07, 0.12);
  const body = ctx.createGain();
  body.connect(amp).connect(out);

  const partials = ([[1, 1], [2, 0.16], [3, 0.06]] as const).map(([mult, level]) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(n.frequency * mult, t);
    const g = ctx.createGain();
    g.gain.value = level;
    osc.connect(g).connect(body);
    return osc;
  });
  const lfo = delayedVibrato(ctx, t, 5, 8, 0.28, partials.map((o) => o.detune));

  const breath = ctx.createBufferSource();
  breath.buffer = noise(ctx);
  breath.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = Math.min(6000, n.frequency * 2.5);
  band.Q.value = 1.5;
  const breathGain = ctx.createGain();
  const hold = Math.max(t + 0.25, end - 0.12);
  breathGain.gain.setValueAtTime(0, t);
  breathGain.gain.linearRampToValueAtTime(0.35, t + 0.03);
  breathGain.gain.exponentialRampToValueAtTime(0.08, t + 0.25);
  breathGain.gain.setValueAtTime(0.08, hold);
  breathGain.gain.linearRampToValueAtTime(0, hold + 0.12);
  breath.connect(band).connect(breathGain).connect(body);

  const nodes: AudioScheduledSourceNode[] = [...partials, lfo, breath];
  for (const node of nodes) {
    node.start(t);
    node.stop(stopAt);
  }
  return { stopAt, nodes, amp };
}

/** Violin-like bowed string: sawtooth through body resonances, bow attack, vibrato after the attack. */
export function violin(ctx: Ctx, out: AudioNode, n: TimedNote) {
  const t = n.time;
  const end = t + Math.max(0.12, n.duration);
  const { amp, stopAt } = sustainEnvelope(ctx, t, end, 0.12 * n.velocity, 0.06, 0.14);
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(n.frequency, t);
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = Math.min(9000, n.frequency * 10);
  lowpass.Q.value = 0.7;
  const low = ctx.createBiquadFilter();
  low.type = "peaking";
  low.frequency.value = 450;
  low.Q.value = 1.2;
  low.gain.value = 4;
  const high = ctx.createBiquadFilter();
  high.type = "peaking";
  high.frequency.value = 2800;
  high.Q.value = 1.4;
  high.gain.value = 5;
  osc.connect(lowpass).connect(low).connect(high).connect(amp).connect(out);
  const lfo = delayedVibrato(ctx, t, 5.6, 11, 0.22, [osc.detune]);
  for (const node of [osc, lfo]) {
    node.start(t);
    node.stop(stopAt);
  }
  return { stopAt, nodes: [osc, lfo] as AudioScheduledSourceNode[], amp };
}

/** Melody instruments selectable in the lab (all synthesised approximations). */
export const INSTRUMENTS = { oud: pluck, qanun, nay, violin } as const;
export type InstrumentId = keyof typeof INSTRUMENTS;
export const INSTRUMENT_IDS = Object.keys(INSTRUMENTS) as InstrumentId[];

/** Soft sustained drone on the tonic. */
export function drone(ctx: Ctx, out: AudioNode, n: TimedNote) {
  const t = n.time;
  const end = t + n.duration;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.12 * n.velocity, t + 0.6);
  amp.gain.setValueAtTime(0.12 * n.velocity, Math.max(t + 0.6, end - 0.8));
  amp.gain.linearRampToValueAtTime(0, end);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = Math.min(2000, n.frequency * 6);

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(n.frequency, t);
  const octave = ctx.createOscillator();
  octave.type = "sine";
  octave.frequency.setValueAtTime(n.frequency * 2, t);
  const octaveGain = ctx.createGain();
  octaveGain.gain.value = 0.25;

  osc.connect(filter);
  octave.connect(octaveGain).connect(filter);
  filter.connect(amp).connect(out);
  for (const o of [osc, octave]) {
    o.start(t);
    o.stop(end + 0.02);
  }
  return { stopAt: end + 0.02, nodes: [osc, octave] as AudioScheduledSourceNode[], amp };
}

let noiseBuffer: { ctx: Ctx; buffer: AudioBuffer } | null = null;
function noise(ctx: Ctx) {
  if (noiseBuffer?.ctx === ctx) return noiseBuffer.buffer;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Deterministic noise (same output every render).
  let seed = 22222;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    data[i] = (seed / 0x3fffffff) - 1;
  }
  noiseBuffer = { ctx, buffer };
  return buffer;
}

/** Synthesised frame-drum strokes: dum (low, round), tak (bright edge), ka (light). */
export function drum(ctx: Ctx, out: AudioNode, h: TimedHit) {
  const t = h.time;
  const nodes: AudioScheduledSourceNode[] = [];
  const amp = ctx.createGain();
  amp.connect(out);

  if (h.stroke === "dum") {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(58, t + 0.12);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(0.7 * h.velocity, t + 0.003);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    osc.connect(amp);
    osc.start(t);
    osc.stop(t + 0.4);
    nodes.push(osc);
  } else {
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = h.stroke === "tak" ? 3200 : 5200;
    band.Q.value = h.stroke === "tak" ? 1.4 : 2.5;
    const level = h.stroke === "tak" ? 0.55 : 0.25;
    const decay = h.stroke === "tak" ? 0.09 : 0.05;
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(level * h.velocity, t + 0.002);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(band).connect(amp);
    src.start(t);
    src.stop(t + decay + 0.02);
    nodes.push(src);
  }
  return { stopAt: t + 0.42, nodes, amp };
}
