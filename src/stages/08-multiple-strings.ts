import { DeterministicRandom } from "../audio/deterministic-random.ts";
import { finalize } from "../audio/safety.ts";
import { edgeGain } from "./03-envelope.ts";
import { hammerTransient } from "./06-hammer-and-velocity.ts";
import { partialFrequency } from "./07-inharmonicity.ts";
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
// Most of the piano's range gives one key *three* strings. The tuner cannot —
// and does not want to — make them perfectly identical: the tiny mistuning is
// what gives the note its shimmer and its slow beating.
const strings = [
  { detuneCents: -1.2, gain: 0.32, phase: 0.0 },
  { detuneCents: 0.0, gain: 0.36, phase: 0.4 },
  { detuneCents: 1.1, gain: 0.32, phase: 0.9 },
];

export function centsToRatio(cents: number): number {
  return 2 ** (cents / 1200);
}
// END_NEW

export function synthesizeStrings(settings: RenderSettings): Float32Array {
  const { frequency, sampleRate, duration, velocity, releaseDuration } =
    settings;

  const attack = parameter(settings, "attack", 8) / 1000;
  const partialCount = Math.round(parameter(settings, "partials", 8));
  const spectralDecay = parameter(settings, "spectralDecay", 1);
  const hammerAmount = parameter(settings, "hammer", 1);
  const inharmonicity = parameter(settings, "inharmonicity", 0.0004);
  // BEGIN_NEW
  // 0 cents = one perfectly unison chorus (dead). 1.2 cents = a real piano.
  const spread = parameter(settings, "detune", 1);
  // END_NEW

  const brightness = 0.45 + 0.55 * velocity;
  const gain = 0.35 + 0.65 * velocity;
  const random = new DeterministicRandom(0x9e3779b9);

  const active = partials.slice(0, partialCount);
  const totalAmplitude = active.reduce((sum, p) => sum + p.amplitude, 0);

  // BEGIN_NEW
  // Every string carries its own complete set of inharmonic partials.
  const voices = strings.flatMap((string) => {
    const stringFrequency =
      frequency * centsToRatio(string.detuneCents * spread);

    return active.map((partial) => ({
      frequency: partialFrequency(
        stringFrequency,
        partial.ratio,
        inharmonicity,
      ),
      amplitude:
        (partial.amplitude * brightness ** (partial.ratio - 1) * string.gain) /
        totalAmplitude,
      decay: partial.decay * spectralDecay,
      phase: string.phase,
    }));
  });
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
        Math.sin(2 * Math.PI * voice.frequency * time + voice.phase) *
        voice.amplitude *
        Math.exp(-time / voice.decay);
      // END_NEW
    }

    const edge = edgeGain(time, duration, attack, releaseDuration);

    const stringSound = sample * edge * 0.9;
    const hammer = hammerTransient(time, velocity, noise, hammerAmount);

    samples[i] = (stringSound + hammer) * gain;
  }

  return samples;
}

export function renderStrings(settings: RenderSettings): RenderResult {
  return finalize(synthesizeStrings(settings));
}
// TALK_END
