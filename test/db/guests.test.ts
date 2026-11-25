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

describe('large guest lists', () => {
  const seed = () =>
    guests().createMany([
      ...Array.from({ length: 37 }, (_, i) => ({ name: `Tamu ${String(i).padStart(2, '0')}`, category: i % 2 ? 'Keluarga' : 'Teman', phone: `0812-0000-${1000 + i}` })),
      { name: 'Zahra VIP', category: 'VIP', pax: 4 },
    ]);

  it('pages, filters, searches and sorts on the server', async () => {
    await seed();
    const first = await guests().page({ page: 1, pageSize: 10 });
    expect(first).toMatchObject({ total: 38, page: 1, pageSize: 10 });
    expect(first.data).toHaveLength(10);
    expect(first.ids).toHaveLength(38);
    expect(first.categories).toEqual(['Keluarga', 'Teman', 'VIP']);
    expect((await guests().page({ page: 4, pageSize: 10 })).data).toHaveLength(8);
    expect((await guests().page({ page: 99, pageSize: 10 })).page).toBe(4);
    expect((await guests().page({ category: 'vip' })).data.map((g) => g.name)).toEqual(['Zahra VIP']);
    expect((await guests().page({ search: '1005' })).total).toBe(1);
    expect((await guests().page({ sort: 'NAME', pageSize: 5 })).data[0].name).toBe('Tamu 00');
    const [one] = (await guests().page({ search: 'Tamu 03' })).data;
    await guests().checkIn({ id: one.id }, {});
    expect((await guests().page({ attendance: 'CHECKED_IN' })).total).toBe(1);
    await guests().markSent([one.id], true);
    expect((await guests().page({ sent: 'SENT' })).total).toBe(1);
    expect((await guests().page({ sent: 'UNSENT' })).total).toBe(37);
  });

  it('applies one action to many selected guests', async () => {
    await seed();
    const { ids } = await guests().page({ category: 'Teman' });
    expect(await guests().bulk(ids, { action: 'sent', value: true })).toEqual({ count: ids.length });
    expect((await guests().page({ sent: 'SENT' })).total).toBe(ids.length);
    await guests().bulk(ids, { action: 'category', value: 'Kantor' });
    expect((await guests().page({ category: 'Kantor' })).total).toBe(ids.length);
    await guests().bulk(ids, { action: 'pax', value: 3 });
    await guests().bulk(ids, { action: 'table', value: 'B2' });
    expect((await guests().page({ category: 'Kantor' })).data[0]).toMatchObject({ pax: 3, tableNumber: 'B2' });
    expect(await guests().bulk(ids, { action: 'delete' })).toEqual({ count: ids.length });
    expect((await guests().page({})).total).toBe(38 - ids.length);
    await expect(guests().bulk([], { action: 'delete' })).rejects.toMatchObject({ status: 400 });
    await expect(guests().bulk(['x'], { action: 'category', value: ' ' })).rejects.toMatchObject({ status: 400 });
  });

  it('skips repeats on import when asked', async () => {
    await guests().create({ name: 'Budi Santoso', phone: '0812-3456-7890' });
    const rows = [
      { name: 'budi santoso', phone: '+62 812 3456 7890' },
      { name: 'Budi Santoso', phone: '0899-1111-2222' },
      { name: 'Sari', phone: '' },
      { name: 'Sari', phone: '' },
    ];
    const created = await guests().createMany(rows, { skipDuplicates: true });
    expect(created.map((g) => g.name)).toEqual(['Budi Santoso', 'Sari']);
    expect((await guests().createMany(rows)).length).toBe(4);
  });
});

describe('invitation opened', () => {
  it('starts unopened and records the first and latest open', async () => {
    const g = await guests().create({ name: 'Rina' });
    expect(g).toMatchObject({ firstOpenedAt: null, lastOpenedAt: null, openCount: 0 });

    expect(await guests().recordOpen(g.slug.toLowerCase())).toEqual({ recorded: true });
    const [opened] = (await guests().page({ opened: 'OPENED' })).data;
    expect(opened).toMatchObject({ id: g.id, openCount: 1 });
    expect(opened.firstOpenedAt).toBeTruthy();
    expect(opened.lastOpenedAt).toBe(opened.firstOpenedAt);
  });

  it('counts a quick reload once but a later visit again, keeping the first time', async () => {
    const g = await guests().create({ name: 'Rina' });
    await guests().recordOpen(g.slug);
    await guests().recordOpen(g.slug);
    expect((await guests().page({ opened: 'OPENED' })).data[0].openCount).toBe(1);

    const first = (await guests().page({ opened: 'OPENED' })).data[0].firstOpenedAt;
    await ctx.db.invitedGuest.update({ where: { id: g.id }, data: { lastOpenedAt: new Date(Date.now() - 10 * 60_000) } });
    await guests().recordOpen(g.slug);
    const after = (await guests().page({ opened: 'OPENED' })).data[0];
    expect(after.openCount).toBe(2);
    expect(after.firstOpenedAt).toBe(first);
  });

  it('ignores unknown or malformed codes and filters the list', async () => {
    const a = await guests().create({ name: 'Ada' });
    await guests().create({ name: 'Bayu' });
    expect(await guests().recordOpen('ZZZZ')).toEqual({ recorded: false });
    expect(await guests().recordOpen('x')).toEqual({ recorded: false });
    await guests().recordOpen(a.slug);

    const opened = await guests().page({ opened: 'OPENED' });
    const unopened = await guests().page({ opened: 'UNOPENED' });
    expect(opened.data.map((g) => g.name)).toEqual(['Ada']);
    expect(unopened.data.map((g) => g.name)).toEqual(['Bayu']);
    expect(opened.openedCount).toBe(1);
  });

  it('never leaks open tracking through the public guest view', async () => {
    const g = await guests().create({ name: 'Rina' });
    await guests().recordOpen(g.slug);
    const res = await guests().verify(g.slug);
    expect(res.guest).not.toHaveProperty('openCount');
    expect(res.guest).not.toHaveProperty('firstOpenedAt');
  });
});

describe('reminders and RSVP filters', () => {
  it('splits guests into who has not opened, who opened without answering, and who has not answered', async () => {
    const sent = { invitationSent: true };
    const a = await guests().create({ name: 'Ani', ...sent }); // sent, never opened
    const b = await guests().create({ name: 'Budi', ...sent }); // opened, no answer
    const c = await guests().create({ name: 'Cici', ...sent }); // opened and answered
    await guests().recordOpen(b.slug);
    await guests().recordOpen(c.slug);
    await ctx.services.guestbook.submit({ guestSlug: c.slug, attendanceStatus: 'HADIR', numberOfGuests: 1, message: 'Selamat' });

    const page = await guests().page({});
    expect(page.reminders).toEqual({ unopened: 1, openedNoRsvp: 1, noRsvp: 2 });
    expect(page.data.find((g) => g.id === c.id)?.rsvp).toBe('HADIR');
    expect(page.data.find((g) => g.id === a.id)?.rsvp).toBeNull();

    expect((await guests().page({ opened: 'OPENED', rsvp: 'NOT_REPLIED' })).data.map((g) => g.name)).toEqual(['Budi']);
    expect((await guests().page({ rsvp: 'REPLIED' })).data.map((g) => g.name)).toEqual(['Cici']);
  });

  it('counts reminders sent', async () => {
    const g = await guests().create({ name: 'Dedi' });
    expect(await guests().bulk([g.id], { action: 'reminded' })).toEqual({ count: 1 });
    await guests().bulk([g.id], { action: 'reminded' });
    const [after] = (await guests().page({})).data;
    expect(after).toMatchObject({ reminderCount: 2 });
    expect(after.lastRemindedAt).toBeTruthy();
  });
});
