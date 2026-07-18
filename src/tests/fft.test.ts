import { describe, expect, it } from "vitest";
import {
  analyzeSpectrum,
  DEFAULT_FFT_SIZE,
  dominantFrequency,
  fft,
  hannWindow,
  MINIMUM_DB,
} from "../audio/fft.ts";

const SAMPLE_RATE = 48000;

function tone(frequency: number, amplitude = 1, length = 16384): Float32Array {
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE);
  }
  return samples;
}

describe("fft", () => {
  it("rejects lengths that are not a power of two", () => {
    expect(() => fft(new Float64Array(3), new Float64Array(3))).toThrow();
  });

  it("matches a naive DFT on a short signal", () => {
    const size = 16;
    const signal = Array.from({ length: size }, (_, i) =>
      Math.sin((2 * Math.PI * 3 * i) / size) + 0.5 * Math.cos((2 * Math.PI * 5 * i) / size),
    );

    const re = Float64Array.from(signal);
    const im = new Float64Array(size);
    fft(re, im);

    for (let k = 0; k < size; k++) {
      let naiveRe = 0;
      let naiveIm = 0;
      for (let n = 0; n < size; n++) {
        const angle = (-2 * Math.PI * k * n) / size;
        naiveRe += signal[n] * Math.cos(angle);
        naiveIm += signal[n] * Math.sin(angle);
      }
      expect(re[k]).toBeCloseTo(naiveRe, 8);
      expect(im[k]).toBeCloseTo(naiveIm, 8);
    }
  });
});

describe("hann window", () => {
  it("starts and ends at zero and peaks in the middle", () => {
    const window = hannWindow(1024);
    expect(window[0]).toBeCloseTo(0, 12);
    expect(window[1023]).toBeCloseTo(0, 12);
    expect(window[512]).toBeCloseTo(1, 2);
  });
});

describe("analyzeSpectrum", () => {
  it("puts the dominant bin of a 440 Hz sine near 440 Hz", () => {
    const spectrum = analyzeSpectrum(tone(440), 0, SAMPLE_RATE);
    // 4096 bins at 48 kHz are 11.7 Hz wide, so "near 440" means "within a bin".
    expect(Math.abs(dominantFrequency(spectrum) - 440)).toBeLessThan(
      spectrum.binHz,
    );
  });

  it("tracks the pitch when the frequency changes", () => {
    for (const frequency of [220, 880, 1320]) {
      const spectrum = analyzeSpectrum(tone(frequency), 0, SAMPLE_RATE);
      expect(Math.abs(dominantFrequency(spectrum) - frequency)).toBeLessThan(
        spectrum.binHz,
      );
    }
  });

  it("reads a full-scale sine as roughly 0 dBFS", () => {
    const spectrum = analyzeSpectrum(tone(440), 0, SAMPLE_RATE);
    const bin = Math.round(440 / spectrum.binHz);
    expect(spectrum.magnitudesDb[bin]).toBeGreaterThan(-1.5);
    expect(spectrum.magnitudesDb[bin]).toBeLessThan(0.5);
  });

  it("finds a peak at the second harmonic too", () => {
    const fundamental = tone(440, 1);
    const harmonic = tone(880, 0.5);
    const mixed = fundamental.map((value, i) => value + harmonic[i]);

    const spectrum = analyzeSpectrum(mixed, 0, SAMPLE_RATE);
    const binOf = (hz: number) => Math.round(hz / spectrum.binHz);

    const at880 = spectrum.magnitudesDb[binOf(880)];
    const between = spectrum.magnitudesDb[binOf(660)];

    expect(at880).toBeGreaterThan(-12);
    expect(at880).toBeGreaterThan(between + 30);
  });

  it("returns finite values for silence", () => {
    const spectrum = analyzeSpectrum(
      new Float32Array(DEFAULT_FFT_SIZE),
      0,
      SAMPLE_RATE,
    );
    for (const db of spectrum.magnitudesDb) {
      expect(Number.isFinite(db)).toBe(true);
      expect(db).toBe(MINIMUM_DB);
    }
  });

  it("zero-pads instead of failing when the window runs past the end", () => {
    const spectrum = analyzeSpectrum(tone(440, 1, 100), 50, SAMPLE_RATE);
    for (const db of spectrum.magnitudesDb) {
      expect(Number.isFinite(db)).toBe(true);
    }
  });
});
