import fs from 'fs/promises';

export interface DetectedType {
  kind: 'image' | 'video' | 'audio';
  ext: string;
  mime: string;
}

const ascii = (b: Buffer, start: number, end: number) => b.toString('latin1', start, end);

/**
 * Identify a file from its first bytes. The client-sent mimetype and filename are never trusted:
 * only these formats are accepted, and none of them can run as a page (no SVG, HTML or scripts).
 */
export function detectType(b: Buffer): DetectedType | null {
  if (b.length < 12) return null;

  // Images
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { kind: 'image', ext: 'jpg', mime: 'image/jpeg' };
  if (b[0] === 0x89 && ascii(b, 1, 4) === 'PNG') return { kind: 'image', ext: 'png', mime: 'image/png' };
  if (ascii(b, 0, 3) === 'GIF') return { kind: 'image', ext: 'gif', mime: 'image/gif' };
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP') return { kind: 'image', ext: 'webp', mime: 'image/webp' };

  // ISO base media (ftyp): AVIF/HEIC images, MP4/MOV video, M4A audio
  if (ascii(b, 4, 8) === 'ftyp') {
    const brand = ascii(b, 8, 12);
    if (brand === 'avif' || brand === 'avis') return { kind: 'image', ext: 'avif', mime: 'image/avif' };
    if (['heic', 'heix', 'mif1', 'msf1'].includes(brand)) return { kind: 'image', ext: 'heic', mime: 'image/heic' };
    if (brand === 'M4A ' || brand === 'M4B ') return { kind: 'audio', ext: 'm4a', mime: 'audio/mp4' };
    if (brand === 'qt  ') return { kind: 'video', ext: 'mov', mime: 'video/quicktime' };
    return { kind: 'video', ext: 'mp4', mime: 'video/mp4' };
  }

  // WebM / Matroska (EBML). Browsers record voice notes as audio-only WebM, so the container is
  // reported as audio here and the route decides, from the category, whether that is acceptable.
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { kind: 'video', ext: 'webm', mime: 'video/webm' };

  // Audio
  if (ascii(b, 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return { kind: 'audio', ext: 'mp3', mime: 'audio/mpeg' };
  if (ascii(b, 0, 4) === 'OggS') return { kind: 'audio', ext: 'ogg', mime: 'audio/ogg' };
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WAVE') return { kind: 'audio', ext: 'wav', mime: 'audio/wav' };

  return null;
}

export async function detectFile(path: string): Promise<DetectedType | null> {
  const handle = await fs.open(path, 'r');
  try {
    const head = Buffer.alloc(16);
    const { bytesRead } = await handle.read(head, 0, 16, 0);
    return detectType(head.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
}
