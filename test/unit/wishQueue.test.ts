import { describe, expect, it, vi } from 'vitest';
import { createWishQueue, type PendingWish, type WishPayload, type WishStore } from '../../src/offline/wishQueue.js';
import type { GuestWish } from '../../shared/types.js';

const wish = (over: Partial<WishPayload> = {}): WishPayload => ({
  guestSlug: 'AAAA',
  guestName: 'Rina',
  relationship: 'Umum',
  attendanceStatus: 'HADIR',
  numberOfGuests: 2,
  message: 'Selamat',
  voiceUrl: null,
  ...over,
});

class Offline extends Error {
  offline = true;
}
class Refused extends Error {
  status = 403;
}

function setup(initial: PendingWish[] = []) {
  const disk = new Map(initial.map((i) => [i.slug, i]));
  const store: WishStore = {
    all: async () => [...disk.values()],
    put: async (i) => void disk.set(i.slug, i),
    remove: async (s) => void disk.delete(s),
  };
  const submit = vi.fn(async (w: WishPayload) => ({ id: 'w1', ...w, isHidden: false, createdAt: '' }) as unknown as GuestWish);
  const upload = vi.fn(async () => '/uploads/voice/abc.webm');
  const queue = createWishQueue({ store, submit, upload, isTransient: (e) => (e as { offline?: boolean }).offline === true });
  return { queue, disk, submit, upload };
}

const item = (over: Partial<PendingWish> = {}): Omit<PendingWish, 'createdAt'> => ({ slug: 'AAAA', wish: wish(), editing: false, ...over });

describe('wish queue', () => {
  it('keeps a wish on disk and shows it as pending', async () => {
    const { queue, disk } = setup();
    await queue.enqueue(item());
    expect(disk.has('AAAA')).toBe(true);
    expect(queue.getSnapshot().pending.AAAA.wish.message).toBe('Selamat');
  });

  it('sends it on flush, removes it, and tells listeners', async () => {
    const { queue, disk, submit } = setup();
    const sent = vi.fn();
    queue.onSent(sent);
    await queue.enqueue(item({ editing: true }));
    await queue.flush();
    expect(submit).toHaveBeenCalledOnce();
    expect(disk.size).toBe(0);
    expect(queue.getSnapshot().pending).toEqual({});
    expect(sent).toHaveBeenCalledWith(expect.objectContaining({ slug: 'AAAA', editing: true }), expect.anything());
  });

  it('keeps it while there is no connection and sends it on a later try', async () => {
    const { queue, disk, submit } = setup();
    submit.mockRejectedValueOnce(new Offline('no signal'));
    await queue.enqueue(item());
    await queue.flush();
    expect(disk.has('AAAA')).toBe(true);
    expect(queue.getSnapshot().failed).toEqual({});
    await queue.flush();
    expect(disk.size).toBe(0);
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it('drops a wish the server refuses for good and reports why', async () => {
    const { queue, disk, submit } = setup();
    submit.mockRejectedValueOnce(new Refused('Kode undangan tidak dikenali.'));
    await queue.enqueue(item());
    await queue.flush();
    expect(disk.size).toBe(0);
    expect(queue.getSnapshot().failed.AAAA).toBe('Kode undangan tidak dikenali.');
    // A new attempt clears the old complaint.
    await queue.enqueue(item());
    expect(queue.getSnapshot().failed).toEqual({});
  });

  it('uploads a saved voice note once, even when the wish itself needs another try', async () => {
    const { queue, disk, upload, submit } = setup();
    submit.mockRejectedValueOnce(new Offline('lost'));
    await queue.enqueue(item({ wish: wish({ message: '' }), voice: new Blob(['x'], { type: 'audio/webm' }) }));
    await queue.flush();
    expect(upload).toHaveBeenCalledOnce();
    expect(disk.get('AAAA')!.wish.voiceUrl).toBe('/uploads/voice/abc.webm');
    await queue.flush();
    expect(upload).toHaveBeenCalledOnce();
    expect(submit).toHaveBeenLastCalledWith(expect.objectContaining({ voiceUrl: '/uploads/voice/abc.webm' }));
  });

  it('keeps one wish per guest: a newer one replaces the older', async () => {
    const { queue, submit } = setup();
    await queue.enqueue(item({ wish: wish({ message: 'pertama' }) }));
    await queue.enqueue(item({ wish: wish({ message: 'kedua' }) }));
    await queue.flush();
    expect(submit).toHaveBeenCalledOnce();
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ message: 'kedua' }));
  });

  it('picks up what an earlier visit left on disk', async () => {
    const { queue, submit } = setup([{ slug: 'BBBB', wish: wish({ guestSlug: 'BBBB' }), editing: false, createdAt: 1 }]);
    await queue.load();
    expect(queue.getSnapshot().pending.BBBB).toBeTruthy();
    await queue.flush();
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ guestSlug: 'BBBB' }));
  });

  it('does not send twice when flushed twice at once', async () => {
    const { queue, submit } = setup();
    await queue.enqueue(item());
    await Promise.all([queue.flush(), queue.flush()]);
    expect(submit).toHaveBeenCalledOnce();
  });

  it('can be discarded', async () => {
    const { queue, disk, submit } = setup();
    await queue.enqueue(item());
    await queue.discard('AAAA');
    await queue.flush();
    expect(disk.size).toBe(0);
    expect(submit).not.toHaveBeenCalled();
  });
});
