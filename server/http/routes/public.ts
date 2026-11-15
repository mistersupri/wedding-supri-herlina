import express, { type Router } from 'express';
import { HttpError, route } from '../http.js';
import { limits } from '../middleware/rateLimit.js';
import type { Services } from '../../app.js';

export function publicRoutes(s: Services): Router {
  const router = express.Router();

  router.get(
    '/invitation',
    route(async () => ({ data: await s.invitation.publicInvitation() }), 'Gagal memuat data undangan.'),
  );

  // Venue addresses, map links and gift accounts are only for guests who hold a valid invitation code.
  router.post(
    '/public/guest-details',
    limits.verifyCode,
    route(async (req) => {
      const verification = await s.guests.verify(typeof req.body?.code === 'string' ? req.body.code : '');
      if (!verification.isValid) throw new HttpError(403, verification.message);
      return { data: await s.invitation.guestDetails() };
    }, 'Gagal memuat detail acara.'),
  );

  router.get(
    '/public/guestbook',
    route((req) => s.guestbook.publicList(String(req.query.c || '')), 'Gagal memuat buku tamu.'),
  );

  router.post(
    '/public/guestbook',
    limits.wish,
    route(async (req, res) => {
      const data = await s.guestbook.submit(req.body || {});
      res.status(201).json({ success: true, message: 'Terima kasih atas doa dan konfirmasinya.', data });
    }, 'Gagal mengirim ucapan.'),
  );

  router.get(
    '/public/guest/:slug',
    limits.verifyCode,
    route((req) => s.guests.verify(req.params.slug), 'Gagal memeriksa kode undangan.'),
  );
  router.post(
    '/public/verify-access',
    limits.verifyCode,
    route((req) => s.guests.verify(typeof req.body?.code === 'string' ? req.body.code : ''), 'Gagal memeriksa kode undangan.'),
  );

  router.get(
    '/public/photo-moments/frame-config',
    route(async () => ({ data: await s.moments.frame() }), 'Gagal memuat bingkai foto.'),
  );
  router.get(
    '/public/photo-moments/config',
    route(async () => ({ data: await s.moments.config() }), 'Gagal memuat pengaturan kamera.'),
  );
  router.get(
    '/public/photo-moments/screen',
    route((_req) => s.moments.screen(), 'Gagal memuat layar foto.'),
  );

  router.get(
    '/public/photo-moments',
    route(
      (req) =>
        s.moments.page({
          page: parseInt(String(req.query.page), 10),
          limit: parseInt(String(req.query.limit), 10),
          guestName: String(req.query.guestName || ''),
          guestSlug: String(req.query.guestSlug || ''),
        }),
      'Gagal memuat foto tamu.',
    ),
  );

  router.post(
    '/public/photo-moments',
    limits.addMoment,
    route(async (req, res) => {
      const photo = await s.moments.add(req.body || {});
      res.status(201).json({ success: true, photo });
    }, 'Gagal menyimpan foto.'),
  );

  router.get(
    '/public/photo-moments/:id/comments',
    route(async (req) => ({ data: await s.moments.comments(req.params.id) }), 'Gagal memuat komentar.'),
  );
  router.post(
    '/public/photo-moments/:id/comments',
    limits.comment,
    route(async (req, res) => {
      const data = await s.moments.addComment(req.params.id, req.body || {});
      res.status(201).json({ success: true, data });
    }, 'Gagal mengirim komentar.'),
  );

  router.post(
    '/public/photo-moments/:id/react',
    limits.react,
    route((req) => {
      const { emoji, action } = req.body || {};
      return s.moments.react(
        req.params.id,
        typeof emoji === 'string' && emoji ? emoji : '❤️',
        action === 'remove' ? 'remove' : 'add',
      );
    }, 'Gagal mengirim reaksi.'),
  );

  return router;
}
