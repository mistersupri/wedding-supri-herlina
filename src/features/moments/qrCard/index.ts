import QRCode from 'qrcode';
import type { TemplateId } from '@shared/types';
import { CARD_H, CARD_W, drawCard, type CardPalette } from './draw.js';
import { ensureFonts } from './fonts.js';
import { PAPER, buildPdf, mmToPt, type PaperId } from './pdf.js';

export { PAPER, type PaperId };

export interface CardOptions {
  template: TemplateId;
  /** The CMS colour preset (sogan, wedel, ...); only the Nusantara card uses it. */
  themePreset: string;
  title: string;
  names: string;
  dateText: string;
  url: string;
}

export const DEFAULT_STEPS = ['Pindai kode ini dengan kamera HP', 'Pilih look film, lalu jepret', 'Fotomu langsung masuk galeri dan layar besar'];

/** Reads the invitation's batik palette off a throwaway element that carries the preset's data-theme. */
function readPalette(preset: string): CardPalette {
  const probe = document.createElement('div');
  probe.setAttribute('data-theme', preset);
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const css = getComputedStyle(probe);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const palette = {
    paper: v('--paper', '#f4ecdf'),
    ink: v('--ink', '#1c1a17'),
    inkSoft: v('--ink-soft', '#5b5348'),
    primary: v('--primary', '#6e3b1e'),
    deep: v('--deep', '#1f2338'),
    onDeep: v('--on-deep', '#f4ecdf'),
    gold: v('--prada', v('--prada-on-deep', '#b4862e')),
  };
  probe.remove();
  return palette;
}

function qrMatrix(url: string): boolean[][] {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const data = qr.modules.data;
  return Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => Boolean(data[r * size + c])));
}

const KICKERS: Record<TemplateId, string> = {
  nusantara: 'Kamera tamu',
  gulungan: 'Kamera tamu',
  bilik: 'Kamera tamu',
  cozy: 'Kamera tamu',
  layar: 'Kamera tamu',
};

/** Draws the card for `template` onto `canvas` (any size with the A-series ratio) and returns the QR's position in card units. */
export async function renderCard(canvas: HTMLCanvasElement, o: CardOptions) {
  await ensureFonts(o.template);
  return drawCard(canvas, {
    template: o.template,
    kicker: KICKERS[o.template],
    title: o.title.trim() || 'Abadikan momen bersama kami',
    names: o.names,
    dateText: o.dateText,
    steps: DEFAULT_STEPS,
    url: o.url,
    qr: qrMatrix(o.url),
    palette: readPalette(o.themePreset),
  });
}

/** A print-ready PDF of the card, 300 dpi on the chosen paper, with the QR clickable in PDF viewers. */
export async function makeCardPdf(o: CardOptions, paper: PaperId): Promise<Blob> {
  const [wMm, hMm] = PAPER[paper].mm;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round((wMm / 25.4) * 300);
  canvas.height = Math.round(canvas.width * (CARD_H / CARD_W));
  const qr = await renderCard(canvas, o);

  const jpeg = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Kartu gagal dibuat.'))), 'image/jpeg', 0.93));
  const widthPt = mmToPt(wMm);
  const heightPt = mmToPt(hMm);
  const k = widthPt / CARD_W;
  const pdf = buildPdf({
    widthPt,
    heightPt,
    jpeg: new Uint8Array(await jpeg.arrayBuffer()),
    imageWidth: canvas.width,
    imageHeight: canvas.height,
    title: `Kartu QR kamera tamu - ${o.names}`,
    link: { url: o.url, x: qr.x * k, y: heightPt - (qr.y + qr.h) * k, w: qr.w * k, h: qr.h * k },
  });
  return new Blob([pdf as BlobPart], { type: 'application/pdf' });
}
