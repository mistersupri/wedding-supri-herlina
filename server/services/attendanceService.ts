import { HttpError, badRequest } from '../http/http.js';
import { distanceMeters, formatDistance, isLatitude, isLongitude } from '../../shared/geo.js';
import { toPublicGuest, type GuestService } from './guestService.js';
import type { attendanceSettingRepository, invitedGuestRepository } from '../repositories/guestRepositories.js';
import type { AttendanceSettings } from '../../shared/types.js';

export const MIN_RADIUS_M = 20;
export const MAX_RADIUS_M = 5000;
/** A fix worse than this (a phone guessing from Wi-Fi or its IP address) says nothing about where the guest stands. */
const MAX_ACCURACY_M = 300;
/** GPS error is allowed to work in the guest's favour, but only up to this much. */
const MAX_ACCURACY_BONUS_M = 50;

export interface Position {
  lat?: unknown;
  lng?: unknown;
  /** Horizontal accuracy in metres, as the phone reports it. */
  accuracy?: unknown;
}

/**
 * Guests confirming their own attendance. When location verification is on (the default), the phone must
 * report a position within the configured radius of the venue; with it off, a valid invitation code is enough.
 * The position comes from the guest's browser, so it keeps honest guests from checking in from home but is not
 * proof against someone determined to fake it; the reception desk remains the authority.
 */
export function attendanceService(deps: {
  settings: ReturnType<typeof attendanceSettingRepository>;
  guests: ReturnType<typeof invitedGuestRepository>;
  guestService: GuestService;
}) {
  return {
    get: () => deps.settings.get(),

    /** Public view: what the invitation page needs to decide whether to show the button. */
    async publicRules() {
      const s = await deps.settings.get();
      return { selfCheckIn: s.selfCheckIn, verifyLocation: s.verifyLocation };
    },

    async save(input: Partial<AttendanceSettings>): Promise<AttendanceSettings> {
      const current = await deps.settings.get();
      const next: AttendanceSettings = {
        selfCheckIn: typeof input.selfCheckIn === 'boolean' ? input.selfCheckIn : current.selfCheckIn,
        verifyLocation: typeof input.verifyLocation === 'boolean' ? input.verifyLocation : current.verifyLocation,
        venueLat: input.venueLat === undefined ? current.venueLat : input.venueLat,
        venueLng: input.venueLng === undefined ? current.venueLng : input.venueLng,
        radiusMeters: Math.min(MAX_RADIUS_M, Math.max(MIN_RADIUS_M, Math.round(Number(input.radiusMeters ?? current.radiusMeters)) || current.radiusMeters)),
      };
      const hasLat = next.venueLat !== null;
      const hasLng = next.venueLng !== null;
      if (hasLat !== hasLng || (hasLat && (!isLatitude(next.venueLat) || !isLongitude(next.venueLng)))) {
        throw badRequest('Koordinat lokasi acara tidak valid. Isi lintang dan bujur, misalnya -6.2088 dan 106.8456.');
      }
      if (next.selfCheckIn && next.verifyLocation && !hasLat) {
        throw badRequest('Isi koordinat lokasi acara dulu, atau matikan verifikasi lokasi.');
      }
      return deps.settings.save(next);
    },

    async selfCheckIn(code: string, position: Position) {
      const rules = await deps.settings.get();
      if (!rules.selfCheckIn) throw new HttpError(403, 'Konfirmasi kehadiran lewat HP belum dibuka. Silakan lapor ke meja penerima tamu.', 'SELF_CHECK_IN_OFF');

      const slug = code.trim().toUpperCase();
      const guest = slug.length === 4 ? await deps.guests.findBySlug(slug) : null;
      if (!guest) throw new HttpError(403, 'Kode undangan tidak dikenali.');

      if (rules.verifyLocation) {
        if (rules.venueLat === null || rules.venueLng === null) {
          throw new HttpError(409, 'Lokasi acara belum diatur oleh mempelai. Silakan lapor ke meja penerima tamu.', 'VENUE_NOT_SET');
        }
        const { lat, lng } = position;
        if (!isLatitude(lat) || !isLongitude(lng)) {
          throw new HttpError(400, 'Lokasi HP Anda belum terbaca. Izinkan akses lokasi di peramban, lalu coba lagi.', 'LOCATION_REQUIRED');
        }
        const accuracy = typeof position.accuracy === 'number' && Number.isFinite(position.accuracy) && position.accuracy >= 0 ? position.accuracy : 0;
        if (accuracy > MAX_ACCURACY_M) {
          throw new HttpError(400, 'Sinyal lokasi HP Anda kurang akurat. Coba di tempat terbuka atau nyalakan GPS.', 'LOCATION_INACCURATE');
        }
        const distance = distanceMeters({ lat, lng }, { lat: rules.venueLat, lng: rules.venueLng });
        if (distance - Math.min(accuracy, MAX_ACCURACY_BONUS_M) > rules.radiusMeters) {
          throw new HttpError(403, `Anda masih sekitar ${formatDistance(distance)} dari lokasi acara. Konfirmasi hadir hanya bisa dilakukan di lokasi (dalam ${formatDistance(rules.radiusMeters)}).`, 'TOO_FAR');
        }
      }

      // The desk keeps authority over the figures: a guest only marks themselves present, never changes a count.
      const result = guest.isCheckedIn
        ? await deps.guestService.checkIn({ id: guest.id }, {})
        : await deps.guestService.checkIn({ id: guest.id }, { actualPax: guest.pax, souvenirGiven: false, method: 'SELF' });
      return {
        isValid: true,
        guest: toPublicGuest(result.guest),
        alreadyCheckedIn: result.alreadyCheckedIn,
        message: result.alreadyCheckedIn ? 'Kehadiran Anda sudah tercatat.' : `Selamat datang, ${guest.name}! Kehadiran Anda tercatat.`,
      };
    },
  };
}

export type AttendanceService = ReturnType<typeof attendanceService>;
