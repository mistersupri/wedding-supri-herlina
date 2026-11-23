import { describe, expect, it } from 'vitest';
import { buildFramePresets, FRAME_HEIGHT, FRAME_WIDTH, SAFE_TEXT_BOTTOM, STORY_SAFE } from '../../shared/photoFrames.js';
import { aspectOf, isStoryAspect, STORY_ASPECT } from '../../src/features/moments/film/render.js';

const svgOf = (dataUrl: string) => decodeURIComponent(dataUrl.replace('data:image/svg+xml;charset=utf-8,', ''));

describe('event frame presets', () => {
  const presets = buildFramePresets('Arya', 'Nadhira');

  it('are 1080 × 1920, the size and shape of an Instagram Story', () => {
    expect(FRAME_WIDTH / FRAME_HEIGHT).toBeCloseTo(9 / 16, 5);
    expect(presets).toHaveLength(4);
    for (const p of presets) {
      const svg = svgOf(p.dataUrl);
      expect(svg, p.id).toContain('viewBox="0 0 1080 1920"');
      expect(svg, p.id).toContain('width="1080" height="1920"');
    }
  });

  it('keep every line of text out of the areas Instagram covers', () => {
    for (const p of presets) {
      const texts = [...svgOf(p.dataUrl).matchAll(/<text[^>]* y="([\d.]+)"/g)].map((m) => Number(m[1]));
      expect(texts.length, p.id).toBeGreaterThan(0);
      for (const y of texts) {
        expect(y, p.id).toBeGreaterThanOrEqual(STORY_SAFE.top);
        expect(y, p.id).toBeLessThanOrEqual(SAFE_TEXT_BOTTOM);
      }
    }
  });

  it('carry the couple names, escaped', () => {
    const tricky = buildFramePresets('Dewi & <Ayu>', 'Andi "A"');
    for (const p of tricky) {
      const svg = svgOf(p.dataUrl);
      expect(svg).toContain('Dewi &amp; &lt;Ayu&gt; &amp; Andi &quot;A&quot;');
      expect(svg).not.toContain('<Ayu>');
    }
  });
});

describe('aspectOf', () => {
  it('is 4:5 for every style except the event frame', () => {
    for (const f of ['none', 'white', 'black', 'white-caption', 'black-caption'] as const) expect(aspectOf(f, { naturalWidth: 1080, naturalHeight: 1920 })).toBe(0.8);
  });

  it('follows a Story-shaped event frame, and keeps 4:5 for an older 4:5 frame', () => {
    expect(aspectOf('event', { naturalWidth: 1080, naturalHeight: 1920 })).toBeCloseTo(STORY_ASPECT, 5);
    expect(isStoryAspect(aspectOf('event', { naturalWidth: 1080, naturalHeight: 1920 }))).toBe(true);
    expect(aspectOf('event', { naturalWidth: 800, naturalHeight: 1000 })).toBe(0.8);
    expect(isStoryAspect(0.8)).toBe(false);
  });

  it('clamps odd frame shapes between 9:16 and 4:5, and falls back to 4:5 without a frame', () => {
    expect(aspectOf('event', { naturalWidth: 500, naturalHeight: 2000 })).toBeCloseTo(STORY_ASPECT, 5);
    expect(aspectOf('event', { naturalWidth: 2000, naturalHeight: 1000 })).toBe(0.8);
    expect(aspectOf('event', null)).toBe(0.8);
    expect(aspectOf('event', { naturalWidth: 0, naturalHeight: 0 })).toBe(0.8);
  });
});
