import { samplesToAudioBuffer } from "./audio-buffer.ts";

export const FALLBACK_SAMPLE_RATE = 48000;

/**
 * Owns the single AudioContext and the single playing source.
 *
 * Two rules keep a live demo out of trouble:
 *   1. The context is created lazily, inside a user gesture, because browsers
 *      block audio that starts on its own.
 *   2. There is never more than one source. Hitting Play twice stops the first
 *      note instead of stacking notes on top of each other.
 */
export class AudioEngine {
  private context: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private masterGain: GainNode | null = null;
  private playingChanged: ((playing: boolean) => void) | null = null;

  /** Sample rate to render at. Before the first gesture we guess; the guess is
   *  replaced by the real hardware rate as soon as the context exists. */
  get sampleRate(): number {
    return this.context?.sampleRate ?? FALLBACK_SAMPLE_RATE;
  }

  get isPlaying(): boolean {
    return this.source !== null;
  }

  onPlayingChanged(listener: (playing: boolean) => void): void {
    this.playingChanged = listener;
  }

  /** Must be called from a user gesture (click / keypress). */
  async ensureContext(): Promise<AudioContext> {
    if (!this.context) {
      const context = new AudioContext();
      const gain = context.createGain();
      gain.gain.value = 0.9;
      gain.connect(context.destination);
      this.context = context;
      this.masterGain = gain;
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    return this.context;
  }

  /** Stop the current note, then play `samples` from the start. */
  play(samples: Float32Array, sampleRate: number): void {
    const context = this.context;
    const masterGain = this.masterGain;
    if (!context || !masterGain) return;

    this.stop();

    const buffer = samplesToAudioBuffer(context, samples, sampleRate);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(masterGain);

    source.onended = () => {
      if (this.source === source) {
        this.source = null;
        this.playingChanged?.(false);
      }
    };

    this.source = source;
    source.start();
    this.playingChanged?.(true);
  }

  stop(): void {
    const source = this.source;
    if (!source) return;

    this.source = null;
    source.onended = null;
    try {
      source.stop();
    } catch {
      // Already finished — nothing to stop.
    }
    source.disconnect();
    this.playingChanged?.(false);
  }
}
