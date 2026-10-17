import { round6, type Cents } from "./pitch";
import type { Localized, Provenance } from "./types";

/**
 * A tuning system maps theoretical cents to the cents actually played.
 * Systems are data with provenance so musicians can review them.
 */
export type TuningSystem = {
  id: string;
  name: Localized;
  /** Snap a theoretical value (cents relative to the tonic) to this system. */
  quantize: (cents: Cents) => Cents;
  /** Per-degree performance offset in cents (performance profiles only). */
  offsetFor?: (degree: number) => Cents;
  provenance: Provenance;
};

/** n-tone equal division of the octave (12, 24, 53…). */
export function edo(n: number, name: Localized, provenance: Provenance): TuningSystem {
  if (!Number.isInteger(n) || n < 1) throw new RangeError(`EDO size must be a positive integer, got ${n}`);
  const step = 1200 / n;
  return { id: `${n}-edo`, name, provenance, quantize: (c) => round6(Math.round(c / step) * step) };
}

/** Pass-through: theoretical values as written (the default for teaching material). */
export const theoretical: TuningSystem = {
  id: "theoretical",
  name: { ar: "القيم النظرية", fr: "Valeurs théoriques", en: "Theoretical values" },
  quantize: (c) => c,
  provenance: { source: "Values exactly as stored in the maqam data", status: "reviewed" },
};

export const edo24 = edo(
  24,
  { ar: "السلّم الربعي (24 ربع تون)", fr: "Tempérament en quarts de ton (24)", en: "24-tone equal temperament" },
  { source: "Common 20th-century Arab theoretical grid (50-cent steps)", status: "reviewed" },
);

/** 53 equal divisions (Holdrian comma ≈ 22.64¢), used in Turkish/Ottoman theory. */
export const edo53 = edo(
  53,
  { ar: "تقسيم الكومة (53)", fr: "53 commas (Holder)", en: "53-comma division" },
  { source: "Holdrian comma, 1200/53 cents", status: "reviewed" },
);

/**
 * Performance profile: a base system plus per-degree offsets in cents, e.g. a
 * teacher's measured Tunisian sikah. Offsets are keyed by scale-degree index.
 */
export function profile(
  base: TuningSystem,
  offsets: Record<number, Cents>,
  meta: { id: string; name: Localized; provenance: Provenance },
): TuningSystem {
  return {
    ...meta,
    quantize: base.quantize,
    offsetFor: (degree) => offsets[degree] ?? 0,
  };
}
