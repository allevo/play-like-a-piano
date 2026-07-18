import { finalize } from "../audio/safety.ts";
import { parameter, sampleCountFor } from "./types.ts";
import type { RenderResult, RenderSettings } from "./types.ts";

// TALK_START
// BEGIN_NEW
// A note that switches on and off instantly jumps from 0 to full amplitude:
// a discontinuity, which we hear as a click. The two edges of the buffer have
// to be ramps — a fast attack in, a short release out.
export function edgeGain(
  time: number,
  duration: number,
  attack: number,
  release: number,
): number {
  const attackGain = Math.min(time / attack, 1);

  const releaseStart = duration - release;
  const releaseGain =
    time < releaseStart ? 1 : Math.max(0, (duration - time) / release);

  return attackGain * releaseGain;
}

// Between the edges, a struck string loses its energy exponentially.
export function amplitudeEnvelope(
  time: number,
  duration: number,
  attack: number,
  decayTime: number,
  release: number,
): number {
  return edgeGain(time, duration, attack, release) * Math.exp(-time / decayTime);
}
// END_NEW

export function renderEnvelopedTone(settings: RenderSettings): RenderResult {
  const { frequency, sampleRate, duration, velocity, releaseDuration } =
    settings;

  const attack = parameter(settings, "attack", 8) / 1000; // ms -> s
  const decayTime = parameter(settings, "decay", 1.8);

  const sampleCount = sampleCountFor(settings);
  const samples = new Float32Array(sampleCount);
  const amplitude = 0.75 * velocity;

  for (let i = 0; i < sampleCount; i++) {
    const time = i / sampleRate;
    const tone = Math.sin(2 * Math.PI * frequency * time);

    // BEGIN_NEW
    const envelope = amplitudeEnvelope(
      time,
      duration,
      attack,
      decayTime,
      releaseDuration,
    );

    samples[i] = tone * envelope * amplitude;
    // END_NEW
  }

  return finalize(samples);
}
// TALK_END
