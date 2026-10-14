import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { HttpError } from '../http.js';
import { createSeedData } from './seed.js';
import type { DatabaseSchema, StoredAdminUser } from './schema.js';
import type {
  CMSStatsData,
  CoupleProfile,
  GalleryPhoto,
  GiftAccount,
  GuestWish,
  InvitationData,
  InvitedGuest,
  InvitedGuestInput,
  LoveStoryItem,
  PhotoFrameConfig,
  PhotoMoment,
  PresensiStats,
  RSVPStats,
  ThemePreset,
  ThemeSettings,
  WeddingEvent,
} from '../../src/types.js';

type WithId = { id: string };

const now = () => new Date().toISOString();
const randomSuffix = () => Math.random().toString(36).substring(2, 7);
const newId = (prefix: string) => `${prefix}_${Date.now()}_${randomSuffix()}`;
const normalize = (text: string | undefined | null) => (text || '').trim().toLowerCase();
const byOrderIndex = <T extends { orderIndex: number }>(a: T, b: T) => a.orderIndex - b.orderIndex;
const byNewest = <T extends { createdAt: string }>(a: T, b: T) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

function patchById<T extends WithId>(list: T[], id: string, patch: Partial<T>): T | null {
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) return null;
  list[index] = { ...list[index], ...patch, id };
  return list[index];
}

function removeById<T extends WithId>(list: T[], id: string): boolean {
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) return false;
  list.splice(index, 1);
  return true;
}

/** Theme keys from before the Nusantara redesign, mapped to their closest new preset. */
const LEGACY_THEMES: Record<string, ThemePreset> = {
  natural: 'sogan',
  gold: 'sogan',
  ivory: 'sogan',
  rose: 'jambon',
  sage: 'gadung',
};
const THEMES: ThemePreset[] = ['sogan', 'wedel', 'gadung', 'jambon'];

const SLUG_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** JSON-file store. Every mutation writes the whole file; the data set is one wedding. */
class WeddingDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  // --- Persistence ---

  private load(): DatabaseSchema {
    const seed = createSeedData();
    try {
      if (fs.existsSync(config.dataFile)) {
        const parsed = JSON.parse(fs.readFileSync(config.dataFile, 'utf-8')) as Partial<DatabaseSchema>;
        const data: DatabaseSchema = {
          ...seed,
          ...parsed,
          invitation: { ...seed.invitation, ...parsed.invitation },
          invitedGuests: Array.isArray(parsed.invitedGuests) ? parsed.invitedGuests : seed.invitedGuests,
          photoMoments: Array.isArray(parsed.photoMoments) ? parsed.photoMoments : [],
          photoFrameConfig: parsed.photoFrameConfig || seed.photoFrameConfig,
          admins: Array.isArray(parsed.admins) ? parsed.admins : [],
        };
        this.migrate(data);
        return data;
      }
    } catch (err) {
      console.error('Could not read the data file, starting from the demo seed:', err);
    }
    this.write(seed);
    return seed;
  }

  private migrate(data: DatabaseSchema) {
    const theme = data.invitation.themeColor as string;
    if (!THEMES.includes(theme as ThemePreset)) {
      data.invitation.themeColor = LEGACY_THEMES[theme] || 'sogan';
    }
    // The env superadmin always wins over a stored account with the same username, so an
    // old seeded password for that username can no longer be used to sign in.
    data.admins = data.admins.filter((a) => normalize(a.username) !== normalize(config.admin.username));
  }

  private write(data: DatabaseSchema) {
    fs.mkdirSync(path.dirname(config.dataFile), { recursive: true });
    const tmp = `${config.dataFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, config.dataFile);
  }

  private save() {
    this.write(this.data);
  }

  /** Run a mutation and persist only when it reports a change. */
  private commit<R>(result: R): R {
    if (result) this.save();
    return result;
  }

  resetToDefault(): InvitationData {
    this.data = createSeedData();
    this.save();
    return this.getInvitationData();
  }

  // --- Invitation ---

  getInvitationData(): InvitationData {
    return {
      ...this.data.invitation,
      events: this.getEvents(),
      gallery: this.getGallery(),
      stats: this.getRSVPStats(),
    };
  }

  getCoupleData(): CoupleProfile {
    const i = this.data.invitation;
    return {
      groomName: i.groomName,
      groomShortName: i.groomShortName,
      groomParents: i.groomParents,
      groomInstagram: i.groomInstagram,
      groomPhoto: i.groomPhoto,
      brideName: i.brideName,
      brideShortName: i.brideShortName,
      brideParents: i.brideParents,
      brideInstagram: i.brideInstagram,
      bridePhoto: i.bridePhoto,
      heroImage: i.heroImage,
      heroVideoUrl: i.heroVideoUrl,
      heroMediaType: i.heroMediaType,
      quoteText: i.quoteText,
      quoteSource: i.quoteSource,
    };
  }

  updateCoupleData(updates: Partial<CoupleProfile>): CoupleProfile {
    Object.assign(this.data.invitation, updates);
    this.save();
    return this.getCoupleData();
  }

  getThemeData(): ThemeSettings {
    const i = this.data.invitation;
    return {
      themeColor: i.themeColor,
      musicUrl: i.musicUrl,
      musicTitle: i.musicTitle,
      weddingDate: i.weddingDate,
      countdownTarget: i.countdownTarget,
      whatsappNumber: i.whatsappNumber,
      whatsappTemplate: i.whatsappTemplate,
    };
  }

  updateThemeData(updates: Partial<ThemeSettings>): ThemeSettings {
    if (updates.themeColor && !THEMES.includes(updates.themeColor)) {
      throw new HttpError(400, 'Preset tema tidak dikenal.');
    }
    Object.assign(this.data.invitation, updates);
    this.save();
    return this.getThemeData();
  }

  getCMSStats(): CMSStatsData {
    return {
      stats: this.getRSVPStats(),
      counts: {
        eventsCount: this.data.events.length,
        galleryCount: this.data.gallery.length,
        storiesCount: this.data.invitation.loveStories.length,
        giftsCount: this.data.invitation.giftInfo.length,
      },
      recentGuests: [...this.data.guests].sort(byNewest).slice(0, 5),
    };
  }

  // --- Events ---

  getEvents(): WeddingEvent[] {
    return [...this.data.events].sort(byOrderIndex);
  }

  createEvent(input: Omit<WeddingEvent, 'id'>): WeddingEvent {
    const event = { ...input, id: newId('event'), orderIndex: input.orderIndex || this.data.events.length + 1 };
    this.data.events.push(event);
    this.save();
    return event;
  }

  updateEvent(id: string, patch: Partial<WeddingEvent>) {
    return this.commit(patchById(this.data.events, id, patch));
  }

  deleteEvent(id: string) {
    return this.commit(removeById(this.data.events, id));
  }

  // --- Love stories ---

  getLoveStories(): LoveStoryItem[] {
    return [...this.data.invitation.loveStories];
  }

  createLoveStory(input: Omit<LoveStoryItem, 'id'>): LoveStoryItem {
    const story = { ...input, id: newId('story') };
    this.data.invitation.loveStories.push(story);
    this.save();
    return story;
  }

  updateLoveStory(id: string, patch: Partial<LoveStoryItem>) {
    return this.commit(patchById(this.data.invitation.loveStories, id, patch));
  }

  deleteLoveStory(id: string) {
    return this.commit(removeById(this.data.invitation.loveStories, id));
  }

  // --- Gift accounts ---

  getGiftAccounts(): GiftAccount[] {
    return [...this.data.invitation.giftInfo];
  }

  createGiftAccount(input: Omit<GiftAccount, 'id'>): GiftAccount {
    const gift = { ...input, id: newId('gift') };
    this.data.invitation.giftInfo.push(gift);
    this.save();
    return gift;
  }

  updateGiftAccount(id: string, patch: Partial<GiftAccount>) {
    return this.commit(patchById(this.data.invitation.giftInfo, id, patch));
  }

  deleteGiftAccount(id: string) {
    return this.commit(removeById(this.data.invitation.giftInfo, id));
  }

  // --- Gallery ---

  getGallery(): GalleryPhoto[] {
    return [...this.data.gallery].sort(byOrderIndex);
  }

  createGalleryPhotos(inputs: Omit<GalleryPhoto, 'id'>[]): GalleryPhoto[] {
    const start = this.data.gallery.length;
    const created = inputs.map((p, i) => ({ ...p, id: newId('gal'), orderIndex: p.orderIndex || start + i + 1 }));
    this.data.gallery.push(...created);
    this.save();
    return created;
  }

  updateGalleryPhoto(id: string, patch: Partial<GalleryPhoto>) {
    return this.commit(patchById(this.data.gallery, id, patch));
  }

  deleteGalleryPhoto(id: string) {
    return this.commit(removeById(this.data.gallery, id));
  }

  // --- Guestbook & RSVP ---

  getPublicGuests(): GuestWish[] {
    return this.data.guests.filter((g) => !g.isHidden).sort(byNewest);
  }

  getAllGuests(status = 'ALL', search = ''): GuestWish[] {
    const q = normalize(search);
    return [...this.data.guests]
      .sort(byNewest)
      .filter((g) => status === 'ALL' || g.attendanceStatus === status)
      .filter((g) => !q || normalize(g.guestName).includes(q) || normalize(g.message).includes(q) || normalize(g.relationship).includes(q));
  }

  /** One wish per guest name: a second submission updates the RSVP instead of duplicating it. */
  addGuestWish(input: Omit<GuestWish, 'id' | 'createdAt' | 'isHidden' | 'reply'>): GuestWish {
    const numberOfGuests = Number(input.numberOfGuests) || 1;
    const existing = this.data.guests.find((g) => normalize(g.guestName) === normalize(input.guestName));
    if (existing) {
      existing.attendanceStatus = input.attendanceStatus;
      existing.numberOfGuests = numberOfGuests;
      if (input.message) existing.message = input.message;
      if (input.voiceUrl !== undefined) existing.voiceUrl = input.voiceUrl;
      this.save();
      return existing;
    }

    const wish: GuestWish = {
      ...input,
      id: newId('guest'),
      numberOfGuests,
      reply: null,
      isHidden: false,
      createdAt: now(),
    };
    this.data.guests.unshift(wish);
    this.save();
    return wish;
  }

  replyToGuest(id: string, reply: string) {
    return this.commit(patchById(this.data.guests, id, { reply }));
  }

  toggleGuestVisibility(id: string) {
    const wish = this.data.guests.find((g) => g.id === id);
    if (!wish) return null;
    wish.isHidden = !wish.isHidden;
    this.save();
    return wish;
  }

  deleteGuest(id: string) {
    return this.commit(removeById(this.data.guests, id));
  }

  getRSVPStats(): RSVPStats {
    const stats: RSVPStats = {
      totalWishes: this.data.guests.length,
      attendingCount: 0,
      declinedCount: 0,
      tentativeCount: 0,
      totalGuestSeats: 0,
    };
    for (const g of this.data.guests) {
      if (g.attendanceStatus === 'HADIR') {
        stats.attendingCount++;
        stats.totalGuestSeats += g.numberOfGuests || 1;
      } else if (g.attendanceStatus === 'TIDAK_HADIR') {
        stats.declinedCount++;
      } else {
        stats.tentativeCount++;
      }
    }
    return stats;
  }

  // --- Invited guests & check-in ---

  private generateUniqueSlug(): string {
    const taken = new Set(this.data.invitedGuests.map((g) => g.slug.toUpperCase()));
    for (let attempt = 0; attempt < 1000; attempt++) {
      let slug = '';
      for (let i = 0; i < 4; i++) slug += SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)];
      if (!taken.has(slug)) return slug;
    }
    throw new HttpError(409, 'Kode undangan 4 karakter sudah habis terpakai.');
  }

  getAllInvitedGuests(filter = 'ALL', search = ''): InvitedGuest[] {
    const q = normalize(search);
    return this.data.invitedGuests
      .filter((g) => {
        if (filter === 'ALL') return true;
        if (filter === 'CHECKED_IN') return g.isCheckedIn;
        if (filter === 'NOT_CHECKED_IN') return !g.isCheckedIn;
        return normalize(g.category) === normalize(filter);
      })
      .filter(
        (g) =>
          !q ||
          normalize(g.name).includes(q) ||
          normalize(g.slug).includes(q) ||
          (g.phone || '').includes(q) ||
          normalize(g.tableNumber).includes(q) ||
          normalize(g.category).includes(q),
      )
      .sort((a, b) => (a.isCheckedIn !== b.isCheckedIn ? (a.isCheckedIn ? 1 : -1) : a.name.localeCompare(b.name)));
  }

  findInvitedGuestBySlug(slug: string): InvitedGuest | null {
    const clean = slug.trim().toUpperCase();
    if (!clean) return null;
    return this.data.invitedGuests.find((g) => g.slug.toUpperCase() === clean) || null;
  }

  private buildInvitedGuest(input: InvitedGuestInput, slug: string, timestamp: string): InvitedGuest {
    return {
      id: newId('inv_gst'),
      name: input.name.trim(),
      slug,
      phone: input.phone?.trim() || '',
      instagram: input.instagram?.trim() || '',
      category: input.category || 'Umum',
      pax: Number(input.pax) || 2,
      tableNumber: input.tableNumber?.trim() || '',
      customNote: input.customNote?.trim() || '',
      invitationSent: Boolean(input.invitationSent),
      invitationSentAt: input.invitationSent ? timestamp : null,
      isCheckedIn: false,
      checkInTime: null,
      checkInMethod: null,
      actualPax: null,
      souvenirGiven: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  createInvitedGuest(input: InvitedGuestInput): InvitedGuest {
    const requested = input.slug?.trim().toUpperCase() || '';
    const slug = requested.length === 4 && !this.findInvitedGuestBySlug(requested) ? requested : this.generateUniqueSlug();
    const guest = this.buildInvitedGuest(input, slug, now());
    this.data.invitedGuests.push(guest);
    this.save();
    return guest;
  }

  createBatchInvitedGuests(inputs: InvitedGuestInput[]): InvitedGuest[] {
    const timestamp = now();
    const created: InvitedGuest[] = [];
    for (const input of inputs) {
      if (!input.name?.trim()) continue;
      const guest = this.buildInvitedGuest(input, this.generateUniqueSlug(), timestamp);
      this.data.invitedGuests.push(guest);
      created.push(guest);
    }
    this.save();
    return created;
  }

  updateInvitedGuest(id: string, patch: Partial<InvitedGuest>): InvitedGuest | null {
    const guest = this.data.invitedGuests.find((g) => g.id === id);
    if (!guest) return null;

    if (patch.slug && patch.slug.toUpperCase() !== guest.slug.toUpperCase()) {
      const owner = this.findInvitedGuestBySlug(patch.slug);
      if (owner && owner.id !== id) {
        throw new HttpError(409, `Kode ${patch.slug.toUpperCase()} sudah dipakai tamu lain.`);
      }
      patch.slug = patch.slug.toUpperCase();
    }
    if (patch.invitationSent !== undefined) {
      patch.invitationSentAt = patch.invitationSent ? guest.invitationSentAt || now() : null;
    }

    Object.assign(guest, patch, { id, updatedAt: now() });
    this.save();
    return guest;
  }

  batchUpdateInvitationSent(ids: string[], sent: boolean): { updatedCount: number } {
    const timestamp = now();
    const targets = this.data.invitedGuests.filter((g) => ids.includes(g.id));
    for (const g of targets) {
      g.invitationSent = sent;
      g.invitationSentAt = sent ? g.invitationSentAt || timestamp : null;
      g.updatedAt = timestamp;
    }
    if (targets.length) this.save();
    return { updatedCount: targets.length };
  }

  deleteInvitedGuest(id: string) {
    return this.commit(removeById(this.data.invitedGuests, id));
  }

  checkInGuest(
    identifier: { id?: string; slug?: string; nameQuery?: string },
    options: { actualPax?: number; souvenirGiven?: boolean; method?: 'QR_SCAN' | 'MANUAL' } = {},
  ) {
    const guests = this.data.invitedGuests;
    const q = normalize(identifier.nameQuery);
    const guest =
      (identifier.id && guests.find((g) => g.id === identifier.id)) ||
      (identifier.slug && this.findInvitedGuestBySlug(identifier.slug)) ||
      (q && (guests.find((g) => normalize(g.name) === q) || guests.find((g) => normalize(g.name).includes(q)))) ||
      null;

    if (!guest) {
      throw new HttpError(404, 'Tamu tidak ada di daftar undangan.');
    }

    const alreadyCheckedIn = guest.isCheckedIn;
    Object.assign(guest, {
      isCheckedIn: true,
      checkInTime: guest.checkInTime || now(),
      checkInMethod: options.method || (identifier.slug ? 'QR_SCAN' : 'MANUAL'),
      actualPax: options.actualPax !== undefined ? Number(options.actualPax) : guest.actualPax || guest.pax,
      souvenirGiven: options.souvenirGiven ?? true,
      updatedAt: now(),
    });
    this.save();
    return {
      guest,
      alreadyCheckedIn,
      message: alreadyCheckedIn ? `${guest.name} sudah tercatat hadir sebelumnya.` : `${guest.name} tercatat hadir.`,
    };
  }

  undoCheckIn(id: string) {
    const guest = this.data.invitedGuests.find((g) => g.id === id);
    if (!guest) throw new HttpError(404, 'Tamu tidak ditemukan.');
    Object.assign(guest, {
      isCheckedIn: false,
      checkInTime: null,
      checkInMethod: null,
      actualPax: null,
      souvenirGiven: false,
      updatedAt: now(),
    });
    this.save();
    return { guest, message: `Kehadiran ${guest.name} dibatalkan.` };
  }

  getPresensiStats(): PresensiStats {
    const stats: PresensiStats = {
      totalInvited: this.data.invitedGuests.length,
      totalPaxAllocated: 0,
      totalCheckedIn: 0,
      totalActualPax: 0,
      totalRemaining: 0,
      totalSouvenirsGiven: 0,
    };
    for (const g of this.data.invitedGuests) {
      stats.totalPaxAllocated += g.pax || 1;
      if (!g.isCheckedIn) continue;
      stats.totalCheckedIn++;
      stats.totalActualPax += g.actualPax || g.pax || 1;
      if (g.souvenirGiven) stats.totalSouvenirsGiven++;
    }
    stats.totalRemaining = stats.totalInvited - stats.totalCheckedIn;
    return stats;
  }

  // --- Admin accounts (besides the env superadmin) ---

  findAdminByUsername(username: string): StoredAdminUser | null {
    return this.data.admins.find((a) => normalize(a.username) === normalize(username)) || null;
  }

  findAdminById(id: string): StoredAdminUser | null {
    return this.data.admins.find((a) => a.id === id) || null;
  }

  updateAdminPassword(id: string, passwordHash: string) {
    const admin = this.findAdminById(id);
    if (!admin) return false;
    admin.passwordHash = passwordHash;
    this.save();
    return true;
  }

  // --- Photo moments ---

  getPhotoMoments(): PhotoMoment[] {
    return this.data.photoMoments;
  }

  /** Resolve a guest's code from the slug, or from an exact invited-guest name match. */
  private resolveGuestSlug(guestName: string, guestSlug?: string): string | undefined {
    if (guestSlug?.trim()) return guestSlug.trim().toUpperCase();
    const name = normalize(guestName);
    if (!name || name === 'tamu undangan') return undefined;
    return this.data.invitedGuests.find((g) => normalize(g.name) === name)?.slug.toUpperCase();
  }

  getGuestPhotoCount(guestName: string, guestSlug?: string): number {
    const slug = this.resolveGuestSlug(guestName, guestSlug);
    if (slug) return this.data.photoMoments.filter((p) => p.guestSlug?.toUpperCase() === slug).length;
    const name = normalize(guestName);
    if (!name || name === 'tamu undangan') return 0;
    return this.data.photoMoments.filter((p) => normalize(p.guestName) === name).length;
  }

  addPhotoMoment(input: { guestName: string; guestSlug?: string; photoUrl: string; caption?: string }): PhotoMoment {
    const guestSlug = this.resolveGuestSlug(input.guestName, input.guestSlug);
    if (this.getGuestPhotoCount(input.guestName, guestSlug) >= config.photoMomentsPerGuest) {
      throw new HttpError(400, `Batas ${config.photoMomentsPerGuest} foto per tamu sudah tercapai.`);
    }
    const photo: PhotoMoment = {
      id: newId('photo'),
      guestName: input.guestName.trim() || 'Tamu Undangan',
      guestSlug,
      photoUrl: input.photoUrl,
      caption: input.caption?.trim() || '',
      createdAt: now(),
      likesCount: 0,
      reactions: {},
    };
    this.data.photoMoments.unshift(photo);
    this.save();
    return photo;
  }

  reactPhotoMoment(id: string, emoji: string, action: 'add' | 'remove') {
    const photo = this.data.photoMoments.find((p) => p.id === id);
    if (!photo) throw new HttpError(404, 'Foto tidak ditemukan.');
    const reactions = (photo.reactions ||= {});
    const delta = action === 'add' ? 1 : -1;
    reactions[emoji] = Math.max(0, (reactions[emoji] || 0) + delta);
    if (reactions[emoji] === 0) delete reactions[emoji];
    photo.likesCount = Math.max(0, (photo.likesCount || 0) + delta);
    this.save();
    return { likesCount: photo.likesCount, reactions };
  }

  deletePhotoMoment(id: string) {
    return this.commit(removeById(this.data.photoMoments, id));
  }

  getPhotoFrameConfig(): PhotoFrameConfig {
    return this.data.photoFrameConfig;
  }

  updatePhotoFrameConfig(patch: Partial<PhotoFrameConfig>): PhotoFrameConfig {
    this.data.photoFrameConfig = { ...this.data.photoFrameConfig, ...patch };
    this.save();
    return this.data.photoFrameConfig;
  }
}

export const db = new WeddingDatabase();
