import { describe, expect, it } from 'vitest';
import { PAPER, buildPdf, mmToPt } from '../../src/features/moments/qrCard/pdf.js';

const latin1 = (b: Uint8Array) => Buffer.from(b).toString('latin1');
const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 0xff, 0xd9]);

describe('buildPdf', () => {
  const page = { widthPt: mmToPt(148), heightPt: mmToPt(210), jpeg, imageWidth: 10, imageHeight: 14, title: 'Kartu QR' };

  it('writes a well-formed file whose cross-reference table points at every object', () => {
    const pdf = buildPdf({ ...page, link: { url: 'https://undangan.example/photo-moments', x: 10, y: 20, w: 100, h: 100 } });
    const text = latin1(pdf);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);

    const xrefAt = Number(/startxref\n(\d+)/.exec(text)![1]);
    expect(text.slice(xrefAt, xrefAt + 4)).toBe('xref');
    const entries = [...text.slice(xrefAt).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
    expect(entries.length).toBe(7); // catalog, pages, page, image, contents, link, info
    entries.forEach((offset, i) => expect(text.slice(offset, offset + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
  });

  it('embeds the JPEG bytes untouched and declares their exact length', () => {
    const pdf = buildPdf(page);
    const text = latin1(pdf);
    expect(text).toContain(`/Length ${jpeg.length} >>`);
    expect(text).toContain(latin1(jpeg));
    expect(text).toContain('/Filter /DCTDecode');
  });

  it('adds a link only when asked', () => {
    expect(latin1(buildPdf(page))).not.toContain('/Annots');
    expect(latin1(buildPdf({ ...page, link: { url: 'https://x.example', x: 0, y: 0, w: 5, h: 5 } }))).toContain('/URI (https://x.example)');
  });

  it('keeps titles with accents and escapes parentheses', () => {
    expect(latin1(buildPdf({ ...page, title: 'Kartu (meja)' }))).toContain('/Title (Kartu \\(meja\\))');
    expect(latin1(buildPdf({ ...page, title: 'Pernikahan Dewi & Andi · Ñandú' }))).toMatch(/\/Title <FEFF[0-9a-f]+>/);
  });
});

describe('paper sizes', () => {
  it('convert millimetres to points', () => {
    expect(mmToPt(25.4)).toBeCloseTo(72, 5);
    expect(PAPER.A4.mm).toEqual([210, 297]);
  });
});
