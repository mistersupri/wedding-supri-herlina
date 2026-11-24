/**
 * Photo-strip collages: 2 or 3 shots stacked top to bottom, or 4 in a 2 x 2 grid. The cells are laid out inside a
 * canvas that already has the shape of the finished photo (4:5, or 9:16 for a Story frame), so the darkroom can
 * treat the collage like any single photo: look, grain and the event frame go on top of the whole sheet.
 */

import { ASPECT, STORY_ASPECT } from './render.js';

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
}

/** Sheet width in px. The darkroom scales it down for the preview and for the feed copy. */
const SHEET_WIDTH = 1440;

export function collageSpec(layout: CollageLayout, story: boolean, width = SHEET_WIDTH): CollageSpec {
  const aspect = story ? STORY_ASPECT : ASPECT;
  const height = Math.round(width / aspect);
  if (layout === 1) return { width, height, cells: [{ x: 0, y: 0, w: width, h: height }], cellRatio: aspect };

  const side = Math.round(width * 0.05);
  // A Story keeps clear of the top and bottom, where Instagram puts its own buttons.
  const vertical = story ? Math.round(height * 0.08) : side;
  const gap = Math.round(width * 0.035);
  const innerW = width - side * 2;
  const innerH = height - vertical * 2;

  const cells: Cell[] = [];
  if (layout === 4) {
    const w = Math.floor((innerW - gap) / 2);
    const h = Math.floor((innerH - gap) / 2);
    for (let i = 0; i < 4; i++) cells.push({ x: side + (i % 2) * (w + gap), y: vertical + Math.floor(i / 2) * (h + gap), w, h });
  } else {
    const h = Math.floor((innerH - gap * (layout - 1)) / layout);
    for (let i = 0; i < layout; i++) cells.push({ x: side, y: vertical + i * (h + gap), w: innerW, h });
  }
  return { width, height, cells, cellRatio: cells[0].w / cells[0].h };
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
  ctx.fillStyle = '#fbf8f2';
  ctx.fillRect(0, 0, c.width, c.height);
  shots.forEach((shot, i) => spec.cells[i] && drawCover(ctx, shot, spec.cells[i]));
  return c;
}

export const collageLabel = (n: CollageLayout) => (n === 1 ? '1 foto' : n === 4 ? '4 foto kotak' : `${n} foto ke bawah`);
