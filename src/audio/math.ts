/**
 * Small, dependency-free frequency helpers shared by every stage.
 */

export const A4_FREQUENCY = 440;

/** Ratio between two pitches separated by `semitones` steps of equal temperament. */
export function semitonesToRatio(semitones: number): number {
  return 2 ** (semitones / 12);
}

/** Ratio between two pitches separated by `cents` (1/100 of a semitone). */
export function centsToRatio(cents: number): number {
  return 2 ** (cents / 1200);
}

/** Frequency of a note given as a semitone offset from A4. */
export function frequencyFromA4(semitones: number): number {
  return A4_FREQUENCY * semitonesToRatio(semitones);
}

/**
 * Frequency of partial `partialNumber` on a stiff (real) string.
 *
 *   fₙ = n · f₀ · √(1 + B · n²)
 *
 * With B = 0 this collapses to the ideal harmonic series.
 */
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

const NOTE_NAMES = [
  "A",
  "A#",
  "B",
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
];

/** Closest note name for a frequency, e.g. 440 -> "A4", 233 -> "A#3". */
export function noteName(frequency: number): string {
  if (!(frequency > 0)) return "—";
  const semitones = Math.round(12 * Math.log2(frequency / A4_FREQUENCY));
  const index = ((semitones % 12) + 12) % 12;
  // A4 is the anchor: octave numbers change at C, three semitones above A.
  const octave = 4 + Math.floor((semitones + 9) / 12);
  return `${NOTE_NAMES[index]}${octave}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
