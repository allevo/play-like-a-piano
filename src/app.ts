import { AudioEngine } from "./audio/audio-engine.ts";
import { analyzeSpectrum, DEFAULT_FFT_SIZE } from "./audio/fft.ts";
import { noteName } from "./audio/math.ts";
import { stageById, stages } from "./stages/index.ts";
import type { RenderResult, RenderSettings, SynthStage } from "./stages/types.ts";
import { installKeyboardShortcuts } from "./ui/keyboard-shortcuts.ts";
import { StageNavigation } from "./ui/stage-navigation.ts";
import { CanvasSurface, PLOT_COLORS } from "./visualizations/canvas.ts";
import { drawSpectrum } from "./visualizations/spectrum.ts";
import type { SpectrumTrace } from "./visualizations/spectrum.ts";
import { drawWaveform } from "./visualizations/waveform.ts";

const EARLY_WINDOW_START_SECONDS = 0.02;
const SPECTRUM_MAX_HZ = 5000;

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element #${id}`);
  return found as T;
}

export class App {
  private readonly engine = new AudioEngine();

  /** 0 is the intro page; 1..9 select stages[pageIndex - 1]. */
  private pageIndex = 0;
  private frequency = 440;
  private duration = 2.8;
  private velocity = 0.75;
  private readonly parameterValues: Record<string, number> = {};

  private waveformZoomMs: number | null = null;

  private result: RenderResult | null = null;
  private renderedSampleRate = this.engine.sampleRate;
  private renderToken = 0;

  private readonly waveformSurface = new CanvasSurface(
    element<HTMLCanvasElement>("waveform-canvas"),
  );
  private readonly spectrumSurface = new CanvasSurface(
    element<HTMLCanvasElement>("spectrum-canvas"),
  );

  private readonly navigation: StageNavigation;

  private readonly playButton = element<HTMLButtonElement>("play");

  constructor() {
    for (const stage of stages) {
      for (const parameter of stage.parameters) {
        this.parameterValues[parameter.id] ??= parameter.defaultValue;
      }
    }

    this.navigation = new StageNavigation(
      element("stage-strip"),
      [
        { index: 0, shortTitle: "Introduzione" },
        ...stages.map((stage) => ({
          index: stage.index,
          shortTitle: stage.shortTitle,
        })),
      ],
      (index) => this.goToPage(index),
    );

    this.buildPlotControls();
    this.wireTransport();

    this.engine.onPlayingChanged((playing) => this.updatePlayButton(playing));

    this.waveformSurface.onResize(() => this.drawWaveform());
    this.spectrumSurface.onResize(() => this.drawSpectrum());

    installKeyboardShortcuts({
      previous: () => this.goToPage(this.pageIndex - 1),
      next: () => this.goToPage(this.pageIndex + 1),
      togglePlay: () => void this.togglePlay(),
    });

    this.showPage();
  }

  private get isIntro(): boolean {
    return this.pageIndex === 0;
  }

  private get stage(): SynthStage {
    return stages[this.pageIndex - 1];
  }

  // --- construction -------------------------------------------------------

  private buildPlotControls(): void {
    const zoomButtons = element("waveform-controls").querySelectorAll<
      HTMLButtonElement
    >("button[data-zoom]");

    zoomButtons.forEach((button) => {
      button.addEventListener("click", () => {
        this.waveformZoomMs =
          button.dataset.zoom === "full" ? null : Number(button.dataset.zoom);
        zoomButtons.forEach((other) =>
          other.classList.toggle("is-active", other === button),
        );
        this.drawWaveform();
      });
    });
  }

  private wireTransport(): void {
    this.playButton.addEventListener("click", () => void this.togglePlay());
    element<HTMLButtonElement>("play-sine").addEventListener("click", () =>
      void this.playStage("sine"),
    );
    element<HTMLButtonElement>("play-piano").addEventListener("click", () =>
      void this.playStage("piano"),
    );
    element<HTMLButtonElement>("next-section").addEventListener("click", () =>
      this.goToPage(this.pageIndex + 1),
    );
  }

  // --- state --------------------------------------------------------------

  private goToPage(index: number): void {
    const clamped = Math.min(stages.length, Math.max(0, index));
    if (clamped === this.pageIndex) return;
    this.pageIndex = clamped;
    this.showPage();
  }

  private showPage(): void {
    this.navigation.setActive(this.pageIndex);
    element<HTMLButtonElement>("next-section").disabled =
      this.pageIndex >= stages.length;

    const intro = this.isIntro;
    element("intro").hidden = !intro;
    element("stage-visuals").hidden = intro;
    element("explanation-panel").hidden = intro;
    element("controls-panel").hidden = intro;

    if (intro) {
      element("stage-title").textContent = "Introduzione";
      element("stage-concept").textContent =
        "Dai numeri grezzi al suono di un pianoforte.";
      element("stage-counter").textContent = "Introduzione";
      this.engine.stop();
      return;
    }

    const stage = this.stage;

    element("stage-title").textContent = stage.title;
    element("stage-concept").textContent = stage.concept;
    element("stage-counter").textContent =
      `Fase ${stage.index} di ${stages.length}`;
    element("stage-explanation").textContent = stage.explanation;
    element("stage-listen").textContent = stage.listenFor;
    element("stage-look").textContent = stage.lookFor;

    const formula = element("stage-formula");
    formula.textContent = stage.formula ?? "";
    formula.hidden = !stage.formula;

    void this.renderPreview();
  }

  // --- rendering ----------------------------------------------------------

  private settings(sampleRate: number): RenderSettings {
    return {
      frequency: this.frequency,
      duration: this.duration,
      velocity: this.velocity,
      sampleRate,
      releaseDuration: 0.12,
      parameters: { ...this.parameterValues },
    };
  }

  /** Render for the graphs only — playing is what makes noise, not this. */
  private async renderPreview(): Promise<RenderResult | null> {
    const sampleRate = this.engine.sampleRate;
    const token = ++this.renderToken;

    try {
      const result = await this.stage.render(this.settings(sampleRate));

      // A slower stage 9 render must not overwrite a newer one.
      if (token !== this.renderToken) return null;

      this.result = result;
      this.renderedSampleRate = sampleRate;
      this.drawWaveform();
      this.drawSpectrum();
      return result;
    } catch (error) {
      console.error("Rendering fallito:", error);
      return null;
    }
  }

  private async togglePlay(): Promise<void> {
    if (this.engine.isPlaying) {
      this.engine.stop();
      return;
    }

    // The intro page has its own two buttons; there is no single note to toggle.
    if (this.isIntro) return;

    // The AudioContext may only be created and resumed inside a user gesture.
    await this.engine.ensureContext();

    // The real hardware rate is known only now; re-render if we guessed wrong.
    const result =
      this.result && this.renderedSampleRate === this.engine.sampleRate
        ? this.result
        : await this.renderPreview();

    if (!result) return;
    this.engine.play(result.samples, this.renderedSampleRate);
  }

  /** Play a specific stage by id — used by the intro page's two buttons. */
  private async playStage(id: string): Promise<void> {
    const stage = stageById(id);
    if (!stage) return;

    // The AudioContext may only be created and resumed inside a user gesture.
    await this.engine.ensureContext();
    const sampleRate = this.engine.sampleRate;

    try {
      const result = await stage.render(this.settings(sampleRate));
      this.engine.play(result.samples, sampleRate);
    } catch (error) {
      console.error("Rendering fallito:", error);
    }
  }

  // --- painting -----------------------------------------------------------

  private drawWaveform(): void {
    if (!this.result || this.isIntro) return;
    drawWaveform(this.waveformSurface, {
      samples: this.result.samples,
      sampleRate: this.renderedSampleRate,
      zoomMs: this.waveformZoomMs,
    });
  }

  private drawSpectrum(): void {
    if (!this.result || this.isIntro) return;

    const samples = this.result.samples;
    const sampleRate = this.renderedSampleRate;
    const fundamental = this.frequency;
    const fftSize = DEFAULT_FFT_SIZE;

    const earlyStart = Math.floor(EARLY_WINDOW_START_SECONDS * sampleRate);
    const lateStart = Math.max(
      earlyStart,
      Math.floor(samples.length * 0.6) - fftSize,
    );
    const tailStart = Math.max(
      lateStart,
      Math.floor(samples.length * 0.8) - fftSize,
    );

    // Label each trace with where in the note its analysis window is centred.
    const percentLabel = (windowStart: number): string =>
      `${Math.round(((windowStart + fftSize / 2) / samples.length) * 100)}%`;

    const windowAt = (windowStart: number, color: string): SpectrumTrace => ({
      label: percentLabel(windowStart),
      spectrum: analyzeSpectrum(samples, windowStart, sampleRate, fftSize),
      color,
    });

    const traces: SpectrumTrace[] = [windowAt(earlyStart, PLOT_COLORS.primary)];
    // The pure sine never changes over time, so its later windows would sit
    // exactly on top of the first one and just hide it.
    if (this.stage.id !== "sine") {
      traces.push(windowAt(lateStart, PLOT_COLORS.secondary));
      traces.push(windowAt(tailStart, PLOT_COLORS.tertiary));
    }

    const minHz = 0;
    const maxHz = SPECTRUM_MAX_HZ;

    drawSpectrum(this.spectrumSurface, {
      traces,
      minHz,
      maxHz,
      fundamental,
      guideFrequencies: idealHarmonics(fundamental, maxHz),
    });
  }

  private updatePlayButton(playing: boolean): void {
    this.playButton.textContent = playing
      ? "Ferma"
      : `Suona ${noteName(this.frequency)}`;
    this.playButton.classList.toggle("is-playing", playing);
  }
}

function idealHarmonics(fundamental: number, maxHz: number): number[] {
  const harmonics: number[] = [];
  for (let n = 1; n * fundamental <= maxHz && n <= 24; n++) {
    harmonics.push(n * fundamental);
  }
  return harmonics;
}
