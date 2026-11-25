/**
 * Where a guest's picture goes on the couple's event frame.
 *
 * - Frame over photo (the default, for a transparent PNG): the picture runs under the whole frame. Collage
 *   cells go into the biggest clear window the frame leaves, so nothing lands behind a border or name plate.
 * - Photo in front (for a solid frame picture): the frame is drawn first and the picture sits on top of it,
 *   inside the margins the couple set in the CMS.
 */
import type { PhotoInset } from '@shared/types';

/** A rectangle as fractions (0..1) of the finished picture. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FrameLayout {
  front: boolean;
  /** Front: where the photo goes. Behind: the clear window of the frame, or null when the frame leaves no usable window. */
  area: Rect | null;
}

export const FULL_LAYOUT: FrameLayout = { front: false, area: null };

/** Pixels more opaque than this count as "frame" when looking for the clear window. */
const OPAQUE_ALPHA = 64;
const GRID_WIDTH = 60;
/** A window this much of the frame or more is no window at all (the frame is only a thin border). */
const FULL_ENOUGH = 0.9;
const WINDOW_MARGIN = 0.015;

/**
 * The largest axis-aligned rectangle made only of clear cells, found with the histogram method.
 * `alpha` holds one value per grid cell, row by row.
 */
export function largestClearRect(alpha: ArrayLike<number>, gw: number, gh: number, threshold = OPAQUE_ALPHA): Rect | null {
  const heights = new Array<number>(gw).fill(0);
  let best = { area: 0, x: 0, y: 0, w: 0, h: 0 };
  for (let row = 0; row < gh; row++) {
    for (let col = 0; col < gw; col++) heights[col] = alpha[row * gw + col] < threshold ? heights[col] + 1 : 0;
    const stack: number[] = [];
    for (let col = 0; col <= gw; col++) {
      const h = col === gw ? 0 : heights[col];
      while (stack.length && heights[stack[stack.length - 1]] >= h) {
        const height = heights[stack.pop()!];
        const left = stack.length ? stack[stack.length - 1] + 1 : 0;
        const width = col - left;
        if (height * width > best.area) best = { area: height * width, x: left, y: row - height + 1, w: width, h: height };
      }
      stack.push(col);
    }
  }
  return best.area ? { x: best.x / gw, y: best.y / gh, w: best.w / gw, h: best.h / gh } : null;
}

const windows = new WeakMap<HTMLImageElement, Rect | null>();

/** The clear window of a frame image, or null when it has none worth using (or the browser will not let us read it). */
export function frameWindow(img: HTMLImageElement): Rect | null {
  if (windows.has(img)) return windows.get(img)!;
  let found: Rect | null = null;
  try {
    const gw = GRID_WIDTH;
    const gh = Math.max(8, Math.round((GRID_WIDTH * img.naturalHeight) / img.naturalWidth));
    const c = document.createElement('canvas');
    c.width = gw;
    c.height = gh;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, gw, gh);
    const px = ctx.getImageData(0, 0, gw, gh).data;
    const alpha = new Uint8Array(gw * gh);
    for (let i = 0; i < alpha.length; i++) alpha[i] = px[i * 4 + 3];
    const rect = largestClearRect(alpha, gw, gh);
    if (rect && rect.w * rect.h < FULL_ENOUGH) {
      const m = WINDOW_MARGIN;
      found = { x: rect.x + m, y: rect.y + m, w: Math.max(0.1, rect.w - m * 2), h: Math.max(0.1, rect.h - m * 2) };
    }
  } catch {
    found = null;
  }
  windows.set(img, found);
  return found;
}

/** The margins the couple set, as the rectangle left for the photo. */
export const insetRect = (i: PhotoInset): Rect => ({ x: i.left / 100, y: i.top / 100, w: 1 - (i.left + i.right) / 100, h: 1 - (i.top + i.bottom) / 100 });

export function resolveFrameLayout(
  img: HTMLImageElement | null,
  config: { photoInFront?: boolean; photoInset?: PhotoInset } | undefined,
): FrameLayout {
  if (!img) return FULL_LAYOUT;
  if (config?.photoInFront && config.photoInset) return { front: true, area: insetRect(config.photoInset) };
  return { front: false, area: frameWindow(img) };
}
