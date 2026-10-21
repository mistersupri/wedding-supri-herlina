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

const MOMENT_PATH = '/uploads/moments/';
const isGenericName = (name: string) => !name.trim() || name.trim().toLowerCase() === 'tamu undangan';
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const ACCESS = ['CHECKED_IN', 'INVITED', 'ANYONE'] as const;
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
      if (settings.access === 'CHECKED_IN' && !guest.isCheckedIn) {
        throw new HttpError(403, 'Kamera terbuka setelah Anda tercatat hadir di meja penerima tamu.');
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

    async add(input: { guestName?: string; guestSlug?: string; photoUrl?: string; originalUrl?: string; caption?: string; look?: string }) {
      const settings = await d.settings.get();
      if (!settings.cameraOpen) throw new HttpError(403, 'Kamera tamu sudah ditutup. Foto yang sudah masuk tetap tersimpan.');
      if (typeof input.photoUrl !== 'string' || !input.photoUrl.startsWith(MOMENT_PATH)) throw badRequest('Foto belum terunggah.');
      if (input.originalUrl && (typeof input.originalUrl !== 'string' || !input.originalUrl.startsWith(MOMENT_PATH)))
        throw badRequest('Foto asli tidak valid.');
      const who = await identify(input, settings);
      if ((await countFor(who)) >= settings.framesPerGuest) {
        throw new HttpError(400, `Jatah ${settings.framesPerGuest} foto Anda sudah habis. Terima kasih sudah ikut mengabadikan.`);
      }
      return d.moments.create({
        guestName: who.name,
        guestSlug: who.slug,
        photoUrl: input.photoUrl,
        originalUrl: input.originalUrl || undefined,
        caption: clean(input.caption, 140),
        look: clean(input.look, 20) || undefined,
        approved: !settings.moderation,
      });
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
