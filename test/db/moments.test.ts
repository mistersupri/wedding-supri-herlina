import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { fakeUpload, freshServices } from '../support/app.js';

let ctx: Awaited<ReturnType<typeof freshServices>>;
let seq = 0;
const moments = () => ctx.services.moments;
const photo = (guestName: string, extra: Record<string, unknown> = {}) =>
  moments().add({ guestName, photoUrl: fakeUpload('moments', `t${++seq}.jpg`), ...extra });

beforeEach(async () => {
  ctx = await freshServices();
  await moments().saveSettings({ access: 'ANYONE', framesPerGuest: 3, cameraOpen: true, moderation: false, requireCheckIn: false });
});
afterAll(async () => ctx?.db.$disconnect());

describe('photo quota', () => {
  it('never lets parallel uploads pass the frame limit', async () => {
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => photo('Budi Test')));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
    expect((await moments().all()).filter((m) => m.guestName === 'Budi Test')).toHaveLength(3);
  });

  it('treats spaces and letter case in a typed name as the same guest', async () => {
    await photo('Budi   Test');
    await photo('budi test');
    await photo(' BUDI TEST ');
    await expect(photo('Budi Test')).rejects.toMatchObject({ status: 400 });
  });

  it('counts invited guests by code and requires check-in when the rule says so', async () => {
    const guest = await ctx.services.guests.create({ name: 'Ani', slug: 'ANIA' });
    await moments().saveSettings({ access: 'INVITED', requireCheckIn: true });
    await expect(photo('Ani', { guestSlug: guest.slug })).rejects.toMatchObject({ status: 403 });
    await ctx.services.guests.checkIn({ id: guest.id }, {});
    await expect(photo('Ani', { guestSlug: guest.slug })).resolves.toBeTruthy();
  });

  it('charges a collage one frame per shot it holds', async () => {
    await photo('Collage Guest', { frames: 2 });
    // 1 frame left of 3: a 2-shot collage no longer fits, a single photo does.
    await expect(photo('Collage Guest', { frames: 2 })).rejects.toMatchObject({ status: 400, message: expect.stringContaining('kolase 2 foto') });
    await expect(photo('Collage Guest')).resolves.toMatchObject({ frames: 1 });
    await expect(photo('Collage Guest')).rejects.toMatchObject({ status: 400 });
    const page = await moments().page({ page: 1, limit: 12, guestName: 'Collage Guest', guestSlug: '' });
    expect(page.userCount).toBe(3);
  });

  it('refuses photos once the camera is closed', async () => {
    await moments().saveSettings({ cameraOpen: false });
    await expect(photo('Budi')).rejects.toMatchObject({ status: 403 });
  });
});

describe('photo files', () => {
  it('rejects paths that are not a stored moment photo', async () => {
    for (const photoUrl of ['/uploads/moments/../gallery/x.jpg', '/uploads/gallery/x.jpg', '/uploads/moments/missing.jpg', 'https://evil.example/a.jpg', '']) {
      await expect(moments().add({ guestName: 'Siti', photoUrl })).rejects.toMatchObject({ status: 400 });
    }
  });

  it('registers one file only once', async () => {
    const url = fakeUpload('moments', 'once.jpg');
    await moments().add({ guestName: 'Siti', photoUrl: url });
    await expect(moments().add({ guestName: 'Orang Lain', photoUrl: url })).rejects.toMatchObject({ status: 400 });
  });

  it('holds photos for review when moderation is on, and approves them in bulk', async () => {
    await moments().saveSettings({ moderation: true });
    await photo('Siti');
    await photo('Siti');
    expect(await ctx.services.invitation.cmsStats().then((s) => s.pendingMoments)).toBe(2);
    expect(await moments().approveAllPending()).toBe(2);
    expect(await ctx.services.invitation.cmsStats().then((s) => s.pendingMoments)).toBe(0);
  });
});

describe('reactions', () => {
  it('keeps counts exact under simultaneous taps and never goes below zero', async () => {
    const p = await photo('Siti');
    await Promise.all(Array.from({ length: 10 }, () => moments().react(p.id, '😍', 'add')));
    let now = await moments().react(p.id, '❤️', 'add');
    expect(now.reactions).toEqual({ '😍': 10, '❤️': 1 });
    expect(now.likesCount).toBe(11);
    for (let i = 0; i < 15; i++) now = await moments().react(p.id, '😍', 'remove');
    expect(now.reactions).toEqual({ '❤️': 1 });
    expect(now.likesCount).toBe(1);
  });

  it('only accepts the emoji the feed offers', async () => {
    const p = await photo('Siti');
    await expect(moments().react(p.id, '💥', 'add')).rejects.toMatchObject({ status: 400 });
    await expect(moments().react('nope', '❤️', 'add')).rejects.toMatchObject({ status: 404 });
  });
});

describe('event frame settings', () => {
  it('stores photo-in-front with clamped margins and rejects an area that is too small', async () => {
    const { services } = await freshServices();
    const saved = await services.moments.saveFrame({ photoInFront: true, photoInset: { top: 12, right: 99, bottom: 20, left: 5 } });
    expect(saved).toMatchObject({ photoInFront: true, photoInset: { top: 12, right: 45, bottom: 20, left: 5 } });
    expect((await services.moments.frame()).photoInFront).toBe(true);
    await expect(services.moments.saveFrame({ photoInset: { top: 45, right: 45, bottom: 45, left: 45 } })).rejects.toMatchObject({ status: 400 });
  });
});
