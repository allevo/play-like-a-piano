import { DeterministicRandom } from "../audio/deterministic-random.ts";
import { finalize } from "../audio/safety.ts";
import { edgeGain } from "./03-envelope.ts";
import { parameter, sampleCountFor } from "./types.ts";
import type { RenderResult, RenderSettings } from "./types.ts";

const partials = [
  { ratio: 1, amplitude: 1.0, decay: 3.4 },
  { ratio: 2, amplitude: 0.48, decay: 2.2 },
  { ratio: 3, amplitude: 0.28, decay: 1.5 },
  { ratio: 4, amplitude: 0.16, decay: 1.0 },
  { ratio: 5, amplitude: 0.09, decay: 0.7 },
  { ratio: 6, amplitude: 0.06, decay: 0.55 },
  { ratio: 7, amplitude: 0.04, decay: 0.45 },
  { ratio: 8, amplitude: 0.028, decay: 0.38 },
  { ratio: 9, amplitude: 0.02, decay: 0.32 },
  { ratio: 10, amplitude: 0.014, decay: 0.28 },
  { ratio: 11, amplitude: 0.01, decay: 0.24 },
  { ratio: 12, amplitude: 0.008, decay: 0.2 },
];

// TALK_START
// BEGIN_NEW
// The first 25 ms are what the ear uses to recognise the instrument: a felt
// hammer hitting a string is a short, noisy thump, not a sine.
const HAMMER_WINDOW = 0.025;

export function hammerTransient(
  time: number,
  velocity: number,
  noise: number,
  amount: number,
): number {
  if (time > HAMMER_WINDOW) return 0;

  return noise * Math.exp(-time * 180) * velocity * 0.12 * amount;
}
// END_NEW

export function renderHammered(settings: RenderSettings): RenderResult {
  const { frequency, sampleRate, duration, velocity, releaseDuration } =
    settings;

  const attack = parameter(settings, "attack", 8) / 1000;
  const partialCount = Math.round(parameter(settings, "partials", 8));
  const spectralDecay = parameter(settings, "spectralDecay", 1);
  const hammerAmount = parameter(settings, "hammer", 1);

  // BEGIN_NEW
  // Velocity is not a volume knob. Hitting a key harder makes the string
  // *brighter*: the upper partials grow faster than the fundamental.
  const brightness = 0.45 + 0.55 * velocity;
  const gain = 0.35 + 0.65 * velocity;

  // Same seed -> same noise -> the same buffer on every render.
  const random = new DeterministicRandom(0x9e3779b9);
  // END_NEW

  const active = partials.slice(0, partialCount);
  const totalAmplitude = active.reduce((sum, p) => sum + p.amplitude, 0);
  const compensation = 1 / totalAmplitude;

  const sampleCount = sampleCountFor(settings);
  const samples = new Float32Array(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    const time = i / sampleRate;
    const noise = random.nextBipolar();

    let sample = 0;
    for (const partial of active) {
      // BEGIN_NEW
      // brightness^(n-1): partial 1 is untouched, partial 12 is heavily
      // attenuated at low velocity.
      const velocityTilt = brightness ** (partial.ratio - 1);
      // END_NEW
      const decayGain = Math.exp(-time / (partial.decay * spectralDecay));
      sample +=
        Math.sin(2 * Math.PI * frequency * partial.ratio * time) *
        partial.amplitude *
        velocityTilt *
        decayGain;
    }
    sample *= compensation;

    const edge = edgeGain(time, duration, attack, releaseDuration);

    // BEGIN_NEW
    const strings = sample * edge * 0.9;
    const hammer = hammerTransient(time, velocity, noise, hammerAmount);

    samples[i] = (strings + hammer) * gain;
    // END_NEW
  }

  return finalize(samples);
}
// TALK_END
