import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { freshServices } from '../support/app.js';

let ctx: Awaited<ReturnType<typeof freshServices>>;
beforeEach(async () => {
  ctx = await freshServices();
});
afterAll(async () => ctx?.db.$disconnect());

describe('public invitation', () => {
  it('leaves out venue addresses, map links and gift accounts', async () => {
    const inv = await ctx.services.invitation.publicInvitation();
    expect(inv.events.length).toBeGreaterThan(0);
    for (const e of inv.events) expect(e).toMatchObject({ address: '', mapsUrl: '' });
    expect(inv.giftInfo).toEqual([]);
    expect(JSON.stringify(inv)).not.toMatch(/accountNumber/);
  });

  it('serves the held-back details through guestDetails (callers must verify a code first)', async () => {
    const details = await ctx.services.invitation.guestDetails();
    expect(details.events.every((e) => e.address.length > 0)).toBe(true);
    expect(details.giftInfo.length).toBeGreaterThan(0);
  });

  it('verifies invitation codes case-insensitively and rejects unknown ones', async () => {
    const g = await ctx.services.guests.create({ name: 'Tamu Uji' });
    expect((await ctx.services.guests.verify(` ${g.slug.toLowerCase()} `)).isValid).toBe(true);
    expect((await ctx.services.guests.verify('ZZZZ')).isValid).toBe(false);
    expect((await ctx.services.guests.verify('AB')).isValid).toBe(false);
  });
});

describe('exports', () => {
  it('lists guests with check-in state and keeps typed text from becoming a formula', async () => {
    await ctx.db.invitedGuest.deleteMany();
    await ctx.services.guests.create({ name: '=CMD()', phone: '+62 812 3456 7890' });
    const csv = await ctx.services.exports.guestsCsv('https://undangan.example');
    expect(csv).toContain("'=CMD()");
    expect(csv).toContain('https://undangan.example/?to=');
  });
});

describe('settings input', () => {
  it('stores the WhatsApp destination as international digits and refuses nonsense', async () => {
    const saved = await ctx.services.invitation.saveTheme({ whatsappNumber: '0812-3456-7890' });
    expect(saved.whatsappNumber).toBe('6281234567890');
    await expect(ctx.services.invitation.saveTheme({ whatsappNumber: 'hubungi saya' })).rejects.toMatchObject({ status: 400 });
  });

  it('reduces Instagram links to the bare name on the couple profile', async () => {
    const saved = await ctx.services.invitation.saveCouple({ groomInstagram: '@arya.pradipta', brideInstagram: 'instagram.com/nadhira.k/' });
    expect(saved.groomInstagram).toBe('arya.pradipta');
    expect(saved.brideInstagram).toBe('nadhira.k');
    await expect(ctx.services.invitation.saveCouple({ groomInstagram: 'a b!c' })).rejects.toMatchObject({ status: 400 });
  });
});
