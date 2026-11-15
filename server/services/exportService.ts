import { toCsv, phoneCell } from './csv.js';
import type { invitedGuestRepository, wishRepository } from '../repositories/guestRepositories.js';
import type { AttendanceStatus } from '../../shared/types.js';

const STATUS_LABEL: Record<AttendanceStatus, string> = { HADIR: 'Hadir', TIDAK_HADIR: 'Tidak hadir', RAGU: 'Masih ragu' };
const stamp = (iso: string | null | undefined) => (iso ? iso.replace('T', ' ').slice(0, 19) : '');

/** Spreadsheet exports for the couple: the guest list with check-in, and the RSVP wishes. */
export function exportService(deps: { guests: ReturnType<typeof invitedGuestRepository>; wishes: ReturnType<typeof wishRepository> }) {
  return {
    async guestsCsv(origin: string) {
      const guests = await deps.guests.list();
      return toCsv(
        ['Kode', 'Nama', 'Kategori', 'Kursi', 'Telepon', 'Instagram', 'Meja', 'Catatan', 'Undangan terkirim', 'Waktu kirim', 'Hadir', 'Waktu check-in', 'Metode', 'Jumlah hadir', 'Souvenir', 'Tautan undangan'],
        [...guests]
          .sort((a, b) => a.name.localeCompare(b.name, 'id'))
          .map((g) => [
            g.slug,
            g.name,
            g.category,
            g.pax,
            phoneCell(g.phone),
            g.instagram,
            g.tableNumber,
            g.customNote,
            g.invitationSent,
            stamp(g.invitationSentAt),
            g.isCheckedIn,
            stamp(g.checkInTime),
            g.checkInMethod === 'QR_SCAN' ? 'Scan QR' : g.checkInMethod === 'MANUAL' ? 'Manual' : '',
            g.actualPax,
            g.souvenirGiven,
            `${origin}/?to=${encodeURIComponent(g.name)}&c=${g.slug}`,
          ]),
      );
    },

    async wishesCsv() {
      const wishes = await deps.wishes.list({ includeHidden: true });
      return toCsv(
        ['Nama', 'Hubungan', 'Kehadiran', 'Jumlah tamu', 'Ucapan', 'Pesan suara', 'Balasan', 'Disembunyikan', 'Waktu'],
        wishes.map((w) => [
          w.guestName,
          w.relationship,
          STATUS_LABEL[w.attendanceStatus],
          w.numberOfGuests,
          w.message,
          w.voiceUrl && w.voiceUrl.startsWith('/') ? w.voiceUrl : w.voiceUrl ? '(rekaman lama di database)' : '',
          w.reply,
          w.isHidden,
          stamp(w.createdAt),
        ]),
      );
    },
  };
}
