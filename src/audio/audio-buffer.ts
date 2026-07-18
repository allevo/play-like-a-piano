/**
 * Bridge between "an array of numbers we computed ourselves" and something the
 * Web Audio API can play. This is the whole trick of the talk: every stage
 * hands us a Float32Array, and playback is always the same three lines.
 */

export type AudioContextLike = BaseAudioContext;

export function samplesToAudioBuffer(
  context: AudioContextLike,
  samples: Float32Array,
  sampleRate: number,
): AudioBuffer {
  const buffer = context.createBuffer(1, samples.length, sampleRate);
  // The DOM types insist on an ArrayBuffer-backed view; ours always is.
  buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
  return buffer;
}

/** Copy channel 0 of an AudioBuffer back into a plain Float32Array. */
export function audioBufferToSamples(buffer: AudioBuffer): Float32Array {
  const samples = new Float32Array(buffer.length);
  buffer.copyFromChannel(samples as Float32Array<ArrayBuffer>, 0);
  return samples;
}
