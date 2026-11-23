import { describe, expect, it } from 'vitest';
import {
  checkAccountNumber,
  checkInstagram,
  checkMapsEmbed,
  checkMapsLink,
  checkUrl,
  cleanInstagram,
  composeEventTime,
  extractEmbedSrc,
  formatIdDate,
  isAfter,
  parseEventTime,
  parseIdDate,
} from '../../src/lib/inputs.js';

describe('Instagram', () => {
  it('reduces handles, links and mentions to the bare name', () => {
    for (const raw of ['@aryapradipta', 'aryapradipta', ' https://www.instagram.com/aryapradipta/?hl=id ', 'instagram.com/aryapradipta', '@@aryapradipta']) {
      expect(cleanInstagram(raw), raw).toBe('aryapradipta');
    }
  });

  it('flags characters Instagram does not allow', () => {
    expect(checkInstagram('arya.pradipta_1')).toBeNull();
    expect(checkInstagram('')).toBeNull();
    expect(checkInstagram('arya pradipta')).not.toBeNull();
    expect(checkInstagram('a'.repeat(31))).not.toBeNull();
  });
});

describe('URLs', () => {
  it('accepts web addresses and explains the rest', () => {
    expect(checkUrl('https://contoh.id/lagu.mp3')).toBeNull();
    expect(checkUrl('')).toBeNull();
    expect(checkUrl('contoh.id')).toMatch(/https/i);
    expect(checkUrl('ftp://contoh.id/x')).toMatch(/https/i);
  });

  it('accepts Google Maps links, including short ones, and refuses other sites', () => {
    expect(checkMapsLink('https://maps.app.goo.gl/abc123')).toBeNull();
    expect(checkMapsLink('https://www.google.com/maps/place/Monas/@-6.17,106.82,17z')).toBeNull();
    expect(checkMapsLink('https://goo.gl/maps/xyz')).toBeNull();
    expect(checkMapsLink('https://contoh.id/peta')).not.toBeNull();
  });

  it('pulls the src out of a pasted iframe and checks it is a Maps embed', () => {
    const iframe = '<iframe src="https://www.google.com/maps/embed?pb=!1m18" width="600" height="450"></iframe>';
    expect(extractEmbedSrc(iframe)).toBe('https://www.google.com/maps/embed?pb=!1m18');
    expect(extractEmbedSrc('https://x.example/a')).toBe('https://x.example/a');
    expect(checkMapsEmbed('https://www.google.com/maps/embed?pb=!1m18')).toBeNull();
    expect(checkMapsEmbed('https://www.google.com/maps/place/x')).not.toBeNull();
  });
});

describe('account numbers', () => {
  it('allows digits with separators and explains the rest', () => {
    expect(checkAccountNumber('1234 5678 90', true)).toBeNull();
    expect(checkAccountNumber('123-456-7890', true)).toBeNull();
    expect(checkAccountNumber('', true)).toMatch(/wajib/);
    expect(checkAccountNumber('', false)).toBeNull();
    expect(checkAccountNumber('12ab5678', true)).toMatch(/angka/);
    expect(checkAccountNumber('123', true)).toMatch(/5 sampai 20/);
  });
});

describe('dates', () => {
  it('writes the long Indonesian form without time-zone drift', () => {
    expect(formatIdDate('2026-11-20')).toBe('Jumat, 20 November 2026');
    expect(formatIdDate('2027-01-01')).toBe('Jumat, 1 Januari 2027');
    expect(formatIdDate('2026-02-30')).toBe('');
    expect(formatIdDate('x')).toBe('');
  });

  it('reads the forms older entries were typed in', () => {
    expect(parseIdDate('Jumat, 20 November 2026')).toBe('2026-11-20');
    expect(parseIdDate('20 nov 2026')).toBe('2026-11-20');
    expect(parseIdDate('5/3/2027')).toBe('2027-03-05');
    expect(parseIdDate('2026-11-20')).toBe('2026-11-20');
    expect(parseIdDate('segera')).toBeNull();
    expect(parseIdDate('31 Februari 2026')).toBeNull();
  });
});

describe('times', () => {
  it('splits and joins "08:00 WIB"', () => {
    expect(parseEventTime('08:00 WIB')).toEqual({ time: '08:00', zone: 'WIB' });
    expect(parseEventTime('9.30 wita')).toEqual({ time: '09:30', zone: 'WITA' });
    expect(parseEventTime('11:00')).toEqual({ time: '11:00', zone: 'WIB' });
    expect(parseEventTime('Selesai')).toEqual({ time: '', zone: 'WIB' });
    expect(parseEventTime('25:00')).toEqual({ time: '', zone: 'WIB' });
    expect(composeEventTime('08:00', 'WIB')).toBe('08:00 WIB');
    expect(composeEventTime('', 'WIB')).toBe('');
  });

  it('checks the end is after the start', () => {
    expect(isAfter('10:00', '08:00')).toBe(true);
    expect(isAfter('08:00', '10:00')).toBe(false);
    expect(isAfter('', '10:00')).toBe(true);
  });
});

import { passwordStrength } from '../../src/components/ui/fields.js';

describe('passwordStrength', () => {
  it('rates by length and variety', () => {
    expect(passwordStrength('').score).toBe(0);
    expect(passwordStrength('abc12').label).toBe('Terlalu pendek');
    expect(passwordStrength('abcdef').score).toBe(1);
    expect(passwordStrength('abcdefgh').score).toBe(1);
    expect(passwordStrength('Abcdefg1').score).toBeGreaterThanOrEqual(2);
    expect(passwordStrength('Kopi-Tubruk-2026!').score).toBe(4);
  });
});
