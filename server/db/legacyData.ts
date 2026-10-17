import type { GalleryPhoto, GiftAccount, GuestWish, InvitedGuest, LoveStoryItem, PhotoFrameConfig, PhotoMoment, WeddingEvent } from '../../shared/types.js';

/**
 * Shape of the old data/wedding_data.json store. The demo seed uses it too, so a JSON backup
 * from the previous version can be imported with `yarn db:import-json <file>`.
 */
export interface LegacyData {
  invitation: Record<string, unknown> & {
    giftInfo?: (GiftAccount & { qrCodeUrl?: string })[];
    loveStories?: LoveStoryItem[];
  };
  events?: WeddingEvent[];
  gallery?: GalleryPhoto[];
  guests?: GuestWish[];
  invitedGuests?: InvitedGuest[];
  admins?: { id: string; username: string; email: string; name: string; passwordHash: string; role: 'SUPERADMIN' | 'ADMIN'; createdAt: string }[];
  photoMoments?: PhotoMoment[];
  photoFrameConfig?: PhotoFrameConfig;
}
