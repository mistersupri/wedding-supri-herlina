import express, { type Router } from 'express';
import { requireAdminAuth, type AuthenticatedRequest } from '../auth.js';
import { db } from '../db/index.js';
import { badRequest, notFound, route } from '../http.js';

interface CrudOptions<T> {
  list: () => T[];
  create: (body: any) => T;
  update: (id: string, body: any) => T | null;
  remove: (id: string) => boolean;
  /** Noun used in messages, e.g. "Acara". */
  noun: string;
}

/** Registers GET/POST on `path` and PUT/DELETE on `path/:id` for one collection. */
function crud<T>(router: Router, path: string, o: CrudOptions<T>) {
  const missing = () => notFound(`${o.noun} tidak ditemukan.`);

  router.get(
    path,
    route(() => ({ data: o.list() }), `Gagal memuat ${o.noun.toLowerCase()}.`),
  );

  router.post(
    path,
    route((req, res) => {
      res.status(201).json({ success: true, message: `${o.noun} ditambahkan.`, data: o.create(req.body) });
    }, `Gagal menambahkan ${o.noun.toLowerCase()}.`),
  );

  router.put(
    `${path}/:id`,
    route((req) => {
      const data = o.update(req.params.id, req.body);
      if (!data) throw missing();
      return { message: `${o.noun} diperbarui.`, data };
    }, `Gagal memperbarui ${o.noun.toLowerCase()}.`),
  );

  router.delete(
    `${path}/:id`,
    route((req) => {
      if (!o.remove(req.params.id)) throw missing();
      return { message: `${o.noun} dihapus.` };
    }, `Gagal menghapus ${o.noun.toLowerCase()}.`),
  );
}

export function cmsRoutes(): Router {
  const router = express.Router();
  router.use(['/cms', '/admin'], requireAdminAuth);

  router.get(
    '/cms/stats',
    route(() => ({ data: db.getCMSStats() }), 'Gagal memuat ringkasan.'),
  );

  router.get(
    '/cms/couple',
    route(() => ({ data: db.getCoupleData() }), 'Gagal memuat data mempelai.'),
  );
  router.put(
    '/cms/couple',
    route((req) => ({ message: 'Data mempelai tersimpan.', data: db.updateCoupleData(req.body) }), 'Gagal menyimpan data mempelai.'),
  );

  router.get(
    '/cms/theme',
    route(() => ({ data: db.getThemeData() }), 'Gagal memuat pengaturan tema.'),
  );
  router.put(
    '/cms/theme',
    route((req) => ({ message: 'Pengaturan tersimpan.', data: db.updateThemeData(req.body) }), 'Gagal menyimpan tema.'),
  );

  crud(router, '/cms/events', {
    noun: 'Acara',
    list: () => db.getEvents(),
    create: (body) => db.createEvent(body),
    update: (id, body) => db.updateEvent(id, body),
    remove: (id) => db.deleteEvent(id),
  });

  crud(router, '/cms/stories', {
    noun: 'Kisah',
    list: () => db.getLoveStories(),
    create: (body) => db.createLoveStory(body),
    update: (id, body) => db.updateLoveStory(id, body),
    remove: (id) => db.deleteLoveStory(id),
  });

  crud(router, '/cms/gifts', {
    noun: 'Rekening',
    list: () => db.getGiftAccounts(),
    create: (body) => db.createGiftAccount(body),
    update: (id, body) => db.updateGiftAccount(id, body),
    remove: (id) => db.deleteGiftAccount(id),
  });

  // Registered before the generic gallery routes so "/batch" is not read as an :id.
  router.post(
    '/cms/gallery/batch',
    route((req, res) => {
      const photos = req.body?.photos;
      if (!Array.isArray(photos) || photos.length === 0) throw badRequest('Daftar foto kosong.');
      const data = db.createGalleryPhotos(photos);
      res.status(201).json({ success: true, message: `${data.length} media ditambahkan ke galeri.`, data });
    }, 'Gagal menambahkan media galeri.'),
  );

  crud(router, '/cms/gallery', {
    noun: 'Foto',
    list: () => db.getGallery(),
    create: (body) => db.createGalleryPhotos([body])[0],
    update: (id, body) => db.updateGalleryPhoto(id, body),
    remove: (id) => db.deleteGalleryPhoto(id),
  });

  // --- Guestbook moderation ---

  router.get(
    '/cms/guests',
    route(
      (req) => ({
        data: db.getAllGuests(String(req.query.status || 'ALL'), String(req.query.search || '')),
        stats: db.getRSVPStats(),
      }),
      'Gagal memuat buku tamu.',
    ),
  );

  router.put(
    '/cms/guests/:id/reply',
    route((req) => {
      const data = db.replyToGuest(req.params.id, String(req.body?.reply || ''));
      if (!data) throw notFound('Ucapan tidak ditemukan.');
      return { message: 'Balasan tersimpan.', data };
    }, 'Gagal menyimpan balasan.'),
  );

  router.put(
    '/cms/guests/:id/visibility',
    route((req) => {
      const data = db.toggleGuestVisibility(req.params.id);
      if (!data) throw notFound('Ucapan tidak ditemukan.');
      return { message: data.isHidden ? 'Ucapan disembunyikan dari tamu.' : 'Ucapan tampil lagi.', data };
    }, 'Gagal mengubah visibilitas.'),
  );

  router.delete(
    '/cms/guests/:id',
    route((req) => {
      if (!db.deleteGuest(req.params.id)) throw notFound('Ucapan tidak ditemukan.');
      return { message: 'Ucapan dihapus.' };
    }, 'Gagal menghapus ucapan.'),
  );

  // --- Invited guests & check-in ---

  router.get(
    '/cms/invited-guests',
    route(
      (req) => ({
        data: db.getAllInvitedGuests(String(req.query.filter || 'ALL'), String(req.query.search || '')),
        stats: db.getPresensiStats(),
      }),
      'Gagal memuat daftar tamu.',
    ),
  );

  router.post(
    '/cms/invited-guests/batch',
    route((req, res) => {
      const guests = req.body?.guests;
      if (!Array.isArray(guests) || guests.length === 0) throw badRequest('Daftar tamu kosong.');
      const data = db.createBatchInvitedGuests(guests);
      res.status(201).json({ success: true, message: `${data.length} tamu ditambahkan.`, data });
    }, 'Gagal mengimpor tamu.'),
  );

  router.post(
    '/cms/invited-guests/batch-sent',
    route((req) => {
      const { ids, sentStatus } = req.body || {};
      if (!Array.isArray(ids) || ids.length === 0) throw badRequest('Tidak ada tamu yang dipilih.');
      const data = db.batchUpdateInvitationSent(ids, Boolean(sentStatus));
      return { message: `${data.updatedCount} tamu ditandai.`, data };
    }, 'Gagal memperbarui status kirim.'),
  );

  router.post(
    '/cms/invited-guests',
    route((req, res) => {
      if (!req.body?.name?.trim()) throw badRequest('Nama tamu wajib diisi.');
      const data = db.createInvitedGuest({ ...req.body, pax: Number(req.body.pax) || 2 });
      res.status(201).json({ success: true, message: `${data.name} ditambahkan dengan kode ${data.slug}.`, data });
    }, 'Gagal menambahkan tamu.'),
  );

  router.put(
    '/cms/invited-guests/:id',
    route((req) => {
      const data = db.updateInvitedGuest(req.params.id, req.body);
      if (!data) throw notFound('Tamu tidak ditemukan.');
      return { message: 'Data tamu diperbarui.', data };
    }, 'Gagal memperbarui tamu.'),
  );

  router.delete(
    '/cms/invited-guests/:id',
    route((req) => {
      if (!db.deleteInvitedGuest(req.params.id)) throw notFound('Tamu tidak ditemukan.');
      return { message: 'Tamu dihapus dari daftar.' };
    }, 'Gagal menghapus tamu.'),
  );

  router.post(
    '/cms/presensi/check-in',
    route((req) => {
      const { guestId, slug, nameQuery, actualPax, souvenirGiven, method } = req.body || {};
      const result = db.checkInGuest({ id: guestId, slug, nameQuery }, { actualPax, souvenirGiven, method });
      return { ...result, stats: db.getPresensiStats() };
    }, 'Gagal mencatat kehadiran.'),
  );

  router.post(
    '/cms/presensi/undo',
    route((req) => {
      if (!req.body?.guestId) throw badRequest('ID tamu wajib disertakan.');
      return { ...db.undoCheckIn(req.body.guestId), stats: db.getPresensiStats() };
    }, 'Gagal membatalkan kehadiran.'),
  );

  router.get(
    '/cms/presensi/stats',
    route(() => ({ data: db.getPresensiStats() }), 'Gagal memuat statistik.'),
  );

  // --- Photo moments moderation ---

  router.get(
    '/cms/photo-moments/frame-config',
    route(() => ({ data: db.getPhotoFrameConfig() }), 'Gagal memuat bingkai foto.'),
  );

  router.put(
    '/cms/photo-moments/frame-config',
    route((req) => ({ message: 'Bingkai foto tersimpan.', data: db.updatePhotoFrameConfig(req.body) }), 'Gagal menyimpan bingkai foto.'),
  );

  router.get(
    '/cms/photo-moments',
    route(() => {
      const data = db.getPhotoMoments();
      return { data, total: data.length };
    }, 'Gagal memuat foto tamu.'),
  );

  router.delete(
    '/cms/photo-moments/:id',
    route((req) => {
      if (!db.deletePhotoMoment(req.params.id)) throw notFound('Foto tidak ditemukan.');
      return { message: 'Foto tamu dihapus.' };
    }, 'Gagal menghapus foto.'),
  );

  // --- Account & data ---

  router.get(
    '/cms/general',
    route<AuthenticatedRequest>((req) => {
      const inv = db.getInvitationData();
      return {
        data: {
          invitationId: inv.id,
          weddingDate: inv.weddingDate,
          groomShortName: inv.groomShortName,
          brideShortName: inv.brideShortName,
          adminProfile: req.user,
        },
      };
    }, 'Gagal memuat pengaturan.'),
  );

  router.post(
    '/admin/reset-default',
    route(() => ({ message: 'Data dikembalikan ke isi demo.', data: db.resetToDefault() }), 'Gagal mereset data.'),
  );

  return router;
}
