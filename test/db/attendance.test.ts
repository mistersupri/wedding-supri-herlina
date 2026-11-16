import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { fakeUpload, freshServices } from '../support/app.js';

let ctx: Awaited<ReturnType<typeof freshServices>>;
const attendance = () => ctx.services.attendance;

// The venue, and points at known distances from it (0.001 degree of latitude is about 111 m).
const VENUE = { lat: -6.2, lng: 106.8 };
const at = (metersNorth: number) => ({ lat: VENUE.lat + metersNorth / 111_195, lng: VENUE.lng, accuracy: 10 });

beforeEach(async () => {
  ctx = await freshServices();
  await ctx.db.invitedGuest.deleteMany();
});
afterAll(async () => ctx?.db.$disconnect());

describe('attendance settings', () => {
  it('start with self check-in off and location verification on', async () => {
    expect(await attendance().get()).toEqual({ selfCheckIn: false, verifyLocation: true, venueLat: null, venueLng: null, radiusMeters: 150 });
    expect(await attendance().publicRules()).toEqual({ selfCheckIn: false, verifyLocation: true });
  });

  it('need venue coordinates before self check-in can be switched on with verification', async () => {
    await expect(attendance().save({ selfCheckIn: true })).rejects.toMatchObject({ status: 400 });
    await expect(attendance().save({ selfCheckIn: true, venueLat: VENUE.lat, venueLng: VENUE.lng })).resolves.toMatchObject({ selfCheckIn: true });
  });

  it('allow switching on without coordinates once verification is off', async () => {
    await expect(attendance().save({ selfCheckIn: true, verifyLocation: false })).resolves.toMatchObject({ selfCheckIn: true, verifyLocation: false });
  });

  it('reject impossible coordinates and keep the radius in range', async () => {
    await expect(attendance().save({ venueLat: 95, venueLng: 10 })).rejects.toMatchObject({ status: 400 });
    await expect(attendance().save({ venueLat: 10, venueLng: null })).rejects.toMatchObject({ status: 400 });
    expect((await attendance().save({ radiusMeters: 5 })).radiusMeters).toBe(20);
    expect((await attendance().save({ radiusMeters: 999_999 })).radiusMeters).toBe(5000);
  });
});

describe('self check-in', () => {
  const setup = async (extra: Record<string, unknown> = {}) => {
    await attendance().save({ selfCheckIn: true, verifyLocation: true, venueLat: VENUE.lat, venueLng: VENUE.lng, radiusMeters: 150, ...extra });
    return ctx.services.guests.create({ name: 'Rina', pax: 3 });
  };

  it('is closed until the couple opens it', async () => {
    const g = await ctx.services.guests.create({ name: 'Rina' });
    await expect(attendance().selfCheckIn(g.slug, at(0))).rejects.toMatchObject({ status: 403, code: 'SELF_CHECK_IN_OFF' });
  });

  it('checks a guest in when their phone is at the venue', async () => {
    const g = await setup();
    const res = await attendance().selfCheckIn(g.slug.toLowerCase(), at(60));
    expect(res).toMatchObject({ isValid: true, alreadyCheckedIn: false, guest: { isCheckedIn: true } });
    const stored = await ctx.services.guests.checkIn({ id: g.id }, {});
    expect(stored.guest).toMatchObject({ checkInMethod: 'SELF', actualPax: 3, souvenirGiven: false });
  });

  it('turns a guest away who is too far, and says how far', async () => {
    const g = await setup();
    await expect(attendance().selfCheckIn(g.slug, at(900))).rejects.toMatchObject({ status: 403, code: 'TOO_FAR', message: expect.stringContaining('900 m') });
    expect((await ctx.services.guests.checkIn({ id: g.id }, {})).alreadyCheckedIn).toBe(false);
  });

  it('honours the configured radius', async () => {
    const g = await setup({ radiusMeters: 1000 });
    await expect(attendance().selfCheckIn(g.slug, at(900))).resolves.toMatchObject({ guest: { isCheckedIn: true } });
  });

  it('lets GPS error help the guest a little, but not a lot', async () => {
    const g = await setup({ radiusMeters: 100 });
    // 130 m away with 40 m of reported error: inside once the error is allowed for.
    await expect(attendance().selfCheckIn(g.slug, { ...at(130), accuracy: 40 })).resolves.toBeTruthy();
    const h = await ctx.services.guests.create({ name: 'Budi' });
    // 250 m away claiming 200 m of error: the bonus is capped, so still too far.
    await expect(attendance().selfCheckIn(h.slug, { ...at(250), accuracy: 200 })).rejects.toMatchObject({ code: 'TOO_FAR' });
  });

  it('needs a position, and refuses a vague one', async () => {
    const g = await setup();
    await expect(attendance().selfCheckIn(g.slug, {})).rejects.toMatchObject({ status: 400, code: 'LOCATION_REQUIRED' });
    await expect(attendance().selfCheckIn(g.slug, { lat: 'x', lng: 'y' })).rejects.toMatchObject({ code: 'LOCATION_REQUIRED' });
    await expect(attendance().selfCheckIn(g.slug, { ...at(0), accuracy: 5000 })).rejects.toMatchObject({ code: 'LOCATION_INACCURATE' });
  });

  it('needs only a valid code when verification is off', async () => {
    const g = await setup({ verifyLocation: false });
    await expect(attendance().selfCheckIn(g.slug, {})).resolves.toMatchObject({ guest: { isCheckedIn: true } });
  });

  it('refuses unknown codes', async () => {
    await setup();
    await expect(attendance().selfCheckIn('ZZZZ', at(0))).rejects.toMatchObject({ status: 403 });
    await expect(attendance().selfCheckIn('', at(0))).rejects.toMatchObject({ status: 403 });
  });

  it('keeps the reception desk figures when a guest taps again', async () => {
    const g = await setup();
    await attendance().selfCheckIn(g.slug, at(10));
    await ctx.services.guests.checkIn({ id: g.id }, { actualPax: 2, souvenirGiven: true });
    const again = await attendance().selfCheckIn(g.slug, at(10));
    expect(again.alreadyCheckedIn).toBe(true);
    const stored = (await ctx.services.guests.list()).data.find((x) => x.id === g.id)!;
    expect(stored).toMatchObject({ actualPax: 2, souvenirGiven: true, checkInMethod: 'SELF' });
  });

  it('only exposes the switches to the public page, not the venue', async () => {
    await setup();
    const inv = await ctx.services.invitation.publicInvitation();
    expect(inv.attendance).toEqual({ selfCheckIn: true, verifyLocation: true });
    expect(JSON.stringify(inv)).not.toContain(String(VENUE.lat));
  });
});

describe('camera and check-in', () => {
  const photo = (guestSlug: string, name = 'Rina') =>
    ctx.services.moments.add({ guestName: name, guestSlug, photoUrl: fakeUpload('moments', `ci${Math.random().toString(36).slice(2)}.jpg`) });

  it('does not require check-in by default', async () => {
    expect((await ctx.services.moments.settings()).requireCheckIn).toBe(false);
    const g = await ctx.services.guests.create({ name: 'Rina' });
    await expect(photo(g.slug)).resolves.toBeTruthy();
  });

  it('requires it when the couple says so, and opens after a self check-in', async () => {
    await ctx.services.moments.saveSettings({ requireCheckIn: true });
    await attendance().save({ selfCheckIn: true, verifyLocation: false });
    const g = await ctx.services.guests.create({ name: 'Rina' });
    await expect(photo(g.slug)).rejects.toMatchObject({ status: 403, code: 'CHECK_IN_REQUIRED' });
    await attendance().selfCheckIn(g.slug, {});
    await expect(photo(g.slug)).resolves.toBeTruthy();
  });

  it('reads the retired CHECKED_IN mode as invited guests who must be checked in', async () => {
    await ctx.db.cameraSetting.create({ data: { id: 'main', access: 'CHECKED_IN' } });
    expect(await ctx.services.moments.settings()).toMatchObject({ access: 'INVITED', requireCheckIn: true });
  });

  it('lets anyone with a typed name in under ANYONE, while invited guests still need to check in', async () => {
    await ctx.services.moments.saveSettings({ access: 'ANYONE', requireCheckIn: true });
    const g = await ctx.services.guests.create({ name: 'Rina' });
    await expect(photo(g.slug)).rejects.toMatchObject({ code: 'CHECK_IN_REQUIRED' });
    await expect(ctx.services.moments.add({ guestName: 'Orang Lewat', photoUrl: fakeUpload('moments', 'walkin.jpg') })).resolves.toBeTruthy();
  });
});
