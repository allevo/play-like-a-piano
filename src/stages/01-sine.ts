import { finalize } from "../audio/safety.ts";
import { sampleCountFor } from "./types.ts";
import type { RenderResult, RenderSettings } from "./types.ts";

// TALK_START
export function renderSine(settings: RenderSettings): RenderResult {
  // BEGIN_NEW
  const { frequency, sampleRate, velocity } = settings;

  // A sound is nothing but a list of numbers: one amplitude per sample,
  // 48 000 of them per second.
  const sampleCount = sampleCountFor(settings);
  const samples = new Float32Array(sampleCount);

  const amplitude = 0.55 * velocity;

  for (let i = 0; i < sampleCount; i++) {
    // Sample index -> time in seconds.
    const time = i / sampleRate;

    // x(t) = A · sin(2πft)
    samples[i] = Math.sin(2 * Math.PI * frequency * time) * amplitude;
  }
  // END_NEW

  return finalize(samples);
}
// TALK_END
