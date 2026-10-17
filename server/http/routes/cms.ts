import express, { type Router } from 'express';
import { badRequest, notFound, route } from '../http.js';
import { requireAdmin, type AuthenticatedRequest } from '../middleware/requireAdmin.js';
import type { OrderedRepository } from '../../repositories/contentRepositories.js';
import type { Services } from '../../app.js';

/** GET/POST on `path`, PUT/DELETE on `path/:id` for one ordered content list. */
function crud<T extends { id: string }>(router: Router, path: string, repo: OrderedRepository<T>, noun: string, after: () => void) {
  const missing = () => notFound(`${noun} tidak ditemukan.`);
  const lower = noun.toLowerCase();

  router.get(path, route(async () => ({ data: await repo.list() }), `Gagal memuat ${lower}.`));
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
  router.use(['/cms', '/admin'], requireAdmin);
  const noop = () => undefined;

  router.get('/cms/stats', route(async () => ({ data: await s.invitation.cmsStats() }), 'Gagal memuat ringkasan.'));
  router.get(
    '/cms/general',
    route<AuthenticatedRequest>(async (req) => ({ data: { ...(await s.invitation.general()), adminProfile: req.user } }), 'Gagal memuat pengaturan.'),
  );

  router.get('/cms/couple', route(async () => ({ data: await s.invitation.couple() }), 'Gagal memuat data mempelai.'));
  router.put(
    '/cms/couple',
    route(async (req) => ({ message: 'Data mempelai tersimpan.', data: await s.invitation.saveCouple(req.body || {}) }), 'Gagal menyimpan data mempelai.'),
  );
  router.get('/cms/theme', route(async () => ({ data: await s.invitation.theme() }), 'Gagal memuat pengaturan tampilan.'));
  router.put(
    '/cms/theme',
    route(async (req) => ({ message: 'Pengaturan tersimpan.', data: await s.invitation.saveTheme(req.body || {}) }), 'Gagal menyimpan pengaturan.'),
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

  // --- Guestbook moderation ---
  router.get('/cms/guests', route((req) => s.guestbook.cmsList(String(req.query.status || 'ALL'), String(req.query.search || '')), 'Gagal memuat buku tamu.'));
  router.put(
    '/cms/guests/:id/reply',
    route(async (req) => ({ message: 'Balasan tersimpan.', data: await s.guestbook.reply(req.params.id, String(req.body?.reply || '')) }), 'Gagal menyimpan balasan.'),
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
  router.get('/cms/invited-guests', route((req) => s.guests.list(String(req.query.filter || 'ALL'), String(req.query.search || '')), 'Gagal memuat daftar tamu.'));
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
    route(async (req) => ({ message: 'Data tamu diperbarui.', data: await s.guests.update(req.params.id, req.body || {}) }), 'Gagal memperbarui tamu.'),
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
  router.get('/cms/presensi/stats', route(async () => ({ data: await s.guests.stats() }), 'Gagal memuat statistik.'));

  // --- Photo moments moderation ---
  router.get('/cms/photo-moments/frame-config', route(async () => ({ data: await s.moments.frame() }), 'Gagal memuat bingkai foto.'));
  router.put(
    '/cms/photo-moments/frame-config',
    route(async (req) => ({ message: 'Bingkai foto tersimpan.', data: await s.moments.saveFrame(req.body || {}) }), 'Gagal menyimpan bingkai foto.'),
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
    route(async () => {
      await s.resetDemo();
      return { message: 'Data dikembalikan ke isi demo.', data: await s.invitation.publicInvitation() };
    }, 'Gagal mereset data.'),
  );

  return router;
}
