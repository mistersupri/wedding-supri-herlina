import fs from 'fs/promises';
import path from 'path';
import { safeSegment, type ZipEntry } from '../http/zip.js';
import { toCsv, phoneCell } from './csv.js';
import type { invitedGuestRepository, photoMomentRepository, wishRepository } from '../repositories/guestRepositories.js';
import type { AttendanceStatus } from '../../shared/types.js';

const STATUS_LABEL: Record<AttendanceStatus, string> = { HADIR: 'Hadir', TIDAK_HADIR: 'Tidak hadir', RAGU: 'Masih ragu' };
/** Times are stored in UTC; the couple reads them in Jakarta time (WIB), the way the invitation shows them. */
const stamp = (iso: string | null | undefined) => (iso ? `${new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' })} WIB` : '');

/** Spreadsheet exports for the couple: the guest list with check-in, and the RSVP wishes. */
export function exportService(deps: {
  guests: ReturnType<typeof invitedGuestRepository>;
  wishes: ReturnType<typeof wishRepository>;
  moments: ReturnType<typeof photoMomentRepository>;
  uploadDir: string;
}) {
  return {
    async guestsCsv(origin: string) {
      const guests = await deps.guests.list();
      return toCsv(
        ['Kode', 'Nama', 'Kategori', 'Kursi', 'Telepon', 'Instagram', 'Meja', 'Catatan', 'Undangan terkirim', 'Waktu kirim', 'Undangan dibuka', 'Pertama dibuka', 'Terakhir dibuka', 'Kali dibuka', 'Hadir', 'Waktu check-in', 'Metode', 'Jumlah hadir', 'Souvenir', 'Tautan undangan'],
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
            Boolean(g.firstOpenedAt),
            stamp(g.firstOpenedAt),
            stamp(g.lastOpenedAt),
            g.openCount,
            g.isCheckedIn,
            stamp(g.checkInTime),
            g.checkInMethod === 'QR_SCAN' ? 'Scan QR' : g.checkInMethod === 'MANUAL' ? 'Manual' : g.checkInMethod === 'SELF' ? 'Mandiri (HP tamu)' : '',
            g.actualPax,
            g.souvenirGiven,
            `${origin}/?to=${encodeURIComponent(g.name)}&c=${g.slug}`,
          ]),
      );
    },

    /**
     * Every guest photo (full size when the original was kept) in one folder per guest, plus a list of
     * who took what. Hidden photos are left out unless `include` is "all".
     */
    async photoEntries(include: 'approved' | 'all'): Promise<ZipEntry[]> {
      const moments = (await deps.moments.all()).filter((m) => include === 'all' || m.approved !== false).reverse();
      const perFolder = new Map<string, number>();
      const entries: ZipEntry[] = [];
      const manifest: (string | number | boolean)[][] = [];

      for (const m of moments) {
        const url = m.originalUrl || m.photoUrl;
        const file = path.join(deps.uploadDir, 'moments', path.basename(url));
        if (!(await fs.access(file).then(() => true, () => false))) continue;
        const folder = safeSegment(m.guestName);
        const n = (perFolder.get(folder) ?? 0) + 1;
        perFolder.set(folder, n);
        const when = m.createdAt.slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
        const name = `${folder}/${String(n).padStart(2, '0')}_${when}${path.extname(file).toLowerCase() || '.jpg'}`;
        entries.push({ name, path: file });
        manifest.push([m.guestName, m.guestSlug ?? '', name, m.caption ?? '', m.look ?? '', m.likesCount ?? 0, m.commentsCount ?? 0, m.approved !== false, stamp(m.createdAt)]);
      }
      entries.unshift({
        name: 'daftar-foto.csv',
        data: Buffer.from(toCsv(['Tamu', 'Kode', 'File', 'Keterangan', 'Look', 'Suka', 'Komentar', 'Tayang', 'Waktu'], manifest), 'utf8'),
      });
      return entries;
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
