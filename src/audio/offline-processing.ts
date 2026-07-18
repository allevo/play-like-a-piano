import { audioBufferToSamples } from "./audio-buffer.ts";

/**
 * Stage 9 runs its samples through a graph of ordinary Web Audio nodes
 * (filters, a convolver) but must end up with a plain sample buffer again, so
 * that playback and the visualizations stay exactly as simple as in stage 1.
 *
 * OfflineAudioContext does that: it renders a node graph to an AudioBuffer as
 * fast as the CPU allows, with no AudioWorklet and no realtime scheduling.
 */

/** Node tests and very old browsers have no OfflineAudioContext. */
export function isOfflineRenderingAvailable(): boolean {
  return typeof OfflineAudioContext !== "undefined";
}

export async function renderOffline(
  lengthInSamples: number,
  sampleRate: number,
  build: (context: OfflineAudioContext) => void,
): Promise<Float32Array> {
  const context = new OfflineAudioContext(1, lengthInSamples, sampleRate);
  build(context);
  const rendered = await context.startRendering();
  return audioBufferToSamples(rendered);
}
