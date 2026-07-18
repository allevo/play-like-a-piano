import { finalize } from "../audio/safety.ts";
import { amplitudeEnvelope } from "./03-envelope.ts";
import { parameter, sampleCountFor } from "./types.ts";
import type { RenderResult, RenderSettings } from "./types.ts";

// TALK_START
// BEGIN_NEW
// Timbre is what is left once pitch and loudness are accounted for. A single
// sine has no timbre. Real instruments radiate a fundamental *plus* partials
// at integer multiples of it, each with its own amplitude.
const partials = [
  { ratio: 1, amplitude: 1.0 },
  { ratio: 2, amplitude: 0.48 },
  { ratio: 3, amplitude: 0.28 },
  { ratio: 4, amplitude: 0.16 },
  { ratio: 5, amplitude: 0.09 },
  { ratio: 6, amplitude: 0.06 },
  { ratio: 7, amplitude: 0.04 },
  { ratio: 8, amplitude: 0.028 },
  { ratio: 9, amplitude: 0.02 },
  { ratio: 10, amplitude: 0.014 },
  { ratio: 11, amplitude: 0.01 },
  { ratio: 12, amplitude: 0.008 },
];
// END_NEW

export function renderAdditive(settings: RenderSettings): RenderResult {
  const { frequency, sampleRate, duration, velocity, releaseDuration } =
    settings;

  const attack = parameter(settings, "attack", 8) / 1000;
  const decayTime = parameter(settings, "decay", 1.8);
  // BEGIN_NEW
  const partialCount = Math.round(parameter(settings, "partials", 8));
  const active = partials.slice(0, partialCount);

  // Summing sines stacks their amplitudes, so divide by the total to stay
  // inside [-1, 1] instead of relying on the limiter.
  const totalAmplitude = active.reduce((sum, p) => sum + p.amplitude, 0);
  const compensation = 1 / totalAmplitude;
  // END_NEW

  const sampleCount = sampleCountFor(settings);
  const samples = new Float32Array(sampleCount);
  const amplitude = 0.85 * velocity;

  for (let i = 0; i < sampleCount; i++) {
    const time = i / sampleRate;

    // BEGIN_NEW
    let sample = 0;
    for (const partial of active) {
      sample +=
        Math.sin(2 * Math.PI * frequency * partial.ratio * time) *
        partial.amplitude;
    }
    sample *= compensation;
    // END_NEW

    const envelope = amplitudeEnvelope(
      time,
      duration,
      attack,
      decayTime,
      releaseDuration,
    );

    samples[i] = sample * envelope * amplitude;
  }

  return finalize(samples);
}
// TALK_END
