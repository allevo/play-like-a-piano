import { finalize } from "../audio/safety.ts";
import { edgeGain } from "./03-envelope.ts";
import { parameter, sampleCountFor } from "./types.ts";
import type { RenderResult, RenderSettings } from "./types.ts";

// TALK_START
// BEGIN_NEW
// One decay curve for the whole note freezes the timbre: the sound only gets
// quieter, never darker. On a real string the high partials lose their energy
// first, so every partial gets its own decay time.
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
// END_NEW

export function renderPartialDecays(settings: RenderSettings): RenderResult {
  const { frequency, sampleRate, duration, velocity, releaseDuration } =
    settings;

  const attack = parameter(settings, "attack", 8) / 1000;
  const partialCount = Math.round(parameter(settings, "partials", 8));
  // BEGIN_NEW
  // < 1 makes the high partials die away even faster, > 1 keeps them alive.
  const spectralDecay = parameter(settings, "spectralDecay", 1);
  // END_NEW

  const active = partials.slice(0, partialCount);
  const totalAmplitude = active.reduce((sum, p) => sum + p.amplitude, 0);
  const compensation = 1 / totalAmplitude;

  const sampleCount = sampleCountFor(settings);
  const samples = new Float32Array(sampleCount);
  const amplitude = 0.85 * velocity;

  for (let i = 0; i < sampleCount; i++) {
    const time = i / sampleRate;

    let sample = 0;
    for (const partial of active) {
      // BEGIN_NEW
      const decayGain = Math.exp(-time / (partial.decay * spectralDecay));
      sample +=
        Math.sin(2 * Math.PI * frequency * partial.ratio * time) *
        partial.amplitude *
        decayGain;
      // END_NEW
    }
    sample *= compensation;

    // Only the click-free edges stay shared between all partials.
    const edge = edgeGain(time, duration, attack, releaseDuration);

    samples[i] = sample * edge * amplitude;
  }

  return finalize(samples);
}
// TALK_END
