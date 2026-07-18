/**
 * Seeded pseudorandom numbers.
 *
 * The hammer transient (stage 6) and the room impulse response (stage 9) are
 * built from noise. `Math.random()` would make every render slightly different,
 * so the demo would no longer be reproducible on stage. This small PRNG gives
 * the same sequence for the same seed, forever.
 *
 * Algorithm: mulberry32 — 32-bit state, good enough for audio noise.
 */
export class DeterministicRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Uniform in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform in [-1, 1): white noise sample. */
  nextBipolar(): number {
    return this.next() * 2 - 1;
  }
}
