/**
 * A small in-place radix-2 FFT plus the analysis helpers the spectrum view
 * needs. Local and deterministic: the graph is computed from the rendered
 * sample buffer, not from live playback, so it is identical every time.
 */

/** In-place complex FFT. `re` and `im` must have the same power-of-two length. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  if (n !== im.length) {
    throw new Error("fft: real and imaginary arrays must have equal length");
  }
  if (n < 2 || (n & (n - 1)) !== 0) {
    throw new Error(`fft: length must be a power of two, got ${n}`);
  }

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;

    if (i < j) {
      const tempRe = re[i];
      re[i] = re[j];
      re[j] = tempRe;
      const tempIm = im[i];
      im[i] = im[j];
      im[j] = tempIm;
    }
  }

  // Butterfly stages.
  for (let length = 2; length <= n; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    const stepRe = Math.cos(angle);
    const stepIm = Math.sin(angle);
    const half = length >> 1;

    for (let start = 0; start < n; start += length) {
      let twiddleRe = 1;
      let twiddleIm = 0;

      for (let k = 0; k < half; k++) {
        const evenRe = re[start + k];
        const evenIm = im[start + k];
        const oddRe = re[start + k + half];
        const oddIm = im[start + k + half];

        const rotatedRe = oddRe * twiddleRe - oddIm * twiddleIm;
        const rotatedIm = oddRe * twiddleIm + oddIm * twiddleRe;

        re[start + k] = evenRe + rotatedRe;
        im[start + k] = evenIm + rotatedIm;
        re[start + k + half] = evenRe - rotatedRe;
        im[start + k + half] = evenIm - rotatedIm;

        const nextTwiddleRe = twiddleRe * stepRe - twiddleIm * stepIm;
        twiddleIm = twiddleRe * stepIm + twiddleIm * stepRe;
        twiddleRe = nextTwiddleRe;
      }
    }
  }
}

const windowCache = new Map<number, Float64Array>();

/** Hann window — tames the spectral leakage of a truncated tone. */
export function hannWindow(size: number): Float64Array {
  const cached = windowCache.get(size);
  if (cached) return cached;

  const window = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  windowCache.set(size, window);
  return window;
}

export const DEFAULT_FFT_SIZE = 4096;
export const MINIMUM_DB = -100;

export interface Spectrum {
  /** Magnitude of each bin in dB, floored at MINIMUM_DB. Length = size / 2. */
  magnitudesDb: Float32Array;
  /** Width of one bin in Hz. */
  binHz: number;
  sampleRate: number;
}

/**
 * Windowed magnitude spectrum of `size` samples taken from `startIndex`.
 * Short or out-of-range regions are zero-padded rather than rejected, so the
 * caller never has to special-case the tail of a note.
 */
export function analyzeSpectrum(
  samples: Float32Array,
  startIndex: number,
  sampleRate: number,
  size: number = DEFAULT_FFT_SIZE,
): Spectrum {
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  const window = hannWindow(size);

  for (let i = 0; i < size; i++) {
    const source = startIndex + i;
    const sample =
      source >= 0 && source < samples.length ? samples[source] : 0;
    re[i] = Number.isFinite(sample) ? sample * window[i] : 0;
  }

  fft(re, im);

  // Coherent gain of the Hann window is 0.5; the one-sided spectrum doubles
  // every bin except DC. Together these make a full-scale sine read as 0 dB.
  const scale = 2 / (size * 0.5);
  const bins = size >> 1;
  const magnitudesDb = new Float32Array(bins);

  for (let bin = 0; bin < bins; bin++) {
    const magnitude = Math.hypot(re[bin], im[bin]) * scale;
    magnitudesDb[bin] =
      magnitude > 0
        ? Math.max(MINIMUM_DB, 20 * Math.log10(magnitude))
        : MINIMUM_DB;
  }

  return { magnitudesDb, binHz: sampleRate / size, sampleRate };
}

/** Index of the loudest bin, ignoring DC. */
export function dominantBin(spectrum: Spectrum): number {
  let bestBin = 1;
  let bestDb = -Infinity;
  for (let bin = 1; bin < spectrum.magnitudesDb.length; bin++) {
    if (spectrum.magnitudesDb[bin] > bestDb) {
      bestDb = spectrum.magnitudesDb[bin];
      bestBin = bin;
    }
  }
  return bestBin;
}

/** Frequency in Hz of the loudest bin. */
export function dominantFrequency(spectrum: Spectrum): number {
  return dominantBin(spectrum) * spectrum.binHz;
}
