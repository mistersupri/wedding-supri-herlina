import { describe, expect, it } from 'vitest';
import { collageSpec } from '../../src/features/moments/film/collage.js';

const overlaps = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('collage layout', () => {
  for (const story of [false, true]) {
    for (const n of [1, 2, 3, 4] as const) {
      it(`${n} photo(s), ${story ? 'story 9:16' : '4:5'}: cells fit the sheet without overlapping`, () => {
        const s = collageSpec(n, story);
        expect(s.cells).toHaveLength(n);
        expect(Math.abs(s.width / s.height - (story ? 9 / 16 : 4 / 5))).toBeLessThan(0.002);
        for (const c of s.cells) {
          expect(c.x).toBeGreaterThanOrEqual(0);
          expect(c.y).toBeGreaterThanOrEqual(0);
          expect(c.x + c.w).toBeLessThanOrEqual(s.width);
          expect(c.y + c.h).toBeLessThanOrEqual(s.height);
        }
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) expect(overlaps(s.cells[i], s.cells[j])).toBe(false);
        expect(s.cellRatio).toBeCloseTo(s.cells[0].w / s.cells[0].h, 5);
      });
    }
  }

  it('stacks 2 and 3 photos top to bottom and puts 4 in a 2 x 2 grid', () => {
    const two = collageSpec(2, false).cells;
    expect(two[0].x).toBe(two[1].x);
    expect(two[1].y).toBeGreaterThan(two[0].y);
    const four = collageSpec(4, false).cells;
    expect(four[0].y).toBe(four[1].y);
    expect(four[2].y).toBeGreaterThan(four[0].y);
    expect(four[1].x).toBeGreaterThan(four[0].x);
  });
});
