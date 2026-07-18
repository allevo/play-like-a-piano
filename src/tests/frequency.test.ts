import { describe, expect, it } from "vitest";
import {
  A4_FREQUENCY,
  centsToRatio,
  frequencyFromA4,
  noteName,
  partialFrequency,
  semitonesToRatio,
} from "../audio/math.ts";

describe("frequency math", () => {
  it("anchors A4 at 440 Hz", () => {
    expect(A4_FREQUENCY).toBe(440);
    expect(frequencyFromA4(0)).toBe(440);
  });

  it("doubles the frequency one octave up", () => {
    expect(frequencyFromA4(12)).toBeCloseTo(880, 6);
    expect(frequencyFromA4(-12)).toBeCloseTo(220, 6);
    expect(semitonesToRatio(12)).toBeCloseTo(2, 12);
  });

  it("converts cents to ratios", () => {
    expect(centsToRatio(0)).toBe(1);
    expect(centsToRatio(1200)).toBeCloseTo(2, 12);
    expect(centsToRatio(-1200)).toBeCloseTo(0.5, 12);
    // A cent is small: 1.2 cents on A4 is a fraction of a hertz.
    expect(440 * centsToRatio(1.2) - 440).toBeLessThan(0.5);
  });

  it("names the octaves used in the talk", () => {
    expect(noteName(220)).toBe("A3");
    expect(noteName(440)).toBe("A4");
    expect(noteName(880)).toBe("A5");
    expect(noteName(261.63)).toBe("C4");
  });
});

describe("inharmonicity", () => {
  it("gives exact harmonics when B = 0", () => {
    for (let n = 1; n <= 12; n++) {
      expect(partialFrequency(440, n, 0)).toBeCloseTo(n * 440, 9);
    }
  });

  it("raises the higher partials when B > 0", () => {
    const ideal = 8 * 440;
    const stretched = partialFrequency(440, 8, 0.0004);
    expect(stretched).toBeGreaterThan(ideal);

    // The stretching grows with the partial number.
    const firstError = partialFrequency(440, 1, 0.0004) / 440 - 1;
    const eighthError = stretched / ideal - 1;
    expect(eighthError).toBeGreaterThan(firstError * 10);
  });

  it("leaves the fundamental essentially where it was", () => {
    expect(partialFrequency(440, 1, 0.0004)).toBeCloseTo(440, 0);
  });
});
