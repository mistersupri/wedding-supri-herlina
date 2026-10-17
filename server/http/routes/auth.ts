import express, { type Router } from 'express';
import { route } from '../http.js';
import { requireAdmin, type AuthenticatedRequest } from '../middleware/requireAdmin.js';
import type { Services } from '../../app.js';

export function authRoutes(s: Services): Router {
  const router = express.Router();

  router.post(
    '/auth/login',
    route(async (req) => ({ data: await s.auth.login(String(req.body?.username || ''), String(req.body?.password || '')) }), 'Gagal masuk.'),
  );

  router.post('/auth/refresh', route(async (req) => ({ data: await s.auth.refresh(req.body?.refreshToken) }), 'Gagal memperbarui sesi.'));

  router.post('/auth/logout', route(() => ({ message: 'Berhasil keluar.' }), 'Gagal keluar.'));

  router.get(
    '/auth/me',
    requireAdmin,
    route<AuthenticatedRequest>(async (req) => ({ data: await s.auth.me(req.user!) }), 'Gagal memeriksa sesi.'),
  );

  router.post(
    '/auth/change-password',
    requireAdmin,
    route<AuthenticatedRequest>(async (req) => {
      await s.auth.changePassword(req.user!, String(req.body?.currentPassword || ''), String(req.body?.newPassword || ''));
      return { message: 'Kata sandi berhasil diperbarui.' };
    }, 'Gagal mengubah kata sandi.'),
  );

  return router;
}
