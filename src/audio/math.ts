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

/** Semitone offset from A4 for a natural letter in a given octave. */
function naturalSemitones(letterIndex: number, octave: number): number {
  // The mirror of noteName's anchoring: octave numbers change at C, three
  // semitones above A, so an octave's block of twelve starts at 12·(o − 4) − 9.
  return 12 * (octave - 4) - 9 + ((((letterIndex - 3) % 12) + 12) % 12);
}

/**
 * Frequency of a note written in scientific pitch notation: "E5" -> 659.26.
 *
 * The inverse of noteName. The accidental is applied after the natural letter,
 * so the awkward spellings land where a musician expects: Cb4 is B3, B#4 is C5.
 */
export function frequencyOfNote(name: string): number {
  const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(name.trim());
  if (!match) throw new Error(`Nome di nota non valido: "${name}"`);

  const [, letter, accidental, octave] = match;
  const letterIndex = NOTE_NAMES.indexOf(letter.toUpperCase());
  const semitones =
    naturalSemitones(letterIndex, Number(octave)) +
    (accidental === "#" ? 1 : accidental === "b" ? -1 : 0);

  return frequencyFromA4(semitones);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
