/**
 * Shared primitives for the hand-written SVG drawings in this folder.
 *
 * Everything here builds markup as a string, safe to assign via innerHTML, and
 * animates with SMIL so no JavaScript has to drive it. Colours are hard-coded to
 * the app palette because CSS custom properties do not reach inside markup
 * injected via innerHTML.
 */

export const MUTED = "#94a5bb";
export const DIM = "#64748b";
export const BORDER = "#2a3646";
export const ACCENT = "#59d1ff";
export const HIGHLIGHT = "#ffb454";

/** Ease that dwells near the extremes, like a cosine — used for oscillations. */
export const EASE = "0.4 0 0.6 1";

/** Default canvas: the size of the per-stage illustration panel. */
export const VIEW_W = 440;
export const VIEW_H = 240;

export interface SvgOptions {
  /** viewBox width, defaulting to the stage panel's 440. */
  w?: number;
  /** viewBox height, defaulting to the stage panel's 240. */
  h?: number;
  /** Extra class alongside `phys-svg`, for gallery-specific sizing. */
  className?: string;
}

export function svg(inner: string, options: SvgOptions = {}): string {
  const { w = VIEW_W, h = VIEW_H, className } = options;
  const classes = className ? `phys-svg ${className}` : "phys-svg";

  return (
    `<svg viewBox="0 0 ${w} ${h}" ` +
    `preserveAspectRatio="xMidYMid meet" ` +
    `xmlns="http://www.w3.org/2000/svg" class="${classes}" ` +
    `font-family="system-ui, -apple-system, sans-serif">${inner}</svg>`
  );
}

export function label(
  x: number,
  y: number,
  text: string,
  color = MUTED,
  size = 12,
): string {
  return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}">${text}</text>`;
}

/** Path for one string mode: `n` half-waves of amplitude `amp`, around y = 0. */
export function modePath(
  width: number,
  amp: number,
  n: number,
  samples = 60,
): string {
  const pts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = (i / samples) * width;
    // Negative because SVG y grows downward and we want the first arch up.
    const y = -amp * Math.sin((n * Math.PI * i) / samples);
    pts.push(`${x.toFixed(1)},${y.toFixed(2)}`);
  }
  return "M" + pts.join(" L");
}

/**
 * A vibrating shape: `inner` is drawn around y = 0 and flexed up/down through
 * flat, the way a standing wave breathes at amplitude cos(ωt). `phase` shifts
 * where in the cycle it starts (seconds), so several can drift against each
 * other.
 */
export function vibrate(
  x: number,
  y: number,
  inner: string,
  dur: number,
  phase = 0,
): string {
  return (
    `<g transform="translate(${x} ${y})"><g>` +
    `<animateTransform attributeName="transform" type="scale" ` +
    `values="1 1;1 -1;1 1" keyTimes="0;0.5;1" ` +
    `calcMode="spline" keySplines="${EASE};${EASE}" ` +
    `dur="${dur}s" begin="${-phase}s" repeatCount="indefinite"/>` +
    `${inner}</g></g>`
  );
}

/**
 * Turn a scalar envelope list ("0;1;0.5") into y-only scale pairs
 * ("1 0;1 1;1 0.5"). A single-number `scale` shrinks x as well as y, which
 * would drag a string's endpoints off their fixed anchors as it decays; scaling
 * y alone keeps every x — and so both fixed ends — exactly in place.
 */
export function yScale(values: string): string {
  return values
    .split(";")
    .map((v) => `1 ${v.trim()}`)
    .join(";");
}
