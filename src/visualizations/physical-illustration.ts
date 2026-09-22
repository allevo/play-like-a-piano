/**
 * Per-stage physical illustrations.
 *
 * Each stage builds up the physics of a piano note; the waveform and spectrum
 * panels show the *signal* that comes out, and these SVGs show the *physical
 * thing* the stage adds — the oscillating source, a string's harmonic modes,
 * the felt hammer, three detuned strings beating, the soundboard in a room.
 *
 * The SVGs are self-contained and animate with SMIL (no JS, no external
 * assets), so we just drop the markup into the DOM and let it loop. The drawing
 * primitives and the palette live in ./svg-kit.ts.
 */

import {
  ACCENT,
  BORDER,
  DIM,
  EASE,
  HIGHLIGHT,
  label,
  modePath,
  MUTED,
  svg,
  VIEW_H,
  VIEW_W,
  vibrate,
  yScale,
} from "./svg-kit.ts";

export interface PhysicalIllustration {
  /** Inline <svg> markup, animated, safe to assign via innerHTML. */
  svg: string;
  /** One-line Italian caption shown under the drawing. */
  caption: string;
}

// --- stage 1: pure oscillation -------------------------------------------

function sineIllustration(): string {
  const cx = 95;
  const cy = 120;
  const r = 62;
  const traceX0 = 175;
  const traceX1 = 420;
  const cycles = 2;

  const trace: string[] = [];
  const samples = 120;
  for (let i = 0; i <= samples; i++) {
    const x = traceX0 + (i / samples) * (traceX1 - traceX0);
    const y = cy - r * Math.sin((cycles * 2 * Math.PI * i) / samples);
    trace.push(`${x.toFixed(1)},${y.toFixed(2)}`);
  }

  return svg(
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${BORDER}" stroke-width="1.5"/>` +
    `<line x1="${cx}" y1="${cy}" x2="${traceX1}" y2="${cy}" stroke="${BORDER}" stroke-dasharray="3 4"/>` +
    `<path d="M${trace.join(" L")}" fill="none" stroke="${ACCENT}" stroke-width="2.5" opacity="0.85"/>` +
    // Rotating radius = uniform circular motion.
    `<g transform="translate(${cx} ${cy})"><g>` +
    // One revolution per second, counter-clockwise so the dot rises first —
    // the trace shows one cycle per second, so radius and tracer stay locked.
    `<animateTransform attributeName="transform" type="rotate" ` +
    `from="0" to="-360" dur="1s" repeatCount="indefinite"/>` +
    `<line x1="0" y1="0" x2="${r}" y2="0" stroke="${HIGHLIGHT}" stroke-width="2"/>` +
    `<circle cx="${r}" cy="0" r="6" fill="${HIGHLIGHT}"/></g></g>` +
    // Tracer dot riding the sine, in step with the rotation.
    `<circle r="6" fill="${HIGHLIGHT}"><animateMotion dur="2s" repeatCount="indefinite" ` +
    `path="M${trace.join(" L")}"/></circle>` +
    label(cx - 22, cy + r + 26, "moto circolare", DIM) +
    label(traceX1 - 78, cy - r - 6, "→ sinusoide", DIM),
  );
}

// --- stage 2: amplitude envelope -----------------------------------------

function envelopeIllustration(): string {
  const x0 = 55;
  const w = 330;
  const yc = 125;
  const amp = 70;

  // The blue line is the string itself, pinned at both ends, swinging as one
  // arch (its fundamental). Its swing grows fast after the strike, then dies
  // away. We do NOT draw the loudness-over-time outline here on purpose — that
  // is exactly what the Forma d'onda panel already shows; repeating it is what
  // made this picture confusing.
  const arch = modePath(w, amp, 1);
  const vibrating =
    `<g transform="translate(${x0} ${yc})"><g>` +
    // Outer amplitude envelope: fast attack, exponential fall, back to zero.
    `<animateTransform attributeName="transform" type="scale" ` +
    `values="${yScale("0;1;0.55;0.3;0.16;0.08;0.03;0")}" ` +
    `keyTimes="0;0.05;0.25;0.42;0.58;0.72;0.86;1" ` +
    `dur="2.6s" repeatCount="indefinite"/><g>` +
    // Inner swing of the string, slow enough to actually read as motion.
    `<animateTransform attributeName="transform" type="scale" ` +
    `values="1 1;1 -1;1 1" keyTimes="0;0.5;1" ` +
    `calcMode="spline" keySplines="${EASE};${EASE}" ` +
    `dur="0.34s" repeatCount="indefinite"/>` +
    `<path d="${arch}" fill="none" stroke="${ACCENT}" stroke-width="2.5"/>` +
    `</g></g></g>`;

  const postH = 30;
  const anchor = (x: number): string =>
    `<line x1="${x}" y1="${yc - postH}" x2="${x}" y2="${yc + postH}" stroke="${DIM}" stroke-width="3"/>` +
    `<circle cx="${x}" cy="${yc}" r="4.5" fill="${MUTED}"/>`;

  return svg(
    // Rest position of the string, between two fixed anchors.
    `<line x1="${x0}" y1="${yc}" x2="${x0 + w}" y2="${yc}" stroke="${BORDER}" stroke-dasharray="3 4"/>` +
    anchor(x0) +
    anchor(x0 + w) +
    vibrating +
    label(x0 - 6, 34, "la corda percossa oscilla, poi si spegne", HIGHLIGHT, 12) +
    label(x0 - 34, yc + postH + 20, "estremo fisso", DIM, 11) +
    label(x0 + w - 40, yc + postH + 20, "estremo fisso", DIM, 11),
  );
}

// --- stage 3: additive synthesis -----------------------------------------

function additiveIllustration(): string {
  const x0 = 70;
  const w = 340;
  const lanes = [
    { y: 40, n: 1, amp: 24, dur: 2.0, tag: "fondamentale" },
    { y: 95, n: 2, amp: 20, dur: 1.0, tag: "2× parziale" },
    { y: 150, n: 3, amp: 18, dur: 0.667, tag: "3× parziale" },
  ];

  const modeRows = lanes
    .map(
      (l) =>
        `<line x1="${x0}" y1="${l.y}" x2="${x0 + w}" y2="${l.y}" stroke="${BORDER}" stroke-dasharray="2 4"/>` +
        vibrate(
          x0,
          l.y,
          `<path d="${modePath(w, l.amp, l.n)}" fill="none" stroke="${ACCENT}" stroke-width="2.5"/>`,
          l.dur,
        ) +
        label(6, l.y + 4, l.tag, MUTED, 11),
    )
    .join("");

  // The sum: a richer non-sine shape breathing at the fundamental rate.
  const sumY = 210;
  const sumPts: string[] = [];
  const samples = 80;
  for (let i = 0; i <= samples; i++) {
    // Relative to the lane origin; vibrate() applies the x0 shift, exactly as
    // modePath does for the partials above — so the sum lines up under them.
    const x = (i / samples) * w;
    const t = (i / samples) * Math.PI;
    const y = -(24 * Math.sin(t) + 10 * Math.sin(2 * t) + 6 * Math.sin(3 * t));
    sumPts.push(`${x.toFixed(1)},${y.toFixed(2)}`);
  }

  return svg(
    modeRows +
    `<line x1="${x0}" y1="${sumY}" x2="${x0 + w}" y2="${sumY}" stroke="${BORDER}" stroke-dasharray="2 4"/>` +
    vibrate(
      x0,
      sumY,
      `<path d="M${sumPts.join(" L")}" fill="none" stroke="${HIGHLIGHT}" stroke-width="2.5"/>`,
      2.0,
    ) +
    label(6, sumY + 4, "somma", HIGHLIGHT, 11),
  );
}

// --- stage 4: independent partial decays ---------------------------------

function partialDecayIllustration(): string {
  const x0 = 70;
  const w = 340;
  const lanes = [
    { y: 55, n: 1, amp: 26, breathe: 1.0, env: "0;1;0.8;0.62;0.5;0.42", tag: "1× lenta" },
    { y: 120, n: 2, amp: 22, breathe: 0.5, env: "0;1;0.5;0.26;0.13;0.06", tag: "2×" },
    { y: 185, n: 3, amp: 20, breathe: 0.34, env: "0;1;0.3;0.1;0.03;0", tag: "3× rapida" },
  ];
  const keyTimes = "0;0.06;0.3;0.55;0.8;1";

  const rows = lanes
    .map(
      (l) =>
        `<line x1="${x0}" y1="${l.y}" x2="${x0 + w}" y2="${l.y}" stroke="${BORDER}" stroke-dasharray="2 4"/>` +
        // Outer envelope decays (rate varies by mode), inner oscillation is fast.
        `<g transform="translate(${x0} ${l.y})"><g>` +
        `<animateTransform attributeName="transform" type="scale" ` +
        `values="${yScale(l.env)}" keyTimes="${keyTimes}" dur="4s" repeatCount="indefinite"/><g>` +
        `<animateTransform attributeName="transform" type="scale" ` +
        `values="1 1;1 -1;1 1" keyTimes="0;0.5;1" ` +
        `calcMode="spline" keySplines="${EASE};${EASE}" ` +
        `dur="${l.breathe}s" repeatCount="indefinite"/>` +
        `<path d="${modePath(w, l.amp, l.n)}" fill="none" stroke="${ACCENT}" stroke-width="2.5"/>` +
        `</g></g></g>` +
        label(6, l.y + 4, l.tag, MUTED, 11),
    )
    .join("");

  return svg(
    rows +
    label(x0, 24, "le parziali alte si spengono per prime", HIGHLIGHT, 12),
  );
}

// --- stage 5: hammer transient -------------------------------------------

function hammerIllustration(): string {
  const x0 = 60;
  const w = 340;
  const stringY = 78;
  const pivotX = 150;
  const pivotY = 220;

  // String: silent until the strike (~0.36), then bursts and decays. Looped at
  // the same 2.4s period as the hammer swing so the two stay in step.
  const stringEnv = "0;0;1;0.5;0.24;0.1;0.03;0";
  const stringKeys = "0;0.3;0.4;0.55;0.7;0.82;0.92;1";
  const stringNode =
    `<g transform="translate(${x0} ${stringY})"><g>` +
    `<animateTransform attributeName="transform" type="scale" ` +
    `values="${yScale(stringEnv)}" keyTimes="${stringKeys}" dur="2.4s" repeatCount="indefinite"/><g>` +
    `<animateTransform attributeName="transform" type="scale" ` +
    `values="1 1;1 -1;1 1" keyTimes="0;0.5;1" ` +
    `calcMode="spline" keySplines="${EASE};${EASE}" ` +
    `dur="0.14s" repeatCount="indefinite"/>` +
    `<path d="${modePath(w, 34, 4)}" fill="none" stroke="${ACCENT}" stroke-width="2.5"/>` +
    `</g></g></g>`;

  // Hammer: shank pivoting up to the string, felt head at the top.
  const shankLen = pivotY - stringY - 8;
  const hammer =
    `<g transform="translate(${pivotX} ${pivotY})"><g>` +
    `<animateTransform attributeName="transform" type="rotate" ` +
    `values="16;16;0;0;16" keyTimes="0;0.28;0.38;0.6;1" ` +
    `calcMode="spline" keySplines="0.3 0 0.7 1;0.9 0 0.2 1;0.4 0 0.6 1;0.4 0 0.6 1" ` +
    `dur="2.4s" repeatCount="indefinite"/>` +
    `<line x1="0" y1="0" x2="0" y2="${-shankLen}" stroke="${DIM}" stroke-width="3"/>` +
    `<rect x="-13" y="${-shankLen - 20}" width="26" height="22" rx="9" fill="${HIGHLIGHT}"/>` +
    `<circle cx="0" cy="0" r="4" fill="${MUTED}"/>` +
    `</g></g>`;

  // Noise burst flashing at the moment of contact.
  const bursts = [175, 195, 215, 235]
    .map(
      (bx, i) =>
        `<line x1="${bx}" y1="${stringY - 20}" x2="${bx}" y2="${stringY + 20}" ` +
        `stroke="${HIGHLIGHT}" stroke-width="1.5">` +
        `<animate attributeName="opacity" values="0;0;1;0" ` +
        `keyTimes="0;0.36;0.4;0.5" dur="2.4s" repeatCount="indefinite" ` +
        `begin="${i * 0.01}s"/></line>`,
    )
    .join("");

  return svg(
    `<line x1="${x0}" y1="${stringY}" x2="${x0 + w}" y2="${stringY}" stroke="${BORDER}" stroke-dasharray="3 4"/>` +
    stringNode +
    bursts +
    hammer +
    label(pivotX + 18, pivotY - 4, "martelletto di feltro", MUTED) +
    label(x0, 30, "il transiente d'attacco", HIGHLIGHT),
  );
}

// --- stage 6: inharmonicity ----------------------------------------------

function inharmonicIllustration(): string {
  const x0 = 45;
  const spacing = 47;
  const baseY = 200;
  const count = 8;
  const B = 0.006;

  const guides: string[] = [];
  const partials: string[] = [];
  for (let n = 1; n <= count; n++) {
    const idealX = x0 + (n - 1) * spacing;
    const height = 30 + 120 / Math.sqrt(n);
    // Real partials sit sharp of the ideal comb, more so the higher they are.
    const shift = idealX * B * n * n * 4 + n * n * 0.9;

    guides.push(
      `<line x1="${idealX}" y1="${baseY}" x2="${idealX}" y2="${baseY - height}" ` +
      `stroke="${BORDER}" stroke-width="1.5" stroke-dasharray="3 4"/>` +
      label(idealX - 5, baseY + 16, `${n}·f₀`, DIM, 10),
    );

    partials.push(
      `<g><animateTransform attributeName="transform" type="translate" ` +
      `values="0 0;${shift.toFixed(1)} 0;0 0" keyTimes="0;0.5;1" ` +
      `calcMode="spline" keySplines="${EASE};${EASE}" dur="4s" repeatCount="indefinite"/>` +
      `<line x1="${idealX}" y1="${baseY}" x2="${idealX}" y2="${baseY - height}" ` +
      `stroke="${HIGHLIGHT}" stroke-width="2.5"/>` +
      `<circle cx="${idealX}" cy="${baseY - height}" r="3.5" fill="${HIGHLIGHT}"/></g>`,
    );
  }

  return svg(
    `<line x1="${x0 - 10}" y1="${baseY}" x2="${VIEW_W - 10}" y2="${baseY}" stroke="${BORDER}"/>` +
    guides.join("") +
    partials.join("") +
    label(x0 - 5, 28, "armoniche ideali", DIM) +
    label(x0 - 5, 46, "parziali reali (dilatate →)", HIGHLIGHT),
  );
}

// --- stage 7: three detuned strings --------------------------------------

function stringsIllustration(): string {
  const x0 = 55;
  const w = 350;
  const strings = [
    { y: 50, dur: 2.0, phase: 0.0 },
    { y: 100, dur: 2.14, phase: 0.35 },
    { y: 150, dur: 2.3, phase: 0.7 },
  ];

  const rows = strings
    .map(
      (s) =>
        `<line x1="${x0}" y1="${s.y}" x2="${x0 + w}" y2="${s.y}" stroke="${BORDER}" stroke-dasharray="2 4"/>` +
        vibrate(
          x0,
          s.y,
          `<path d="${modePath(w, 20, 1)}" fill="none" stroke="${ACCENT}" stroke-width="2.5"/>`,
          s.dur,
          s.phase,
        ),
    )
    .join("");

  // Their sum: fast vibration inside a slow beat envelope (in and out of phase).
  const beatY = 210;
  const beat =
    `<g transform="translate(${x0} ${beatY})"><g>` +
    `<animateTransform attributeName="transform" type="scale" ` +
    `values="${yScale("0.15;1;0.15;1;0.15")}" keyTimes="0;0.25;0.5;0.75;1" ` +
    `calcMode="spline" keySplines="${EASE};${EASE};${EASE};${EASE}" ` +
    `dur="5.2s" repeatCount="indefinite"/><g>` +
    `<animateTransform attributeName="transform" type="scale" ` +
    `values="1 1;1 -1;1 1" keyTimes="0;0.5;1" ` +
    `calcMode="spline" keySplines="${EASE};${EASE}" ` +
    `dur="0.5s" repeatCount="indefinite"/>` +
    `<path d="${modePath(w, 26, 2)}" fill="none" stroke="${HIGHLIGHT}" stroke-width="2.5"/>` +
    `</g></g></g>`;

  return svg(
    rows +
    `<line x1="${x0}" y1="${beatY}" x2="${x0 + w}" y2="${beatY}" stroke="${BORDER}" stroke-dasharray="2 4"/>` +
    beat +
    label(6, 100, "3 corde", MUTED, 11) +
    label(6, beatY + 4, "battimento", HIGHLIGHT, 11),
  );
}

// --- stage 8: soundboard and room ----------------------------------------

function pianoIllustration(): string {
  const stringX = 70;
  const stringY = 60;
  const boardX = 150;
  const boardY = 150;

  // Concentric wavefronts radiating from the soundboard into the room.
  const waves = [0, 1, 2]
    .map(
      (i) =>
        `<circle cx="${boardX}" cy="${boardY}" r="20" fill="none" ` +
        `stroke="${ACCENT}" stroke-width="2">` +
        `<animate attributeName="r" values="18;150" dur="3s" ` +
        `begin="${i}s" repeatCount="indefinite"/>` +
        `<animate attributeName="opacity" values="0.9;0" dur="3s" ` +
        `begin="${i}s" repeatCount="indefinite"/></circle>`,
    )
    .join("");

  return svg(
    // Room enclosure.
    `<rect x="20" y="24" width="${VIEW_W - 40}" height="${VIEW_H - 48}" rx="10" ` +
    `fill="none" stroke="${BORDER}" stroke-width="1.5"/>` +
    label(VIEW_W - 70, 44, "stanza", DIM) +
    // Vibrating string feeding the bridge.
    vibrate(
      stringX,
      stringY,
      `<path d="${modePath(150, 14, 3)}" fill="none" stroke="${HIGHLIGHT}" stroke-width="2.5"/>`,
      1.6,
    ) +
    label(stringX, stringY - 20, "corda", MUTED) +
    `<line x1="${boardX}" y1="${stringY + 6}" x2="${boardX}" y2="${boardY}" stroke="${DIM}" stroke-width="2"/>` +
    label(boardX + 8, (stringY + boardY) / 2, "ponte", DIM, 11) +
    waves +
    // Soundboard: a tilted resonant panel.
    `<rect x="${boardX - 40}" y="${boardY - 12}" width="120" height="24" rx="6" ` +
    `transform="rotate(-8 ${boardX} ${boardY})" fill="${ACCENT}" opacity="0.85"/>` +
    label(boardX - 40, boardY + 42, "tavola armonica", ACCENT),
  );
}

export const physicalIllustrations: Record<string, PhysicalIllustration> = {
  sine: {
    svg: sineIllustration(),
    caption:
      "Un'oscillazione armonica pura: il moto circolare uniforme, proiettato nel tempo, è esattamente una sinusoide.",
  },
  envelope: {
    svg: envelopeIllustration(),
    caption:
      "La linea azzurra è la corda, fissata ai due estremi: subito dopo il colpo oscilla ampiamente, poi l'oscillazione si spegne dolcemente fino a fermarsi.",
  },
  additive: {
    svg: additiveIllustration(),
    caption:
      "Una stessa corda, fissata ai due estremi, vibra in più modi insieme — fondamentale più parziali — e la loro somma è il timbro.",
  },
  "partial-decays": {
    svg: partialDecayIllustration(),
    caption:
      "Ogni modo perde energia a velocità diversa: le parziali alte si spengono per prime e la nota si scurisce.",
  },
  hammer: {
    svg: hammerIllustration(),
    caption:
      "Un martelletto di feltro percuote la corda: quei primi millisecondi rumorosi danno l'identità allo strumento.",
  },
  inharmonicity: {
    svg: inharmonicIllustration(),
    caption:
      "La rigidezza della corda dilata le parziali: ognuna sale rispetto all'armonica ideale, sempre di più salendo.",
  },
  strings: {
    svg: stringsIllustration(),
    caption:
      "Tre corde per tasto, mai identiche: vanno dentro e fuori fase, e quel lento battimento è la vitalità del suono.",
  },
  piano: {
    svg: pianoIllustration(),
    caption:
      "La corda mette in moto la tavola armonica, che irradia nella stanza: sorgente, corpo e ambiente insieme.",
  },
};
