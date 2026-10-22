import type { TimedHit, TimedNote, toTimeline } from "@/lib/music/composer/timeline";
import { drone, drum, INSTRUMENTS, type InstrumentId } from "./voices";

type Timeline = Pick<ReturnType<typeof toTimeline>, "melody" | "drone" | "percussion" | "duration">;
type Event = TimedNote | TimedHit;

export type Mix = { melody: number; drone: number; percussion: number };
export const DEFAULT_MIX: Mix = { melody: 1, drone: 0.8, percussion: 0.9 };

/**
 * Build the output chain: one gain per track → master gain → limiter-ish
 * compressor → destination. Same builder for live and offline rendering.
 */
export function buildGraph(ctx: BaseAudioContext, mix: Mix = DEFAULT_MIX) {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -10;
  comp.ratio.value = 6;
  comp.attack.value = 0.003;
  comp.release.value = 0.2;
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(comp).connect(ctx.destination);
  const tracks = {
    melody: ctx.createGain(),
    drone: ctx.createGain(),
    percussion: ctx.createGain(),
  };
  for (const [name, g] of Object.entries(tracks) as [keyof Mix, GainNode][]) {
    g.gain.value = mix[name];
    g.connect(master);
  }
  return { master, tracks };
}

function scheduleEvent(ctx: BaseAudioContext, tracks: ReturnType<typeof buildGraph>["tracks"], e: Event, offset: number, instrument: InstrumentId) {
  const shifted = { ...e, time: e.time + offset };
  if (shifted.track === "melody") return INSTRUMENTS[instrument](ctx, tracks.melody, shifted as TimedNote);
  if (shifted.track === "drone") return drone(ctx, tracks.drone, shifted as TimedNote);
  return drum(ctx, tracks.percussion, shifted as TimedHit);
}

const allEvents = (t: Timeline): Event[] => [...t.drone, ...t.melody, ...t.percussion].sort((a, b) => a.time - b.time);

/** Render a whole timeline offline (tests now; WAV export in a later phase). */
export async function renderOffline(t: Timeline, opts: { sampleRate?: number; tail?: number; mix?: Mix; instrument?: InstrumentId } = {}) {
  const sampleRate = opts.sampleRate ?? 48000;
  const length = Math.ceil((t.duration + (opts.tail ?? 1.6)) * sampleRate);
  const ctx = new OfflineAudioContext(2, length, sampleRate);
  const { tracks } = buildGraph(ctx, opts.mix);
  for (const e of allEvents(t)) scheduleEvent(ctx, tracks, e, 0, opts.instrument ?? "oud");
  return ctx.startRendering();
}

let shared: AudioContext | null = null;
/** One AudioContext per page, created on first use (after a user gesture). */
export function getAudioContext() {
  if (!shared) shared = new AudioContext({ latencyHint: "interactive" });
  return shared;
}

export type PlayerState = "idle" | "playing";

/**
 * Live player with lookahead scheduling on the audio clock: a 25 ms timer
 * schedules every event due in the next 150 ms. play() is idempotent (it stops
 * whatever was playing first, and a play() still waiting for the browser to let
 * audio start gives way to any later play() or stop()), so double clicks or
 * re-renders never double the sound. stop() fades out within ~30 ms to avoid clicks.
 */
export class Player {
  private ctx: AudioContext | null = null;
  private graph: ReturnType<typeof buildGraph> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private events: Event[] = [];
  private instrument: InstrumentId = "oud";
  private cursor = 0;
  private startTime = 0;
  private duration = 0;
  private active = new Set<{ stopAt: number; nodes: AudioScheduledSourceNode[]; amp: GainNode }>();
  private listeners = new Set<() => void>();
  private generation = 0;
  state: PlayerState = "idle";

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  /** Seconds since playback started (0 when idle). */
  get position() {
    if (this.state !== "playing" || !this.ctx) return 0;
    return Math.max(0, Math.min(this.duration, this.ctx.currentTime - this.startTime));
  }

  async play(t: Timeline, mix: Mix = DEFAULT_MIX, instrument: InstrumentId = "oud") {
    this.stop();
    const generation = this.generation;
    this.instrument = instrument;
    this.ctx = getAudioContext();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    if (generation !== this.generation) return; // stopped or replaced while the browser held the audio back
    this.graph = buildGraph(this.ctx, mix);
    this.events = allEvents(t);
    this.duration = t.duration;
    this.cursor = 0;
    this.startTime = this.ctx.currentTime + 0.08;
    this.state = "playing";
    this.tick();
    this.timer = setInterval(() => this.tick(), 25);
    this.emit();
  }

  private tick() {
    if (!this.ctx || !this.graph) return;
    const horizon = this.ctx.currentTime + 0.15;
    while (this.cursor < this.events.length && this.startTime + this.events[this.cursor].time < horizon) {
      const v = scheduleEvent(this.ctx, this.graph.tracks, this.events[this.cursor], this.startTime, this.instrument);
      this.active.add(v);
      this.cursor++;
    }
    const now = this.ctx.currentTime;
    for (const v of this.active) if (v.stopAt < now) this.active.delete(v);
    if (this.cursor >= this.events.length && now > this.startTime + this.duration + 0.1) this.finish();
  }

  setMix(mix: Mix) {
    if (!this.graph || !this.ctx) return;
    const now = this.ctx.currentTime;
    for (const [name, g] of Object.entries(this.graph.tracks) as [keyof Mix, GainNode][]) {
      g.gain.setTargetAtTime(mix[name], now, 0.02);
    }
  }

  stop() {
    this.generation++;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.ctx && this.graph) {
      const now = this.ctx.currentTime;
      this.graph.master.gain.setTargetAtTime(0, now, 0.01);
      for (const v of this.active) for (const n of v.nodes) {
        try {
          n.stop(now + 0.05);
        } catch {
          // already stopped
        }
      }
      const master = this.graph.master;
      setTimeout(() => master.disconnect(), 120);
    }
    this.active.clear();
    this.graph = null;
    const wasPlaying = this.state === "playing";
    this.state = "idle";
    if (wasPlaying) this.emit();
  }

  private finish() {
    this.stop();
  }
}

/**
 * Sound one note right away (clicking a note in the score). Uses its own short
 * graph on the shared context; callers skip it while the Player is playing.
 */
export async function previewNote(frequency: number, instrument: InstrumentId = "oud") {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") await ctx.resume();
  const { master, tracks } = buildGraph(ctx);
  const note: TimedNote = { track: "melody", time: ctx.currentTime + 0.02, duration: 0.6, pitch: { cents: 0 }, frequency, velocity: 0.8 };
  const v = INSTRUMENTS[instrument](ctx, tracks.melody, note);
  setTimeout(() => master.disconnect(), (v.stopAt - ctx.currentTime + 0.3) * 1000);
}
