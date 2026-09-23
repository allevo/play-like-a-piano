import { describe, expect, it } from "vitest";
import { analyzeSpectrum, dominantFrequency } from "../audio/fft.ts";
import { DeterministicRandom } from "../audio/deterministic-random.ts";
import { frequencyOfNote, partialFrequency } from "../audio/math.ts";
import { measurePeak, softLimit } from "../audio/safety.ts";
import { stages } from "../stages/index.ts";
import { furElise, renderFurEliseSine } from "../stages/10-fur-elise.ts";
import { leftHand } from "../stages/11-fur-elise-chords.ts";
import type { RenderResult, RenderSettings, SynthStage } from "../stages/types.ts";

const SAMPLE_RATE = 48000;
const DURATION = 1.5;

function settingsFor(
  stage: SynthStage,
  overrides: Partial<RenderSettings> = {},
): RenderSettings {
  const parameters: Record<string, number> = {};
  for (const parameter of stage.parameters) {
    parameters[parameter.id] = parameter.defaultValue;
  }

  return {
    frequency: 440,
    duration: DURATION,
    velocity: 0.75,
    sampleRate: SAMPLE_RATE,
    releaseDuration: 0.12,
    parameters: { ...parameters, ...overrides.parameters },
    ...overrides,
  };
}

async function render(
  stage: SynthStage,
  overrides: Partial<RenderSettings> = {},
): Promise<RenderResult> {
  return await stage.render(settingsFor(stage, overrides));
}

/** Total energy above `minHz`, relative to the whole spectrum. */
function highFrequencyEnergy(samples: Float32Array, minHz: number): number {
  const spectrum = analyzeSpectrum(samples, 0, SAMPLE_RATE);
  let high = 0;
  let total = 0;
  for (let bin = 1; bin < spectrum.magnitudesDb.length; bin++) {
    const magnitude = 10 ** (spectrum.magnitudesDb[bin] / 20);
    total += magnitude;
    if (bin * spectrum.binHz >= minHz) high += magnitude;
  }
  return high / total;
}

describe("stage registry", () => {
  it("has ten stages, numbered and unique", () => {
    expect(stages).toHaveLength(10);
    expect(stages.map((stage) => stage.index)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(new Set(stages.map((stage) => stage.id)).size).toBe(10);
  });

  it("shows source that comes from the executing module", () => {
    for (const stage of stages) {
      expect(stage.sourceCode).toContain("// TALK_START");
      expect(stage.sourceCode).toContain("// TALK_END");
      expect(stage.sourceCode).toContain("RenderSettings");
    }
  });
});

describe.each(stages.map((stage) => [stage.shortTitle, stage] as const))(
  "stage %s",
  (_name, stage) => {
    it("produces the requested number of samples", async () => {
      const { samples } = await render(stage);
      const expected = Math.round(SAMPLE_RATE * DURATION);
      // The piano appends a room tail, and the melody is as long as its score.
      expect(samples.length).toBeGreaterThanOrEqual(expected);
      if (
        stage.id !== "piano" &&
        stage.id !== "fur-elise" &&
        stage.id !== "fur-elise-chords"
      ) {
        expect(samples.length).toBe(expected);
      }
    });

    it("produces only finite samples", async () => {
      const { samples } = await render(stage);
      for (let i = 0; i < samples.length; i++) {
        expect(Number.isFinite(samples[i])).toBe(true);
      }
    });

    it("is deterministic", async () => {
      const first = await render(stage);
      const second = await render(stage);
      expect(Array.from(second.samples)).toEqual(Array.from(first.samples));
    });

    it("stays inside a safe output range but is audible", async () => {
      const { samples, peak } = await render(stage);
      expect(peak).toBe(measurePeak(samples));
      expect(peak).toBeLessThanOrEqual(1);
      expect(peak).toBeGreaterThan(0.05);
    });

    it("starts without a full-amplitude jump", async () => {
      const { samples } = await render(stage);
      // From the hammer stage the note deliberately starts with a transient.
      const limit = stage.index >= 5 ? 0.2 : 1e-6;
      expect(Math.abs(samples[0])).toBeLessThan(limit);
    });
  },
);

describe("stage 1 — sine", () => {
  const stage = stages[0];

  it("is a 440 Hz sine", async () => {
    const { samples } = await render(stage);
    const spectrum = analyzeSpectrum(samples, 0, SAMPLE_RATE);
    expect(Math.abs(dominantFrequency(spectrum) - 440)).toBeLessThan(
      spectrum.binHz,
    );
  });

  it("follows the frequency it is given", async () => {
    for (const frequency of [220, 880]) {
      const { samples } = await render(stage, { frequency });
      const spectrum = analyzeSpectrum(samples, 0, SAMPLE_RATE);
      expect(Math.abs(dominantFrequency(spectrum) - frequency)).toBeLessThan(
        spectrum.binHz,
      );
    }
  });

  it("has essentially no energy at the second harmonic", async () => {
    const { samples } = await render(stage);
    const spectrum = analyzeSpectrum(samples, 0, SAMPLE_RATE);
    const bin = Math.round(880 / spectrum.binHz);
    expect(spectrum.magnitudesDb[bin]).toBeLessThan(-60);
  });
});

describe("stage 2 — envelope", () => {
  const stage = stages[1];

  it("fades to silence so the buffer cannot click", async () => {
    const { samples } = await render(stage);
    expect(Math.abs(samples[samples.length - 1])).toBeLessThan(1e-3);
  });

  it("decays: every 100 ms block is quieter than the one before", async () => {
    const { samples } = await render(stage);
    const block = Math.round(SAMPLE_RATE * 0.1);

    let previous = Infinity;
    for (let start = 0; start + block <= samples.length; start += block) {
      const level = measurePeak(samples.slice(start, start + block));
      if (start > 0) expect(level).toBeLessThan(previous);
      previous = level;
    }
  });
});

describe("stage 3 — additive synthesis", () => {
  const stage = stages[2];

  it("adds a peak at every harmonic", async () => {
    const { samples } = await render(stage, { parameters: { partials: 5 } });
    const spectrum = analyzeSpectrum(samples, 0, SAMPLE_RATE);
    const binOf = (hz: number) => Math.round(hz / spectrum.binHz);

    for (const harmonic of [440, 880, 1320, 1760, 2200]) {
      expect(spectrum.magnitudesDb[binOf(harmonic)]).toBeGreaterThan(-45);
    }
    // Nothing where there is no partial.
    expect(spectrum.magnitudesDb[binOf(660)]).toBeLessThan(-60);
  });

  it("collapses to a single partial when asked", async () => {
    const { samples } = await render(stage, { parameters: { partials: 1 } });
    const spectrum = analyzeSpectrum(samples, 0, SAMPLE_RATE);
    const bin = Math.round(880 / spectrum.binHz);
    expect(spectrum.magnitudesDb[bin]).toBeLessThan(-60);
  });
});

describe("stage 4 — independent partial decays", () => {
  const stage = stages[3];

  it("loses its high partials faster than its fundamental", async () => {
    const { samples } = await render(stage);
    const early = highFrequencyEnergy(samples.slice(0, 8192), 1000);
    const late = highFrequencyEnergy(
      samples.slice(SAMPLE_RATE - 8192, SAMPLE_RATE),
      1000,
    );
    expect(late).toBeLessThan(early);
  });
});

describe("stage 5 — hammer and velocity", () => {
  const stage = stages[4];

  it("makes a harder strike louder *and* brighter", async () => {
    const soft = await render(stage, { velocity: 0.2 });
    const hard = await render(stage, { velocity: 1 });

    expect(hard.peak).toBeGreaterThan(soft.peak);

    const softBrightness = highFrequencyEnergy(soft.samples.slice(0, 8192), 1500);
    const hardBrightness = highFrequencyEnergy(hard.samples.slice(0, 8192), 1500);
    expect(hardBrightness).toBeGreaterThan(softBrightness);
  });

  it("puts the transient only at the very beginning", async () => {
    const withHammer = await render(stage, { parameters: { hammer: 3 } });
    const without = await render(stage, { parameters: { hammer: 0 } });

    const transient = Math.round(SAMPLE_RATE * 0.025);
    let differsEarly = false;
    for (let i = 0; i < transient; i++) {
      if (Math.abs(withHammer.samples[i] - without.samples[i]) > 1e-4) {
        differsEarly = true;
        break;
      }
    }
    expect(differsEarly).toBe(true);

    for (let i = transient + 1; i < withHammer.samples.length; i += 97) {
      expect(withHammer.samples[i]).toBeCloseTo(without.samples[i], 6);
    }
  });
});

describe("stage 6 — inharmonicity", () => {
  const stage = stages[5];

  it("leaves the partials exactly harmonic at B = 0", async () => {
    const { samples } = await render(stage, {
      parameters: { inharmonicity: 0, partials: 8 },
    });
    const spectrum = analyzeSpectrum(samples, 2400, SAMPLE_RATE);
    const bin = Math.round(3520 / spectrum.binHz); // 8 × 440
    expect(spectrum.magnitudesDb[bin]).toBeGreaterThan(
      spectrum.magnitudesDb[bin + 4] + 6,
    );
  });

  it("pushes the eighth partial above 8 × f₀ when B > 0", async () => {
    const inharmonicity = 0.005;
    const { samples } = await render(stage, {
      parameters: { inharmonicity, partials: 8 },
    });
    const spectrum = analyzeSpectrum(samples, 2400, SAMPLE_RATE);
    const binOf = (hz: number) => Math.round(hz / spectrum.binHz);

    const ideal = 8 * 440;
    const stretched = partialFrequency(440, 8, inharmonicity);
    expect(stretched).toBeGreaterThan(ideal);

    // The energy sits where fₙ = n·f₀·√(1 + Bn²) says it should, not on the
    // ideal harmonic, which is now empty.
    expect(spectrum.magnitudesDb[binOf(stretched)]).toBeGreaterThan(-60);
    expect(spectrum.magnitudesDb[binOf(stretched)]).toBeGreaterThan(
      spectrum.magnitudesDb[binOf(ideal)] + 20,
    );
  });
});

describe("stage 7 — multiple strings", () => {
  const stage = stages[6];

  it("collapses to a single string when the spread is zero", async () => {
    const unison = await render(stage, { parameters: { detune: 0 } });
    const spread = await render(stage, { parameters: { detune: 10 } });

    // A unison chorus is a plain periodic tone; detuned strings beat, so the
    // two buffers must differ.
    let differences = 0;
    for (let i = 0; i < unison.samples.length; i += 101) {
      if (Math.abs(unison.samples[i] - spread.samples[i]) > 1e-3) differences++;
    }
    expect(differences).toBeGreaterThan(10);
  });

  it("beats: the envelope of a detuned note is not monotonic", async () => {
    const { samples } = await render(stage, {
      parameters: { detune: 20, hammer: 0 },
      duration: 3,
    });

    // Look at the amplitude in 50 ms blocks after the attack; with strings a
    // full 24 cents apart the sum must swell again at least once.
    const block = Math.round(SAMPLE_RATE * 0.05);
    const levels: number[] = [];
    for (let start = block; start + block < samples.length; start += block) {
      levels.push(measurePeak(samples.slice(start, start + block)));
    }

    const rises = levels.filter(
      (level, index) => index > 0 && level > levels[index - 1] * 1.05,
    );
    expect(rises.length).toBeGreaterThan(0);
  });
});

describe("stage 8 — piano", () => {
  const stage = stages[7];

  it("still ends in silence", async () => {
    const { samples } = await render(stage);
    expect(Math.abs(samples[samples.length - 1])).toBeLessThan(0.05);
  });
});

describe("output safety", () => {
  it("passes small samples through untouched", () => {
    expect(softLimit(0.5)).toBe(0.5);
    expect(softLimit(-0.5)).toBe(-0.5);
  });

  it("bends loud samples towards, but never past, full scale", () => {
    expect(softLimit(0.9)).toBeGreaterThan(0.7);
    expect(softLimit(0.9)).toBeLessThan(0.9);
    expect(Math.abs(softLimit(50))).toBeLessThanOrEqual(1);
    expect(Math.abs(softLimit(-50))).toBeLessThanOrEqual(1);
  });
});

describe("deterministic random", () => {
  it("repeats its sequence for the same seed", () => {
    const first = new DeterministicRandom(1234);
    const second = new DeterministicRandom(1234);
    for (let i = 0; i < 1000; i++) {
      expect(second.next()).toBe(first.next());
    }
  });

  it("differs for a different seed", () => {
    const a = new DeterministicRandom(1);
    const b = new DeterministicRandom(2);
    expect(a.next()).not.toBe(b.next());
  });

  it("stays within [-1, 1)", () => {
    const random = new DeterministicRandom(7);
    for (let i = 0; i < 10000; i++) {
      const value = random.nextBipolar();
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("stage 9 — Für Elise", () => {
  const stage = stages[8];

  it("is a single line: one note at a time, in order", () => {
    for (let i = 1; i < furElise.length; i++) {
      const previous = furElise[i - 1];
      expect(furElise[i].at).toBeGreaterThanOrEqual(previous.at + previous.beats);
    }
  });

  it("opens on E5", async () => {
    const { samples } = await render(stage);
    const spectrum = analyzeSpectrum(samples, 0, SAMPLE_RATE);
    const error = Math.abs(dominantFrequency(spectrum) - frequencyOfNote("E5"));
    expect(error).toBeLessThan(spectrum.binHz * 2);
  });

  it("outlasts a single note, because the score is longer than one", async () => {
    const { samples } = await render(stage);
    expect(samples.length / SAMPLE_RATE).toBeGreaterThan(4);
  });

  it("leaves headroom for the overlapping tails", async () => {
    // Half a dozen notes ring at once. If the sum were pinned to full scale the
    // limiter would be flattening the dynamics of the whole piece.
    const { peak } = await render(stage);
    expect(peak).toBeLessThan(0.98);
  });

  it("plays the same score through stage 1's sine", async () => {
    const sine = renderFurEliseSine(settingsFor(stage));
    expect(sine.peak).toBeGreaterThan(0.05);
    expect(sine.peak).toBeLessThanOrEqual(1);
    // No decay tail, so the sine version stops when the score does.
    const piano = await render(stage);
    expect(sine.samples.length).toBeLessThan(piano.samples.length);
  });
});

describe("stage 10 — Für Elise with chords", () => {
  const stage = stages[9];
  const melodyStage = stages[8];

  it("strikes notes on the same instant, which stage 9 never does", () => {
    const onsets = leftHand.map((note) => note.at);
    // Every chord is three keys down together: twelve notes, four instants.
    expect(new Set(onsets).size).toBe(4);
    for (const at of new Set(onsets)) {
      expect(onsets.filter((other) => other === at)).toHaveLength(3);
    }
    // The melody it sits under stays a single line.
    expect(new Set(furElise.map((note) => note.at)).size).toBe(furElise.length);
  });

  it("does not make the piece any longer", async () => {
    const chords = await render(stage);
    const melody = await render(melodyStage);
    expect(chords.samples.length).toBe(melody.samples.length);
  });

  it("adds a bass the melody alone does not have", async () => {
    // The first chord lands with the melody's A4, eight sixteenths in.
    const window = Math.round(1.15 * SAMPLE_RATE);
    const withChords = analyzeSpectrum(
      (await render(stage)).samples,
      window,
      SAMPLE_RATE,
    );
    const melodyOnly = analyzeSpectrum(
      (await render(melodyStage)).samples,
      window,
      SAMPLE_RATE,
    );

    const binOf = (hz: number) => Math.round(hz / withChords.binHz);
    // A2, the root of the A minor chord, an octave and a half below the tune.
    const a2 = binOf(frequencyOfNote("A2"));
    expect(withChords.magnitudesDb[a2]).toBeGreaterThan(
      melodyOnly.magnitudesDb[a2] + 12,
    );
  });

  it("leaves headroom, even with four notes struck at once", async () => {
    const { peak } = await render(stage);
    expect(peak).toBeLessThan(0.98);
  });
});
