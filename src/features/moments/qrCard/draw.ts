import type { TemplateId } from '@shared/types';

/** The card is drawn on a 1000 × 1414 canvas (the A-series ratio); every paper size is this scaled. */
export const CARD_W = 1000;
export const CARD_H = 1414;

type Ctx = CanvasRenderingContext2D;

export interface CardPalette {
  paper: string;
  ink: string;
  inkSoft: string;
  primary: string;
  deep: string;
  onDeep: string;
  gold: string;
}

export interface CardInput {
  template: TemplateId;
  kicker: string;
  title: string;
  names: string;
  /** "Jumat, 20 November 2026", or empty. */
  dateText: string;
  steps: string[];
  url: string;
  /** QR modules, true = dark. */
  qr: boolean[][];
  /** Colours of the active batik preset; only the Nusantara template uses them. */
  palette: CardPalette;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// --- Primitives ---------------------------------------------------------------------------------

const roundRect = (c: Ctx, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
};

function setSpacing(c: Ctx, px: number) {
  (c as Ctx & { letterSpacing: string }).letterSpacing = `${px}px`;
}

/** Lines of `text` that each fit `maxW` with the font currently set on the context. */
function wrap(c: Ctx, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && c.measureText(next).width > maxW) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

interface TextOpts {
  font: (px: number) => string;
  color: string;
  size: number;
  minSize?: number;
  maxW: number;
  maxLines?: number;
  lineHeight?: number;
  align?: CanvasTextAlign;
  spacing?: number;
  upper?: boolean;
  stroke?: { color: string; width: number };
}

/**
 * Draws wrapped text centred on x, starting at y, shrinking the font until it fits maxW in maxLines.
 * Returns the y just below the block.
 */
function textBlock(c: Ctx, text: string, x: number, y: number, o: TextOpts): number {
  const content = o.upper ? text.toUpperCase() : text;
  let size = o.size;
  let lines: string[] = [];
  for (; ; size -= 2) {
    c.font = o.font(size);
    setSpacing(c, o.spacing ?? 0);
    lines = wrap(c, content, o.maxW);
    const widest = Math.max(0, ...lines.map((l) => c.measureText(l).width));
    if ((lines.length <= (o.maxLines ?? 3) && widest <= o.maxW) || size <= (o.minSize ?? 28)) break;
  }
  const lh = size * (o.lineHeight ?? 1.12);
  c.textAlign = o.align ?? 'center';
  c.textBaseline = 'alphabetic';
  lines.forEach((line, i) => {
    const baseline = y + size * 0.85 + i * lh;
    if (o.stroke) {
      c.lineWidth = o.stroke.width;
      c.strokeStyle = o.stroke.color;
      c.lineJoin = 'round';
      c.strokeText(line, x, baseline);
    }
    c.fillStyle = o.color;
    c.fillText(line, x, baseline);
  });
  setSpacing(c, 0);
  return y + lines.length * lh;
}

/** The QR as crisp squares inside `box`, on a quiet-zone background. Returns the rect holding the code itself. */
function drawQr(c: Ctx, qr: boolean[][], box: Rect, fg: string, bg: string, radius = 0): Rect {
  const quiet = 3;
  const cells = qr.length + quiet * 2;
  const cell = Math.floor((Math.min(box.w, box.h) / cells) * 100) / 100;
  const size = cell * cells;
  const x0 = box.x + (box.w - size) / 2;
  const y0 = box.y + (box.h - size) / 2;
  c.fillStyle = bg;
  roundRect(c, box.x, box.y, box.w, box.h, radius);
  c.fill();
  c.fillStyle = fg;
  for (let r = 0; r < qr.length; r++) {
    for (let col = 0; col < qr.length; col++) {
      if (qr[r][col]) c.fillRect(x0 + (col + quiet) * cell - 0.2, y0 + (r + quiet) * cell - 0.2, cell + 0.4, cell + 0.4);
    }
  }
  return { x: x0 + quiet * cell, y: y0 + quiet * cell, w: qr.length * cell, h: qr.length * cell };
}

/** One kawung unit: four petals around a seed, like the invitation's ornament. */
function kawung(c: Ctx, cx: number, cy: number, r: number, color: string) {
  c.fillStyle = color;
  for (const deg of [45, 135, 225, 315]) {
    const a = (deg * Math.PI) / 180;
    const px = cx + Math.cos(a) * r * 0.48;
    const py = cy + Math.sin(a) * r * 0.48;
    c.beginPath();
    c.ellipse(px, py, r * 0.3, r * 0.35, a + Math.PI / 2, 0, Math.PI * 2);
    c.fill();
  }
  c.beginPath();
  c.arc(cx, cy, r * 0.1, 0, Math.PI * 2);
  c.fill();
}

const hairline = (c: Ctx, x1: number, y: number, x2: number, color: string, width = 2) => {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(x1, y);
  c.lineTo(x2, y);
  c.stroke();
};

/** Numbered steps, one per line, left-aligned from `x`. Returns the y below the list. */
function steps(
  c: Ctx,
  list: string[],
  x: number,
  y: number,
  o: { font: (px: number) => string; color: string; size: number; maxW: number; gap: number; marker: (i: number, cy: number) => void },
): number {
  let cy = y;
  list.forEach((text, i) => {
    o.marker(i, cy + o.size * 0.45);
    let size = o.size;
    c.font = o.font(size);
    while (c.measureText(text).width > o.maxW && size > 20) c.font = o.font((size -= 1));
    c.fillStyle = o.color;
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillText(text, x + 70, cy + o.size * 0.45);
    cy += o.gap;
  });
  return cy;
}

// --- Templates ----------------------------------------------------------------------------------

/** Nusantara: batik paper on a deep ground, kawung ornaments; colours follow the chosen batik preset. */
function nusantara(c: Ctx, d: CardInput): Rect {
  const p = d.palette;
  c.fillStyle = p.deep;
  c.fillRect(0, 0, CARD_W, CARD_H);
  for (let y = 0; y < CARD_H + 90; y += 90) for (let x = (y / 90) % 2 ? 45 : 0; x < CARD_W + 90; x += 90) kawung(c, x, y, 40, `${p.onDeep}14`);

  roundRect(c, 70, 70, 860, 1274, 26);
  c.fillStyle = p.paper;
  c.fill();
  c.strokeStyle = p.gold;
  c.lineWidth = 3;
  roundRect(c, 92, 92, 816, 1230, 16);
  c.stroke();

  kawung(c, 500, 152, 42, p.gold);
  textBlock(c, d.kicker, 500, 204, { font: (s) => `700 ${s}px "Plus Jakarta Sans", system-ui, sans-serif`, color: p.inkSoft, size: 26, maxW: 700, spacing: 9, upper: true, maxLines: 1 });
  textBlock(c, d.title, 500, 250, { font: (s) => `italic 500 ${s}px Fraunces, Georgia, serif`, color: p.ink, size: 84, minSize: 54, maxW: 740, maxLines: 2, lineHeight: 1.08 });

  const box = { x: 240, y: 496, w: 520, h: 520 };
  c.strokeStyle = p.primary;
  c.lineWidth = 4;
  roundRect(c, box.x - 14, box.y - 14, box.w + 28, box.h + 28, 22);
  c.stroke();
  const code = drawQr(c, d.qr, box, '#1c1a17', '#ffffff', 12);
  for (const [cx, cy] of [[box.x - 14, box.y - 14], [box.x + box.w + 14, box.y - 14], [box.x - 14, box.y + box.h + 14], [box.x + box.w + 14, box.y + box.h + 14]]) {
    c.fillStyle = p.paper;
    c.beginPath();
    c.arc(cx, cy, 24, 0, Math.PI * 2);
    c.fill();
    kawung(c, cx, cy, 22, p.gold);
  }

  steps(c, d.steps, 175, 1075, {
    font: (s) => `500 ${s}px "Plus Jakarta Sans", system-ui, sans-serif`,
    color: p.ink,
    size: 31,
    maxW: 640,
    gap: 52,
    marker: (i, cy) => {
      c.fillStyle = p.primary;
      c.beginPath();
      c.arc(205, cy, 19, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = p.paper;
      c.font = '700 22px "Plus Jakarta Sans", system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(String(i + 1), 205, cy + 1);
    },
  });

  hairline(c, 330, 1250, 670, p.gold);
  textBlock(c, d.names, 500, 1262, { font: (s) => `italic 500 ${s}px Fraunces, Georgia, serif`, color: p.primary, size: 50, maxW: 760, maxLines: 1 });
  return code;
}

/** Gulungan Kenangan: a dim screening room, film strips down both sides, a ticket and a red stamp. */
function gulungan(c: Ctx, d: CardInput): Rect {
  const cream = '#f3ecc9';
  const amber = '#ff9a4a';
  const red = '#c8453a';
  const bg = '#34352f';
  const g = c.createRadialGradient(500, 620, 60, 500, 620, 900);
  g.addColorStop(0, '#43443c');
  g.addColorStop(1, '#2a2b26');
  c.fillStyle = g;
  c.fillRect(0, 0, CARD_W, CARD_H);

  for (const x0 of [0, 890]) {
    c.fillStyle = '#262521';
    c.fillRect(x0, 0, 110, CARD_H);
    c.fillStyle = bg;
    for (let y = 24; y < CARD_H; y += 70) {
      roundRect(c, x0 + 33, y, 44, 32, 7);
      c.fill();
    }
    hairline(c, x0 === 0 ? 110 : 890, 0, x0 === 0 ? 110 : 890, '#f3ecc933', 2);
    c.strokeStyle = '#f3ecc933';
    c.beginPath();
    c.moveTo(x0 === 0 ? 110 : 890, 0);
    c.lineTo(x0 === 0 ? 110 : 890, CARD_H);
    c.stroke();
  }

  textBlock(c, `SCENE 01 · ${d.kicker}`, 500, 120, { font: (s) => `400 ${s}px VT323, ui-monospace, monospace`, color: amber, size: 40, maxW: 700, spacing: 5, maxLines: 1, upper: true });
  textBlock(c, d.title, 500, 160, { font: (s) => `400 ${s}px "Pinyon Script", cursive`, color: cream, size: 104, maxW: 700, maxLines: 2, lineHeight: 1.05, minSize: 50 });

  const ticket = { x: 190, y: 450, w: 620, h: 560 };
  c.fillStyle = '#15150f55';
  roundRect(c, ticket.x + 10, ticket.y + 14, ticket.w, ticket.h, 16);
  c.fill();
  c.fillStyle = cream;
  roundRect(c, ticket.x, ticket.y, ticket.w, ticket.h, 16);
  c.fill();
  c.fillStyle = bg;
  for (const x of [ticket.x, ticket.x + ticket.w]) {
    c.beginPath();
    c.arc(x, ticket.y + ticket.h / 2, 26, 0, Math.PI * 2);
    c.fill();
  }
  c.setLineDash([10, 10]);
  hairline(c, ticket.x + 40, ticket.y + 46, ticket.x + ticket.w - 40, '#2f2e2866', 2);
  c.setLineDash([]);
  textBlock(c, 'ADMIT ONE · KAMERA TAMU', 500, ticket.y + 62, { font: (s) => `400 ${s}px VT323, ui-monospace, monospace`, color: '#6b675a', size: 30, maxW: 520, spacing: 4, maxLines: 1 });
  const code = drawQr(c, d.qr, { x: ticket.x + 80, y: ticket.y + 106, w: 460, h: 440 }, '#2f2e28', cream, 0);

  c.save();
  c.translate(740, 1000);
  c.rotate((-9 * Math.PI) / 180);
  c.strokeStyle = red;
  c.fillStyle = red;
  c.lineWidth = 6;
  roundRect(c, -140, -34, 280, 68, 8);
  c.stroke();
  c.font = '400 44px VT323, ui-monospace, monospace';
  setSpacing(c, 4);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('ADEGAN BARU', 0, 3);
  c.restore();
  setSpacing(c, 0);

  steps(c, d.steps, 170, 1058, {
    font: (s) => `italic 400 ${s}px "EB Garamond", Georgia, serif`,
    color: cream,
    size: 31,
    maxW: 620,
    gap: 48,
    marker: (i, cy) => {
      c.fillStyle = amber;
      c.font = '400 38px VT323, ui-monospace, monospace';
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillText(`0${i + 1}`, 175, cy);
    },
  });

  textBlock(c, d.names, 500, 1212, { font: (s) => `400 ${s}px "Pinyon Script", cursive`, color: cream, size: 76, maxW: 700, maxLines: 1 });
  if (d.dateText) textBlock(c, d.dateText, 500, 1336, { font: (s) => `400 ${s}px VT323, ui-monospace, monospace`, color: amber, size: 30, maxW: 700, spacing: 3, maxLines: 1, upper: true });
  return code;
}

/** Bilik Foto: a dotted paper wall, a red booth sign, taped paper and a handwritten name. */
function bilik(c: Ctx, d: CardInput): Rect {
  const red = '#b42a2f';
  const ink = '#221d1a';
  const paper = '#fbf8f1';
  c.fillStyle = '#efe8dc';
  c.fillRect(0, 0, CARD_W, CARD_H);
  c.fillStyle = '#d9cfbf';
  for (let y = 7; y < CARD_H; y += 28) for (let x = 7; x < CARD_W; x += 28) {
    c.beginPath();
    c.arc(x, y, 1.4, 0, Math.PI * 2);
    c.fill();
  }

  // Booth sign with a scalloped curtain edge and two lamps
  c.fillStyle = red;
  c.fillRect(0, 0, CARD_W, 170);
  for (let x = 0; x < CARD_W; x += 100) {
    c.beginPath();
    c.arc(x + 50, 170, 50, 0, Math.PI);
    c.fill();
  }
  for (const x of [110, 890]) {
    const glow = c.createRadialGradient(x, 85, 4, x, 85, 52);
    glow.addColorStop(0, '#ffcf3a');
    glow.addColorStop(1, '#ffcf3a00');
    c.fillStyle = glow;
    c.fillRect(x - 60, 25, 120, 120);
    c.fillStyle = '#ffcf3a';
    c.beginPath();
    c.arc(x, 85, 26, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = ink;
    c.lineWidth = 5;
    c.stroke();
  }
  textBlock(c, `FOTO BOOTH · ${d.kicker}`, 500, 66, { font: (s) => `700 ${s}px "Courier Prime", ui-monospace, monospace`, color: paper, size: 44, maxW: 620, spacing: 3, maxLines: 1, upper: true });

  textBlock(c, d.title, 500, 262, { font: (s) => `800 ${s}px Fraunces, Georgia, serif`, color: ink, size: 80, minSize: 52, maxW: 800, maxLines: 2, lineHeight: 1.06 });

  const box = { x: 270, y: 462, w: 460, h: 460 };
  c.fillStyle = ink;
  c.fillRect(box.x + 14, box.y + 14, box.w, box.h);
  c.fillStyle = paper;
  c.fillRect(box.x, box.y, box.w, box.h);
  c.strokeStyle = ink;
  c.lineWidth = 7;
  c.strokeRect(box.x, box.y, box.w, box.h);
  const code = drawQr(c, d.qr, { x: box.x + 10, y: box.y + 10, w: box.w - 20, h: box.h - 20 }, ink, paper, 0);
  // Tape stays on the quiet border, clear of the code itself.
  for (const [x, y, deg] of [[box.x + 34, box.y - 8, -24], [box.x + box.w - 34, box.y - 8, 24]]) {
    c.save();
    c.translate(x, y);
    c.rotate((deg * Math.PI) / 180);
    c.fillStyle = '#f3df98e6';
    c.fillRect(-60, -18, 120, 36);
    c.restore();
  }

  c.setLineDash([12, 9]);
  hairline(c, 150, 985, 850, '#5d544c', 2);
  c.setLineDash([]);
  steps(c, d.steps, 150, 1008, {
    font: (s) => `400 ${s}px "Courier Prime", ui-monospace, monospace`,
    color: ink,
    size: 28,
    maxW: 700,
    gap: 46,
    marker: (i, cy) => {
      c.fillStyle = red;
      c.font = '700 34px "Courier Prime", ui-monospace, monospace';
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillText(`${i + 1}.`, 150, cy);
    },
  });
  c.setLineDash([12, 9]);
  hairline(c, 150, 1172, 850, '#5d544c', 2);
  c.setLineDash([]);

  c.save();
  c.translate(500, 1182);
  c.rotate((-3 * Math.PI) / 180);
  textBlock(c, d.names, 0, 0, { font: (s) => `400 ${s}px "Reenie Beanie", cursive`, color: red, size: 112, maxW: 800, maxLines: 1 });
  c.restore();
  if (d.dateText) textBlock(c, d.dateText, 500, 1346, { font: (s) => `400 ${s}px "Courier Prime", ui-monospace, monospace`, color: '#5d544c', size: 26, maxW: 760, spacing: 2, maxLines: 1, upper: true });
  return code;
}

/** Cozy Home: a little forest world, a wooden signboard on posts, hills and clouds. */
function cozy(c: Ctx, d: CardInput): Rect {
  const brown = '#7a4521';
  const wood = '#9c5c2d';
  const ink = '#304f48';
  const cream = '#fffdf0';
  const text = '#6d5a45';
  const sky = c.createLinearGradient(0, 0, 0, CARD_H);
  sky.addColorStop(0, '#9fd1cd');
  sky.addColorStop(0.7, '#cfe9e3');
  c.fillStyle = sky;
  c.fillRect(0, 0, CARD_W, CARD_H);

  const cloud = (x: number, y: number, s: number) => {
    c.fillStyle = '#ffffffcc';
    for (const [dx, dy, r] of [[0, 0, 46], [52, -18, 58], [112, 0, 48], [58, 12, 52]]) {
      c.beginPath();
      c.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
      c.fill();
    }
  };
  cloud(90, 120, 1.1);
  cloud(700, 70, 1);
  cloud(560, 400, 0.7);

  // Hills and trees
  c.fillStyle = '#6f9a6c';
  c.beginPath();
  c.moveTo(0, 1180);
  c.quadraticCurveTo(250, 1060, 520, 1170);
  c.quadraticCurveTo(780, 1250, 1000, 1120);
  c.lineTo(1000, CARD_H);
  c.lineTo(0, CARD_H);
  c.fill();
  c.fillStyle = '#587957';
  c.beginPath();
  c.moveTo(0, 1260);
  c.quadraticCurveTo(300, 1190, 560, 1270);
  c.quadraticCurveTo(800, 1330, 1000, 1240);
  c.lineTo(1000, CARD_H);
  c.lineTo(0, CARD_H);
  c.fill();
  const tree = (x: number, y: number, s: number) => {
    c.fillStyle = brown;
    c.fillRect(x - 9 * s, y, 18 * s, 50 * s);
    c.fillStyle = '#3f6b45';
    for (const [dy, w] of [[0, 90], [-46, 72], [-88, 52]]) {
      c.beginPath();
      c.moveTo(x - w * s, y + dy * s);
      c.lineTo(x, y + (dy - 70) * s);
      c.lineTo(x + w * s, y + dy * s);
      c.closePath();
      c.fill();
    }
  };
  tree(70, 1150, 1.2);
  tree(930, 1130, 1.3);
  tree(150, 1260, 0.8);

  textBlock(c, d.kicker, 500, 110, { font: (s) => `900 ${s}px Nunito, ui-rounded, sans-serif`, color: ink, size: 28, maxW: 700, spacing: 8, maxLines: 1, upper: true });
  textBlock(c, d.title, 500, 168, { font: (s) => `900 ${s}px Nunito, ui-rounded, sans-serif`, color: ink, size: 82, minSize: 52, maxW: 800, maxLines: 2, lineHeight: 1.08 });

  // Posts and the board
  c.fillStyle = brown;
  c.fillRect(215, 1080, 44, 220);
  c.fillRect(741, 1080, 44, 220);
  const board = { x: 110, y: 470, w: 780, h: 700 };
  c.fillStyle = '#00000022';
  roundRect(c, board.x + 8, board.y + 14, board.w, board.h, 40);
  c.fill();
  c.fillStyle = cream;
  roundRect(c, board.x, board.y, board.w, board.h, 40);
  c.fill();
  c.strokeStyle = wood;
  c.lineWidth = 22;
  roundRect(c, board.x, board.y, board.w, board.h, 40);
  c.stroke();
  c.strokeStyle = brown;
  c.lineWidth = 4;
  roundRect(c, board.x + 11, board.y + 11, board.w - 22, board.h - 22, 30);
  c.stroke();
  for (const [x, y] of [[board.x + 38, board.y + 38], [board.x + board.w - 38, board.y + 38]]) {
    c.fillStyle = brown;
    c.beginPath();
    c.arc(x, y, 9, 0, Math.PI * 2);
    c.fill();
  }

  const code = drawQr(c, d.qr, { x: 280, y: 520, w: 440, h: 440 }, '#2c3e38', '#ffffff', 22);
  steps(c, d.steps, 170, 995, {
    font: (s) => `800 ${s}px Nunito, ui-rounded, sans-serif`,
    color: text,
    size: 27,
    maxW: 600,
    gap: 52,
    marker: (i, cy) => {
      c.fillStyle = '#587957';
      c.beginPath();
      c.arc(205, cy, 19, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = cream;
      c.font = '900 22px Nunito, ui-rounded, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(String(i + 1), 205, cy + 1);
    },
  });

  textBlock(c, d.names, 500, 1312, { font: (s) => `900 ${s}px Nunito, ui-rounded, sans-serif`, color: cream, size: 66, maxW: 800, maxLines: 1, stroke: { color: '#3f6b45', width: 14 } });
  return code;
}

/** Layar Perak: an ivory-and-gold cinema programme with film strips and a framed ticket. */
function layar(c: Ctx, d: CardInput): Rect {
  const gold = '#a8844c';
  const goldDeep = '#7e6133';
  const ink = '#1f1b16';
  const muted = '#6b6357';
  c.fillStyle = '#faf6ef';
  c.fillRect(0, 0, CARD_W, CARD_H);
  c.strokeStyle = gold;
  c.lineWidth = 3;
  c.strokeRect(40, 40, 920, 1334);
  c.lineWidth = 1;
  c.strokeRect(54, 54, 892, 1306);

  for (const y of [74, 1270]) {
    c.fillStyle = '#2b251f';
    c.fillRect(74, y, 852, 70);
    c.fillStyle = '#f4eee3';
    for (let x = 92; x < 900; x += 50) {
      roundRect(c, x, y + 26, 28, 18, 4);
      c.fill();
    }
  }

  textBlock(c, `${d.kicker} · PROGRAM TAYANG`, 500, 172, { font: (s) => `400 ${s}px "IBM Plex Mono", ui-monospace, monospace`, color: goldDeep, size: 26, maxW: 780, spacing: 7, maxLines: 1, upper: true });
  textBlock(c, d.title, 500, 214, { font: (s) => `italic 400 ${s}px "Cormorant Garamond", Georgia, serif`, color: ink, size: 96, maxW: 780, maxLines: 2, lineHeight: 1.0, minSize: 56 });

  const ticket = { x: 215, y: 432, w: 570, h: 580 };
  c.fillStyle = '#f2ebdf';
  roundRect(c, ticket.x, ticket.y, ticket.w, ticket.h, 10);
  c.fill();
  c.strokeStyle = gold;
  c.lineWidth = 3;
  roundRect(c, ticket.x, ticket.y, ticket.w, ticket.h, 10);
  c.stroke();
  c.lineWidth = 1;
  roundRect(c, ticket.x + 14, ticket.y + 14, ticket.w - 28, ticket.h - 28, 6);
  c.stroke();
  textBlock(c, 'ADMIT ONE', 500, ticket.y + 34, { font: (s) => `400 ${s}px "IBM Plex Mono", ui-monospace, monospace`, color: goldDeep, size: 26, maxW: 400, spacing: 9, maxLines: 1 });
  const code = drawQr(c, d.qr, { x: ticket.x + 50, y: ticket.y + 80, w: 470, h: 470 }, ink, '#faf6ef', 6);

  hairline(c, 300, 1042, 450, gold, 2);
  hairline(c, 550, 1042, 700, gold, 2);
  c.fillStyle = gold;
  c.save();
  c.translate(500, 1042);
  c.rotate(Math.PI / 4);
  c.fillRect(-7, -7, 14, 14);
  c.restore();

  steps(c, d.steps, 170, 1068, {
    font: (s) => `400 ${s}px Jost, system-ui, sans-serif`,
    color: muted,
    size: 26,
    maxW: 660,
    gap: 44,
    marker: (i, cy) => {
      c.fillStyle = gold;
      c.font = 'italic 400 34px "Cormorant Garamond", Georgia, serif';
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillText(String(i + 1), 178, cy - 3);
    },
  });
  textBlock(c, d.names, 500, 1206, { font: (s) => `italic 400 ${s}px "Cormorant Garamond", Georgia, serif`, color: goldDeep, size: 46, maxW: 700, maxLines: 1 });
  return code;
}

const DRAWERS: Record<TemplateId, (c: Ctx, d: CardInput) => Rect> = { nusantara, gulungan, bilik, cozy, layar };

/** Draws the whole card and returns where the QR code sits (for a link over it in the PDF). */
export function drawCard(canvas: HTMLCanvasElement, d: CardInput): Rect {
  const scale = canvas.width / CARD_W;
  const c = canvas.getContext('2d')!;
  c.setTransform(scale, 0, 0, scale, 0, 0);
  c.clearRect(0, 0, CARD_W, CARD_H);
  const rect = DRAWERS[d.template](c, d);
  return rect;
}
