import type { Direction } from "../maqam/engine";

/**
 * A composition is plain data, independent of audio. Notes are stored as
 * maqam degrees (not MIDI numbers or Hz), so changing tuning or tonic never
 * rewrites the score. Time is counted in pulses of the chosen iqaʿ.
 */
export type NoteEvent = {
  id: string;
  startPulse: number;
  durationPulses: number;
  /** Scale degree index; may go beyond one octave (8 = second degree an octave up). */
  degree: number;
  /** Which form of the maqam the note belongs to (e.g. Rast's B½♭ up vs B♭ down). */
  direction: Direction;
  /** 0..1 */
  velocity: number;
};

export type PhraseRole = "opening" | "development" | "climax" | "cadence";

export type Phrase = {
  role: PhraseRole;
  startCycle: number;
  cycles: number;
  /** Degree the phrase aims for. */
  target: number;
};

export type Composition = {
  version: 1;
  maqamId: string;
  tuningId: string;
  iqaId: string;
  quarterBpm: number;
  seed: number;
  cycles: number;
  notes: NoteEvent[];
  phrases: Phrase[];
  /** Accompaniment layers (rendered by the audio engine). */
  percussion: boolean;
  drone: boolean;
};

export type ComposeOptions = {
  maqamId: string;
  iqaId: string;
  tuningId?: string;
  quarterBpm?: number;
  cycles?: number;
  seed?: number;
  percussion?: boolean;
  drone?: boolean;
};
