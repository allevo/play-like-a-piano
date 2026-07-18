import { PLOT_COLORS, type CanvasSurface } from "./canvas.ts";

export interface WaveformOptions {
  samples: Float32Array;
  sampleRate: number;
  /** When set, only the first N milliseconds are drawn. */
  zoomMs: number | null;
}

const PADDING = { left: 46, right: 12, top: 10, bottom: 22 };

export function drawWaveform(
  surface: CanvasSurface,
  options: WaveformOptions,
): void {
  const { context: ctx, width, height } = surface;
  const { samples, sampleRate, zoomMs } = options;

  surface.clear(PLOT_COLORS.background);

  const plotLeft = PADDING.left;
  const plotTop = PADDING.top;
  const plotWidth = Math.max(1, width - PADDING.left - PADDING.right);
  const plotHeight = Math.max(1, height - PADDING.top - PADDING.bottom);
  const centerY = plotTop + plotHeight / 2;

  const visibleCount =
    zoomMs === null
      ? samples.length
      : Math.max(2, Math.min(samples.length, Math.round((zoomMs / 1000) * sampleRate)));
  const visibleSeconds = visibleCount / sampleRate;

  ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillStyle = PLOT_COLORS.text;

  // Amplitude grid.
  ctx.strokeStyle = PLOT_COLORS.grid;
  ctx.lineWidth = 1;
  for (const amplitude of [-1, -0.5, 0.5, 1]) {
    const y = centerY - (amplitude * plotHeight) / 2;
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotLeft + plotWidth, y);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(amplitude.toFixed(1), plotLeft - 8, y);
  }

  // Zero line.
  ctx.strokeStyle = PLOT_COLORS.axis;
  ctx.beginPath();
  ctx.moveTo(plotLeft, centerY);
  ctx.lineTo(plotLeft + plotWidth, centerY);
  ctx.stroke();
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = PLOT_COLORS.text;
  ctx.fillText("0", plotLeft - 8, centerY);

  if (samples.length === 0) return;

  // One vertical bar per pixel column: min/max of the samples that fall in it.
  // Far cheaper than a line segment per sample, and it keeps fast transients
  // visible instead of aliasing them away.
  ctx.strokeStyle = PLOT_COLORS.primary;
  ctx.lineWidth = 1;
  ctx.beginPath();

  const columns = Math.floor(plotWidth);
  const samplesPerColumn = visibleCount / columns;

  if (samplesPerColumn < 2) {
    // Zoomed in far enough that a real polyline is the honest picture.
    for (let i = 0; i < visibleCount; i++) {
      const x = plotLeft + (i / (visibleCount - 1)) * plotWidth;
      const y = centerY - (samples[i] * plotHeight) / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  } else {
    for (let column = 0; column < columns; column++) {
      const start = Math.floor(column * samplesPerColumn);
      const end = Math.min(
        visibleCount,
        Math.floor((column + 1) * samplesPerColumn),
      );

      let min = Infinity;
      let max = -Infinity;
      for (let i = start; i < end; i++) {
        const sample = samples[i];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      if (min === Infinity) continue;

      const x = plotLeft + column + 0.5;
      ctx.moveTo(x, centerY - (max * plotHeight) / 2);
      ctx.lineTo(x, centerY - (min * plotHeight) / 2);
    }
  }
  ctx.stroke();

  // Time axis.
  ctx.fillStyle = PLOT_COLORS.text;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("0 ms", plotLeft, plotTop + plotHeight + 6);

  ctx.textAlign = "right";
  const label =
    visibleSeconds < 0.2
      ? `${(visibleSeconds * 1000).toFixed(0)} ms`
      : `${visibleSeconds.toFixed(2)} s`;
  ctx.fillText(label, plotLeft + plotWidth, plotTop + plotHeight + 6);
}
