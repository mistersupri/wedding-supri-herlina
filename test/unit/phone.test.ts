import { describe, expect, it } from 'vitest';
import { isValidPhone, parsePhone, whatsappDigits } from '../../shared/phone.js';

describe('parsePhone', () => {
  it('normalises every common way of writing an Indonesian mobile number', () => {
    for (const raw of ['0812-3456-7890', '+62 812 3456 7890', '62812 3456 7890', '812.3456.7890', '(0812) 3456 7890', '+62 0812 3456 7890']) {
      expect(parsePhone(raw)?.international, raw).toBe('6281234567890');
    }
  });

  it('shows the local form with groups', () => {
    expect(parsePhone('6281234567890')?.display).toBe('0812-3456-7890');
    expect(parsePhone('08123456789')?.display).toBe('0812-3456-789');
  });

  it('accepts numbers from other countries only with a plus sign', () => {
    expect(parsePhone('+44 7700 900123')).toMatchObject({ international: '447700900123', indonesian: false });
    expect(parsePhone('447700900123')).toBeNull();
  });

  it('rejects things that cannot be a mobile number', () => {
    for (const raw of ['', 'abc', '0812', '021-5551234', '0712345678', '+62 12345', '0812-3456-7890-1234-5', '08x12345678', '12345678901234567']) {
      expect(parsePhone(raw), raw).toBeNull();
    }
  });
});

describe('helpers', () => {
  it('isValidPhone and whatsappDigits follow parsePhone', () => {
    expect(isValidPhone('0812 3456 7890')).toBe(true);
    expect(isValidPhone('nomor saya')).toBe(false);
    expect(whatsappDigits('0812 3456 7890')).toBe('6281234567890');
    expect(whatsappDigits('')).toBe('');
  });
});
