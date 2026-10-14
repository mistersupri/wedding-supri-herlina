import express, { type Router } from 'express';
import { db } from '../db/index.js';
import { transcribeAudioWithGemini } from '../gemini.js';
import { badRequest, route } from '../http.js';
import type { AttendanceStatus, InvitedGuest, PublicGuest } from '../../src/types.js';

const toPublicGuest = (g: InvitedGuest): PublicGuest => ({
  id: g.id,
  name: g.name,
  slug: g.slug,
  category: g.category,
  pax: g.pax,
  tableNumber: g.tableNumber,
  isCheckedIn: g.isCheckedIn,
  checkInTime: g.checkInTime,
});

const ATTENDANCE: AttendanceStatus[] = ['HADIR', 'TIDAK_HADIR', 'RAGU'];
const VOICE_FALLBACK = '[Voice Note] Ucapan dikirim lewat rekaman suara.';

/** Prefer the typed message; when only a voice note came in, ask Gemini for a transcript. */
async function resolveWishMessage(message: string, voiceUrl: string | null) {
  const typed = message.trim();
  if (voiceUrl && (!typed || typed.startsWith('[Voice Note]'))) {
    return (await transcribeAudioWithGemini(voiceUrl)) || typed || VOICE_FALLBACK;
  }
  return typed || 'Selamat untuk kedua mempelai!';
}

export function publicRoutes(): Router {
  const router = express.Router();

  router.get(
    '/invitation',
    route(() => ({ data: db.getInvitationData() }), 'Gagal memuat data undangan.'),
  );

  router.get(
    '/public/couple',
    route(() => ({ data: db.getCoupleData() }), 'Gagal memuat data mempelai.'),
  );
  router.get(
    '/public/events',
    route(() => ({ data: db.getEvents() }), 'Gagal memuat jadwal acara.'),
  );
  router.get(
    '/public/stories',
    route(() => ({ data: db.getLoveStories() }), 'Gagal memuat kisah.'),
  );
  router.get(
    '/public/gallery',
    route(() => ({ data: db.getGallery() }), 'Gagal memuat galeri.'),
  );
  router.get(
    '/public/gifts',
    route(() => ({ data: db.getGiftAccounts() }), 'Gagal memuat rekening.'),
  );

  router.get(
    '/public/guestbook',
    route(() => ({ data: db.getPublicGuests(), stats: db.getRSVPStats() }), 'Gagal memuat buku tamu.'),
  );

  router.post(
    '/public/guestbook',
    route(async (req, res) => {
      const { guestName, relationship, attendanceStatus, numberOfGuests, message, voiceUrl } = req.body || {};
      if (!guestName?.trim() || !ATTENDANCE.includes(attendanceStatus)) {
        throw badRequest('Nama dan status kehadiran wajib diisi.');
      }
      const wish = db.addGuestWish({
        guestName: guestName.trim(),
        relationship: relationship?.trim() || 'Tamu Undangan',
        attendanceStatus,
        numberOfGuests: Number(numberOfGuests) || 1,
        message: await resolveWishMessage(message || '', voiceUrl || null),
        voiceUrl: voiceUrl || null,
      });
      res.status(201).json({ success: true, message: 'Terima kasih atas doa dan konfirmasinya.', data: wish });
    }, 'Gagal mengirim ucapan.'),
  );

  router.get(
    '/public/guest/:slug',
    route((req) => {
      const guest = db.findInvitedGuestBySlug(req.params.slug);
      return guest
        ? { isValid: true, guest: toPublicGuest(guest) }
        : { isValid: false, guest: null, message: 'Kode undangan tidak ditemukan.' };
    }, 'Gagal memeriksa kode undangan.'),
  );

  router.post(
    '/public/verify-access',
    route((req) => {
      const code = typeof req.body?.code === 'string' ? req.body.code : '';
      if (!code.trim()) return { isValid: false, guest: null, message: 'Kode undangan wajib diisi.' };
      const guest = db.findInvitedGuestBySlug(code);
      return guest
        ? { isValid: true, guest: toPublicGuest(guest), message: `Selamat datang, ${guest.name}.` }
        : { isValid: false, guest: null, message: 'Kode ini tidak ada di daftar undangan.' };
    }, 'Gagal memeriksa kode undangan.'),
  );

  // --- Photo moments ---

  router.get(
    '/public/photo-moments/frame-config',
    route(() => ({ data: db.getPhotoFrameConfig() }), 'Gagal memuat bingkai foto.'),
  );

  router.get(
    '/public/photo-moments',
    route((req) => {
      const moments = db.getPhotoMoments();
      const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
      const limit = Math.max(1, parseInt(String(req.query.limit), 10) || 10);
      const start = (page - 1) * limit;
      return {
        data: moments.slice(start, start + limit),
        total: moments.length,
        page,
        limit,
        hasMore: start + limit < moments.length,
        userCount: db.getGuestPhotoCount(String(req.query.guestName || ''), String(req.query.guestSlug || '')),
      };
    }, 'Gagal memuat foto tamu.'),
  );

  router.post(
    '/public/photo-moments',
    route((req, res) => {
      const { guestName, guestSlug, photoUrl, caption } = req.body || {};
      if (typeof photoUrl !== 'string' || !photoUrl.startsWith('/uploads/moments/')) {
        throw badRequest('Foto belum terunggah.');
      }
      const photo = db.addPhotoMoment({ guestName: guestName || 'Tamu Undangan', guestSlug, photoUrl, caption });
      res.status(201).json({ success: true, photo });
    }, 'Gagal menyimpan foto.'),
  );

  router.post(
    '/public/photo-moments/:id/react',
    route((req) => {
      const { emoji, action } = req.body || {};
      return db.reactPhotoMoment(req.params.id, emoji || '❤️', action === 'remove' ? 'remove' : 'add');
    }, 'Gagal mengirim reaksi.'),
  );

  return router;
}
