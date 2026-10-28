import type { TimedHit } from "@/lib/music/composer/timeline";
import { buildGraph, getAudioContext } from "./engine";
import { drum } from "./voices";

/**
 * Metronome on the shared AudioContext, with the same lookahead scheduling as
 * the Player: clicks are placed on the audio clock (sample-accurate), the
 * beat callback follows them for the visual pulse. The first beat of each bar
 * is accented (tak), the others are lighter (ka). Tempo and beats per bar can
 * change while it runs; the change applies from the next click.
 */
export class Metronome {
  private ctx: AudioContext | null = null;
  private graph: ReturnType<typeof buildGraph> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private timeouts = new Set<ReturnType<typeof setTimeout>>();
  private nextTime = 0;
  private beat = 0;
  private generation = 0;
  bpm = 60;
  beats = 4;
  running = false;

  constructor(private onBeat?: (beat: number) => void) {}

  async start(bpm: number, beats: number) {
    this.stop();
    const generation = this.generation;
    this.bpm = bpm;
    this.beats = beats;
    this.ctx = getAudioContext();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    if (generation !== this.generation) return;
    this.graph = buildGraph(this.ctx);
    this.nextTime = this.ctx.currentTime + 0.08;
    this.beat = 0;
    this.running = true;
    this.tick();
    this.timer = setInterval(() => this.tick(), 25);
  }

  private tick() {
    const ctx = this.ctx;
    if (!ctx || !this.graph) return;
    while (this.nextTime < ctx.currentTime + 0.15) {
      const beat = this.beat % this.beats;
      const hit: TimedHit = { track: "percussion", time: this.nextTime, stroke: beat === 0 ? "tak" : "ka", velocity: beat === 0 ? 1 : 0.85 };
      drum(ctx, this.graph.tracks.percussion, hit);
      if (this.onBeat) {
        const id = setTimeout(() => {
          this.timeouts.delete(id);
          this.onBeat?.(beat);
        }, Math.max(0, (this.nextTime - ctx.currentTime) * 1000));
        this.timeouts.add(id);
      }
      this.nextTime += 60 / this.bpm;
      this.beat = (beat + 1) % this.beats;
    }
  }

  stop() {
    this.generation++;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.timeouts.forEach(clearTimeout);
    this.timeouts.clear();
    if (this.graph) {
      const master = this.graph.master;
      setTimeout(() => master.disconnect(), 500);
    }
    this.graph = null;
    this.running = false;
  }
}
