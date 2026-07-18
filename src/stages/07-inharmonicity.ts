import { DeterministicRandom } from "../audio/deterministic-random.ts";
import { finalize } from "../audio/safety.ts";
import { edgeGain } from "./03-envelope.ts";
import { hammerTransient } from "./06-hammer-and-velocity.ts";
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
// A piano string is not an ideal string: it is stiff. Stiffness stretches the
// partials upwards, so they are *not* exact integer multiples of f₀.
//
//   fₙ = n · f₀ · √(1 + B·n²)
//
// B is tiny (~0.0004 in the middle of the keyboard) but it is a large part of
// why a piano sounds like a piano and not like an organ.
export function partialFrequency(
  fundamental: number,
  partialNumber: number,
  inharmonicity: number,
): number {
  return (
    fundamental *
    partialNumber *
    Math.sqrt(1 + inharmonicity * partialNumber * partialNumber)
  );
}
// END_NEW

export function renderInharmonic(settings: RenderSettings): RenderResult {
  const { frequency, sampleRate, duration, velocity, releaseDuration } =
    settings;

  const attack = parameter(settings, "attack", 8) / 1000;
  const partialCount = Math.round(parameter(settings, "partials", 8));
  const spectralDecay = parameter(settings, "spectralDecay", 1);
  const hammerAmount = parameter(settings, "hammer", 1);
  // BEGIN_NEW
  const inharmonicity = parameter(settings, "inharmonicity", 0.0004);
  // END_NEW

  const brightness = 0.45 + 0.55 * velocity;
  const gain = 0.35 + 0.65 * velocity;
  const random = new DeterministicRandom(0x9e3779b9);

  const active = partials.slice(0, partialCount);
  const totalAmplitude = active.reduce((sum, p) => sum + p.amplitude, 0);
  const compensation = 1 / totalAmplitude;

  // BEGIN_NEW
  // Precompute each partial's stretched frequency once, not per sample.
  const voices = active.map((partial) => ({
    frequency: partialFrequency(frequency, partial.ratio, inharmonicity),
    amplitude: partial.amplitude * brightness ** (partial.ratio - 1),
    decay: partial.decay * spectralDecay,
  }));
  // END_NEW

  const sampleCount = sampleCountFor(settings);
  const samples = new Float32Array(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    const time = i / sampleRate;
    const noise = random.nextBipolar();

    let sample = 0;
    for (const voice of voices) {
      // BEGIN_NEW
      sample +=
        Math.sin(2 * Math.PI * voice.frequency * time) *
        voice.amplitude *
        Math.exp(-time / voice.decay);
      // END_NEW
    }
    sample *= compensation;

    const edge = edgeGain(time, duration, attack, releaseDuration);

    const strings = sample * edge * 0.9;
    const hammer = hammerTransient(time, velocity, noise, hammerAmount);

    samples[i] = (strings + hammer) * gain;
  }

  return finalize(samples);
}
// TALK_END
