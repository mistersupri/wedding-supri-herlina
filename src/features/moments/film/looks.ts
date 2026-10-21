/**
 * Film looks and the colour grade behind them. A look is a set of grade parameters; the strength
 * slider scales every parameter from neutral, so 0 is the untouched photo and 100 the full look.
 * Grading runs on canvas pixels (see applyGrade), so preview and upload are identical.
 */

type RGB = [number, number, number];

export interface Grade {
  /** Stops of exposure. */
  exposure?: number;
  /** -1..1 */
  contrast?: number;
  saturation?: number;
  /** Warm (+) / cool (-). */
  temp?: number;
  /** Green (+) / magenta (-). */
  tint?: number;
  /** Lifts the blacks into a matte finish, 0..1. */
  fade?: number;
  shadows?: number;
  highlights?: number;
  /** 0..1, how far towards black and white. */
  mono?: number;
  /** Per-channel lift/gain/gamma, 0-centred offsets (gain and gamma 0 = neutral). */
  lift?: RGB;
  gain?: RGB;
  gamma?: RGB;
  /** Colour pushed into shadows and highlights. */
  splitShadow?: RGB;
  splitHighlight?: RGB;
  /** 0..1 darkening towards the corners. */
  vignette?: number;
}

export interface Look {
  id: string;
  code: string;
  name: string;
  group: LookGroup;
  grade: Grade;
}

export type LookGroup = 'asli' | 'terang' | 'kalem' | 'hangat' | 'nyeleneh';

export const LOOK_GROUPS: { id: LookGroup; label: string }[] = [
  { id: 'terang', label: 'Terang' },
  { id: 'kalem', label: 'Kalem' },
  { id: 'hangat', label: 'Hangat' },
  { id: 'nyeleneh', label: 'Nyeleneh' },
];

export const NO_LOOK: Look = { id: 'none', code: '00', name: 'Asli', group: 'asli', grade: {} };

export const LOOKS: Look[] = [
  NO_LOOK,
  // Terang: bright, airy.
  {
    id: 'sekali',
    code: 'A1',
    name: 'Sekali Pakai',
    group: 'terang',
    grade: { temp: 0.22, contrast: 0.14, saturation: 0.08, fade: 0.18, lift: [0.03, 0.02, 0], gain: [0.03, 0, -0.05], vignette: 0.25 },
  },
  {
    id: 'fajar',
    code: 'A2',
    name: 'Fajar',
    group: 'terang',
    grade: { exposure: 0.12, tint: -0.14, fade: 0.24, saturation: -0.08, splitHighlight: [0.05, 0.01, 0.04] },
  },
  {
    id: 'pasir',
    code: 'A3',
    name: 'Pasir',
    group: 'terang',
    grade: { temp: 0.18, saturation: -0.25, fade: 0.32, contrast: -0.04, lift: [0.03, 0.025, 0.01] },
  },
  {
    id: 'senja',
    code: 'A4',
    name: 'Senja',
    group: 'terang',
    grade: { temp: 0.32, contrast: 0.1, saturation: 0.1, gain: [0.05, -0.01, -0.1], vignette: 0.2 },
  },
  {
    id: 'gurun',
    code: 'A5',
    name: 'Gurun',
    group: 'terang',
    grade: { contrast: 0.18, saturation: 0.05, splitShadow: [-0.04, 0.03, 0.06], splitHighlight: [0.07, 0.03, -0.04] },
  },
  { id: 'kabut', code: 'A6', name: 'Kabut', group: 'terang', grade: { exposure: 0.15, contrast: -0.2, fade: 0.4, saturation: -0.15 } },
  // Kalem: muted, cool, quiet.
  {
    id: 'teduh',
    code: 'B1',
    name: 'Teduh',
    group: 'kalem',
    grade: { temp: -0.1, tint: 0.08, saturation: -0.22, fade: 0.2, shadows: 0.15 },
  },
  { id: 'rembulan', code: 'B2', name: 'Rembulan', group: 'kalem', grade: { mono: 1, contrast: 0.12, fade: 0.14, vignette: 0.3 } },
  {
    id: 'telaga',
    code: 'B3',
    name: 'Telaga',
    group: 'kalem',
    grade: { temp: -0.24, contrast: 0.06, saturation: -0.05, lift: [0, 0.02, 0.05] },
  },
  {
    id: 'malam',
    code: 'B4',
    name: 'Malam',
    group: 'kalem',
    grade: { exposure: -0.15, contrast: 0.24, saturation: -0.2, splitShadow: [-0.02, 0.01, 0.07], vignette: 0.45 },
  },
  { id: 'kopi', code: 'B5', name: 'Kopi', group: 'kalem', grade: { temp: 0.18, saturation: -0.35, fade: 0.3, gain: [0, -0.04, -0.14] } },
  // Hangat: warm, sunny.
  { id: 'sawo', code: 'C1', name: 'Sawo', group: 'hangat', grade: { temp: 0.28, tint: -0.05, contrast: 0.15, saturation: 0.15 } },
  {
    id: 'kemarau',
    code: 'C2',
    name: 'Kemarau',
    group: 'hangat',
    grade: { temp: 0.4, contrast: 0.2, saturation: -0.05, highlights: -0.2, vignette: 0.2 },
  },
  {
    id: 'jeruk',
    code: 'C3',
    name: 'Jeruk',
    group: 'hangat',
    grade: { temp: 0.24, tint: 0.1, saturation: 0.25, gain: [0.03, 0.03, -0.06] },
  },
  {
    id: 'mentari',
    code: 'C4',
    name: 'Mentari',
    group: 'hangat',
    grade: { exposure: 0.1, temp: 0.3, saturation: 0.2, highlights: 0.1, splitHighlight: [0.06, 0.03, -0.02] },
  },
  {
    id: 'indie',
    code: 'C5',
    name: 'Indie',
    group: 'hangat',
    grade: { contrast: 0.2, saturation: 0.3, splitShadow: [-0.03, 0.03, 0.05], splitHighlight: [0.06, 0.05, -0.04] },
  },
  {
    id: 'indie-pekat',
    code: 'C6',
    name: 'Indie Pekat',
    group: 'hangat',
    grade: { contrast: 0.34, saturation: 0.55, splitShadow: [-0.05, 0.05, 0.08], splitHighlight: [0.09, 0.07, -0.06], vignette: 0.3 },
  },
  // Nyeleneh: odd on purpose.
  {
    id: 'magenta',
    code: 'D1',
    name: 'Magenta',
    group: 'nyeleneh',
    grade: { tint: -0.35, fade: 0.15, splitHighlight: [0.06, -0.02, 0.06] },
  },
  {
    id: 'nostalgia',
    code: 'D2',
    name: 'Nostalgia',
    group: 'nyeleneh',
    grade: { temp: 0.15, tint: 0.1, fade: 0.45, saturation: -0.2, contrast: -0.1, lift: [0.05, 0.04, 0.02], vignette: 0.35 },
  },
  { id: 'doff', code: 'D3', name: 'Doff', group: 'nyeleneh', grade: { fade: 0.5, contrast: -0.15, saturation: -0.1 } },
];

export const lookById = (id: string | undefined) => LOOKS.find((l) => l.id === id) ?? NO_LOOK;

/** The looks a guest may pick: the couple's selection (empty means all), always with "Asli". */
export function availableLooks(enabled: string[]) {
  if (!enabled.length) return LOOKS;
  return LOOKS.filter((l) => l.id === 'none' || enabled.includes(l.id));
}

/** Manual adjustments, each -100..100 (fade and vignette 0..100). */
export interface Edits {
  brightness: number;
  contrast: number;
  warmth: number;
  tint: number;
  shadows: number;
  highlights: number;
  saturation: number;
  fade: number;
  vignette: number;
}

export const EDIT_FIELDS: { key: keyof Edits; label: string; min: number }[] = [
  { key: 'brightness', label: 'Terang', min: -100 },
  { key: 'contrast', label: 'Kontras', min: -100 },
  { key: 'warmth', label: 'Hangat', min: -100 },
  { key: 'tint', label: 'Rona', min: -100 },
  { key: 'shadows', label: 'Bayangan', min: -100 },
  { key: 'highlights', label: 'Sorotan', min: -100 },
  { key: 'saturation', label: 'Saturasi', min: -100 },
  { key: 'fade', label: 'Pudar', min: 0 },
  { key: 'vignette', label: 'Vinyet', min: 0 },
];

export const NO_EDITS: Edits = {
  brightness: 0,
  contrast: 0,
  warmth: 0,
  tint: 0,
  shadows: 0,
  highlights: 0,
  saturation: 0,
  fade: 0,
  vignette: 0,
};

const add3 = (a: RGB | undefined, b: RGB | undefined, k = 1): RGB => [
  (a?.[0] ?? 0) + (b?.[0] ?? 0) * k,
  (a?.[1] ?? 0) + (b?.[1] ?? 0) * k,
  (a?.[2] ?? 0) + (b?.[2] ?? 0) * k,
];

/** The look at `strength` (0..100), plus the manual edits on top. */
export function combineGrade(look: Look, strength: number, edits: Edits): Required<Grade> {
  const k = Math.max(0, Math.min(100, strength)) / 100;
  const g = look.grade;
  const e = (v: number) => v / 100;
  return {
    exposure: (g.exposure ?? 0) * k + e(edits.brightness) * 0.6,
    contrast: (g.contrast ?? 0) * k + e(edits.contrast) * 0.5,
    saturation: (g.saturation ?? 0) * k + e(edits.saturation) * 0.8,
    temp: (g.temp ?? 0) * k + e(edits.warmth) * 0.45,
    tint: (g.tint ?? 0) * k + e(edits.tint) * 0.35,
    fade: Math.min(1, (g.fade ?? 0) * k + e(edits.fade) * 0.6),
    shadows: (g.shadows ?? 0) * k + e(edits.shadows) * 0.6,
    highlights: (g.highlights ?? 0) * k + e(edits.highlights) * 0.6,
    mono: (g.mono ?? 0) * k,
    lift: add3(undefined, g.lift, k),
    gain: add3(undefined, g.gain, k),
    gamma: add3(undefined, g.gamma, k),
    splitShadow: add3(undefined, g.splitShadow, k),
    splitHighlight: add3(undefined, g.splitHighlight, k),
    vignette: Math.min(1, (g.vignette ?? 0) * k + e(edits.vignette) * 0.8),
  };
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Grade pixels in place. Per-channel work (exposure, white balance, lift/gain/gamma, contrast) is
 * baked into three 256-entry tables; luminance-dependent work runs per pixel.
 */
export function applyGrade(data: Uint8ClampedArray, grade: Required<Grade>) {
  const luts = [0, 1, 2].map((c) => {
    const lut = new Float32Array(256);
    const wb = c === 0 ? grade.temp * 0.12 : c === 2 ? -grade.temp * 0.12 : grade.tint * 0.1;
    const exp = 2 ** grade.exposure;
    const gamma = 1 + grade.gamma[c];
    for (let i = 0; i < 256; i++) {
      let v = clamp01((i / 255) * exp + wb);
      v = (1 + grade.gain[c]) * v ** (1 / gamma) + grade.lift[c] * (1 - v);
      v = (v - 0.5) * (1 + grade.contrast) + 0.5;
      lut[i] = v;
    }
    return lut;
  });
  const [lr, lg, lb] = luts;
  const { saturation, mono, shadows, highlights, fade, splitShadow: ss, splitHighlight: sh } = grade;
  const fadeMul = 1 - fade * 0.22;
  const fadeAdd = fade * 0.1;
  for (let i = 0; i < data.length; i += 4) {
    let r = lr[data[i]];
    let g = lg[data[i + 1]];
    let b = lb[data[i + 2]];
    let lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (shadows || highlights) {
      const dark = 1 - clamp01(lum);
      const lift = shadows * 0.35 * dark * dark * dark + highlights * 0.3 * lum * lum * lum;
      r += lift;
      g += lift;
      b += lift;
      lum += lift;
    }
    const s = (1 + saturation) * (1 - mono);
    r = lum + (r - lum) * s;
    g = lum + (g - lum) * s;
    b = lum + (b - lum) * s;
    const dark = 1 - clamp01(lum);
    const light = clamp01(lum);
    r += ss[0] * dark + sh[0] * light;
    g += ss[1] * dark + sh[1] * light;
    b += ss[2] * dark + sh[2] * light;
    data[i] = clamp01(r * fadeMul + fadeAdd) * 255;
    data[i + 1] = clamp01(g * fadeMul + fadeAdd) * 255;
    data[i + 2] = clamp01(b * fadeMul + fadeAdd) * 255;
  }
}
