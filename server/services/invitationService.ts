import { HttpError } from '../http/http.js';
import { whatsappDigits } from '../../shared/phone.js';
import { cleanInstagram, isInstagramHandle } from '../../shared/handles.js';
import { isTemplateId } from '../../shared/templates.js';
import type { InvitationRepository } from '../repositories/invitationRepository.js';
import type { OrderedRepository } from '../repositories/contentRepositories.js';
import type { cameraSettingRepository, wishRepository } from '../repositories/guestRepositories.js';
import { TEXT_KEYS } from '../../shared/types.js';
import type {
  HeroSlide,
  TemplateTexts,
  TextKey,
  CMSStatsData,
  CoupleProfile,
  GalleryPhoto,
  GiftAccount,
  InvitationData,
  LoveStoryItem,
  ThemePreset,
  ThemeSettings,
  WeddingEvent,
} from '../../shared/types.js';

const THEMES: ThemePreset[] = ['sogan', 'wedel', 'gadung', 'jambon'];

const COUPLE_KEYS: (keyof CoupleProfile)[] = [
  'groomName', 'groomShortName', 'groomParents', 'groomInstagram', 'groomPhoto',
  'brideName', 'brideShortName', 'brideParents', 'brideInstagram', 'bridePhoto',
  'heroImage', 'heroVideoUrl', 'heroMediaType', 'heroSlides', 'texts', 'quoteText', 'quoteSource',
];
const THEME_KEYS: (keyof ThemeSettings)[] = [
  'templateId', 'themeColor', 'musicUrl', 'musicTitle', 'weddingDate', 'countdownTarget', 'whatsappNumber', 'whatsappTemplate',
];

export const MAX_HERO_SLIDES = 5;
const MEDIA_URL = /^(https?:\/\/|\/uploads\/)\S{1,1000}$/;

/** The opening-screen sequence: a few photos and videos, each with a real address. */
export function cleanSlides(raw: unknown): HeroSlide[] {
  if (!Array.isArray(raw)) throw new HttpError(400, 'Daftar foto dan video sampul tidak valid.');
  if (raw.length > MAX_HERO_SLIDES) throw new HttpError(400, `Sampul paling banyak ${MAX_HERO_SLIDES} foto atau video.`);
  return raw.map((item, i) => {
    const slide = item as Partial<HeroSlide>;
    const type = slide.type === 'VIDEO' ? 'VIDEO' : 'IMAGE';
    if (typeof slide.url !== 'string' || !MEDIA_URL.test(slide.url.trim())) throw new HttpError(400, `Sampul nomor ${i + 1} belum punya foto atau video yang valid.`);
    const poster = typeof slide.poster === 'string' && MEDIA_URL.test(slide.poster.trim()) ? slide.poster.trim() : undefined;
    return { type, url: slide.url.trim(), ...(type === 'VIDEO' && poster ? { poster } : {}) };
  });
}

const TEXT_LIMITS: Record<TextKey, number> = { greetingTitle: 120, greetingBody: 400, closing: 400, letter: 600, credits: 160, receiptNote: 80 };

/** Only the known text slots, trimmed and capped; a blank one is dropped so the template's own wording returns. */
export function cleanTexts(raw: unknown): TemplateTexts {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new HttpError(400, 'Teks undangan tidak valid.');
  const out: TemplateTexts = {};
  for (const key of TEXT_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) out[key] = value.trim().slice(0, TEXT_LIMITS[key]);
  }
  return out;
}

/** Fields of an event that only invited guests may read. */
const redactEvent = (e: WeddingEvent): WeddingEvent => ({ ...e, address: '', mapsUrl: '', mapsEmbedUrl: undefined });

const pick = <T extends object>(source: Partial<T>, keys: (keyof T)[]): Partial<T> =>
  Object.fromEntries(keys.filter((k) => source[k] !== undefined).map((k) => [k, source[k]])) as Partial<T>;

interface Deps {
  invitation: InvitationRepository;
  events: OrderedRepository<WeddingEvent>;
  stories: OrderedRepository<LoveStoryItem>;
  gifts: OrderedRepository<GiftAccount>;
  gallery: OrderedRepository<GalleryPhoto>;
  wishes: ReturnType<typeof wishRepository>;
  cameraSettings: ReturnType<typeof cameraSettingRepository>;
  moments: { countPending(): Promise<number> };
  attendanceRules: () => Promise<{ selfCheckIn: boolean; verifyLocation: boolean }>;
}

export function invitationService(d: Deps) {
  const core = async () => {
    const inv = await d.invitation.get();
    if (!inv) throw new HttpError(503, 'Data undangan belum disiapkan. Impor data (`yarn db:import-json`) atau jalankan seed database.');
    return inv;
  };

  return {
    /** Everything the public page renders in one request. */
    async publicInvitation(): Promise<InvitationData> {
      const [inv, events, gallery, loveStories, giftInfo, stats, camera, attendance] = await Promise.all([
        core(), d.events.list(), d.gallery.list(), d.stories.list(), d.gifts.list(), d.wishes.stats(), d.cameraSettings.get(), d.attendanceRules(),
      ]);
      // Addresses, map links and bank accounts leave the server only through guestDetails(), behind an invitation code.
      return {
        ...inv,
        events: events.map(redactEvent),
        gallery,
        loveStories,
        giftInfo: [],
        stats,
        photoMoments: { access: camera.access, cameraOpen: camera.cameraOpen, requireCheckIn: camera.requireCheckIn },
        attendance,
      };
    },

    /** The parts of the invitation held back from the public page. Callers must have verified an invitation code. */
    async guestDetails(): Promise<Pick<InvitationData, 'events' | 'giftInfo'>> {
      const [events, giftInfo] = await Promise.all([d.events.list(), d.gifts.list()]);
      return { events, giftInfo };
    },

    async couple(): Promise<CoupleProfile> {
      return pick(await core(), COUPLE_KEYS) as CoupleProfile;
    },

    async saveCouple(input: Partial<CoupleProfile>): Promise<CoupleProfile> {
      for (const key of ['groomInstagram', 'brideInstagram'] as const) {
        if (typeof input[key] === 'string') {
          const handle = cleanInstagram(input[key]!);
          if (handle && !isInstagramHandle(handle)) throw new HttpError(400, 'Nama Instagram hanya boleh berisi huruf, angka, titik, dan garis bawah.');
          input[key] = handle;
        }
      }
      if (input.heroSlides !== undefined) input.heroSlides = cleanSlides(input.heroSlides);
      if (input.texts !== undefined) input.texts = cleanTexts(input.texts);
      return pick(await d.invitation.update(pick(input, COUPLE_KEYS)), COUPLE_KEYS) as CoupleProfile;
    },

    async theme(): Promise<ThemeSettings> {
      return pick(await core(), THEME_KEYS) as ThemeSettings;
    },

    async saveTheme(input: Partial<ThemeSettings>): Promise<ThemeSettings> {
      if (input.themeColor && !THEMES.includes(input.themeColor)) throw new HttpError(400, 'Preset warna tidak dikenal.');
      if (input.templateId && !isTemplateId(input.templateId)) throw new HttpError(400, 'Template tidak dikenal.');
      if (typeof input.whatsappNumber === 'string' && input.whatsappNumber.trim()) {
        const digits = whatsappDigits(input.whatsappNumber);
        if (!digits) throw new HttpError(400, 'Nomor WhatsApp tidak valid. Contoh: 0812-3456-7890 atau 6281234567890.');
        input.whatsappNumber = digits;
      }
      for (const key of ['weddingDate', 'countdownTarget'] as const) {
        if (input[key] && Number.isNaN(new Date(input[key]!).getTime())) throw new HttpError(400, 'Tanggal tidak valid.');
      }
      return pick(await d.invitation.update(pick(input, THEME_KEYS)), THEME_KEYS) as ThemeSettings;
    },

    async cmsStats(): Promise<CMSStatsData> {
      const [stats, eventsCount, galleryCount, storiesCount, giftsCount, recentGuests, pendingMoments] = await Promise.all([
        d.wishes.stats(), d.events.count(), d.gallery.count(), d.stories.count(), d.gifts.count(), d.wishes.recent(5), d.moments.countPending(),
      ]);
      return { stats, counts: { eventsCount, galleryCount, storiesCount, giftsCount }, recentGuests, pendingMoments };
    },

    /** What a chat app needs to preview the link: the couple, the date and a picture. Reads one row only. */
    async shareInfo() {
      const inv = await core();
      return {
        groomShortName: inv.groomShortName,
        brideShortName: inv.brideShortName,
        weddingDate: inv.weddingDate,
        image: inv.heroImage || inv.bridePhoto || inv.groomPhoto || '',
      };
    },

    async general() {
      const inv = await core();
      return { invitationId: inv.id, weddingDate: inv.weddingDate, groomShortName: inv.groomShortName, brideShortName: inv.brideShortName };
    },
  };
}

export type InvitationService = ReturnType<typeof invitationService>;
