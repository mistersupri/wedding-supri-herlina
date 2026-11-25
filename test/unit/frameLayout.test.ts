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
