import { samplesToAudioBuffer } from "../audio/audio-buffer.ts";
import {
  isOfflineRenderingAvailable,
  renderOffline,
} from "../audio/offline-processing.ts";
import { finalize } from "../audio/safety.ts";
import { synthesizeStrings } from "./08-multiple-strings.ts";
import { ROOM_TAIL_SECONDS, buildPianoBody } from "./09-piano.ts";
import { PIANO_NOTE_GAIN, furElise, renderScore } from "./10-fur-elise.ts";
import type { ScoreNote } from "./10-fur-elise.ts";
import { parameter } from "./types.ts";
import type { RenderResult, RenderSettings } from "./types.ts";

// TALK_START
// The melody of stage 9, note for note. What is new sits underneath it: notes
// that share an onset. Nothing in `renderScore` knows what a chord is — five
// notes with the same `at` are five buffers added at the same sample offset,
// which is what the sum has been doing since the first note of stage 9.

/** The left hand is played softer than the melody it holds up. */
const BASS = 0.62;

// BEGIN_NEW
/**
 * The left hand as held chords. Stage 9 spreads these same harmonies out in
 * time, one note after another, so they fit in the gaps the melody leaves; here
 * they are struck together and held underneath it.
 *
 * Each chord is voiced across two octaves, from a low root for weight up to E4
 * for presence, and that span is the whole point. The partial table in stage 7
 * stops at eight partials: on an A2 at 110 Hz that puts the last one at 880 Hz
 * and leaves everything above it empty, so low notes alone add no body at all.
 * The upper voices reach 2.6 kHz and fill the band where the ear hears a chord.
 * Both chords also carry their third — C4 for the minor, G#3 for the major —
 * and both top out on E4, so the upper voice never moves.
 */
const aMinor = ["A2", "E3", "A3", "C4", "E4"];
const eMajor = ["E2", "E3", "G#3", "B3", "E4"];

/** One chord: every note struck on the same sixteenth, and held for `beats`. */
function chord(notes: string[], at: number, beats: number): ScoreNote[] {
  return notes.map((note) => ({ note, at, beats, velocity: BASS }));
}

export const leftHand: ScoreNote[] = [
  ...chord(aMinor, 0, 8), // under the opening figure
  ...chord(aMinor, 8, 5), // under the landing on A4
  ...chord(eMajor, 13, 5), // under B4
  ...chord(aMinor, 18, 3), // under C5
  ...chord(aMinor, 21, 8), // under the figure's return
  ...chord(aMinor, 29, 12), // under the long final A4
];
// END_NEW

const DAMPER_SECONDS = 0.5;

/**
 * Five notes struck on the same sample cost far more headroom than five notes
 * spread over time, and not because of the hammer: measured, the transient
 * makes no difference to the peak at all. It is the strings. A chord is
 * consonant precisely because its notes share partials, those shared partials
 * all start at the same fixed phase, and identical frequencies at identical
 * phases add in full. The peak lands some 70 ms after a downbeat, well past the
 * hammer's 25 ms.
 *
 * So the ceiling here is set by the model's fixed starting phases, and this
 * gain is the measured answer to it: the accompaniment sits level with the
 * melody, and the soft limiter shapes about 2 % of the samples.
 */
const LEFT_HAND_GAIN = 0.52;

export async function renderFurEliseChords(
  settings: RenderSettings,
): Promise<RenderResult> {
  // BEGIN_NEW
  // The melody is rendered exactly as in stage 9 — same score, same gain — so
  // that the only difference you can hear is the hand underneath it.
  const dry = renderScore(
    furElise,
    synthesizeStrings,
    DAMPER_SECONDS,
    PIANO_NOTE_GAIN,
    settings,
  );

  const chords = renderScore(
    leftHand,
    synthesizeStrings,
    DAMPER_SECONDS,
    LEFT_HAND_GAIN,
    settings,
  );

  // Two hands, one buffer. Still the same addition.
  const shared = Math.min(dry.length, chords.length);
  for (let i = 0; i < shared; i++) {
    dry[i] += chords[i];
  }
  // END_NEW

  if (!isOfflineRenderingAvailable()) {
    return finalize(dry);
  }

  // One soundboard, one room, one pass over the whole piece — exactly as in
  // stage 9. Adding voices to `x` does not add convolutions.
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

  return finalize(processed);
}
// TALK_END
