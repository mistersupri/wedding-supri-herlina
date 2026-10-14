import type {
  AdminUser,
  GalleryPhoto,
  GuestWish,
  InvitationRecord,
  InvitedGuest,
  PhotoFrameConfig,
  PhotoMoment,
  WeddingEvent,
} from '../../src/types.js';

export interface StoredAdminUser extends AdminUser {
  passwordHash: string;
}

/** Shape of data/wedding_data.json. */
export interface DatabaseSchema {
  invitation: InvitationRecord;
  events: WeddingEvent[];
  gallery: GalleryPhoto[];
  guests: GuestWish[];
  invitedGuests: InvitedGuest[];
  admins: StoredAdminUser[];
  photoMoments: PhotoMoment[];
  photoFrameConfig: PhotoFrameConfig;
}
