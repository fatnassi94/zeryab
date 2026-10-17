import type { Cents } from "../pitch";
import type { ToneId } from "../notes";
import type { Localized, Provenance } from "../types";

/** A jins: a short scale fragment defined by its successive intervals. */
export type Jins = {
  id: string;
  names: Localized;
  /** Successive intervals in cents, e.g. Bayati [150, 150, 200]. */
  steps: Cents[];
  provenance: Provenance;
};

/** A jins placed on a scale degree (0-based index into the ascending form). */
export type JinsPlacement = { jins: string; degree: number };

export type MaqamVariant = {
  id: string;
  /** Family this variant belongs to (e.g. "bayati"); several traditions may share one. */
  maqam: string;
  names: Localized;
  tradition: "mashriqi" | "tunisian" | "turkish" | (string & {});
  /** Ascending form by tone name, tonic first. */
  ascending: ToneId[];
  /** Descending form by tone name, from the top down to the tonic, when it differs. */
  descending?: ToneId[];
  lower: JinsPlacement;
  /** Upper ajnas; alternatives allowed (e.g. Nahawand or Rast on Nawa for Bayati). */
  upper: JinsPlacement[];
  /** Degree index of the ghammaz (dominant). */
  ghammaz: number;
  /** False for scales like Saba whose top note is not the tonic's octave. */
  octaveRepeating: boolean;
  /** Short description of the melodic path (sayr), per language. Draft until reviewed. */
  sayr?: Localized;
  provenance: Provenance;
};
