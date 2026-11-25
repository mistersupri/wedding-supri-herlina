import { describe, expect, it } from 'vitest';
import { acceptAttr, checkFile, formatBytes, kindOf, kindOfUrl, partitionFiles } from '../../src/lib/files.js';

const f = (name: string, type: string, mb = 1) => ({ name, type, size: Math.round(mb * 1024 * 1024) });

describe('kindOf', () => {
  it('uses the MIME type, then the extension', () => {
    expect(kindOf(f('a.jpg', 'image/jpeg'))).toBe('image');
    expect(kindOf(f('lagu.mp3', ''))).toBe('audio');
    expect(kindOf(f('IMG_1.HEIC', ''))).toBe('image');
    expect(kindOf(f('klip.mov', 'video/quicktime'))).toBe('video');
    expect(kindOf(f('catatan.pdf', 'application/pdf'))).toBeNull();
  });

  it('reads the kind of an uploaded URL', () => {
    expect(kindOfUrl('/uploads/hero/a.webm')).toBe('video');
    expect(kindOfUrl('https://x.id/lagu.mp3?x=1')).toBe('audio');
    expect(kindOfUrl('/uploads/general/b.png')).toBe('image');
    expect(kindOfUrl('https://x.id/halaman')).toBeNull();
  });
});

describe('checkFile', () => {
  const images = { kinds: ['image' as const] };
  it('accepts a file of an allowed kind within the size', () => {
    expect(checkFile(f('a.png', 'image/png', 3), images)).toBeNull();
  });
  it('names the problem for the wrong kind', () => {
    expect(checkFile(f('lagu.mp3', 'audio/mpeg'), images)).toMatch(/bukan foto/);
    expect(checkFile(f('a.pdf', 'application/pdf'), { kinds: ['image', 'video'] })).toMatch(/foto atau video/);
  });
  it('enforces the per-kind size limit', () => {
    expect(checkFile(f('besar.mp4', 'video/mp4', 150), { kinds: ['video'] })).toMatch(/Batasnya 100 MB/);
    expect(checkFile(f('lagu.mp3', 'audio/mpeg', 12), { kinds: ['audio'], maxMB: { audio: 10 } })).toMatch(/Batasnya 10 MB/);
  });
  it('refuses empty files', () => {
    expect(checkFile({ name: 'a.png', type: 'image/png', size: 0 }, images)).toMatch(/kosong/);
  });
});

describe('helpers', () => {
  it('partitions a mixed drop', () => {
    const { accepted, errors } = partitionFiles([f('a.jpg', 'image/jpeg'), f('b.pdf', 'application/pdf'), f('c.png', 'image/png')], { kinds: ['image'] });
    expect(accepted.map((x) => x.name)).toEqual(['a.jpg', 'c.png']);
    expect(errors).toHaveLength(1);
  });
  it('formats sizes and accept attributes', () => {
    expect(formatBytes(900)).toBe('900 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1,5 MB');
    expect(formatBytes(40 * 1024 * 1024)).toBe('40 MB');
    expect(acceptAttr(['image', 'video'])).toBe('image/*,video/*');
  });
});
