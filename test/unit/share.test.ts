import { describe, expect, it } from 'vitest';
import { absoluteImage, guestFromQuery, shareTags, withShareTags } from '../../server/http/share.js';

const info = { groomShortName: 'Arya', brideShortName: 'Nadhira', weddingDate: '2026-12-20T03:00:00.000Z', image: '/uploads/hero/a.jpg' };

describe('link preview tags', () => {
  it('names the couple, the date and the picture', () => {
    const tags = shareTags(info, 'https://undangan.id', '/');
    expect(tags).toContain('Undangan Pernikahan Arya &amp; Nadhira');
    expect(tags).toContain('Minggu, 20 Desember 2026');
    expect(tags).toContain('og:image" content="https://undangan.id/uploads/hero/a.jpg"');
  });

  it('greets a guest by name and escapes anything odd in it', () => {
    const tags = shareTags(info, 'https://undangan.id', '/?to=x', 'Budi "<b>"');
    expect(tags).toContain('Kepada Yth. Budi &quot;&lt;b&gt;&quot;');
    expect(tags).not.toContain('<b>');
  });

  it('leaves the picture out when it cannot be fetched by others', () => {
    expect(absoluteImage('data:image/png;base64,AAA', 'https://x.id')).toBe('');
    expect(shareTags({ ...info, image: '' }, 'https://x.id', '/')).not.toContain('og:image');
    expect(absoluteImage('https://cdn.id/a.jpg', 'https://x.id')).toBe('https://cdn.id/a.jpg');
  });

  it('replaces the generic tags in index.html instead of adding second ones', () => {
    const html = '<head><title>Undangan Pernikahan</title><meta name="description" content="x" /><meta property="og:title" content="old" /></head>';
    const out = withShareTags(html, info, 'https://x.id', '/');
    expect(out.match(/<title>/g)).toHaveLength(1);
    expect(out.match(/og:title/g)).toHaveLength(1);
    expect(out).not.toContain('content="old"');
  });

  it('reads and trims the guest name from the query', () => {
    expect(guestFromQuery('  Budi   Santoso ')).toBe('Budi Santoso');
    expect(guestFromQuery(['a'])).toBe('');
  });
});
