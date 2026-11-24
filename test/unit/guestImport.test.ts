import { describe, expect, it } from 'vitest';
import { parseGuestRows, parseGuestLinesWithIssues } from '../../src/components/cms/guests/GuestForm.js';
import { parseDelimited } from '../../src/lib/xlsx.js';

describe('guest import rows', () => {
  it('maps columns by their titles, in any order and with common aliases', () => {
    const { guests, hasHeader, issues } = parseGuestRows([
      ['No', 'Nama Tamu', 'Grup', 'Jumlah Kursi', 'No HP', 'Meja'],
      ['1', 'Andi Wijaya', 'Keluarga', '3', '812345678901', 'A1'],
      ['2', 'Rina', '', '', '', ''],
    ].map((r) => r.slice(1)));
    expect(hasHeader).toBe(true);
    expect(issues).toEqual([]);
    expect(guests[0]).toMatchObject({ name: 'Andi Wijaya', category: 'Keluarga', pax: 3, phone: '0812-3456-78901', tableNumber: 'A1' });
    expect(guests[1]).toMatchObject({ name: 'Rina', category: 'Umum', pax: 2, phone: '' });
  });

  it('falls back to the template order without titles and reports unreadable cells', () => {
    const { guests, issues, hasHeader } = parseGuestRows([
      ['Budi', 'VIP', '99', 'abc', 'B2'],
      ['', 'Umum'],
    ]);
    expect(hasHeader).toBe(false);
    expect(guests).toHaveLength(1);
    expect(guests[0]).toMatchObject({ name: 'Budi', category: 'VIP', pax: 2, phone: '', tableNumber: 'B2' });
    expect(issues).toHaveLength(2);
  });

  it('still reads pasted lines', () => {
    expect(parseGuestLinesWithIssues('Nama\tKategori\nSari\tVIP\n').guests).toEqual([expect.objectContaining({ name: 'Sari', category: 'VIP' })]);
  });
});

describe('delimited text', () => {
  it('handles quotes, semicolons and tabs', () => {
    expect(parseDelimited('Nama;Kursi\n"Budi, S.T.";2\n')).toEqual([['Nama', 'Kursi'], ['Budi, S.T.', '2']]);
    expect(parseDelimited('a\tb\r\nc\t"d ""x"""\r\n')).toEqual([['a', 'b'], ['c', 'd "x"']]);
  });
});
