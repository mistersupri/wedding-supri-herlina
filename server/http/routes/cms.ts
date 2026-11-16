import express, { type Router } from 'express';
import { config } from '../../config.js';
import { issueDownloadTicket, verifyDownloadTicket } from '../../services/authService.js';
import { ZipTooLargeError, writeZip } from '../zip.js';
import { HttpError, badRequest, notFound, route } from '../http.js';
import { requireAdmin, type AuthenticatedRequest } from '../middleware/requireAdmin.js';
import type { OrderedRepository } from '../../repositories/contentRepositories.js';
import type { Services } from '../../app.js';

/** GET/POST on `path`, PUT/DELETE on `path/:id` for one ordered content list. */
function crud<T extends { id: string }>(router: Router, path: string, repo: OrderedRepository<T>, noun: string, after: () => void) {
  const missing = () => notFound(`${noun} tidak ditemukan.`);
  const lower = noun.toLowerCase();

  router.get(
    path,
    route(async () => ({ data: await repo.list() }), `Gagal memuat ${lower}.`),
  );
  router.post(
    path,
    route(async (req, res) => {
      const data = await repo.create(req.body);
      after();
      res.status(201).json({ success: true, message: `${noun} ditambahkan.`, data });
    }, `Gagal menambahkan ${lower}.`),
  );
  router.put(
    `${path}/:id`,
    route(async (req) => {
      const data = await repo.update(req.params.id, req.body);
      if (!data) throw missing();
      after();
      return { message: `${noun} diperbarui.`, data };
    }, `Gagal memperbarui ${lower}.`),
  );
  router.delete(
    `${path}/:id`,
    route(async (req) => {
      if (!(await repo.remove(req.params.id))) throw missing();
      after();
      return { message: `${noun} dihapus.` };
    }, `Gagal menghapus ${lower}.`),
  );
}

export function cmsRoutes(s: Services): Router {
  const router = express.Router();

  // Browser downloads cannot send the Authorization header, so the CMS first asks for a 60-second ticket.
  // Registered before requireAdmin, which guards only /cms and /admin.
  router.get('/export/photos.zip', async (req, res) => {
    if (!verifyDownloadTicket(String(req.query.t || ''), 'photos-zip')) {
      res.status(401).json({ success: false, message: 'Tautan unduhan kedaluwarsa. Coba lagi dari CMS.' });
      return;
    }
    try {
      const entries = await s.exports.photoEntries(req.query.include === 'all' ? 'all' : 'approved');
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="foto-tamu.zip"');
      res.setHeader('Cache-Control', 'no-store');
      await writeZip(res, entries);
    } catch (err) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      if (err instanceof ZipTooLargeError) {
        res.status(413).json({ success: false, message: 'Foto terlalu banyak untuk satu ZIP. Unduh foto per tamu dari CMS.' });
        return;
      }
      console.error('Gagal membuat ZIP foto:', err);
      res.status(500).json({ success: false, message: 'Gagal membuat ZIP foto.' });
    }
  });

  router.use(['/cms', '/admin'], requireAdmin);

  router.post(
    '/cms/export/photos-ticket',
    route<AuthenticatedRequest>((req) => ({ ticket: issueDownloadTicket(req.user!, 'photos-zip') }), 'Gagal menyiapkan unduhan.'),
  );
  router.post(
    '/cms/photo-moments/approve-all',
    route(async () => {
      const count = await s.moments.approveAllPending();
      return { message: count ? `${count} foto ditayangkan.` : 'Tidak ada foto yang menunggu.', data: { count } };
    }, 'Gagal menayangkan foto.'),
  );
  const noop = () => undefined;

  router.get(
    '/cms/stats',
    route(async () => ({ data: await s.invitation.cmsStats() }), 'Gagal memuat ringkasan.'),
  );
  router.get(
    '/cms/general',
    route<AuthenticatedRequest>(
      async (req) => ({ data: { ...(await s.invitation.general()), adminProfile: req.user } }),
      'Gagal memuat pengaturan.',
    ),
  );

  router.get(
    '/cms/couple',
    route(async () => ({ data: await s.invitation.couple() }), 'Gagal memuat data mempelai.'),
  );
  router.put(
    '/cms/couple',
    route(
      async (req) => ({ message: 'Data mempelai tersimpan.', data: await s.invitation.saveCouple(req.body || {}) }),
      'Gagal menyimpan data mempelai.',
    ),
  );
  router.get(
    '/cms/theme',
    route(async () => ({ data: await s.invitation.theme() }), 'Gagal memuat pengaturan tampilan.'),
  );
  router.put(
    '/cms/theme',
    route(
      async (req) => ({ message: 'Pengaturan tersimpan.', data: await s.invitation.saveTheme(req.body || {}) }),
      'Gagal menyimpan pengaturan.',
    ),
  );

  // Registered before the generic gallery routes so "/batch" is not read as an :id.
  router.post(
    '/cms/gallery/batch',
    route(async (req, res) => {
      const photos = req.body?.photos;
      if (!Array.isArray(photos) || photos.length === 0) throw badRequest('Daftar foto kosong.');
      const data = await s.content.gallery.createMany(photos);
      res.status(201).json({ success: true, message: `${data.length} media ditambahkan ke galeri.`, data });
    }, 'Gagal menambahkan media galeri.'),
  );

  crud(router, '/cms/events', s.content.events, 'Acara', noop);
  crud(router, '/cms/stories', s.content.stories, 'Kisah', noop);
  crud(router, '/cms/gifts', s.content.gifts, 'Rekening', noop);
  crud(router, '/cms/gallery', s.content.gallery, 'Foto', noop);

  // --- Spreadsheet exports ---
  const sendCsv = (res: express.Response, filename: string, body: string) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(body);
  };
  router.get(
    '/cms/export/guests.csv',
    route(async (req, res) => sendCsv(res, 'daftar-tamu.csv', await s.exports.guestsCsv(`${req.protocol}://${req.get('host')}`)), 'Gagal mengekspor daftar tamu.'),
  );
  router.get(
    '/cms/export/wishes.csv',
    route(async (_req, res) => sendCsv(res, 'ucapan-rsvp.csv', await s.exports.wishesCsv()), 'Gagal mengekspor ucapan.'),
  );

  // --- Guestbook moderation ---
  router.get(
    '/cms/guests',
    route((req) => s.guestbook.cmsList(String(req.query.status || 'ALL'), String(req.query.search || '')), 'Gagal memuat buku tamu.'),
  );
  router.put(
    '/cms/guests/:id/reply',
    route(
      async (req) => ({ message: 'Balasan tersimpan.', data: await s.guestbook.reply(req.params.id, String(req.body?.reply || '')) }),
      'Gagal menyimpan balasan.',
    ),
  );
  router.put(
    '/cms/guests/:id/visibility',
    route(async (req) => {
      const data = await s.guestbook.toggleVisibility(req.params.id);
      return { message: data.isHidden ? 'Ucapan disembunyikan dari tamu.' : 'Ucapan tampil lagi.', data };
    }, 'Gagal mengubah visibilitas.'),
  );
  router.delete(
    '/cms/guests/:id',
    route(async (req) => {
      await s.guestbook.remove(req.params.id);
      return { message: 'Ucapan dihapus.' };
    }, 'Gagal menghapus ucapan.'),
  );

  // --- Invited guests & check-in ---
  router.get(
    '/cms/invited-guests',
    route((req) => s.guests.list(String(req.query.filter || 'ALL'), String(req.query.search || '')), 'Gagal memuat daftar tamu.'),
  );
  router.post(
    '/cms/invited-guests/batch',
    route(async (req, res) => {
      const data = await s.guests.createMany(req.body?.guests);
      res.status(201).json({ success: true, message: `${data.length} tamu ditambahkan.`, data });
    }, 'Gagal mengimpor tamu.'),
  );
  router.post(
    '/cms/invited-guests/batch-sent',
    route(async (req) => {
      const data = await s.guests.markSent(req.body?.ids, Boolean(req.body?.sentStatus));
      return { message: `${data.updatedCount} tamu ditandai.`, data };
    }, 'Gagal memperbarui status kirim.'),
  );
  router.post(
    '/cms/invited-guests',
    route(async (req, res) => {
      const data = await s.guests.create(req.body || {});
      res.status(201).json({ success: true, message: `${data.name} ditambahkan dengan kode ${data.slug}.`, data });
    }, 'Gagal menambahkan tamu.'),
  );
  router.put(
    '/cms/invited-guests/:id',
    route(
      async (req) => ({ message: 'Data tamu diperbarui.', data: await s.guests.update(req.params.id, req.body || {}) }),
      'Gagal memperbarui tamu.',
    ),
  );
  router.delete(
    '/cms/invited-guests/:id',
    route(async (req) => {
      await s.guests.remove(req.params.id);
      return { message: 'Tamu dihapus dari daftar.' };
    }, 'Gagal menghapus tamu.'),
  );
  router.post(
    '/cms/presensi/check-in',
    route((req) => {
      const { guestId, slug, nameQuery, actualPax, souvenirGiven, method } = req.body || {};
      return s.guests.checkIn({ id: guestId, slug, nameQuery }, { actualPax, souvenirGiven, method });
    }, 'Gagal mencatat kehadiran.'),
  );
  router.post(
    '/cms/presensi/undo',
    route((req) => {
      if (!req.body?.guestId) throw badRequest('ID tamu wajib disertakan.');
      return s.guests.undoCheckIn(req.body.guestId);
    }, 'Gagal membatalkan kehadiran.'),
  );
  router.get(
    '/cms/presensi/stats',
    route(async () => ({ data: await s.guests.stats() }), 'Gagal memuat statistik.'),
  );

  // --- Self check-in rules ---
  router.get(
    '/cms/attendance-settings',
    route(async () => ({ data: await s.attendance.get() }), 'Gagal memuat aturan kehadiran.'),
  );
  router.put(
    '/cms/attendance-settings',
    route(async (req) => ({ message: 'Aturan kehadiran tersimpan.', data: await s.attendance.save(req.body || {}) }), 'Gagal menyimpan aturan kehadiran.'),
  );

  // --- Photo moments moderation ---
  router.get(
    '/cms/photo-moments/frame-config',
    route(async () => ({ data: await s.moments.frame() }), 'Gagal memuat bingkai foto.'),
  );
  router.put(
    '/cms/photo-moments/frame-config',
    route(
      async (req) => ({ message: 'Bingkai foto tersimpan.', data: await s.moments.saveFrame(req.body || {}) }),
      'Gagal menyimpan bingkai foto.',
    ),
  );
  router.get(
    '/cms/photo-moments/settings',
    route(async () => ({ data: await s.moments.settings() }), 'Gagal memuat aturan kamera.'),
  );
  router.put(
    '/cms/photo-moments/settings',
    route(
      async (req) => ({ message: 'Aturan kamera tersimpan.', data: await s.moments.saveSettings(req.body || {}) }),
      'Gagal menyimpan aturan kamera.',
    ),
  );
  router.put(
    '/cms/photo-moments/:id/approval',
    route(async (req) => {
      const data = await s.moments.approve(req.params.id, req.body?.approved !== false);
      return { message: data.approved ? 'Foto tampil di galeri tamu.' : 'Foto disembunyikan.', data };
    }, 'Gagal memperbarui foto.'),
  );
  router.delete(
    '/cms/photo-moments/comments/:id',
    route(async (req) => {
      await s.moments.removeComment(req.params.id);
      return { message: 'Komentar dihapus.' };
    }, 'Gagal menghapus komentar.'),
  );
  router.get(
    '/cms/photo-moments',
    route(async () => {
      const data = await s.moments.all();
      return { data, total: data.length };
    }, 'Gagal memuat foto tamu.'),
  );
  router.delete(
    '/cms/photo-moments/:id',
    route(async (req) => {
      await s.moments.remove(req.params.id);
      return { message: 'Foto tamu dihapus.' };
    }, 'Gagal menghapus foto.'),
  );

  router.post(
    '/admin/reset-default',
    route(async (req) => {
      if (config.isProduction && !config.allowDemoReset) {
        throw new HttpError(403, 'Reset data dimatikan di server produksi. Set ALLOW_DEMO_RESET=true bila memang diperlukan.');
      }
      if (req.body?.confirm !== 'RESET') throw badRequest('Konfirmasi reset tidak lengkap.');
      await s.resetDemo();
      return { message: 'Data dikembalikan ke isi demo.', data: await s.invitation.publicInvitation() };
    }, 'Gagal mereset data.'),
  );

  return router;
}
