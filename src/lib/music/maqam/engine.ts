import { C4, round6, type Cents, type Pitch } from "../pitch";
import { TONES, toneCents, westernName, type ToneId } from "../notes";
import { theoretical, type TuningSystem } from "../tuning";
import type { Locale } from "../types";
import { AJNAS } from "./data/ajnas";
import { MAQAMAT } from "./data/maqamat";
import type { Jins, JinsPlacement, MaqamVariant } from "./types";

export type Direction = "ascending" | "descending";

const JINS_BY_ID = new Map(AJNAS.map((j) => [j.id, j]));

export function getJins(id: string): Jins {
  const j = JINS_BY_ID.get(id);
  if (!j) throw new Error(`Unknown jins "${id}"`);
  return j;
}

export function getMaqam(id: string, all: MaqamVariant[] = MAQAMAT): MaqamVariant {
  const m = all.find((v) => v.id === id);
  if (!m) throw new Error(`Unknown maqam variant "${id}"`);
  return m;
}

/** Tone names of a form, always ordered low → high (tonic first). */
export function tonesOf(variant: MaqamVariant, direction: Direction = "ascending"): ToneId[] {
  if (direction === "descending" && variant.descending) return [...variant.descending].reverse();
  return variant.ascending;
}

/** Degrees in cents relative to the tonic, low → high. */
export function degreesOf(variant: MaqamVariant, direction: Direction = "ascending"): Cents[] {
  const tonic = toneCents(variant.ascending[0]);
  return tonesOf(variant, direction).map((t) => round6(toneCents(t) - tonic));
}

/** Cents of the jins notes when placed on a degree of a form (relative to the maqam tonic). */
function placementCents(degrees: Cents[], p: JinsPlacement): Cents[] {
  const start = degrees[p.degree];
  const out = [start];
  for (const step of getJins(p.jins).steps) out.push(round6(out[out.length - 1] + step));
  return out;
}

function placementFits(degrees: Cents[], p: JinsPlacement): boolean {
  if (p.degree < 0 || p.degree >= degrees.length) return false;
  const wanted = placementCents(degrees, p);
  return wanted.every((c, i) => degrees[p.degree + i] !== undefined && Math.abs(degrees[p.degree + i] - c) < 0.5);
}

/** Problems with a variant's data, empty when consistent. */
export function validateVariant(variant: MaqamVariant): string[] {
  const problems: string[] = [];
  const forms: Direction[] = variant.descending ? ["ascending", "descending"] : ["ascending"];

  for (const dir of forms) {
    const tones = tonesOf(variant, dir);
    for (const t of tones) if (!(t in TONES)) problems.push(`${dir}: unknown tone "${t}"`);
    if (problems.length) return problems;
    const d = degreesOf(variant, dir);
    if (d[0] !== 0) problems.push(`${dir}: first degree must be the tonic`);
    for (let i = 1; i < d.length; i++) if (!(d[i] > d[i - 1])) problems.push(`${dir}: degree ${i} is not above degree ${i - 1}`);
    if (variant.octaveRepeating && d[d.length - 1] !== 1200) problems.push(`${dir}: octave-repeating scale must end at 1200¢, ends at ${d[d.length - 1]}¢`);
  }
  if (variant.descending && variant.descending[variant.descending.length - 1] !== variant.ascending[0]) {
    problems.push("descending form must end on the tonic");
  }

  const asc = degreesOf(variant, "ascending");
  const desc = variant.descending ? degreesOf(variant, "descending") : undefined;
  if (!placementFits(asc, variant.lower)) problems.push(`lower jins ${variant.lower.jins} does not fit at degree ${variant.lower.degree}`);
  for (const u of variant.upper) {
    if (!placementFits(asc, u) && !(desc && placementFits(desc, u))) {
      problems.push(`upper jins ${u.jins} does not fit at degree ${u.degree} in any form`);
    }
  }
  if (variant.ghammaz <= 0 || variant.ghammaz >= asc.length) problems.push(`ghammaz index ${variant.ghammaz} out of range`);
  if (!variant.provenance?.source) problems.push("missing provenance");
  return problems;
}

/** Ajnas covering a degree (lower and upper placements that include it). */
export function ajnasAt(variant: MaqamVariant, degree: number): JinsPlacement[] {
  return [variant.lower, ...variant.upper].filter((p) => degree >= p.degree && degree <= p.degree + getJins(p.jins).steps.length);
}

/**
 * Closest scale degree to a pitch given in cents above the tonic (any octave).
 * `deviation` is signed: negative = performed lower than the reference.
 */
export function nearestDegree(variant: MaqamVariant, centsAboveTonic: Cents, direction: Direction = "ascending") {
  const degrees = degreesOf(variant, direction);
  const span = variant.octaveRepeating ? 1200 : null;
  const octave = span ? Math.floor(centsAboveTonic / span) : 0;
  const local = span ? centsAboveTonic - octave * span : centsAboveTonic;
  let best = 0;
  for (let i = 1; i < degrees.length; i++) if (Math.abs(degrees[i] - local) < Math.abs(degrees[best] - local)) best = i;
  return { degree: best, octave, deviation: round6(local - degrees[best]) };
}

export type ResolveOptions = {
  direction?: Direction;
  tuning?: TuningSystem;
  /** Absolute register of the tonic; defaults to the tone's position above C4. */
  tonicCents?: Cents;
};

/**
 * Absolute pitch of a scale degree. `degree` may exceed the scale: octave-repeating
 * scales continue by octaves (degree 8 of an 8-note form = second degree up an octave).
 */
export function resolvePitch(variant: MaqamVariant, degree: number, opts: ResolveOptions = {}): Pitch {
  const degrees = degreesOf(variant, opts.direction);
  const tuning = opts.tuning ?? theoretical;
  const stepsPerCycle = variant.octaveRepeating ? degrees.length - 1 : degrees.length;
  const cycle = Math.floor(degree / stepsPerCycle);
  const index = ((degree % stepsPerCycle) + stepsPerCycle) % stepsPerCycle;
  const period = variant.octaveRepeating ? 1200 : degrees[degrees.length - 1];
  const relative = tuning.quantize(degrees[index]) + (tuning.offsetFor?.(index) ?? 0);
  const tonic = opts.tonicCents ?? C4 + toneCents(variant.ascending[0]);
  return { cents: round6(tonic + relative + cycle * period) };
}

/**
 * Common modulation paths: each upper jins of this maqam can become the lower
 * jins of another maqam, transposed onto that degree (e.g. Bayati → Nahawand on
 * Nawa). Returns the target maqam and the tone it would start on. Informative
 * only — which modulations are idiomatic is a teacher's call.
 */
export function modulationCandidates(variant: MaqamVariant, all: MaqamVariant[] = MAQAMAT) {
  const out: { maqam: string; on: ToneId; via: string }[] = [];
  const seen = new Set<string>();
  for (const dir of ["ascending", "descending"] as const) {
    if (dir === "descending" && !variant.descending) continue;
    const tones = tonesOf(variant, dir);
    const degrees = degreesOf(variant, dir);
    for (const u of variant.upper) {
      if (!placementFits(degrees, u)) continue;
      for (const other of all) {
        if (other.maqam === variant.maqam || other.lower.jins !== u.jins || other.lower.degree !== 0) continue;
        const key = `${other.id}@${tones[u.degree]}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ maqam: other.id, on: tones[u.degree], via: u.jins });
      }
    }
  }
  return out;
}

/**
 * Shape used by the lesson page / `maqamat` table: scale_notes as
 * "Arabic name|Western name"; ajnas as [{ name, start, notes }] where `start`
 * is the first degree index and `notes` how many degrees it spans; `ghammaz`
 * is the dominant's degree index.
 */
export function toLessonFields(variant: MaqamVariant, locale: Locale) {
  const tones = variant.ascending;
  const scale_notes = tones.map((t) => `${TONES[t].ar}|${westernName(t, locale)}`);
  const asc = degreesOf(variant, "ascending");
  const ajnas = [variant.lower, ...variant.upper.filter((u) => placementFits(asc, u)).slice(0, 1)].map((p) => ({
    name: `${getJins(p.jins).names[locale]} — ${TONES[tones[p.degree]].ar}`,
    start: p.degree,
    notes: getJins(p.jins).steps.length + 1,
  }));
  return { scale_notes, ajnas, ghammaz: variant.ghammaz };
}
