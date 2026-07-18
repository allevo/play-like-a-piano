/**
 * Canvas plumbing: keep the backing store in device pixels (so lines are crisp
 * on a retina laptop and on a projector) while all drawing code works in CSS
 * pixels.
 */
export class CanvasSurface {
  readonly context: CanvasRenderingContext2D;
  width = 0;
  height = 0;

  readonly canvas: HTMLCanvasElement;

  private redraw: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is not available");
    this.context = context;

    const observer = new ResizeObserver(() => {
      this.resize();
      this.redraw?.();
    });
    observer.observe(canvas);
    this.resize();
  }

  /** Called after every size change so the owner can repaint. */
  onResize(redraw: () => void): void {
    this.redraw = redraw;
  }

  private resize(): void {
    const ratio = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));

    this.canvas.width = Math.floor(width * ratio);
    this.canvas.height = Math.floor(height * ratio);
    this.width = width;
    this.height = height;

    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  clear(background: string): void {
    this.context.setTransform(
      window.devicePixelRatio || 1,
      0,
      0,
      window.devicePixelRatio || 1,
      0,
      0,
    );
    this.context.fillStyle = background;
    this.context.fillRect(0, 0, this.width, this.height);
  }
}

export const PLOT_COLORS = {
  background: "#0e131b",
  grid: "#222c3a",
  axis: "#3a4759",
  text: "#8fa0b6",
  primary: "#59d1ff",
  secondary: "#ffb454",
  tertiary: "#c792ea",
  guide: "#5a6b82",
} as const;
