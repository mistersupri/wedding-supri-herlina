export type AttendanceStatus = 'HADIR' | 'TIDAK_HADIR' | 'RAGU';

export type GalleryCategory = 'PREWEDDING' | 'MOMENTS' | 'ENGAGEMENT' | 'CEREMONY';

export type ThemePreset = 'natural' | 'rose' | 'sage' | 'gold' | 'ivory';

export interface GiftAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
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
  mediaType?: 'IMAGE' | 'VIDEO';
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

export interface InvitationData {
  id: string;
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
  weddingDate: string;
  countdownTarget: string;
  heroImage: string;
  heroVideoUrl?: string;
  heroMediaType?: 'IMAGE' | 'VIDEO';
  quoteText: string;
  quoteSource: string;
  musicUrl: string;
  musicTitle: string;
  whatsappNumber: string;
  whatsappTemplate: string;
  themeColor: ThemePreset;
  giftInfo: GiftAccount[];
  loveStories: LoveStoryItem[];
  events: WeddingEvent[];
  gallery: GalleryPhoto[];
  stats?: {
    totalWishes: number;
    attendingCount: number;
    declinedCount: number;
    tentativeCount: number;
    totalGuestSeats: number;
  };
}

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
  slug: string; // Unique 4-character code e.g. "A7K9", "X2B4"
  phone?: string;
  instagram?: string; // Guest Instagram handle or link e.g. "@username"
  category: string; // e.g. "VIP", "Keluarga", "Sahabat", "Rekan Kerja", "Umum"
  pax: number; // Allocated quota (e.g. 2 seats)
  tableNumber?: string; // e.g. "Meja 05", "VIP B"
  customNote?: string;
  invitationSent?: boolean; // Whether the invitation link/card has been sent
  invitationSentAt?: string | null; // Timestamp when invitation was sent
  isCheckedIn: boolean;
  checkInTime?: string | null;
  checkInMethod?: 'QR_SCAN' | 'MANUAL' | null;
  actualPax?: number | null;
  souvenirGiven?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GuestAccessVerification {
  isValid: boolean;
  guest: InvitedGuest | null;
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
  token: string;
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  user: AdminUser;
}

export interface CMSCoupleData {
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
  heroMediaType?: 'IMAGE' | 'VIDEO';
  quoteText: string;
  quoteSource: string;
}

export interface CMSThemeData {
  themeColor: ThemePreset;
  musicUrl: string;
  musicTitle: string;
  weddingDate: string;
  countdownTarget: string;
  whatsappNumber: string;
  whatsappTemplate: string;
}

export interface CMSStatsData {
  stats: {
    totalWishes: number;
    attendingCount: number;
    declinedCount: number;
    tentativeCount: number;
    totalGuestSeats: number;
  };
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
