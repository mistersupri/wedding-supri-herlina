/**
 * Photo-strip collages: 2 or 3 shots stacked top to bottom, or 4 in a 2 x 2 grid. The cells are laid out inside a
 * canvas that already has the shape of the finished photo (4:5, or 9:16 for a Story frame), so the darkroom can
 * treat the collage like any single photo: look, grain and the event frame go on top of the whole sheet.
 */

import { ASPECT, STORY_ASPECT } from './render.js';
import type { Rect } from './frameLayout.js';

export type CollageLayout = 1 | 2 | 3 | 4;
export const COLLAGE_LAYOUTS: CollageLayout[] = [1, 2, 3, 4];

export interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CollageSpec {
  width: number;
  height: number;
  cells: Cell[];
  /** Width over height of one cell: the shape the viewfinder guide shows for each shot. */
  cellRatio: number;
  /** Border around each cell in sheet pixels, and its colour. */
  border: number;
  borderColor: string;
  transparent: boolean;
}

/** Sheet width in px. The darkroom scales it down for the preview and for the feed copy. */
const SHEET_WIDTH = 1440;

export interface CollageOptions {
  /** Shape of the sheet when it is neither 4:5 nor a Story (a photo area in front of a frame). */
  aspect?: number;
  /** The clear window of the couple's frame, as fractions of the sheet: the cells stay inside it, so no shot ends up behind a border. */
  window?: Rect | null;
  /** Gap between photos and border around each, in px on a 1080 px wide sheet. */
  gap?: number;
  border?: number;
  borderColor?: string;
  /** Leave the sheet's background clear, so the frame shows through the gaps (photo placed in the couple's own area). */
  transparent?: boolean;
}

export function collageSpec(layout: CollageLayout, story: boolean, width = SHEET_WIDTH, options: CollageOptions = {}): CollageSpec {
  const aspect = options.aspect ?? (story ? STORY_ASPECT : ASPECT);
  const height = Math.round(width / aspect);
  if (layout === 1) return { width, height, cells: [{ x: 0, y: 0, w: width, h: height }], cellRatio: aspect, border: 0, borderColor: '#FFFFFF', transparent: false };

  const gap = Math.round((width * (options.gap ?? 38)) / 1080);
  const border = Math.round((width * (options.border ?? 0)) / 1080);
  const borderColor = options.borderColor ?? '#FFFFFF';
  // The usable region: a clear window of the frame, else the whole sheet with a margin (a Story also keeps clear of
  // the top and bottom, where Instagram puts its own buttons).
  const win = options.window;
  const side = Math.round(width * (win ? 0.03 : 0.05));
  const vertical = win ? Math.round(width * 0.03) : story ? Math.round(height * 0.08) : side;
  const region = win
    ? { x: Math.round(win.x * width), y: Math.round(win.y * height), w: Math.round(win.w * width), h: Math.round(win.h * height) }
    : { x: 0, y: 0, w: width, h: height };
  const innerW = region.w - side * 2;
  const innerH = region.h - vertical * 2;
  const left = region.x + side;
  const top = region.y + vertical;

  const cells: Cell[] = [];
  if (layout === 4) {
    const w = Math.floor((innerW - gap) / 2);
    const h = Math.floor((innerH - gap) / 2);
    for (let i = 0; i < 4; i++) cells.push({ x: left + (i % 2) * (w + gap), y: top + Math.floor(i / 2) * (h + gap), w, h });
  } else {
    const h = Math.floor((innerH - gap * (layout - 1)) / layout);
    for (let i = 0; i < layout; i++) cells.push({ x: left, y: top + i * (h + gap), w: innerW, h });
  }
  return { width, height, cells, cellRatio: cells[0].w / cells[0].h, border, borderColor, transparent: Boolean(options.transparent) };
}

type Source = HTMLCanvasElement | HTMLImageElement;
const sizeOf = (s: Source) => ('naturalWidth' in s ? { w: s.naturalWidth, h: s.naturalHeight } : { w: s.width, h: s.height });

/** Fill the rectangle with `source`, centred and cropped to cover it. */
export function drawCover(ctx: CanvasRenderingContext2D, source: Source, cell: Cell) {
  const { w, h } = sizeOf(source);
  const scale = Math.max(cell.w / w, cell.h / h);
  const sw = cell.w / scale;
  const sh = cell.h / scale;
  ctx.drawImage(source, (w - sw) / 2, (h - sh) / 2, sw, sh, cell.x, cell.y, cell.w, cell.h);
}

/** Crop a shot to one cell's shape, at the size it will have on the sheet. */
export function cropToCell(source: Source, cell: Cell): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = cell.w;
  c.height = cell.h;
  drawCover(c.getContext('2d')!, source, { x: 0, y: 0, w: cell.w, h: cell.h });
  return c;
}

/** Lay the cropped shots onto a paper-white sheet. */
export function composeCollage(spec: CollageSpec, shots: HTMLCanvasElement[]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = spec.width;
  c.height = spec.height;
  const ctx = c.getContext('2d')!;
  if (!spec.transparent) {
    ctx.fillStyle = '#fbf8f2';
    ctx.fillRect(0, 0, c.width, c.height);
  }
  shots.forEach((shot, i) => {
    const cell = spec.cells[i];
    if (!cell) return;
    if (spec.border > 0) {
      ctx.fillStyle = spec.borderColor;
      ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
    }
    const b = Math.min(spec.border, Math.floor(Math.min(cell.w, cell.h) / 4));
    drawCover(ctx, shot, { x: cell.x + b, y: cell.y + b, w: cell.w - b * 2, h: cell.h - b * 2 });
  });
  return c;
}

export const collageLabel = (n: CollageLayout) => (n === 1 ? '1 foto' : n === 4 ? '4 foto kotak' : `${n} foto ke bawah`);
