import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { HttpError, badRequest, notFound } from '../http/http.js';
import { DEFAULT_CAMERA_SETTINGS } from '../repositories/guestRepositories.js';
import type {
  cameraSettingRepository,
  frameRepository,
  invitedGuestRepository,
  photoCommentRepository,
  photoMomentRepository,
} from '../repositories/guestRepositories.js';
import type { CameraConfig, CameraSettings, MomentIdentity, PhotoFrameConfig } from '../../shared/types.js';

interface Deps {
  moments: ReturnType<typeof photoMomentRepository>;
  comments: ReturnType<typeof photoCommentRepository>;
  frames: ReturnType<typeof frameRepository>;
  settings: ReturnType<typeof cameraSettingRepository>;
  guests: ReturnType<typeof invitedGuestRepository>;
}

/** A file this server stored for a guest: one plain filename under /uploads/moments, no path tricks. */
const MOMENT_FILE = /^\/uploads\/moments\/[A-Za-z0-9][A-Za-z0-9._-]*$/;
/** The reactions the guest feed offers; anything else is rejected so the counts cannot be flooded with arbitrary keys. */
export const REACTION_EMOJIS = ['❤️', '😍', '🎉', '👏', '😊', '🙏'];
const fileExists = (url: string) => fs.access(path.join(config.uploadDir, 'moments', path.basename(url))).then(() => true, () => false);

/** Checks that an uploaded photo URL points at a real file in the moments folder. */
async function assertStoredPhoto(url: unknown, message: string) {
  if (typeof url !== 'string' || !MOMENT_FILE.test(url) || url.includes('..') || !(await fileExists(url))) throw badRequest(message);
  return url;
}
const isGenericName = (name: string) => !name.trim() || name.trim().toLowerCase() === 'tamu undangan';
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

const ACCESS = ['INVITED', 'ANYONE'] as const;
const VISIBILITY = ['ALL', 'OWN'] as const;
const DOWNLOAD = ['NONE', 'OWN', 'ALL'] as const;
const oneOf = <T extends string>(list: readonly T[], v: unknown, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);

export function photoMomentService(d: Deps) {
  /**
   * Resolve who is acting, enforcing the couple's access rule on the server: an invited guest is
   * identified by code (and must be checked in when the rule says so); with ANYONE a plain name is enough.
   */
  async function identify(input: { guestName?: unknown; guestSlug?: unknown }, settings: CameraSettings): Promise<MomentIdentity> {
    const slug = clean(input.guestSlug, 8).toUpperCase();
    const guest = slug ? await d.guests.findBySlug(slug) : null;
    if (guest) {
      if (settings.requireCheckIn && !guest.isCheckedIn) {
        throw new HttpError(403, 'Kamera terbuka setelah Anda tercatat hadir. Konfirmasi kehadiran Anda atau lapor ke meja penerima tamu.', 'CHECK_IN_REQUIRED');
      }
      return { name: guest.name, slug: guest.slug };
    }
    if (settings.access !== 'ANYONE') throw new HttpError(403, 'Kode undangan tidak dikenali. Buka kamera dari tautan undangan Anda.');
    const name = clean(input.guestName, 60);
    if (isGenericName(name)) throw badRequest('Tulis nama Anda dulu.');
    return { name };
  }

  /** Viewer for read-only requests: never throws, unknown viewers just see the public feed. */
  async function viewer(guestName: string, guestSlug: string): Promise<MomentIdentity | undefined> {
    const slug = guestSlug.trim().toUpperCase();
    if (slug) {
      const guest = await d.guests.findBySlug(slug);
      if (guest) return { name: guest.name, slug: guest.slug };
    }
    return isGenericName(guestName) ? undefined : { name: guestName.trim() };
  }

  const countFor = (who: MomentIdentity) => (who.slug ? d.moments.countBySlug(who.slug) : d.moments.countByName(who.name));

  return {
    async config(): Promise<CameraConfig> {
      return { settings: await d.settings.get(), frame: await this.frame() };
    },

    settings: () => d.settings.get(),

    async saveSettings(input: Partial<CameraSettings>): Promise<CameraSettings> {
      const current = await d.settings.get();
      const next: CameraSettings = {
        access: oneOf(ACCESS, input.access, current.access),
        requireCheckIn: typeof input.requireCheckIn === 'boolean' ? input.requireCheckIn : current.requireCheckIn,
        framesPerGuest: Math.min(
          50,
          Math.max(1, Math.round(Number(input.framesPerGuest ?? current.framesPerGuest)) || DEFAULT_CAMERA_SETTINGS.framesPerGuest),
        ),
        cameraOpen: typeof input.cameraOpen === 'boolean' ? input.cameraOpen : current.cameraOpen,
        moderation: typeof input.moderation === 'boolean' ? input.moderation : current.moderation,
        visibility: oneOf(VISIBILITY, input.visibility, current.visibility),
        download: oneOf(DOWNLOAD, input.download, current.download),
        enabledLooks: Array.isArray(input.enabledLooks)
          ? input.enabledLooks.filter((l): l is string => typeof l === 'string').slice(0, 40)
          : current.enabledLooks,
        defaultLook: typeof input.defaultLook === 'string' ? input.defaultLook.slice(0, 20) : current.defaultLook,
        screenEnabled: typeof input.screenEnabled === 'boolean' ? input.screenEnabled : current.screenEnabled,
      };
      return d.settings.save(next);
    },

    async page(params: { page: number; limit: number; guestName: string; guestSlug: string }) {
      const settings = await d.settings.get();
      const page = Math.max(1, params.page || 1);
      const limit = Math.min(50, Math.max(1, params.limit || 12));
      const who = await viewer(params.guestName, params.guestSlug);
      const { data, total } = await d.moments.page((page - 1) * limit, limit, {
        approvedOrOwn: true,
        ownOnly: settings.visibility === 'OWN',
        own: who,
      });
      return { data, total, page, limit, hasMore: page * limit < total, userCount: who ? await countFor(who) : 0 };
    },

    async add(input: { guestName?: string; guestSlug?: string; photoUrl?: string; originalUrl?: string; caption?: string; look?: string; frames?: number }) {
      const settings = await d.settings.get();
      if (!settings.cameraOpen) throw new HttpError(403, 'Kamera tamu sudah ditutup. Foto yang sudah masuk tetap tersimpan.');
      const photoUrl = await assertStoredPhoto(input.photoUrl, 'Foto belum terunggah.');
      const originalUrl = input.originalUrl ? await assertStoredPhoto(input.originalUrl, 'Foto asli tidak valid.') : undefined;
      if (originalUrl === photoUrl) throw badRequest('Foto asli tidak valid.');
      const who = await identify(input, settings);
      // A collage uses one frame per shot it holds.
      const frames = Math.min(4, Math.max(1, Math.round(Number(input.frames)) || 1));
      // A file can belong to one photo only, so nobody can re-register another guest's upload as their own.
      if (await d.moments.urlInUse(originalUrl ? [photoUrl, originalUrl] : [photoUrl])) throw badRequest('Foto ini sudah tersimpan.');
      const created = await d.moments.createWithinQuota(who, settings.framesPerGuest, {
        guestName: who.name,
        guestSlug: who.slug,
        photoUrl,
        originalUrl,
        caption: clean(input.caption, 140),
        look: clean(input.look, 20) || undefined,
        approved: !settings.moderation,
        frames,
      });
      if (!created) {
        throw new HttpError(400, frames > 1 ? `Sisa frame Anda tidak cukup untuk kolase ${frames} foto (jatah ${settings.framesPerGuest} frame).` : `Jatah ${settings.framesPerGuest} foto Anda sudah habis. Terima kasih sudah ikut mengabadikan.`);
      }
      return created;
    },

    async react(id: string, emoji: string, action: 'add' | 'remove') {
      if (!REACTION_EMOJIS.includes(emoji)) throw badRequest('Reaksi tidak dikenal.');
      const saved = await d.moments.react(id, emoji, action === 'add' ? 1 : -1);
      if (!saved) throw notFound('Foto tidak ditemukan.');
      return { likesCount: saved.likesCount || 0, reactions: saved.reactions || {} };
    },

    async comments(id: string) {
      if (!(await d.moments.findById(id))) throw notFound('Foto tidak ditemukan.');
      return d.comments.list(id);
    },

    async addComment(id: string, input: { guestName?: string; guestSlug?: string; text?: string }) {
      const photo = await d.moments.findById(id);
      if (!photo) throw notFound('Foto tidak ditemukan.');
      const text = clean(input.text, 300);
      if (!text) throw badRequest('Komentarnya masih kosong.');
      // Commenting follows the same access rule as the camera, but stays open after the camera closes.
      const who = await identify(input, await d.settings.get());
      return d.comments.create({ momentId: id, guestName: who.name, guestSlug: who.slug, text });
    },

    async removeComment(id: string) {
      if (!(await d.comments.remove(id))) throw notFound('Komentar tidak ditemukan.');
    },

    /** Big-screen slideshow: newest approved photos. */
    async screen() {
      const settings = await d.settings.get();
      if (!settings.screenEnabled) throw new HttpError(403, 'Layar besar sedang dimatikan.');
      const [data, total] = await Promise.all([d.moments.latestApproved(40), d.moments.countApproved()]);
      return { data, total };
    },

    all: () => d.moments.all(),
    approveAllPending: () => d.moments.approveAllPending(),

    async approve(id: string, approved: boolean) {
      const saved = await d.moments.setApproved(id, approved);
      if (!saved) throw notFound('Foto tidak ditemukan.');
      return saved;
    },

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
