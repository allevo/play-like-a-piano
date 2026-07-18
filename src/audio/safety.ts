import type { RenderResult } from "../stages/types.ts";

/**
 * Gentle soft limiter.
 *
 * Below the knee the signal is passed through untouched, so a pure sine stays
 * a pure sine and quiet notes stay quiet — velocity differences survive. Above
 * the knee the curve bends smoothly toward ±1 instead of clipping into a
 * square wave.
 */
export function softLimit(sample: number): number {
  const knee = 0.7;
  const magnitude = Math.abs(sample);
  if (magnitude <= knee) return sample;

  const over = magnitude - knee;
  const limited = knee + (1 - knee) * Math.tanh(over / (1 - knee));
  return Math.sign(sample) * limited;
}

/** Largest absolute sample value in the buffer. */
export function measurePeak(samples: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const magnitude = Math.abs(samples[i]);
    if (magnitude > peak) peak = magnitude;
  }
  return peak;
}

/**
 * Final safety pass every stage runs before handing samples to the speakers:
 * scrub any non-finite value, soft-limit, and measure the peak.
 */
export function finalize(samples: Float32Array): RenderResult {
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    samples[i] = Number.isFinite(sample) ? softLimit(sample) : 0;
  }
  return { samples, peak: measurePeak(samples) };
}

/** Peak expressed in dBFS, floored so the UI never shows -Infinity. */
export function peakToDb(peak: number): number {
  if (peak <= 1e-6) return -120;
  return 20 * Math.log10(peak);
}
