import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { freshServices } from '../support/app.js';

let ctx: Awaited<ReturnType<typeof freshServices>>;
const book = () => ctx.services.guestbook;
const guests = () => ctx.services.guests;

beforeEach(async () => {
  ctx = await freshServices();
  await ctx.db.invitedGuest.deleteMany();
  await ctx.db.guestWish.deleteMany();
});
afterAll(async () => ctx?.db.$disconnect());

describe('wishes', () => {
  it('require a valid invitation code', async () => {
    await expect(book().submit({ attendanceStatus: 'HADIR', guestName: 'Siapa Saja', message: 'hi' })).rejects.toMatchObject({ status: 403 });
    await expect(book().submit({ guestSlug: 'ZZZZ', attendanceStatus: 'HADIR' })).rejects.toMatchObject({ status: 403 });
  });

  it('take name and seat limit from the guest list, not from the request', async () => {
    const g = await guests().create({ name: 'Andi', pax: 2 });
    const wish = await book().submit({ guestSlug: g.slug, guestName: 'Spoof', attendanceStatus: 'HADIR', numberOfGuests: 9, message: 'Selamat' });
    expect(wish).toMatchObject({ guestName: 'Andi', numberOfGuests: 2, message: 'Selamat' });
  });

  it('keep two guests with the same name apart', async () => {
    const a = await guests().create({ name: 'Andi Kembar', pax: 2 });
    const b = await guests().create({ name: 'Andi Kembar', pax: 1 });
    await book().submit({ guestSlug: a.slug, attendanceStatus: 'HADIR', message: 'dari A' });
    await book().submit({ guestSlug: b.slug, attendanceStatus: 'TIDAK_HADIR', message: 'dari B' });
    await book().submit({ guestSlug: a.slug, attendanceStatus: 'RAGU', message: 'A berubah' });
    const list = await book().publicList(a.slug);
    expect(list.data).toHaveLength(2);
    expect(list.mine).toMatchObject({ message: 'A berubah', attendanceStatus: 'RAGU' });
    expect((await book().publicList(b.slug)).mine).toMatchObject({ message: 'dari B' });
  });

  it('keep the original message when only attendance changes', async () => {
    const g = await guests().create({ name: 'Sari' });
    await book().submit({ guestSlug: g.slug, attendanceStatus: 'HADIR', message: 'Doa tulus kami' });
    const changed = await book().submit({ guestSlug: g.slug, attendanceStatus: 'RAGU' });
    expect(changed).toMatchObject({ attendanceStatus: 'RAGU', message: 'Doa tulus kami' });
  });

  it('never reveal invitation codes on the public list', async () => {
    const g = await guests().create({ name: 'Sari' });
    await book().submit({ guestSlug: g.slug, attendanceStatus: 'HADIR', message: 'hi' });
    const json = JSON.stringify(await book().publicList());
    expect(json).not.toContain(g.slug);
    expect(json).not.toContain('guestKey');
  });

  it('only accept voice notes stored by this server', async () => {
    const g = await guests().create({ name: 'Sari' });
    for (const voiceUrl of ['data:audio/webm;base64,AAAA', 'https://evil.example/a.mp3', '/uploads/voice/../moments/x.jpg']) {
      await expect(book().submit({ guestSlug: g.slug, attendanceStatus: 'HADIR', message: 'hi', voiceUrl })).rejects.toMatchObject({ status: 400 });
    }
  });
});
