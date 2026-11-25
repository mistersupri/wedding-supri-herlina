import { describe, expect, it } from 'vitest';
import { phoneCell, toCsv } from '../../server/services/csv.js';

describe('toCsv', () => {
  it('starts with a byte-order mark and ends rows with CRLF', () => {
    const out = toCsv(['A', 'B'], [['x', 1]]);
    expect(out.startsWith('﻿')).toBe(true);
    expect(out).toBe('﻿A,B\r\nx,1\r\n');
  });

  it('quotes commas, quotes and line breaks', () => {
    const out = toCsv(['H'], [['a,b'], ['say "hi"'], ['two\nlines']]);
    expect(out).toContain('"a,b"');
    expect(out).toContain('"say ""hi"""');
    expect(out).toContain('"two\nlines"');
  });

  it('writes booleans in Indonesian and empty cells for null', () => {
    expect(toCsv(['a', 'b', 'c'], [[true, false, null]])).toContain('Ya,Tidak,');
  });

  it('defuses spreadsheet formulas in text, but leaves numbers alone', () => {
    const out = toCsv(['H'], [['=SUM(A1)'], ['+62'], ['-1'], ['@cmd'], [-5]]);
    expect(out).toContain("'=SUM(A1)");
    expect(out).toContain("'+62");
    expect(out).toContain("'-1");
    expect(out).toContain("'@cmd");
    expect(out).toMatch(/\r\n-5\r\n$/);
  });
});

describe('phoneCell', () => {
  it('drops the plus sign and stray characters', () => {
    expect(phoneCell('+62 812-3456 (rumah)')).toBe('62 812-3456');
    expect(phoneCell(undefined)).toBe('');
  });
});
