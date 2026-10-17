import { HttpError } from '../http/http.js';
import { isTemplateId } from '../../shared/templates.js';
import type { InvitationRepository } from '../repositories/invitationRepository.js';
import type { OrderedRepository } from '../repositories/contentRepositories.js';
import type { wishRepository } from '../repositories/guestRepositories.js';
import type {
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
  'heroImage', 'heroVideoUrl', 'heroMediaType', 'quoteText', 'quoteSource',
];
const THEME_KEYS: (keyof ThemeSettings)[] = [
  'templateId', 'themeColor', 'musicUrl', 'musicTitle', 'weddingDate', 'countdownTarget', 'whatsappNumber', 'whatsappTemplate',
];

const pick = <T extends object>(source: Partial<T>, keys: (keyof T)[]): Partial<T> =>
  Object.fromEntries(keys.filter((k) => source[k] !== undefined).map((k) => [k, source[k]])) as Partial<T>;

interface Deps {
  invitation: InvitationRepository;
  events: OrderedRepository<WeddingEvent>;
  stories: OrderedRepository<LoveStoryItem>;
  gifts: OrderedRepository<GiftAccount>;
  gallery: OrderedRepository<GalleryPhoto>;
  wishes: ReturnType<typeof wishRepository>;
}

export function invitationService(d: Deps) {
  const core = async () => {
    const inv = await d.invitation.get();
    if (!inv) throw new HttpError(503, 'Data undangan belum disiapkan. Jalankan seed database.');
    return inv;
  };

  return {
    /** Everything the public page renders in one request. */
    async publicInvitation(): Promise<InvitationData> {
      const [inv, events, gallery, loveStories, giftInfo, stats] = await Promise.all([
        core(), d.events.list(), d.gallery.list(), d.stories.list(), d.gifts.list(), d.wishes.stats(),
      ]);
      return { ...inv, events, gallery, loveStories, giftInfo, stats };
    },

    async couple(): Promise<CoupleProfile> {
      return pick(await core(), COUPLE_KEYS) as CoupleProfile;
    },

    async saveCouple(input: Partial<CoupleProfile>): Promise<CoupleProfile> {
      return pick(await d.invitation.update(pick(input, COUPLE_KEYS)), COUPLE_KEYS) as CoupleProfile;
    },

    async theme(): Promise<ThemeSettings> {
      return pick(await core(), THEME_KEYS) as ThemeSettings;
    },

    async saveTheme(input: Partial<ThemeSettings>): Promise<ThemeSettings> {
      if (input.themeColor && !THEMES.includes(input.themeColor)) throw new HttpError(400, 'Preset warna tidak dikenal.');
      if (input.templateId && !isTemplateId(input.templateId)) throw new HttpError(400, 'Template tidak dikenal.');
      for (const key of ['weddingDate', 'countdownTarget'] as const) {
        if (input[key] && Number.isNaN(new Date(input[key]!).getTime())) throw new HttpError(400, 'Tanggal tidak valid.');
      }
      return pick(await d.invitation.update(pick(input, THEME_KEYS)), THEME_KEYS) as ThemeSettings;
    },

    async cmsStats(): Promise<CMSStatsData> {
      const [stats, eventsCount, galleryCount, storiesCount, giftsCount, recentGuests] = await Promise.all([
        d.wishes.stats(), d.events.count(), d.gallery.count(), d.stories.count(), d.gifts.count(), d.wishes.recent(5),
      ]);
      return { stats, counts: { eventsCount, galleryCount, storiesCount, giftsCount }, recentGuests };
    },

    async general() {
      const inv = await core();
      return { invitationId: inv.id, weddingDate: inv.weddingDate, groomShortName: inv.groomShortName, brideShortName: inv.brideShortName };
    },
  };
}

export type InvitationService = ReturnType<typeof invitationService>;
