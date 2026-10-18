/**
 * Seeded pseudo-random generator (mulberry32). Same seed ⇒ same sequence on
 * every machine, so generated compositions are reproducible. Never use
 * Math.random in the composer.
 */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** Integer in [min, max]. */
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    /** Pick by weight; weights need not sum to 1. */
    weighted<T>(options: readonly (readonly [T, number])[]): T {
      const total = options.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [value, w] of options) {
        if ((r -= w) < 0) return value;
      }
      return options[options.length - 1][0];
    },
  };
}

export type Rng = ReturnType<typeof createRng>;
