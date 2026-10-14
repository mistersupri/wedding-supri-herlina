export type AttendanceStatus = 'HADIR' | 'TIDAK_HADIR' | 'RAGU';

export type GalleryCategory = 'PREWEDDING' | 'MOMENTS' | 'ENGAGEMENT' | 'CEREMONY';

/** Colour presets, each named after a batik dye tradition (see DESIGN.md). */
export type ThemePreset = 'sogan' | 'wedel' | 'gadung' | 'jambon';

export type MediaType = 'IMAGE' | 'VIDEO';

export type UploadCategory = 'hero' | 'gallery' | 'couples' | 'moments' | 'general';

export interface GiftAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  /** Older records store the QR image here; new ones use qrisImageUrl. */
  qrCodeUrl?: string;
  isQris?: boolean;
  qrisImageUrl?: string;
}

export interface LoveStoryItem {
  id: string;
  year: string;
  title: string;
  description: string;
  photoUrl?: string;
}

export interface WeddingEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  venueName: string;
  address: string;
  mapsUrl: string;
  mapsEmbedUrl?: string;
  dressCode?: string;
  notes?: string;
  orderIndex: number;
}

export interface GalleryPhoto {
  id: string;
  title: string;
  url: string;
  caption?: string;
  category: GalleryCategory;
  orderIndex: number;
  mediaType?: MediaType;
  thumbnailUrl?: string;
}

export interface GuestWish {
  id: string;
  guestName: string;
  relationship: string;
  attendanceStatus: AttendanceStatus;
  numberOfGuests: number;
  message: string;
  reply?: string | null;
  isHidden: boolean;
  createdAt: string;
  voiceUrl?: string | null;
}

export interface RSVPStats {
  totalWishes: number;
  attendingCount: number;
  declinedCount: number;
  tentativeCount: number;
  totalGuestSeats: number;
}

export interface CoupleProfile {
  groomName: string;
  groomShortName: string;
  groomParents: string;
  groomInstagram?: string;
  groomPhoto: string;
  brideName: string;
  brideShortName: string;
  brideParents: string;
  brideInstagram?: string;
  bridePhoto: string;
  heroImage: string;
  heroVideoUrl?: string;
  heroMediaType?: MediaType;
  quoteText: string;
  quoteSource: string;
}

export interface ThemeSettings {
  themeColor: ThemePreset;
  musicUrl: string;
  musicTitle: string;
  weddingDate: string;
  countdownTarget: string;
  whatsappNumber: string;
  whatsappTemplate: string;
}

/** The invitation record as stored, without the collections joined in for the public page. */
export interface InvitationRecord extends CoupleProfile, ThemeSettings {
  id: string;
  giftInfo: GiftAccount[];
  loveStories: LoveStoryItem[];
}

export interface InvitationData extends InvitationRecord {
  events: WeddingEvent[];
  gallery: GalleryPhoto[];
  stats?: RSVPStats;
}

export type CMSCoupleData = CoupleProfile;
export type CMSThemeData = ThemeSettings;

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'SUPERADMIN' | 'ADMIN';
  createdAt: string;
}

export interface InvitedGuest {
  id: string;
  name: string;
  /** Unique 4-character access code, e.g. "A7K9". */
  slug: string;
  phone?: string;
  instagram?: string;
  category: string;
  /** Seats allocated to this invitation. */
  pax: number;
  tableNumber?: string;
  customNote?: string;
  invitationSent?: boolean;
  invitationSentAt?: string | null;
  isCheckedIn: boolean;
  checkInTime?: string | null;
  checkInMethod?: 'QR_SCAN' | 'MANUAL' | null;
  actualPax?: number | null;
  souvenirGiven?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The subset of an invited guest that the public verification endpoints expose. */
export type PublicGuest = Pick<InvitedGuest, 'id' | 'name' | 'slug' | 'category' | 'pax' | 'tableNumber' | 'isCheckedIn' | 'checkInTime'>;

export interface GuestAccessVerification {
  isValid: boolean;
  guest: PublicGuest | null;
  message?: string;
}

export interface PhotoMoment {
  id: string;
  guestName: string;
  guestSlug?: string;
  photoUrl: string;
  caption?: string;
  createdAt: string;
  likesCount?: number;
  reactions?: Record<string, number>;
}

export interface PhotoFrameConfig {
  enabled: boolean;
  frameOverlayUrl: string;
  frameName?: string;
  allowGuestToggle?: boolean;
}

export interface PresensiStats {
  totalInvited: number;
  totalPaxAllocated: number;
  totalCheckedIn: number;
  totalActualPax: number;
  totalRemaining: number;
  totalSouvenirsGiven: number;
}

export interface PresensiCheckInPayload {
  guestId?: string;
  slug?: string;
  actualPax?: number;
  souvenirGiven?: boolean;
  method?: 'QR_SCAN' | 'MANUAL';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  user: AdminUser;
}

export interface CMSStatsData {
  stats: RSVPStats;
  counts: {
    eventsCount: number;
    galleryCount: number;
    storiesCount: number;
    giftsCount: number;
  };
  recentGuests: GuestWish[];
}

export interface CMSGeneralData {
  invitationId: string;
  weddingDate: string;
  groomShortName: string;
  brideShortName: string;
  adminProfile?: AdminUser;
}

export type InvitedGuestInput = Partial<
  Pick<InvitedGuest, 'slug' | 'phone' | 'instagram' | 'category' | 'pax' | 'tableNumber' | 'customNote' | 'invitationSent'>
> & { name: string };
