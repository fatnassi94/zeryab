import type { Localized, Provenance } from "../types";

/** Drum strokes. D = dum (low, centre), T = tak (high, edge), K = ka (light, other hand). */
export type Stroke = "dum" | "tak" | "ka";

export type RhythmEvent = { pulse: number; stroke: Stroke; accent?: 0 | 1 | 2 };

export type Iqa = {
  id: string;
  names: Localized;
  /** Pulses per cycle. */
  pulses: number;
  /** Note value of one pulse: 8 = eighth, 16 = sixteenth. */
  pulseUnit: 4 | 8 | 16;
  /** Time signature as usually written, e.g. "4/4", "10/8". */
  meter: string;
  /** Pulse groupings when taught that way, e.g. [3, 2, 2, 3]. Must sum to `pulses`. */
  grouping?: number[];
  /** Core dum/tak skeleton; fills and variations are stored separately. */
  events: RhythmEvent[];
  /** Typical tempo range in BPM of a quarter note. */
  tempoRange?: [number, number];
  tradition: "mashriqi" | "tunisian" | (string & {});
  provenance: Provenance;
};
