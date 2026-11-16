/**
 * A one-page PDF holding a full-page JPEG, with a clickable link laid over a chosen rectangle.
 * No library: the file is five small objects, a cross-reference table and a trailer.
 */

export interface PdfPage {
  /** Page size in PDF points (1/72 inch). */
  widthPt: number;
  heightPt: number;
  jpeg: Uint8Array;
  /** Pixel size of the JPEG. */
  imageWidth: number;
  imageHeight: number;
  title: string;
  /** Rectangle (in points, origin bottom-left) that opens `url` when clicked. */
  link?: { url: string; x: number; y: number; w: number; h: number };
}

const ascii = (s: string) => new TextEncoder().encode(s);

/** A PDF text string: plain when ASCII, otherwise UTF-16BE in hex, so any title survives. */
function pdfString(text: string) {
  if (/^[\x20-\x7e]*$/.test(text)) return `(${text.replace(/[\\()]/g, '\\$&')})`;
  let hex = 'FEFF';
  for (let i = 0; i < text.length; i++) hex += text.charCodeAt(i).toString(16).padStart(4, '0');
  return `<${hex}>`;
}

const num = (n: number) => (Math.round(n * 100) / 100).toString();

export function buildPdf(page: PdfPage): Uint8Array {
  const { widthPt: W, heightPt: H } = page;
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (chunk: Uint8Array | string) => {
    const bytes = typeof chunk === 'string' ? ascii(chunk) : chunk;
    parts.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, body: (Uint8Array | string)[]) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
    body.forEach(push);
    push('\nendobj\n');
  };

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  object(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
  object(2, ['<< /Type /Pages /Kids [3 0 R] /Count 1 >>']);

  const annots = page.link ? ' /Annots [6 0 R]' : '';
  object(3, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(W)} ${num(H)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R${annots} >>`]);

  object(4, [
    `<< /Type /XObject /Subtype /Image /Width ${page.imageWidth} /Height ${page.imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`,
    page.jpeg,
    '\nendstream',
  ]);

  const content = `q ${num(W)} 0 0 ${num(H)} 0 0 cm /Im0 Do Q`;
  object(5, [`<< /Length ${content.length} >>\nstream\n${content}\nendstream`]);

  let objects = 5;
  if (page.link) {
    const { url, x, y, w, h } = page.link;
    object(6, [`<< /Type /Annot /Subtype /Link /Rect [${num(x)} ${num(y)} ${num(x + w)} ${num(y + h)}] /Border [0 0 0] /A << /S /URI /URI ${pdfString(url)} >> >>`]);
    objects = 6;
  }
  const infoId = objects + 1;
  object(infoId, [`<< /Title ${pdfString(page.title)} /Producer (Undangan Pernikahan) >>`]);

  const xrefAt = length;
  push(`xref\n0 ${infoId + 1}\n0000000000 65535 f \n`);
  for (let id = 1; id <= infoId; id++) push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${infoId + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** Paper sizes in millimetres, portrait. */
export const PAPER = {
  A4: { label: 'A4 poster (210 × 297 mm)', mm: [210, 297] },
  A5: { label: 'A5 kartu meja (148 × 210 mm)', mm: [148, 210] },
  A6: { label: 'A6 kartu kecil (105 × 148 mm)', mm: [105, 148] },
} as const;
export type PaperId = keyof typeof PAPER;

export const mmToPt = (mm: number) => (mm / 25.4) * 72;
