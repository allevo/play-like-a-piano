import { samplesToAudioBuffer } from "../audio/audio-buffer.ts";
import { DeterministicRandom } from "../audio/deterministic-random.ts";
import {
  isOfflineRenderingAvailable,
  renderOffline,
} from "../audio/offline-processing.ts";
import { finalize } from "../audio/safety.ts";
import { synthesizeStrings } from "./08-multiple-strings.ts";
import { parameter } from "./types.ts";
import type { RenderResult, RenderSettings } from "./types.ts";

const ROOM_TAIL_SECONDS = 1.2;

function peaking(
  context: OfflineAudioContext,
  frequency: number,
  q: number,
  gain: number,
): BiquadFilterNode {
  const filter = context.createBiquadFilter();
  filter.type = "peaking";
  filter.frequency.value = frequency;
  filter.Q.value = q;
  filter.gain.value = gain;
  return filter;
}

// TALK_START
// BEGIN_NEW
// The strings are only the source. Their energy drives the soundboard, which
// colours it, and the soundboard radiates into a room, which adds a tail. Both
// are linear filters — exactly what Web Audio nodes already are.

/** A procedural impulse response: decaying noise. No audio file involved. */
function createRoomImpulse(context: OfflineAudioContext): AudioBuffer {
  const length = Math.floor(context.sampleRate * 1.1);
  const impulse = context.createBuffer(1, length, context.sampleRate);
  const data = impulse.getChannelData(0);
  const random = new DeterministicRandom(0x1234567);

  let smoothed = 0;
  for (let i = 0; i < length; i++) {
    // Raw white noise sounds like static; smooth it and let it die away.
    smoothed = smoothed * 0.55 + random.nextBipolar() * 0.45;
    data[i] = smoothed * Math.exp((-i / context.sampleRate) * 4.5);
  }

  return impulse;
}

function buildPianoBody(
  context: OfflineAudioContext,
  dry: AudioBuffer,
  soundboard: number,
  roomMix: number,
): void {
  const source = context.createBufferSource();
  source.buffer = dry;

  // Soundboard: a few broad resonances, then a gentle low-pass so the top
  // partials do not sound like glass.
  const body = peaking(context, 180, 0.9, 4 * soundboard);
  const scoop = peaking(context, 620, 1.1, -3 * soundboard);
  const presence = peaking(context, 2400, 0.8, 3.5 * soundboard);

  const smooth = context.createBiquadFilter();
  smooth.type = "lowpass";
  smooth.frequency.value = 7000;

  // Room: a dry path and a convolved wet path, mixed conservatively.
  const convolver = context.createConvolver();
  convolver.buffer = createRoomImpulse(context);

  const wet = context.createGain();
  wet.gain.value = roomMix;

  const dryPath = context.createGain();
  dryPath.gain.value = 1 - roomMix * 0.5;

  const output = context.createGain();
  output.gain.value = 1.25;

  source.connect(body).connect(scoop).connect(presence).connect(smooth);
  smooth.connect(dryPath).connect(output);
  smooth.connect(convolver).connect(wet).connect(output);
  output.connect(context.destination);

  source.start();
}
// END_NEW

export async function renderPiano(
  settings: RenderSettings,
): Promise<RenderResult> {
  // Everything from stage 8 — hammer, inharmonic partials, three detuned
  // strings — is unchanged. The instrument body is a separate concern.
  const strings = synthesizeStrings(settings);

  if (!isOfflineRenderingAvailable()) {
    return finalize(strings);
  }

  // BEGIN_NEW
  // OfflineAudioContext renders the node graph to an AudioBuffer as fast as the
  // CPU allows, so we get plain samples back and play them exactly as in
  // stage 1. No AudioWorklet, no realtime scheduling.
  const processed = await renderOffline(
    strings.length + Math.round(settings.sampleRate * ROOM_TAIL_SECONDS),
    settings.sampleRate,
    (context) => {
      buildPianoBody(
        context,
        samplesToAudioBuffer(context, strings, settings.sampleRate),
        parameter(settings, "soundboard", 0.7),
        parameter(settings, "room", 0.2),
      );
    },
  );
  // END_NEW

  return finalize(processed);
}
// TALK_END
