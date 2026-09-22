export interface RenderSettings {
  /** Fundamental frequency in Hz (A4 = 440). */
  frequency: number;
  /** Length of the rendered buffer in seconds. */
  duration: number;
  /** How hard the key is struck, 0..1. */
  velocity: number;
  /** Rendering sample rate — the real AudioContext rate whenever we have one. */
  sampleRate: number;
  /** Length of the final fade-out in seconds. */
  releaseDuration: number;
  /** Stage-specific slider values, keyed by StageParameter.id. */
  parameters: Record<string, number>;
}

export interface RenderResult {
  samples: Float32Array;
  /** Largest absolute sample value, for the peak indicator. */
  peak: number;
}

export interface StageParameter {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
  /** Decimal places to show next to the slider. */
  precision?: number;
  hint?: string;
}

/** A slide drawn from a bitmap asset: a Vite image import. */
export interface GalleryPicture {
  /** Resolved asset URL (from a Vite image import). */
  src: string;
  caption: string;
}

/** A slide drawn as inline markup, from ../visualizations. */
export interface GalleryDrawing {
  /** Inline <svg> markup, safe to assign via innerHTML. */
  svg: string;
  caption: string;
}

export type GalleryImage = GalleryPicture | GalleryDrawing;

export function isDrawing(image: GalleryImage): image is GalleryDrawing {
  return "svg" in image;
}

/** An optional set of images a stage can open in a modal carousel. */
export interface StageGallery {
  /** Text on the button that opens the modal. */
  buttonLabel: string;
  /** Heading shown inside the modal. */
  title: string;
  images: GalleryImage[];
}

export interface SynthStage {
  id: string;
  /** 1-based position in the talk. */
  index: number;
  title: string;
  shortTitle: string;
  concept: string;
  explanation: string;
  formula?: string;
  /** Modal carousels this stage can open, one button each. */
  galleries?: StageGallery[];
  /** A melody's spectrum would mix unrelated notes, so it can opt out. */
  showSpectrum?: boolean;
  parameters: StageParameter[];
  /** Raw text of this stage's own module, via `import source from "./x.ts?raw"`. */
  sourceCode: string;
  /** File the source came from, shown above the code panel. */
  sourceFile: string;
  render(settings: RenderSettings): Promise<RenderResult> | RenderResult;
}

/** Read a stage slider, falling back to its default when unset. */
export function parameter(
  settings: RenderSettings,
  id: string,
  fallback: number,
): number {
  const value = settings.parameters[id];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Number of samples for the requested duration. */
export function sampleCountFor(settings: RenderSettings): number {
  return Math.max(1, Math.round(settings.sampleRate * settings.duration));
}
