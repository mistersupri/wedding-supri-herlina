import { describe, expect, it } from 'vitest';
import { insetRect, largestClearRect } from '../../src/features/moments/film/frameLayout.js';

const grid = (rows: string[]) => Uint8Array.from(rows.join('').split('').map((c) => (c === '#' ? 255 : 0)));

describe('frame window', () => {
  it('finds the clear area above a name plate', () => {
    const alpha = grid(['......', '......', '......', '.####.', '......']);
    const r = largestClearRect(alpha, 6, 5)!;
    // 3 clear rows across the full width beat the strips beside the plate.
    expect(r).toEqual({ x: 0, y: 0, w: 1, h: 3 / 5 });
  });

  it('finds the window of a solid border (mori style)', () => {
    const alpha = grid(['######', '#....#', '#....#', '#....#', '######']);
    expect(largestClearRect(alpha, 6, 5)).toEqual({ x: 1 / 6, y: 1 / 5, w: 4 / 6, h: 3 / 5 });
  });

  it('returns null when nothing is clear', () => {
    expect(largestClearRect(grid(['##', '##']), 2, 2)).toBeNull();
  });

  it('turns the couple margins into the photo rectangle', () => {
    expect(insetRect({ top: 10, right: 5, bottom: 20, left: 5 })).toEqual({ x: 0.05, y: 0.1, w: 0.9, h: 0.7 });
  });
});

import { resolveFrameLayout, placedInArea } from '../../src/features/moments/film/frameLayout.js';
import { sheetFor } from '../../src/features/moments/film/sheet.js';

describe('photo area, border and gap settings', () => {
  const img = {} as HTMLImageElement;
  const inset = { top: 10, right: 10, bottom: 30, left: 10 };

  it('places the photo in the couple area for either order of frame and photo', () => {
    expect(placedInArea(resolveFrameLayout(img, { photoInFront: true, photoInset: inset }))).toBe(true);
    const behind = resolveFrameLayout(img, { photoManualArea: true, photoInset: inset });
    expect(behind).toMatchObject({ front: false, manual: true });
    expect(placedInArea(behind)).toBe(true);
  });

  it('carries border, colour and gap, with a default gap', () => {
    const l = resolveFrameLayout(img, { photoManualArea: true, photoInset: inset, photoBorder: 12, photoBorderColor: '#112233', photoGap: 20 });
    expect(l).toMatchObject({ border: 12, borderColor: '#112233', gap: 20 });
    expect(resolveFrameLayout(img, { photoManualArea: true, photoInset: inset }).gap).toBe(38);
  });

  it('shapes the collage sheet like the photo area and honours the gap', () => {
    const layout = resolveFrameLayout(img, { photoManualArea: true, photoInset: inset, photoGap: 0, photoBorder: 20 });
    const wide = sheetFor(2, { frameOn: true, story: true, layout, frameAspect: 9 / 16 });
    expect(wide.inArea).toBe(true);
    expect(wide.spec.width / wide.spec.height).toBeCloseTo((0.8 / 0.6) * (9 / 16), 2);
    expect(wide.spec.border).toBeGreaterThan(0);
    const [a, b] = wide.spec.cells;
    expect(b.y - (a.y + a.h)).toBe(0);
    const spaced = sheetFor(2, { frameOn: true, story: true, layout: { ...layout, gap: 100 }, frameAspect: 9 / 16 }).spec.cells;
    expect(spaced[1].y - (spaced[0].y + spaced[0].h)).toBeGreaterThan(0);
  });
});
