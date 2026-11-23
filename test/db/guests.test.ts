import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { freshServices } from '../support/app.js';

let ctx: Awaited<ReturnType<typeof freshServices>>;
const guests = () => ctx.services.guests;

beforeEach(async () => {
  ctx = await freshServices();
  await ctx.db.invitedGuest.deleteMany();
});
afterAll(async () => ctx?.db.$disconnect());

describe('guest list', () => {
  it('makes unique 4-character codes, also for bulk imports', async () => {
    const created = await guests().createMany(Array.from({ length: 40 }, (_, i) => ({ name: `Tamu ${i}` })));
    const slugs = new Set(created.map((g) => g.slug));
    expect(slugs.size).toBe(40);
    for (const slug of slugs) expect(slug).toMatch(/^[2-9A-HJ-NP-Z]{4}$/);
  });

  it('refuses a requested code that someone else already has', async () => {
    await guests().create({ name: 'Satu', slug: 'QQQQ' });
    await expect(guests().create({ name: 'Dua', slug: 'qqqq' })).rejects.toMatchObject({ status: 409 });
  });

  it('survives parallel creations without a failed request', async () => {
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => guests().create({ name: `Paralel ${i}` })));
    expect(new Set(results.map((g) => g.slug)).size).toBe(12);
  });

  it('only edits whitelisted fields and validates them', async () => {
    const g = await guests().create({ name: 'Sari' });
    await guests().checkIn({ id: g.id }, {});
    const updated = await guests().update(g.id, { name: ' Sari Baru ', pax: 'abc', isCheckedIn: false, id: 'x', bogus: 1, slug: 'abcd' });
    expect(updated).toMatchObject({ id: g.id, name: 'Sari Baru', pax: 2, isCheckedIn: true, slug: 'ABCD' });
    await expect(guests().update(g.id, { slug: 'AB' })).rejects.toMatchObject({ status: 400 });
    await expect(guests().update(g.id, { name: '  ' })).rejects.toMatchObject({ status: 400 });
  });
});

describe('check-in', () => {
  it('records time, method and defaults on the first check-in', async () => {
    const g = await guests().create({ name: 'Budi', pax: 3 });
    const res = await guests().checkIn({ slug: g.slug }, {});
    expect(res.alreadyCheckedIn).toBe(false);
    expect(res.guest).toMatchObject({ isCheckedIn: true, checkInMethod: 'QR_SCAN', actualPax: 3, souvenirGiven: true });
    expect(res.stats.totalCheckedIn).toBe(1);
  });

  it('keeps the first check-in when the same guest is scanned again', async () => {
    const g = await guests().create({ name: 'Budi', pax: 3 });
    const first = await guests().checkIn({ id: g.id }, { actualPax: 2, souvenirGiven: false, method: 'MANUAL' });
    const again = await guests().checkIn({ slug: g.slug }, {});
    expect(again.alreadyCheckedIn).toBe(true);
    expect(again.guest).toMatchObject({
      checkInTime: first.guest.checkInTime,
      checkInMethod: 'MANUAL',
      actualPax: 2,
      souvenirGiven: false,
    });
  });

  it('applies figures the receptionist sends explicitly on a repeat check-in', async () => {
    const g = await guests().create({ name: 'Budi', pax: 3 });
    await guests().checkIn({ id: g.id }, { actualPax: 2, souvenirGiven: false });
    const fixed = await guests().checkIn({ id: g.id }, { actualPax: 3, souvenirGiven: true });
    expect(fixed.guest).toMatchObject({ actualPax: 3, souvenirGiven: true });
  });

  it('refuses a partial name that fits several guests, but accepts a unique one', async () => {
    await guests().create({ name: 'Budi Santoso' });
    await guests().create({ name: 'Budi Hartono' });
    await expect(guests().checkIn({ nameQuery: 'budi' }, {})).rejects.toMatchObject({ status: 409 });
    expect((await guests().checkIn({ nameQuery: 'hartono' }, {})).guest.name).toBe('Budi Hartono');
    await expect(guests().checkIn({ nameQuery: 'tidak ada' }, {})).rejects.toMatchObject({ status: 404 });
  });

  it('undoes a check-in', async () => {
    const g = await guests().create({ name: 'Budi' });
    await guests().checkIn({ id: g.id }, {});
    const undone = await guests().undoCheckIn(g.id);
    expect(undone.guest).toMatchObject({ isCheckedIn: false, checkInTime: null, actualPax: null, souvenirGiven: false });
  });
});

describe('phone and Instagram', () => {
  it('tidies a phone number and an Instagram link on create', async () => {
    const g = await guests().create({ name: 'Rina', phone: '+62 812 3456 7890', instagram: ' https://instagram.com/rina.s/?hl=id ' });
    expect(g.phone).toBe('0812-3456-7890');
    expect(g.instagram).toBe('rina.s');
  });

  it('refuses a number that cannot be read, on create and on edit', async () => {
    await expect(guests().create({ name: 'Rina', phone: 'nomor saya' })).rejects.toMatchObject({ status: 400 });
    const g = await guests().create({ name: 'Rina' });
    await expect(guests().update(g.id, { phone: '0812' })).rejects.toMatchObject({ status: 400 });
    await expect(guests().update(g.id, { instagram: 'a b!c' })).rejects.toMatchObject({ status: 400 });
    expect((await guests().update(g.id, { phone: '08123456789' })).phone).toBe('0812-3456-789');
  });

  it('drops an unreadable number in a bulk import instead of failing the list', async () => {
    const made = await guests().createMany([{ name: 'A', phone: '0812 3456 7890' }, { name: 'B', phone: '???' }, { name: 'C' }]);
    expect(made.map((m) => m.phone)).toEqual(['0812-3456-7890', '', '']);
  });
});
