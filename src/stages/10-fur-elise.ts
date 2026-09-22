import { samplesToAudioBuffer } from "../audio/audio-buffer.ts";
import { frequencyOfNote } from "../audio/math.ts";
import {
  isOfflineRenderingAvailable,
  renderOffline,
} from "../audio/offline-processing.ts";
import { finalize } from "../audio/safety.ts";
import { renderSine } from "./01-sine.ts";
import { synthesizeStrings } from "./08-multiple-strings.ts";
import { ROOM_TAIL_SECONDS, buildPianoBody } from "./09-piano.ts";
import { parameter } from "./types.ts";
import type { RenderResult, RenderSettings } from "./types.ts";

// TALK_START
// BEGIN_NEW
// Eight stages built one note. A melody is that same note, rendered once per
// pitch and *added* into one long buffer at the right sample offset. That is
// all that polyphony is: addition. No sequencer, no scheduling, no realtime —
// what comes out is still a Float32Array, played exactly as in stage 1.

export interface ScoreNote {
  /** Pitch in scientific notation, "E5". */
  note: string;
  /** Onset, in sixteenths from the start. */
  at: number;
  /** Written length, in sixteenths. */
  beats: number;
  /** How hard this key is struck; falls back to the global setting. */
  velocity?: number;
}

const SIXTEENTH_SECONDS = 0.14;

/** The runs that belong to the left hand go in a little softer. */
const FILL = 0.55;

/**
 * The opening of Beethoven's Für Elise, reduced to the single line everyone
 * knows. In the score the C4-E4-A4 and E4-G#4-B4 runs are the left hand; played
 * in line with the melody they fill the rests the right hand leaves behind.
 */
export const furElise: ScoreNote[] = [
  { note: "E5", at: 0, beats: 1 },
  { note: "D#5", at: 1, beats: 1 },
  { note: "E5", at: 2, beats: 1 },
  { note: "D#5", at: 3, beats: 1 },
  { note: "E5", at: 4, beats: 1 },
  { note: "B4", at: 5, beats: 1 },
  { note: "D5", at: 6, beats: 1 },
  { note: "C5", at: 7, beats: 1 },
  { note: "A4", at: 8, beats: 2 },
  { note: "C4", at: 10, beats: 1, velocity: FILL },
  { note: "E4", at: 11, beats: 1, velocity: FILL },
  { note: "A4", at: 12, beats: 1, velocity: FILL },
  { note: "B4", at: 13, beats: 2 },
  { note: "E4", at: 15, beats: 1, velocity: FILL },
  { note: "G#4", at: 16, beats: 1, velocity: FILL },
  { note: "B4", at: 17, beats: 1, velocity: FILL },
  { note: "C5", at: 18, beats: 2 },
  { note: "E4", at: 20, beats: 1, velocity: FILL },
  { note: "E5", at: 21, beats: 1 },
  { note: "D#5", at: 22, beats: 1 },
  { note: "E5", at: 23, beats: 1 },
  { note: "D#5", at: 24, beats: 1 },
  { note: "E5", at: 25, beats: 1 },
  { note: "B4", at: 26, beats: 1 },
  { note: "D5", at: 27, beats: 1 },
  { note: "C5", at: 28, beats: 1 },
  { note: "A4", at: 29, beats: 12 },
];

/** Add one rendered note into the melody, starting at a sample offset. */
function mixInto(
  destination: Float32Array,
  source: Float32Array,
  startSample: number,
  gain: number,
): void {
  const count = Math.min(source.length, destination.length - startSample);
  for (let i = 0; i < count; i++) {
    destination[startSample + i] += source[i] * gain;
  }
}

/**
 * Render every note of a score with `voice` and sum them into one buffer.
 *
 * `tailSeconds` is the damper. Our string decays over three and a half seconds,
 * so at this tempo a note is still at 96 % of its amplitude when the next one
 * arrives, and the passage turns to mud. On a real piano the damper drops back
 * onto the string the moment the key is released. We model it by rendering each
 * note for its written length plus `tailSeconds`, and handing that same
 * `tailSeconds` to the release ramp of stage 2 — so the note rings freely while
 * it is held, then fades. Long enough to connect one note to the next, short
 * enough that the fast alternation at the start stays legible.
 */
function renderScore(
  score: ScoreNote[],
  voice: (settings: RenderSettings) => Float32Array,
  tailSeconds: number,
  gain: number,
  settings: RenderSettings,
): Float32Array {
  const { sampleRate } = settings;

  const seconds = score.reduce(
    (latest, note) =>
      Math.max(latest, (note.at + note.beats) * SIXTEENTH_SECONDS + tailSeconds),
    0,
  );
  const melody = new Float32Array(Math.ceil(seconds * sampleRate));

  for (const note of score) {
    const samples = voice({
      ...settings,
      frequency: frequencyOfNote(note.note),
      duration: note.beats * SIXTEENTH_SECONDS + tailSeconds,
      releaseDuration: tailSeconds || settings.releaseDuration,
      velocity: note.velocity ?? settings.velocity,
    });

    mixInto(
      melody,
      samples,
      Math.round(note.at * SIXTEENTH_SECONDS * sampleRate),
      gain,
    );
  }

  return melody;
}
// END_NEW

/**
 * Stage 1, one note at a time. A bare sine has no decay, so each note lasts
 * exactly as long as it is written and the next one starts where it stops —
 * and every one of those joins is the click stage 2 exists to remove.
 */
/** Loud enough to match the piano, but kept under the limiter's 0.7 knee: a
 *  soft-limited sine is no longer a pure sine, and that is the whole point. */
const SINE_NOTE_GAIN = 1.65;

export function renderFurEliseSine(settings: RenderSettings): RenderResult {
  return finalize(
    renderScore(
      furElise,
      (noteSettings) => renderSine(noteSettings).samples,
      0,
      SINE_NOTE_GAIN,
      settings,
    ),
  );
}

const PIANO_TAIL_SECONDS = 0.5;

/** Half a dozen decaying notes overlap at once, so each goes in quietly enough
 *  that their sum never has to lean on the limiter. */
const PIANO_NOTE_GAIN = 0.9;

export async function renderFurElisePiano(
  settings: RenderSettings,
): Promise<RenderResult> {
  // The three detuned strings of stage 7, struck once per note in the score.
  const dry = renderScore(
    furElise,
    synthesizeStrings,
    PIANO_TAIL_SECONDS,
    PIANO_NOTE_GAIN,
    settings,
  );

  if (!isOfflineRenderingAvailable()) {
    return finalize(dry);
  }

  // BEGIN_NEW
  // A piano has one soundboard and stands in one room, so the body of stage 8
  // runs once over the whole piece — not once per note. It is also the only way
  // this stays fast: one convolution instead of thirty.
  const processed = await renderOffline(
    dry.length + Math.round(settings.sampleRate * ROOM_TAIL_SECONDS),
    settings.sampleRate,
    (context) =>
      buildPianoBody(
        context,
        samplesToAudioBuffer(context, dry, settings.sampleRate),
        parameter(settings, "soundboard", 0.7),
        parameter(settings, "room", 0.2),
      ),
  );
  // END_NEW

  return finalize(processed);
}
// TALK_END
