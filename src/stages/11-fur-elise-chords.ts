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
// that share an onset. Nothing in `renderScore` knows what a chord is — three
// notes with the same `at` are three buffers added at the same sample offset,
// which is what the sum has been doing since the first note of stage 9.

/** The left hand is played softer than the melody it holds up. */
const BASS = 0.5;

// BEGIN_NEW
/**
 * The left hand as held chords. Stage 9 spreads these same harmonies out in
 * time, one note after another, so they fit in the gaps the melody leaves; here
 * they are struck together and held underneath it, which is what the score
 * actually asks for.
 *
 * Bars 1 and 4 — the opening figure and its return — stay bare: the piece
 * leaves them unaccompanied, and that silence is what makes the chords land.
 */
export const leftHand: ScoreNote[] = [
  // A minor, under the first landing on A4.
  { note: "A2", at: 8, beats: 5, velocity: BASS },
  { note: "E3", at: 8, beats: 5, velocity: BASS },
  { note: "A3", at: 8, beats: 5, velocity: BASS },
  // E major, under B4.
  { note: "E2", at: 13, beats: 5, velocity: BASS },
  { note: "E3", at: 13, beats: 5, velocity: BASS },
  { note: "G#3", at: 13, beats: 5, velocity: BASS },
  // A minor again, under C5.
  { note: "A2", at: 18, beats: 3, velocity: BASS },
  { note: "E3", at: 18, beats: 3, velocity: BASS },
  { note: "A3", at: 18, beats: 3, velocity: BASS },
  // A minor under the long final A4.
  { note: "A2", at: 29, beats: 12, velocity: BASS },
  { note: "E3", at: 29, beats: 12, velocity: BASS },
  { note: "A3", at: 29, beats: 12, velocity: BASS },
];
// END_NEW

const DAMPER_SECONDS = 0.5;

/**
 * Well under the melody's own gain, and not only for balance.
 * `synthesizeStrings` starts its three strings at fixed phases and reseeds the
 * same hammer noise on every call, so notes struck on the *same* sample are
 * correlated: their transients line up and add almost linearly instead of
 * growing as the square root. Stage 9 never showed this, because no two of its
 * notes share an onset. Here four do, at the downbeat of every chord.
 */
const LEFT_HAND_GAIN = 0.45;

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
