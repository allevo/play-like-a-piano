/**
 * The three explainer carousels of stage 8.
 *
 * The stage claims three things the ear cannot check on its own: that a bare
 * string is physically unable to make sound, that a body and a room act by
 * convolution, and that `x` and `h` in `y = x ∗ h` are measurable objects. Each
 * gets its own modal, stepped one slide at a time in front of an audience.
 *
 * Same rules as ./physical-illustration.ts: markup strings, SMIL where anything
 * moves, palette from ./svg-kit.ts.
 *
 * Layout convention, so slides never collide with their own captions: the
 * heading owns the top band, drawings live between y = 50 and y = 245, and
 * footnote() owns everything below that.
 */

import type { StageGallery } from "../stages/types.ts";
import chladniPlate from "./assets/chladni-figures.png";
import {
  ACCENT,
  BORDER,
  DIM,
  EASE,
  HIGHLIGHT,
  label,
  MUTED,
  modePath,
  svg,
  vibrate,
} from "./svg-kit.ts";

/** Gallery slides get the wider canvas of the modal, not the side panel. */
const W = 640;
const H = 300;

const INK = "#e6edf6";
const WARN = "#e06c75";

/** Lowest y a drawing may use before it runs into the footnote band. */
const FLOOR = 245;

function slide(inner: string): string {
  return svg(inner, { w: W, h: H, className: "gallery-svg" });
}

/** Centred heading inside a slide, so each drawing states its own point. */
function heading(text: string): string {
  return (
    `<text x="${W / 2}" y="30" fill="${INK}" font-size="16" ` +
    `font-weight="600" text-anchor="middle">${text}</text>`
  );
}

/** A centred line of maths — the two formula slides are built out of these. */
function formula(text: string, y: number, size: number, color = INK): string {
  return (
    `<text x="${W / 2}" y="${y}" fill="${color}" font-size="${size}" ` +
    `text-anchor="middle">${text}</text>`
  );
}

/** Up to two lines pinned to the bottom band, out of the drawing's way. */
function footnote(lines: string[], color = MUTED): string {
  return lines
    .map((line, i) => label(40, H - 32 + i * 18, line, color, 12))
    .join("");
}

/**
 * Marker and clip ids have to be unique: every slide of every gallery is built
 * at module load, and in a page that shows more than one at a time duplicated
 * ids would make them all point at the first definition.
 */
let uid = 0;

interface Pen {
  /** <defs> for this slide — include it once, first. */
  defs: string;
  arrow(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color?: string,
    width?: number,
  ): string;
  /** Wrap anything that animates outwards, so it cannot escape the slide. */
  clip(inner: string): string;
}

function pen(clipRect = `x="0" y="0" width="${W}" height="${H}"`): Pen {
  uid += 1;
  const plain = `pg-arrow-${uid}`;
  const hi = `pg-arrow-hi-${uid}`;
  const clipId = `pg-clip-${uid}`;

  const marker = (id: string, fill: string): string =>
    `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" ` +
    `markerWidth="6" markerHeight="6" orient="auto-start-reverse">` +
    `<path d="M0,0 L10,5 L0,10 z" fill="${fill}"/></marker>`;

  return {
    defs:
      `<defs>${marker(plain, MUTED)}${marker(hi, HIGHLIGHT)}` +
      `<clipPath id="${clipId}"><rect ${clipRect}/></clipPath></defs>`,

    arrow(x1, y1, x2, y2, color = MUTED, width = 2) {
      const id = color === HIGHLIGHT ? hi : plain;
      return (
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" ` +
        `stroke-width="${width}" marker-end="url(#${id})"/>`
      );
    },

    clip(inner) {
      return `<g clip-path="url(#${clipId})">${inner}</g>`;
    },
  };
}

function box(
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  color = ACCENT,
): string {
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="none" ` +
    `stroke="${color}" stroke-width="1.8"/>` +
    `<text x="${x + w / 2}" y="${y + h / 2 + 5}" fill="${color}" ` +
    `font-size="13" text-anchor="middle">${text}</text>`
  );
}

/** Concentric wavefronts leaving a point, staggered so they keep coming. */
function wavefronts(cx: number, cy: number, to: number, from = 16): string {
  return [0, 1, 2]
    .map(
      (i) =>
        `<circle cx="${cx}" cy="${cy}" r="${from}" fill="none" stroke="${ACCENT}" ` +
        `stroke-width="2"><animate attributeName="r" values="${from};${to}" ` +
        `dur="3s" begin="${i}s" repeatCount="indefinite"/>` +
        `<animate attributeName="opacity" values="0.8;0" dur="3s" begin="${i}s" ` +
        `repeatCount="indefinite"/></circle>`,
    )
    .join("");
}

// --- A: why a bare string cannot make sound -------------------------------

/**
 * Slide A1 — the acoustic short circuit. A string is thin compared with the
 * wavelength it is trying to launch, so the air it pushes simply flows around
 * to the low-pressure side and cancels.
 */
function shortCircuit(): string {
  const p = pen();
  const cx = 165;
  const cy = 120;

  // Air curling from the compressed side around to the rarefied side.
  const loop = (dir: number): string =>
    `<path d="M${cx + dir * 14},${cy - 28} Q${cx + dir * 78},${cy} ` +
    `${cx + dir * 14},${cy + 28}" fill="none" stroke="${HIGHLIGHT}" ` +
    `stroke-width="2" stroke-dasharray="5 4">` +
    `<animate attributeName="stroke-dashoffset" values="18;0" dur="1.1s" ` +
    `repeatCount="indefinite"/></path>`;

  // The wavelength the note is trying to launch, drawn across the full width.
  const scaleY = 208;
  const tick = (x: number): string =>
    `<line x1="${x}" y1="${scaleY - 7}" x2="${x}" y2="${scaleY + 7}" ` +
    `stroke="${DIM}" stroke-width="2"/>`;

  return slide(
    p.defs +
    heading("La corda è troppo sottile per l'aria") +
    // The string seen end-on, shuttling side to side.
    `<g><animateTransform attributeName="transform" type="translate" ` +
    `values="-7 0;7 0;-7 0" keyTimes="0;0.5;1" dur="1.1s" ` +
    `calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" ` +
    `repeatCount="indefinite"/>` +
    `<circle cx="${cx}" cy="${cy}" r="7" fill="${ACCENT}"/></g>` +
    label(cx - 44, cy + 52, "corda vista di punta", DIM, 11) +
    label(cx - 26, cy - 46, "Ø ≈ 1 mm", ACCENT, 12) +
    loop(1) +
    loop(-1) +
    label(280, cy - 14, "l'aria che spinge da un lato", HIGHLIGHT, 12) +
    label(280, cy + 4, "gira intorno e riempie il vuoto", HIGHLIGHT, 12) +
    label(280, cy + 22, "dall'altro", HIGHLIGHT, 12) +
    label(280, cy + 48, "compressione + rarefazione = 0", MUTED, 12) +
    // Scale bar: the wavelength it is up against.
    `<line x1="60" y1="${scaleY}" x2="580" y2="${scaleY}" stroke="${DIM}" stroke-width="1.5"/>` +
    tick(60) +
    tick(580) +
    label(196, scaleY - 14, "λ di un La a 440 Hz ≈ 78 cm", DIM, 12) +
    label(60, scaleY + 28, "In questa scala la corda sarebbe larga 0,7 pixel.", INK, 12) +
    footnote([
      "L'aria ha tutto il tempo di richiudersi alle spalle della corda.",
    ]),
  );
}

/**
 * Slide A2 — the same air, now facing a panel wider than the wavelength. There
 * is no way around it, so the air has to move.
 */
function bigSurface(): string {
  const p = pen();
  const boardX = 290;
  const cy = 140;

  const front = [0, 1, 2]
    .map(
      (i) =>
        `<path d="M${boardX + 22},${cy - 62} Q${boardX + 68},${cy} ` +
        `${boardX + 22},${cy + 62}" fill="none" stroke="${ACCENT}" ` +
        `stroke-width="2.5" opacity="0.9">` +
        `<animateTransform attributeName="transform" type="translate" ` +
        `values="0 0;150 0" dur="2.4s" begin="${i * 0.8}s" repeatCount="indefinite"/>` +
        `<animate attributeName="opacity" values="0.9;0" dur="2.4s" ` +
        `begin="${i * 0.8}s" repeatCount="indefinite"/></path>`,
    )
    .join("");

  // The shortcut the air took in the previous slide, arced over the panel and
  // crossed out. The apex clears the heading.
  const apexY = cy - 82;
  const blocked =
    `<path d="M${boardX - 34},${cy - 46} Q${boardX},${apexY - 16} ${boardX + 34},${cy - 46}" ` +
    `fill="none" stroke="${DIM}" stroke-width="2" stroke-dasharray="4 4"/>` +
    `<line x1="${boardX - 15}" y1="${apexY - 12}" x2="${boardX + 15}" y2="${apexY + 12}" ` +
    `stroke="${WARN}" stroke-width="2.5"/>` +
    `<line x1="${boardX + 15}" y1="${apexY - 12}" x2="${boardX - 15}" y2="${apexY + 12}" ` +
    `stroke="${WARN}" stroke-width="2.5"/>`;

  return slide(
    p.defs +
    heading("Una superficie grande non si può aggirare") +
    p.clip(front) +
    // The panel, breathing towards the room.
    `<g><animateTransform attributeName="transform" type="translate" ` +
    `values="-5 0;5 0;-5 0" keyTimes="0;0.5;1" dur="1.1s" ` +
    `calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" ` +
    `repeatCount="indefinite"/>` +
    `<rect x="${boardX - 9}" y="${cy - 66}" width="18" height="132" rx="4" ` +
    `fill="${ACCENT}" opacity="0.85"/></g>` +
    label(boardX - 66, cy + 92, "tavola armonica ≈ 1,5 m²", ACCENT, 12) +
    blocked +
    label(boardX + 34, apexY - 4, "niente scorciatoia:", DIM, 11) +
    label(boardX + 34, apexY + 12, "il giro attorno è più lungo di λ", DIM, 11) +
    label(boardX + 108, cy + 92, "una lastra d'aria spinta in blocco", HIGHLIGHT, 12) +
    p.arrow(60, cy, boardX - 24, cy, MUTED) +
    label(62, cy - 12, "la stessa corda, la stessa energia", MUTED, 12) +
    label(62, cy + 22, "ponte", DIM, 11) +
    footnote([
      "Larga rispetto alla lunghezza d'onda, la tavola non può essere cortocircuitata: l'aria non ha dove scappare.",
    ]),
  );
}

/**
 * Slide A3 — the wood itself is the thing that moves, and the shape it takes
 * depends on the frequency driving it. These are Chladni figures: sand collects
 * on the nodal lines, where the plate stands still.
 */
function chladniModes(): string {
  const plateW = 150;
  const plateH = 104;
  const plateY = 76;

  /**
   * One plate, split into `cols × rows` bellies. Neighbouring bellies move in
   * opposite directions — that antiphase is the whole point — and the lines
   * between them are the nodal lines the sand settles on.
   */
  const plate = (
    x: number,
    cols: number,
    rows: number,
    dur: number,
  ): string => {
    const cw = plateW / cols;
    const ch = plateH / rows;

    const bellies: string[] = [];
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const values =
          (i + j) % 2 === 1 ? "0.30;0.04;0.30" : "0.04;0.30;0.04";
        bellies.push(
          `<rect x="${(x + i * cw).toFixed(1)}" y="${(plateY + j * ch).toFixed(1)}" ` +
          `width="${cw.toFixed(1)}" height="${ch.toFixed(1)}" fill="${ACCENT}" opacity="0.04">` +
          `<animate attributeName="opacity" values="${values}" keyTimes="0;0.5;1" ` +
          `calcMode="spline" keySplines="${EASE};${EASE}" dur="${dur}s" ` +
          `repeatCount="indefinite"/></rect>`,
        );
      }
    }

    // Sand, scattered along each internal boundary with a fixed wobble so the
    // grains do not look like a ruled line.
    const sand: string[] = [];
    const grain = (gx: number, gy: number): string =>
      `<circle cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" r="1.6" fill="${INK}"/>`;

    for (let i = 1; i < cols; i++) {
      const lx = x + i * cw;
      for (let s = 3; s < plateH; s += 8) {
        sand.push(grain(lx + Math.sin(s) * 1.6, plateY + s));
      }
    }
    for (let j = 1; j < rows; j++) {
      const ly = plateY + j * ch;
      for (let s = 3; s < plateW; s += 8) {
        sand.push(grain(x + s, ly + Math.sin(s) * 1.6));
      }
    }

    return (
      bellies.join("") +
      `<rect x="${x}" y="${plateY}" width="${plateW}" height="${plateH}" rx="8" ` +
      `fill="none" stroke="${BORDER}" stroke-width="1.5"/>` +
      sand.join("")
    );
  };

  const captionY = plateY + plateH + 24;

  return slide(
    heading("È il legno che oscilla, creando figure") +
    plate(45, 2, 1, 1.6) +
    plate(245, 2, 2, 1.1) +
    plate(445, 3, 2, 0.8) +
    `<text x="120" y="${captionY}" fill="${DIM}" font-size="11" text-anchor="middle">frequenza bassa</text>` +
    `<text x="320" y="${captionY}" fill="${DIM}" font-size="11" text-anchor="middle">più alta</text>` +
    `<text x="520" y="${captionY}" fill="${DIM}" font-size="11" text-anchor="middle">più alta ancora</text>` +
    label(45, captionY + 26, "Le linee sono i punti fermi: la sabbia si raccoglie lì. Le zone vicine salgono e scendono in opposizione.", MUTED, 12) +
    footnote([
      "Quali figure compaiano dipende dalla frequenza e dal legno: forma, spessore, catene, curvatura.",
    ]),
  );
}

// --- B: discrete convolution, one step at a time --------------------------

/**
 * Slide B1 — the real formula, before any hand-waving. Everything that follows
 * is this line, read slowly.
 */
function continuousFormula(): string {
  const p = pen();
  const axisY = 210;
  const tau = 210;
  const now = 460;

  const tick = (x: number, text: string, color: string): string =>
    `<line x1="${x}" y1="${axisY - 8}" x2="${x}" y2="${axisY + 8}" ` +
    `stroke="${color}" stroke-width="2"/>` +
    `<text x="${x}" y="${axisY + 26}" fill="${color}" font-size="12" ` +
    `text-anchor="middle">${text}</text>`;

  // Symbol right-aligned into a column, so the dashes line up under each other.
  const gloss = (y: number, symbol: string, color: string, text: string): string =>
    `<text x="156" y="${y}" fill="${color}" font-size="13" text-anchor="end">${symbol}</text>` +
    `<text x="170" y="${y}" fill="${MUTED}" font-size="12">— ${text}</text>`;

  // A brace spanning the two instants: this is what t − τ means.
  const span =
    `<line x1="${tau}" y1="${axisY - 24}" x2="${now}" y2="${axisY - 24}" ` +
    `stroke="${HIGHLIGHT}" stroke-width="1.5"/>` +
    `<line x1="${tau}" y1="${axisY - 29}" x2="${tau}" y2="${axisY - 19}" stroke="${HIGHLIGHT}" stroke-width="1.5"/>` +
    `<line x1="${now}" y1="${axisY - 29}" x2="${now}" y2="${axisY - 19}" stroke="${HIGHLIGHT}" stroke-width="1.5"/>` +
    `<text x="${(tau + now) / 2}" y="${axisY - 32}" fill="${HIGHLIGHT}" ` +
    `font-size="12" text-anchor="middle">t − τ = quanto tempo fa</text>`;

  return slide(
    p.defs +
    heading("La convoluzione") +
    formula("y(t) = (x ∗ h)(t) = ∫ x(τ) · h(t − τ) dτ", 78, 20) +
    gloss(114, "x(τ)", ACCENT, "quanto era forte l'ingresso in un istante passato τ") +
    gloss(136, "h(t − τ)", HIGHLIGHT, "quanto ne resta adesso, dopo che è passato t − τ") +
    gloss(158, "∫ … dτ", INK, "somma tutto il passato, istante per istante") +
    `<line x1="60" y1="${axisY}" x2="580" y2="${axisY}" stroke="${BORDER}" stroke-width="1.5"/>` +
    p.arrow(560, axisY, 584, axisY, DIM) +
    tick(tau, "τ", MUTED) +
    tick(now, "t = adesso", INK) +
    span +
    footnote([
      "Il simbolo ∗ non è una moltiplicazione: è l'abbreviazione di tutta questa somma.",
    ]),
  );
}

/** Slide B2 — the same statement, sampled. From here on it is arithmetic. */
function discreteFormula(): string {
  const p = pen();
  const rows = [
    ["∫", "Σ", "l'integrale diventa una somma"],
    ["dτ", "1 campione", "il passo non è più infinitesimo ma discreto"],
    ["τ", "k", "l'istante passato è un indice"],
    ["t", "n", "adesso è un indice"],
  ];

  const mapping = rows
    .map(([from, to, note], i) => {
      const y = 178 + i * 21;
      return (
        `<text x="196" y="${y}" fill="${DIM}" font-size="13" text-anchor="end">${from}</text>` +
        `<text x="214" y="${y}" fill="${DIM}" font-size="13">→</text>` +
        `<text x="240" y="${y}" fill="${INK}" font-size="13">${to}</text>` +
        `<text x="340" y="${y}" fill="${DIM}" font-size="11">${note}</text>`
      );
    })
    .join("");

  return slide(
    p.defs +
    heading("Semplifichiamo per capire: il mondo discreto") +
    formula("y(t) = ∫ x(τ) · h(t − τ) dτ", 76, 15, DIM) +
    p.arrow(W / 2, 90, W / 2, 116, DIM) +
    formula("y[n] = Σ x[k] · h[n − k]", 146, 22, ACCENT) +
    `<line x1="180" y1="166" x2="460" y2="166" stroke="${BORDER}"/>` +
    mapping +
    footnote([
      "La semplificazione serve per poter capire e svolgere i calcoli a mano.",
    ]),
  );
}

const X = [2, 0, 1];
const H_IR = [1, 0.5, 0.25];
/** y = x ∗ h, the numbers the last slides build up to. */
const Y = [2, 1, 1.5, 0.5, 0.25];

const COL_X0 = 250;
const COL_W = 70;
const ROW_Y0 = 122;
const ROW_H = 34;

function colX(index: number): number {
  return COL_X0 + index * COL_W;
}

/** A stem plot: the usual way to draw a handful of discrete samples. */
function stems(
  ox: number,
  oy: number,
  values: number[],
  color: string,
  pitch = 46,
  scale = 34,
): string {
  const axis =
    `<line x1="${ox - 16}" y1="${oy}" x2="${ox + (values.length - 1) * pitch + 16}" ` +
    `y2="${oy}" stroke="${BORDER}" stroke-width="1.5"/>`;

  const marks = values
    .map((v, i) => {
      const x = ox + i * pitch;
      const y = oy - v * scale;
      if (v === 0) {
        return `<circle cx="${x}" cy="${oy}" r="3.5" fill="none" stroke="${DIM}" stroke-width="1.5"/>`;
      }
      return (
        `<line x1="${x}" y1="${oy}" x2="${x}" y2="${y}" stroke="${color}" stroke-width="2.5"/>` +
        `<circle cx="${x}" cy="${y}" r="4.5" fill="${color}"/>` +
        `<text x="${x}" y="${y - 12}" fill="${color}" font-size="12" ` +
        `text-anchor="middle">${v}</text>`
      );
    })
    .join("");

  return axis + marks;
}

/** Column headers 0..4: the instants the table is indexed by. */
function tableHeader(): string {
  const cells = Y.map(
    (_, i) =>
      `<text x="${colX(i)}" y="${ROW_Y0 - 28}" fill="${DIM}" font-size="12" ` +
      `text-anchor="middle">istante ${i}</text>`,
  ).join("");

  return (
    cells +
    `<line x1="${colX(0) - 40}" y1="${ROW_Y0 - 18}" x2="${colX(4) + 36}" ` +
    `y2="${ROW_Y0 - 18}" stroke="${BORDER}" stroke-width="1.5"/>`
  );
}

/**
 * One row of the convolution table: the copy of `h` that input sample `k`
 * stamps, scaled by its own value and shifted to start at column `k`. Rows the
 * walkthrough has not reached yet keep their slot but stay empty, so nothing
 * moves as the carousel advances.
 */
function tableRow(k: number, state: "pending" | "done" | "active"): string {
  const y = ROW_Y0 + k * ROW_H;
  const value = X[k] ?? 0;
  const color = state === "active" ? HIGHLIGHT : state === "done" ? DIM : BORDER;

  const what = value === 0 ? "niente" : `stampa ${value} · h`;
  const rowLabel =
    `<text x="${colX(0) - 44}" y="${y + 4}" fill="${color}" font-size="12" ` +
    `text-anchor="end">x[${k}] = ${value}  →  ${what}</text>`;

  if (state === "pending" || value === 0) return rowLabel;

  // A box around the three cells: they are one object, a copy of h laid down
  // starting at column k — which is the whole idea of the convolution.
  const stamp =
    `<rect x="${colX(k) - 32}" y="${y - 13}" width="${2 * COL_W + 64}" height="26" ` +
    `rx="7" fill="${color}" opacity="0.12"/>` +
    `<rect x="${colX(k) - 32}" y="${y - 13}" width="${2 * COL_W + 64}" height="26" ` +
    `rx="7" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.7"/>`;

  const cells = H_IR.map((tap, i) => {
    const product = +(value * tap).toFixed(3);
    return (
      `<text x="${colX(k + i)}" y="${y + 4}" fill="${color}" font-size="14" ` +
      `text-anchor="middle">${product}</text>`
    );
  }).join("");

  return stamp + rowLabel + cells;
}

/** The summed output row, shown once every copy of `h` is on the table. */
function tableSum(): string {
  const y = ROW_Y0 + 3 * ROW_H;

  const cells = Y.map(
    (v, i) =>
      `<text x="${colX(i)}" y="${y + 24}" fill="${ACCENT}" font-size="15" ` +
      `font-weight="600" text-anchor="middle">${v}</text>`,
  ).join("");

  return (
    `<line x1="${colX(0) - 40}" y1="${y + 4}" x2="${colX(4) + 36}" y2="${y + 4}" ` +
    `stroke="${BORDER}" stroke-width="1.5"/>` +
    `<text x="${colX(0) - 52}" y="${y + 24}" fill="${ACCENT}" font-size="13" ` +
    `text-anchor="end">y = somma</text>` +
    cells
  );
}

/** Slides B3..B6 share one table; `rows` says how much of it is filled in. */
function convolutionTable(rows: number, title: string, sum: boolean): string {
  const body = [0, 1, 2]
    .map((k) =>
      tableRow(k, k === rows - 1 ? "active" : k < rows ? "done" : "pending"),
    )
    .join("");

  return slide(
    heading(title) +
    `<text x="${W / 2}" y="62" fill="${DIM}" font-size="13" text-anchor="middle">` +
    `x = [2, 0, 1]      h = [1, 0.5, 0.25]</text>` +
    tableHeader() +
    body +
    (sum ? tableSum() : ""),
  );
}

/** Slide B1 — what `h` even is: one click in, this out. */
function impulseResponse(): string {
  const p = pen();
  const axisY = 175;

  return slide(
    p.defs +
    heading("Il suono della cassa armonica") +
    label(40, 62, "Se batti le mani in una chiesa, senti un eco.", MUTED, 12) +
    stems(110, axisY, [1], ACCENT) +
    label(62, axisY + 50, "Se emettiamo un campione solo", DIM, 11) +
    box(200, axisY - 32, 140, 62, "la cassa", BORDER) +
    p.arrow(146, axisY - 4, 194, axisY - 4) +
    p.arrow(346, axisY - 4, 394, axisY - 4) +
    stems(420, axisY, H_IR, HIGHLIGHT) +
    label(420, axisY + 32, "h = risposta all'impulso", HIGHLIGHT, 12) +
    label(420, axisY + 50, "il click, poi due echi", DIM, 11),
  );
}

/** Every signal is a sum of impulses. A tautology, and the key to everything. */
function signalAsImpulses(): string {
  const terms = [
    { x: 180, text: "2·[1, 0, 0]", height: "altezza 2", when: "all'istante 0" },
    { x: 315, text: "0·[0, 1, 0]", height: "altezza 0", when: "all'istante 1" },
    { x: 450, text: "1·[0, 0, 1]", height: "altezza 1", when: "all'istante 2" },
  ];

  const written = terms
    .map(
      (term, i) =>
        (i > 0
          ? `<text x="${term.x - 22}" y="128" fill="${MUTED}" font-size="16">+</text>`
          : "") +
        `<text x="${term.x}" y="128" fill="${HIGHLIGHT}" font-size="16">${term.text}</text>` +
        `<text x="${term.x + 44}" y="152" fill="${DIM}" font-size="11" ` +
        `text-anchor="middle">un impulso di ${term.height}</text>` +
        `<text x="${term.x + 44}" y="168" fill="${DIM}" font-size="11" ` +
        `text-anchor="middle">${term.when}</text>`,
    )
    .join("");

  return slide(
    heading("Facciamo un esempio numerico") +
    label(40, 76, "Prendi i tre numeri di x e riscrivili come somma dei loro posti (il modo è discreto):", MUTED, 12) +
    `<text x="60" y="128" fill="${ACCENT}" font-size="16">[2, 0, 1]</text>` +
    `<text x="148" y="128" fill="${MUTED}" font-size="16">=</text>` +
    written +
    label(40, 212, "Lo possiamo fare perché la cassa è lineare!", INK, 12) +
    footnote([
    ]),
  );
}

/** Slide B7 — the output outlives the input: why the render buffer grows. */
function tailLength(): string {
  const unit = 50;
  const x0 = 70;

  const bar = (y: number, samples: number, color: string, text: string): string =>
    `<rect x="${x0}" y="${y}" width="${samples * unit}" height="28" rx="5" ` +
    `fill="${color}" opacity="0.22"/>` +
    `<rect x="${x0}" y="${y}" width="${samples * unit}" height="28" rx="5" ` +
    `fill="none" stroke="${color}" stroke-width="1.8"/>` +
    `<text x="${x0 + (samples * unit) / 2}" y="${y + 19}" fill="${color}" ` +
    `font-size="12" text-anchor="middle">${text}</text>`;

  const endOfInput = x0 + 3 * unit;
  const endOfOutput = x0 + 5 * unit;

  return slide(
    heading("L'uscita è più lunga dell'ingresso") +
    bar(64, 3, ACCENT, "x — 3 campioni") +
    bar(112, 3, HIGHLIGHT, "h — 3 campioni") +
    bar(170, 5, INK, "y — 5 campioni") +
    `<line x1="${endOfInput}" y1="56" x2="${endOfInput}" y2="210" ` +
    `stroke="${BORDER}" stroke-dasharray="4 4"/>` +
    `<line x1="${endOfOutput}" y1="162" x2="${endOfOutput}" y2="210" ` +
    `stroke="${BORDER}" stroke-dasharray="4 4"/>` +
    `<text x="${(endOfInput + endOfOutput) / 2}" y="${FLOOR - 25}" fill="${INK}" ` +
    `font-size="12" text-anchor="middle">la coda</text>` +
    label(endOfOutput + 24, 186, "3 + 3 − 1 = 5", INK, 15) +
    footnote([
      "L'eco continua per (3 - 1) campioni nonostante l'input sia a 0",
    ]),
  );
}

// --- C: what x and h are, physically --------------------------------------

/** Slide C1 — `x` is a force on the bridge, not a sound. */
function forceOnBridge(): string {
  const p = pen();
  const stringY = 110;
  const bridgeX = 300;

  const trace: string[] = [];
  for (let i = 0; i <= 140; i++) {
    const t = i / 140;
    const x = 370 + t * 210;
    const env = Math.exp(-t * 2.6);
    trace.push(`${x.toFixed(1)},${(200 - 32 * env * Math.sin(t * 34)).toFixed(2)}`);
  }

  return slide(
    p.defs +
    heading("La funzione x, la forza che le corde fanno sul ponte") +
    vibrate(
      70,
      stringY,
      `<path d="${modePath(215, 18, 3)}" fill="none" stroke="${ACCENT}" stroke-width="2.5"/>`,
      1.4,
    ) +
    label(72, stringY - 36, "corda tesa sopra il ponte", ACCENT, 12) +
    `<path d="M${bridgeX - 16},${stringY + 26} L${bridgeX},${stringY - 2} L${bridgeX + 16},${stringY + 26} z" ` +
    `fill="${MUTED}"/>` +
    label(bridgeX - 18, stringY + 44, "ponte", DIM, 11) +
    `<g><animateTransform attributeName="transform" type="translate" ` +
    `values="0 -4;0 4;0 -4" keyTimes="0;0.5;1" dur="0.7s" repeatCount="indefinite"/>` +
    p.arrow(bridgeX, stringY + 54, bridgeX, stringY + 92, HIGHLIGHT, 3) +
    `</g>` +
    label(bridgeX - 44, stringY + 116, "applica una forza", HIGHLIGHT, 12) +
    // The same force, plotted against time.
    `<line x1="370" y1="200" x2="590" y2="200" stroke="${BORDER}"/>` +
    `<path d="M${trace.join(" L")}" fill="none" stroke="${HIGHLIGHT}" stroke-width="2"/>` +
    label(370, 88, "x(t) — quanto forte il ponte", MUTED, 12) +
    label(370, 106, "viene strattonato", MUTED, 12) +
    footnote([
    ]),
  );
}

/** Slide C2 — `h` measured for real, with an impulse hammer and a microphone. */
function measuredResponse(): string {
  const p = pen();
  const bridgeX = 140;
  const cy = 150;

  const tail: string[] = [];
  for (let i = 0; i <= 160; i++) {
    const t = i / 160;
    const x = 370 + t * 220;
    // Decaying noise: the shape of a room tail, sampled deterministically.
    const wobble = Math.sin(i * 2.7) * Math.sin(i * 1.13) * Math.sin(i * 0.31);
    tail.push(`${x.toFixed(1)},${(200 - 28 * Math.exp(-t * 3.4) * wobble).toFixed(2)}`);
  }

  return slide(
    p.defs +
    heading("La funzione h, il legno") +
    p.clip(wavefronts(bridgeX, cy, 120, 14)) +
    // Instrumented hammer tapping the bridge.
    `<g><animateTransform attributeName="transform" type="translate" ` +
    `values="0 -26;0 0;0 -26;0 -26" keyTimes="0;0.08;0.2;1" dur="3s" ` +
    `repeatCount="indefinite"/>` +
    `<rect x="${bridgeX - 12}" y="${cy - 74}" width="24" height="20" rx="5" fill="${HIGHLIGHT}"/>` +
    `<line x1="${bridgeX}" y1="${cy - 54}" x2="${bridgeX}" y2="${cy - 34}" stroke="${HIGHLIGHT}" stroke-width="3"/>` +
    `</g>` +
    label(bridgeX + 22, cy - 60, "martelletto strumentato", HIGHLIGHT, 11) +
    `<path d="M${bridgeX - 16},${cy + 22} L${bridgeX},${cy - 6} L${bridgeX + 16},${cy + 22} z" fill="${MUTED}"/>` +
    label(bridgeX - 18, cy + 40, "ponte", DIM, 11) +
    label(40, 232, "", DIM, 11) +
    // Microphone in the room.
    `<circle cx="310" cy="${cy}" r="9" fill="none" stroke="${INK}" stroke-width="2"/>` +
    `<line x1="310" y1="${cy + 9}" x2="310" y2="${cy + 30}" stroke="${INK}" stroke-width="2"/>` +
    label(282, cy + 48, "microfono", DIM, 11) +
    `<line x1="370" y1="200" x2="590" y2="200" stroke="${BORDER}"/>` +
    `<path d="M${tail.join(" L")}" fill="none" stroke="${ACCENT}" stroke-width="1.6"/>` +
    label(370, 96, "h(t) è identificata dalla,", MUTED, 12) +
    label(370, 114, "caratteristica del legno", MUTED, 12) +
    footnote([
      "h non contiene nessuna nota: è una proprietà del mobile di legno e della stanza, non della musica.",
    ]),
  );
}

/** Slide C3 — `y` is pressure at the ear, and it depends on where the ear is. */
function pressureAtEar(): string {
  const roomX = 30;
  const roomY = 52;
  const roomW = W - 60;
  const roomH = 150;
  const p = pen(`x="${roomX}" y="${roomY}" width="${roomW}" height="${roomH}"`);

  const boardX = 110;
  const cy = 140;

  const head = (x: number, y: number, color: string, note: string): string =>
    `<circle cx="${x}" cy="${y}" r="15" fill="none" stroke="${color}" stroke-width="2"/>` +
    `<path d="M${x + 13},${y - 4} q10,-6 10,6 q0,10 -10,6" fill="none" stroke="${color}" stroke-width="2"/>` +
    `<text x="${x - 16}" y="${y + 34}" fill="${color}" font-size="11">${note}</text>`;

  return slide(
    p.defs +
    heading("L'output y, la pressione dell'aria al tuo orecchio") +
    `<rect x="${roomX}" y="${roomY}" width="${roomW}" height="${roomH}" rx="10" ` +
    `fill="none" stroke="${BORDER}" stroke-width="1.5"/>` +
    label(W - 82, roomY + 20, "stanza", DIM, 11) +
    p.clip(wavefronts(boardX, cy, 240)) +
    `<rect x="${boardX - 42}" y="${cy - 11}" width="110" height="22" rx="6" ` +
    `transform="rotate(-8 ${boardX} ${cy})" fill="${ACCENT}" opacity="0.85"/>` +
    label(boardX - 44, cy + 40, "tavola armonica", ACCENT, 11) +
    head(360, 105, INK, "qui") +
    head(470, 152, HIGHLIGHT, "e qui è già diverso") +
    label(40, 226, "", INK, 12) +
    footnote([
      "Se si sposta la testa di mezzo metro, y cambia e quindi cambia anche h, nonostante il pianoforte sia lo stesso.",
    ]),
  );
}

/** Slide C4 — the body is a chain, and convolution is associative. */
function chainOfResponses(): string {
  const p = pen();
  const y = 110;

  return slide(
    p.defs +
    heading("h è a sua volta una catena") +
    box(50, y, 112, 54, "corde", HIGHLIGHT) +
    p.arrow(168, y + 27, 196, y + 27) +
    box(202, y, 112, 54, "tavola", ACCENT) +
    p.arrow(320, y + 27, 348, y + 27) +
    box(354, y, 112, 54, "stanza", ACCENT) +
    p.arrow(472, y + 27, 500, y + 27) +
    box(506, y, 84, 54, "y", INK) +
    label(214, y - 14, "h_tavola", DIM, 11) +
    label(368, y - 14, "h_stanza", DIM, 11) +
    `<text x="${W / 2}" y="${y + 100}" fill="${INK}" font-size="15" ` +
    `text-anchor="middle">h = h_tavola ∗ h_stanza</text>` +
    footnote([
      "La convoluzione è associativa: mettere i pezzi in fila equivale a un unico h."
    ]),
  );
}

/** Slide C5 — the honest limit: the model's arrow only points one way. */
function oneWayModel(): string {
  const p = pen();
  const y = 108;

  return slide(
    p.defs +
    heading("Le limitazione della nostra implementazione") +
    box(90, y, 140, 58, "corde", HIGHLIGHT) +
    box(360, y, 160, 58, "tavola + stanza", ACCENT) +
    p.arrow(236, y + 18, 354, y + 18, MUTED, 2.5) +
    label(252, y + 8, "energia", DIM, 11) +
    // The back-reaction the model leaves out.
    `<path d="M354,${y + 44} L236,${y + 44}" fill="none" stroke="${DIM}" ` +
    `stroke-width="2" stroke-dasharray="5 4"/>` +
    `<line x1="278" y1="${y + 32}" x2="308" y2="${y + 56}" stroke="${WARN}" stroke-width="2.5"/>` +
    `<line x1="308" y1="${y + 32}" x2="278" y2="${y + 56}" stroke="${WARN}" stroke-width="2.5"/>` +
    label(242, y + 78, "il ritorno non c'è", WARN, 11) +
    label(40, 212, "Un ponte vero oppone impedenza alla corda: le sottrae energia e le rimanda indietro del moto.", MUTED, 12) +
    footnote([
      "Da lì vengono i tempi di decadimento veri, e il doppio decadimento di una nota di pianoforte.",
      "Qui x è calcolato prima e non sa niente di h: per questo i decadimenti della fase 4 sono scritti a mano.",
    ]),
  );
}

// --- the three galleries --------------------------------------------------

export const pianoGalleries: StageGallery[] = [
  {
    buttonLabel: "Non solo la corda",
    title: "Una corda non riesce a fare suono",
    images: [
      {
        svg: shortCircuit(),
        caption:
          "La corda è centinaia di volte più sottile della lunghezza d'onda che sta cercando di emettere: l'aria che spinge da un lato gira intorno e riempie il vuoto dall'altro. Compressione e rarefazione si annullano a pochi millimetri.",
      },
      {
        svg: bigSurface(),
        caption:
          "Una superficie larga rispetto alla lunghezza d'onda non si può aggirare: l'aria non ha scorciatoie e viene spinta in blocco. Stessa corda, stessa energia, ma adesso qualcuno la sta irradiando davvero.",
      },
      {
        svg: chladniModes(),
        caption:
          "Sono le figure di Chladni: la piastra vibra ma ha zone in cui è ferma. Li è dove la sabbia si ferma. Non solo le zone cambiano in base alla frequenza, ma anche in base al legno (tipologia, forma, spessore, etc...). In base la legno, certe frequenze sono \"preferite\" rispetto ad altre ed è quella preferenza a fare il timbro dello strumento. Anche se la realtà è più complessa di così, il principio è questo.",
      },
      {
        src: chladniPlate,
        caption:
          "Le figure vere, incise da Ernst Chladni nella sua «Akustik» del 1802: una sola piastra quadrata, una trentina di frequenze diverse, una trentina di disegni diversi.",
      },
    ],
  },
  {
    buttonLabel: "La convoluzione",
    title: "Che cos'è davvero una convoluzione",
    images: [
      {
        svg: continuousFormula(),
        caption:
          "Questa riga è tutto ciò che la tavola armonica fa al suono, e si legge a parole: il valore in uscita adesso è la somma di tutto il passato dell'ingresso, ogni istante pesato per quanto \"ne è rimasto\" dopo il tempo trascorso. Quel «tempo trascorso» è t − τ, e h dice quanto resta.",
      },
      {
        svg: discreteFormula(),
        caption:
          "La semplificazione è corretta perché un computer \"vive\" nel discreto non nel continuo.",
      },
      {
        svg: impulseResponse(),
        caption:
          "L'output è un \"click\" iniziale seguito da due echi a metà e a un quarto.",
      },
      {
        svg: signalAsImpulses(),
        caption:
          "",
      },
      {
        svg: convolutionTable(1, "E ora i calcoli veri:", false),
        caption:
          "x[0] * h = [2 * 1, 2 * 0.5, 2 * 0.25] = [2, 1, 0.5]. Quindi 2 è l'impulso a istante 0, 1 è l'effetto dell'input a istante 0 a istante 1, 0.5 è l'effetto dell'input a istante 0 a istante 2",
      },
      {
        svg: convolutionTable(2, "Il secondo campione è zero", false),
        caption:
          "x[1] vale 0 quindi non ha effetto, ma va comunque contata, poiché le posizioni delle righe successive dipendono da lei.",
      },
      {
        svg: convolutionTable(3, "La contribuzione del terzo campione", false),
        caption:
          "x[2] vale 1 e arriva due campioni dopo, quindi la sua copia di h è identica ma appoggiata due colonne più a destra. Invarianza nel tempo: stessa forma, solo spostata.",
      },
      {
        svg: convolutionTable(3, "L'output finale y(t)", true),
        caption:
          "Sommare le colonne dà y = [2, 1, 1,5, 0,5, 0,25]. Questa tabella è la formula di due slide fa: y[n] = Σ x[k]·h[n−k]. Ogni riga è x[k]·h spostata di k, e n−k è solo «quanto tempo fa è successo».",
      },
      {
        svg: tailLength(),
        caption:
          "",
      },
    ],
  },
  {
    buttonLabel: "Chi sono x e h, fisicamente",
    title: "y = x ∗ h — tre oggetti reali",
    images: [
      {
        svg: forceOnBridge(),
        caption:
          "x è la forza, in newton, che le corde esercitano sul ponte istante per istante. Tutto quello che abbiamo costruito dalla fase 1 alla 7 serve a calcolare questa singola funzione del tempo. Non è un suono: è la forza esercitata sul ponte.",
      },
      {
        svg: measuredResponse(),
        caption:
          "h risponde alla domanda: «se do un colpo secco al ponte e sto seduto lì davanti, cosa sento?».",
      },
      {
        svg: pressureAtEar(),
        caption:
          "",
      },
      {
        svg: chainOfResponses(),
        caption:
          "Fra ponte e orecchio non c'è un oggetto solo: ponte, tavola, aria, pareti. Ognuno ha la sua risposta all'impulso, e siccome la convoluzione è associativa, la fila equivale a un unico h.",
      },
      {
        svg: oneWayModel(),
        caption:
          "La cosa che questo schema dà per scontata e che è fisicamente falsa: la freccia va in un senso solo. Il ponte vero rimanda energia alla corda, ed è da lì che vengono i tempi di decadimento.",
      },
    ],
  },
];
