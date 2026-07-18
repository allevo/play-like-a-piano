import { MINIMUM_DB, type Spectrum } from "../audio/fft.ts";
import { PLOT_COLORS, type CanvasSurface } from "./canvas.ts";

export interface SpectrumTrace {
  label: string;
  spectrum: Spectrum;
  color: string;
}

export interface SpectrumOptions {
  traces: SpectrumTrace[];
  minHz: number;
  maxHz: number;
  /** Ideal harmonic positions (n · f₀) drawn as dashed reference lines. */
  guideFrequencies: number[];
  fundamental: number;
}

const PADDING = { left: 52, right: 14, top: 10, bottom: 38 };
const TOP_DB = 0;
const BOTTOM_DB = MINIMUM_DB;

export function drawSpectrum(
  surface: CanvasSurface,
  options: SpectrumOptions,
): void {
  const { context: ctx, width, height } = surface;
  const { traces, minHz, maxHz, guideFrequencies, fundamental } = options;

  surface.clear(PLOT_COLORS.background);

  const plotLeft = PADDING.left;
  const plotTop = PADDING.top;
  const plotWidth = Math.max(1, width - PADDING.left - PADDING.right);
  const plotHeight = Math.max(1, height - PADDING.top - PADDING.bottom);

  const xOf = (hz: number) =>
    plotLeft + ((hz - minHz) / (maxHz - minHz)) * plotWidth;
  const yOf = (db: number) =>
    plotTop +
    ((TOP_DB - Math.max(BOTTOM_DB, db)) / (TOP_DB - BOTTOM_DB)) * plotHeight;

  ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";

  // dB grid.
  ctx.strokeStyle = PLOT_COLORS.grid;
  ctx.lineWidth = 1;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let db = 0; db >= BOTTOM_DB; db -= 20) {
    const y = yOf(db);
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotLeft + plotWidth, y);
    ctx.stroke();
    ctx.fillStyle = PLOT_COLORS.text;
    ctx.fillText(`${db}`, plotLeft - 8, y);
  }

  // Ideal-harmonic guides.
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = PLOT_COLORS.guide;
  for (const hz of guideFrequencies) {
    if (hz < minHz || hz > maxHz) continue;
    const x = xOf(hz);
    ctx.beginPath();
    ctx.moveTo(x, plotTop);
    ctx.lineTo(x, plotTop + plotHeight);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Traces.
  for (const trace of traces) {
    const { magnitudesDb, binHz } = trace.spectrum;
    ctx.strokeStyle = trace.color;
    ctx.lineWidth = 1.75;
    ctx.beginPath();

    const firstBin = Math.max(1, Math.floor(minHz / binHz));
    const lastBin = Math.min(
      magnitudesDb.length - 1,
      Math.ceil(maxHz / binHz) + 1,
    );

    let started = false;
    for (let bin = firstBin; bin <= lastBin; bin++) {
      const x = xOf(bin * binHz);
      const y = yOf(magnitudesDb[bin]);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  // Frequency axis.
  ctx.fillStyle = PLOT_COLORS.text;
  ctx.textBaseline = "top";
  const ticks = frequencyTicks(minHz, maxHz);
  for (const hz of ticks) {
    const x = xOf(hz);
    ctx.textAlign =
      hz === ticks[0] ? "left" : hz === ticks[ticks.length - 1] ? "right" : "center";
    ctx.fillText(formatHz(hz), x, plotTop + plotHeight + 6);
  }

  // Axis titles.
  ctx.fillStyle = PLOT_COLORS.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Frequenza (Hz)", plotLeft + plotWidth / 2, plotTop + plotHeight + 22);

  ctx.save();
  ctx.translate(13, plotTop + plotHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = "middle";
  ctx.fillText("Ampiezza (dB)", 0, 0);
  ctx.restore();

  // Fundamental marker.
  if (fundamental >= minHz && fundamental <= maxHz) {
    const x = xOf(fundamental);
    ctx.strokeStyle = PLOT_COLORS.secondary;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, plotTop);
    ctx.lineTo(x, plotTop + plotHeight);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = PLOT_COLORS.secondary;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("f₀", x + 4, plotTop + 2);
  }

  // Legend.
  if (traces.length > 1) {
    let y = plotTop + 4;
    ctx.textAlign = "right";
    for (const trace of traces) {
      ctx.fillStyle = trace.color;
      ctx.fillText(trace.label, plotLeft + plotWidth - 6, y);
      y += 16;
    }
  }
}

function frequencyTicks(minHz: number, maxHz: number): number[] {
  const span = maxHz - minHz;
  const step = niceStep(span / 5);
  const ticks: number[] = [];
  for (let hz = Math.ceil(minHz / step) * step; hz <= maxHz; hz += step) {
    ticks.push(Math.round(hz));
  }
  return ticks;
}

function niceStep(raw: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const step = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
  return step * magnitude;
}

function formatHz(hz: number): string {
  return hz >= 1000 ? `${(hz / 1000).toFixed(hz % 1000 === 0 ? 0 : 1)}k` : `${hz}`;
}
