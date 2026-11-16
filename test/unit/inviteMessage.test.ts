import { beforeAll, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  vi.stubGlobal('window', { location: { origin: 'https://undangan.example' } });
});

describe('whatsappNumber', () => {
  it('turns local Indonesian numbers into international form', async () => {
    const { whatsappNumber } = await import('../../src/lib/inviteMessage.js');
    expect(whatsappNumber('0812-3456-7890')).toBe('6281234567890');
    expect(whatsappNumber('+62 812 3456 7890')).toBe('6281234567890');
    expect(whatsappNumber('81234567890')).toBe('6281234567890');
  });

  it('rejects things that are not phone numbers', async () => {
    const { whatsappNumber, whatsappLink } = await import('../../src/lib/inviteMessage.js');
    expect(whatsappNumber('')).toBe('');
    expect(whatsappNumber('abc')).toBe('');
    expect(whatsappNumber('123')).toBe('');
    expect(whatsappLink('', 'hi')).toBeNull();
  });
});

describe('renderInvite', () => {
  it('fills every placeholder, including repeats', async () => {
    const { renderInvite } = await import('../../src/lib/inviteMessage.js');
    const text = renderInvite('Yth {nama} ({kode}) dari {mempelai}: {link} {kode}', { name: 'Budi S', slug: 'A7K9' }, 'Arya & Nadhira');
    expect(text).toBe('Yth Budi S (A7K9) dari Arya & Nadhira: https://undangan.example/?to=Budi%20S&c=A7K9 A7K9');
  });
});
