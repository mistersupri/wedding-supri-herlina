import { config } from '../config.js';
import { HttpError, badRequest, notFound } from '../http/http.js';
import type { frameRepository, invitedGuestRepository, photoMomentRepository } from '../repositories/guestRepositories.js';
import type { PhotoFrameConfig } from '../../shared/types.js';

interface Deps {
  moments: ReturnType<typeof photoMomentRepository>;
  frames: ReturnType<typeof frameRepository>;
  guests: ReturnType<typeof invitedGuestRepository>;
}

const isGenericName = (name: string) => !name.trim() || name.trim().toLowerCase() === 'tamu undangan';

export function photoMomentService(d: Deps) {
  /** A guest is counted by code when we can resolve one, else by exact name. */
  const resolveSlug = async (guestName: string, guestSlug?: string) => {
    if (guestSlug?.trim()) return guestSlug.trim().toUpperCase();
    if (isGenericName(guestName)) return undefined;
    const match = await d.guests.findByName(guestName);
    return match && match.name.trim().toLowerCase() === guestName.trim().toLowerCase() ? match.slug : undefined;
  };

  const countFor = async (guestName: string, slug?: string) => {
    if (slug) return d.moments.countBySlug(slug);
    return isGenericName(guestName) ? 0 : d.moments.countByName(guestName);
  };

  return {
    async page(params: { page: number; limit: number; guestName: string; guestSlug: string }) {
      const page = Math.max(1, params.page || 1);
      const limit = Math.min(50, Math.max(1, params.limit || 10));
      const { data, total } = await d.moments.page((page - 1) * limit, limit);
      const slug = await resolveSlug(params.guestName, params.guestSlug);
      return { data, total, page, limit, hasMore: page * limit < total, userCount: await countFor(params.guestName, slug) };
    },

    async add(input: { guestName?: string; guestSlug?: string; photoUrl?: string; caption?: string }) {
      if (typeof input.photoUrl !== 'string' || !input.photoUrl.startsWith('/uploads/moments/')) throw badRequest('Foto belum terunggah.');
      const guestName = input.guestName?.trim() || 'Tamu Undangan';
      const slug = await resolveSlug(guestName, input.guestSlug);
      if ((await countFor(guestName, slug)) >= config.photoMomentsPerGuest) {
        throw new HttpError(400, `Batas ${config.photoMomentsPerGuest} foto per tamu sudah tercapai.`);
      }
      return d.moments.create({ guestName, guestSlug: slug, photoUrl: input.photoUrl, caption: input.caption?.trim().slice(0, 140) || '' });
    },

    async react(id: string, emoji: string, action: 'add' | 'remove') {
      const photo = await d.moments.findById(id);
      if (!photo) throw notFound('Foto tidak ditemukan.');
      const reactions = { ...(photo.reactions || {}) };
      const delta = action === 'add' ? 1 : -1;
      reactions[emoji] = Math.max(0, (reactions[emoji] || 0) + delta);
      if (reactions[emoji] === 0) delete reactions[emoji];
      const likesCount = Math.max(0, (photo.likesCount || 0) + delta);
      const saved = await d.moments.saveReactions(id, reactions, likesCount);
      return { likesCount: saved.likesCount || 0, reactions: saved.reactions || {} };
    },

    all: () => d.moments.all(),

    async remove(id: string) {
      if (!(await d.moments.remove(id))) throw notFound('Foto tidak ditemukan.');
    },

    async frame(): Promise<PhotoFrameConfig> {
      return (await d.frames.get()) ?? { enabled: false, frameOverlayUrl: '', allowGuestToggle: true };
    },

    async saveFrame(patch: Partial<PhotoFrameConfig>) {
      const current = await this.frame();
      return d.frames.save({ ...current, ...patch });
    },
  };
}

export type PhotoMomentService = ReturnType<typeof photoMomentService>;
