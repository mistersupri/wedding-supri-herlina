/**
 * Turns a source photo plus the guest's choices (a "recipe") into the final 4:5 picture.
 * Every effect is drawn from seeded randomness and sizes relative to the canvas, so the small live
 * preview and the full-size upload come out the same.
 */
import { applyGrade, combineGrade, lookById, NO_EDITS, type Edits } from './looks.js';

export type FrameStyle = 'none' | 'white' | 'black' | 'white-caption' | 'black-caption' | 'event';

export interface Crop {
  /** 1..4, relative to "cover". */
  zoom: number;
  /** -1..1 within the available pan. */
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
}

export interface Recipe {
  crop: Crop;
  look: string;
  strength: number;
  edits: Edits;
  /** 0 = off, 1..5 = dust variant. */
  dust: number;
  /** 0..100 */
  grain: number;
  /** 0 = off, 1..16 = light-leak variant. */
  leak: number;
  stamp: boolean;
  frame: FrameStyle;
  caption: string;
}

export const DUST_VARIANTS = 5;
export const LEAK_VARIANTS = 16;
export const ASPECT = 4 / 5;

export const newRecipe = (look = 'none'): Recipe => ({
  crop: { zoom: 1, x: 0, y: 0, rotation: 0 },
  look,
  strength: 80,
  edits: { ...NO_EDITS },
  dust: 0,
  grain: 0,
  leak: 0,
  stamp: false,
  frame: 'none',
  caption: '',
});

/** Small deterministic PRNG (mulberry32), so a variant always draws the same specks. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The source rotated by 0/90/180/270 degrees, cached per image and angle. */
const rotated = new WeakMap<CanvasImageSource, Map<number, CanvasImageSource>>();
function rotate(src: HTMLCanvasElement | HTMLImageElement, deg: Crop['rotation']): HTMLCanvasElement | HTMLImageElement {
  if (!deg) return src;
  let byAngle = rotated.get(src);
  if (!byAngle) rotated.set(src, (byAngle = new Map()));
  const hit = byAngle.get(deg);
  if (hit) return hit as HTMLCanvasElement;
  const w = 'naturalWidth' in src ? src.naturalWidth : src.width;
  const h = 'naturalHeight' in src ? src.naturalHeight : src.height;
  const c = document.createElement('canvas');
  const turn = deg === 90 || deg === 270;
  c.width = turn ? h : w;
  c.height = turn ? w : h;
  const ctx = c.getContext('2d')!;
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(src, -w / 2, -h / 2);
  byAngle.set(deg, c);
  return c;
}

const sizeOf = (src: HTMLCanvasElement | HTMLImageElement) =>
  'naturalWidth' in src ? { w: src.naturalWidth, h: src.naturalHeight } : { w: src.width, h: src.height };

/** Where the source lands in a rect for a given crop: cover-fit, zoomed, panned. Used by the editor's drag too. */
export function placeCrop(src: { w: number; h: number }, rect: { w: number; h: number }, crop: Crop) {
  const scale = Math.max(rect.w / src.w, rect.h / src.h) * crop.zoom;
  const dw = src.w * scale;
  const dh = src.h * scale;
  const panX = (dw - rect.w) / 2;
  const panY = (dh - rect.h) / 2;
  return { dw, dh, panX, panY, dx: (rect.w - dw) / 2 + crop.x * panX, dy: (rect.h - dh) / 2 + crop.y * panY };
}

export function rotatedSize(src: HTMLCanvasElement | HTMLImageElement, deg: Crop['rotation']) {
  const { w, h } = sizeOf(src);
  return deg === 90 || deg === 270 ? { w: h, h: w } : { w, h };
}

/** Photo area inside the 4:5 canvas for each frame style. Caption frames keep a deeper bottom band. */
function frameLayout(frame: FrameStyle, W: number, H: number) {
  if (frame === 'none' || frame === 'event') return { x: 0, y: 0, w: W, h: H };
  const pad = Math.round(W * 0.045);
  const bottom = frame.endsWith('caption') ? Math.round(H * 0.15) : pad;
  return { x: pad, y: pad, w: W - pad * 2, h: H - pad - bottom };
}

function drawDust(ctx: CanvasRenderingContext2D, variant: number, r: { x: number; y: number; w: number; h: number }) {
  const rand = rng(1000 + variant * 7919);
  const s = r.w / 1000;
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  const specks = 70 + Math.floor(rand() * 90);
  for (let i = 0; i < specks; i++) {
    const light = rand() > 0.3;
    ctx.fillStyle = light ? `rgba(255,252,240,${0.35 + rand() * 0.5})` : `rgba(20,16,10,${0.25 + rand() * 0.4})`;
    const rad = (0.6 + rand() * (rand() > 0.92 ? 4 : 1.6)) * s;
    ctx.beginPath();
    ctx.ellipse(r.x + rand() * r.w, r.y + rand() * r.h, rad, rad * (0.6 + rand() * 0.6), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // A few hairs and a long scratch, like dust on a negative.
  ctx.lineCap = 'round';
  for (let i = 0; i < 3 + Math.floor(rand() * 4); i++) {
    ctx.strokeStyle = `rgba(255,250,235,${0.35 + rand() * 0.35})`;
    ctx.lineWidth = (0.8 + rand()) * s;
    const x = r.x + rand() * r.w;
    const y = r.y + rand() * r.h;
    const len = (20 + rand() * 60) * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
      x + (rand() - 0.5) * len,
      y + (rand() - 0.5) * len,
      x + (rand() - 0.5) * len,
      y + (rand() - 0.5) * len,
      x + (rand() - 0.5) * len * 1.4,
      y + (rand() - 0.5) * len * 1.4,
    );
    ctx.stroke();
  }
  ctx.strokeStyle = `rgba(255,250,235,${0.18 + rand() * 0.2})`;
  ctx.lineWidth = 0.9 * s;
  const sx = r.x + rand() * r.w;
  ctx.beginPath();
  ctx.moveTo(sx, r.y);
  ctx.lineTo(sx + (rand() - 0.5) * 30 * s, r.y + r.h);
  ctx.stroke();
  ctx.restore();
}

let grainTile: HTMLCanvasElement | null = null;
function grainPattern(ctx: CanvasRenderingContext2D, scale: number) {
  if (!grainTile) {
    grainTile = document.createElement('canvas');
    grainTile.width = grainTile.height = 160;
    const g = grainTile.getContext('2d')!;
    const img = g.createImageData(160, 160);
    const rand = rng(42);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (rand() - 0.5) * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  const pattern = ctx.createPattern(grainTile, 'repeat')!;
  pattern.setTransform(new DOMMatrix().scale(scale));
  return pattern;
}

const LEAK_COLORS: [string, string][] = [
  ['255,120,40', '255,60,30'],
  ['255,170,60', '255,90,40'],
  ['255,90,120', '255,40,80'],
  ['255,200,90', '255,140,40'],
  ['220,60,160', '255,110,60'],
  ['255,140,90', '200,40,40'],
  ['255,230,150', '255,160,60'],
  ['255,70,50', '120,20,60'],
];
const LEAK_SPOTS: [number, number, number][] = [
  [0, 0.3, 0.7],
  [1, 0.6, 0.7],
  [0, 0, 0.8],
  [1, 0, 0.75],
  [0, 1, 0.8],
  [1, 1, 0.75],
  [0.5, 0, 0.6],
  [0, 0.65, 0.55],
];

function drawLeak(ctx: CanvasRenderingContext2D, variant: number, r: { x: number; y: number; w: number; h: number }) {
  const [c1, c2] = LEAK_COLORS[(variant - 1) % LEAK_COLORS.length];
  const [fx, fy, size] = LEAK_SPOTS[Math.floor((variant - 1) / 2) % LEAK_SPOTS.length];
  const flip = variant % 2 === 0;
  const cx = r.x + (flip ? 1 - fx : fx) * r.w;
  const cy = r.y + fy * r.h;
  const rad = Math.max(r.w, r.h) * size;
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.globalCompositeOperation = 'screen';
  let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
  g.addColorStop(0, `rgba(${c1},0.85)`);
  g.addColorStop(0.35, `rgba(${c2},0.45)`);
  g.addColorStop(1, `rgba(${c2},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  // A softer second burn along the edge, like light creeping past the film door.
  const ex = flip ? r.x + r.w : r.x;
  g = ctx.createLinearGradient(ex, 0, flip ? ex - r.w * 0.35 : ex + r.w * 0.35, 0);
  g.addColorStop(0, `rgba(${c1},0.4)`);
  g.addColorStop(1, `rgba(${c1},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

function drawStamp(ctx: CanvasRenderingContext2D, r: { x: number; y: number; w: number; h: number }, date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const text = `'${String(date.getFullYear()).slice(-2)} ${pad(date.getMonth() + 1)} ${pad(date.getDate())}`;
  const size = r.w * 0.055;
  ctx.save();
  ctx.font = `${size}px VT323, "Courier New", monospace`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(255,110,20,0.9)';
  ctx.shadowBlur = size * 0.35;
  ctx.fillStyle = '#ff9a3c';
  ctx.fillText(text, r.x + r.w * 0.94, r.y + r.h * 0.94);
  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, amount: number, r: { x: number; y: number; w: number; h: number }) {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const g = ctx.createRadialGradient(cx, cy, Math.min(r.w, r.h) * 0.35, cx, cy, Math.hypot(r.w, r.h) * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${0.75 * amount})`);
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
}

export interface RenderOptions {
  width: number;
  /** Optional overlay drawn over everything (the couple's event frame). */
  eventFrame?: HTMLImageElement | null;
  date?: Date;
  /** Skip grading (used while dragging, for speed). */
  fast?: boolean;
}

/** Render `recipe` applied to `source` into a canvas `width` px wide (4:5). */
export function renderPhoto(source: HTMLCanvasElement | HTMLImageElement, recipe: Recipe, opts: RenderOptions, target?: HTMLCanvasElement) {
  const W = Math.round(opts.width);
  const H = Math.round(W / ASPECT);
  const canvas = target ?? document.createElement('canvas');
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: !opts.fast })!;
  ctx.globalCompositeOperation = 'source-over';

  const frame = recipe.frame === 'event' && !opts.eventFrame ? 'none' : recipe.frame;
  const r = frameLayout(frame, W, H);
  const dark = frame.startsWith('black');
  ctx.fillStyle = dark ? '#111110' : '#fbfaf6';
  ctx.fillRect(0, 0, W, H);

  // Photo, cropped into its area.
  const src = rotate(source, recipe.crop.rotation);
  const p = placeCrop(sizeOf(src), r, recipe.crop);
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, r.x + p.dx, r.y + p.dy, p.dw, p.dh);
  ctx.restore();

  const grade = combineGrade(lookById(recipe.look), recipe.strength, recipe.edits);
  if (!opts.fast) {
    const img = ctx.getImageData(r.x, r.y, r.w, r.h);
    applyGrade(img.data, grade);
    ctx.putImageData(img, r.x, r.y);
  }
  if (grade.vignette > 0) drawVignette(ctx, grade.vignette, r);
  if (recipe.leak) drawLeak(ctx, recipe.leak, r);
  if (recipe.grain > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = (recipe.grain / 100) * 0.55;
    ctx.fillStyle = grainPattern(ctx, Math.max(0.5, W / 1400));
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
  }
  if (recipe.dust) drawDust(ctx, recipe.dust, r);
  if (recipe.stamp) drawStamp(ctx, r, opts.date ?? new Date());

  if (frame.endsWith('caption') && recipe.caption.trim()) {
    const size = W * 0.052;
    ctx.save();
    ctx.fillStyle = dark ? '#f3eee2' : '#2a2620';
    ctx.font = `italic ${size}px Fraunces, Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(recipe.caption.trim().slice(0, 60), W / 2, r.y + r.h + (H - r.y - r.h) / 2, W * 0.9);
    ctx.restore();
  }
  if (frame === 'event' && opts.eventFrame) ctx.drawImage(opts.eventFrame, 0, 0, W, H);
  return canvas;
}

/** A canvas-backed copy of an image, downscaled so its long side is at most `max` px. */
export function downscale(src: HTMLCanvasElement | HTMLImageElement, max: number) {
  const { w, h } = sizeOf(src);
  const k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * k);
  c.height = Math.round(h * k);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

export const toBlob = (canvas: HTMLCanvasElement, quality = 0.9) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Foto gagal diproses.'))), 'image/jpeg', quality),
  );

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'));
    img.src = src;
  });
}

/** Draws a small sunny landscape, the sample the CMS shows each look on. */
export function sampleScene(width = 160) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = Math.round(width / ASPECT);
  const ctx = c.getContext('2d')!;
  const { width: W, height: H } = c;
  let g = ctx.createLinearGradient(0, 0, 0, H * 0.6);
  g.addColorStop(0, '#7fb2e5');
  g.addColorStop(1, '#e8eef0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(W * 0.72, H * 0.22, W * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a9aa6';
  ctx.beginPath();
  ctx.moveTo(0, H * 0.55);
  ctx.lineTo(W * 0.3, H * 0.32);
  ctx.lineTo(W * 0.55, H * 0.5);
  ctx.lineTo(W * 0.8, H * 0.36);
  ctx.lineTo(W, H * 0.52);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();
  g = ctx.createLinearGradient(0, H * 0.55, 0, H);
  g.addColorStop(0, '#6f9a4a');
  g.addColorStop(1, '#3f6a2c');
  ctx.fillStyle = g;
  ctx.fillRect(0, H * 0.58, W, H);
  ctx.fillStyle = '#2f4f2a';
  for (const [x, s] of [
    [0.2, 1],
    [0.32, 0.7],
    [0.82, 0.9],
  ]) {
    ctx.beginPath();
    ctx.arc(W * x, H * 0.62, W * 0.07 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}
