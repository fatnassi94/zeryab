import { degreesOf, getMaqam } from "../maqam/engine";
import type { Composition, NoteEvent } from "./types";

/**
 * Pure editing operations: each returns a new Composition (enables undo/redo
 * and tests). Degrees stay inside the maqam's range.
 */

function withNote(c: Composition, id: string, f: (n: NoteEvent) => NoteEvent): Composition {
  return { ...c, notes: c.notes.map((n) => (n.id === id ? f(n) : n)) };
}

const maxDegree = (c: Composition) => degreesOf(getMaqam(c.maqamId)).length - 1;

/** Move a note up or down by scale degrees (not semitones). */
export function shiftDegree(c: Composition, id: string, by: number): Composition {
  const top = maxDegree(c);
  return withNote(c, id, (n) => {
    const degree = Math.max(0, Math.min(top, n.degree + by));
    return { ...n, degree, direction: by < 0 ? "descending" : "ascending" };
  });
}

export function setDegree(c: Composition, id: string, degree: number): Composition {
  const top = maxDegree(c);
  return withNote(c, id, (n) => ({ ...n, degree: Math.max(0, Math.min(top, degree)) }));
}

/** Remove a note; the previous note is extended so the line has no gap. */
export function removeNote(c: Composition, id: string): Composition {
  const i = c.notes.findIndex((n) => n.id === id);
  if (i < 0 || c.notes.length <= 1) return c;
  const notes = c.notes.slice();
  const [removed] = notes.splice(i, 1);
  if (i > 0) notes[i - 1] = { ...notes[i - 1], durationPulses: notes[i - 1].durationPulses + removed.durationPulses };
  return { ...c, notes };
}

export function setTempo(c: Composition, quarterBpm: number): Composition {
  return { ...c, quarterBpm: Math.max(30, Math.min(240, Math.round(quarterBpm))) };
}
