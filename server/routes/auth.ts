import express, { type Router } from 'express';
import {
  authenticate,
  changePassword,
  issueTokens,
  requireAdminAuth,
  resolveAdmin,
  verifyRefreshToken,
  type AuthenticatedRequest,
} from '../auth.js';
import { HttpError, badRequest, route } from '../http.js';

export function authRoutes(): Router {
  const router = express.Router();

  router.post(
    '/auth/login',
    route((req) => {
      const { username, password } = req.body || {};
      if (!username || !password) throw badRequest('Username dan kata sandi wajib diisi.');
      const user = authenticate(String(username), String(password));
      if (!user) throw new HttpError(401, 'Username atau kata sandi tidak cocok.');
      return { data: issueTokens(user) };
    }, 'Gagal masuk.'),
  );

  router.post(
    '/auth/refresh',
    route((req) => {
      const token = req.body?.refreshToken;
      if (!token) throw new HttpError(400, 'Refresh token wajib disertakan.', 'REFRESH_TOKEN_REQUIRED');
      const { payload, expired } = verifyRefreshToken(token);
      if (!payload) {
        throw expired
          ? new HttpError(401, 'Sesi berakhir. Silakan masuk lagi.', 'REFRESH_TOKEN_EXPIRED')
          : new HttpError(401, 'Refresh token tidak valid.', 'INVALID_REFRESH_TOKEN');
      }
      const user = resolveAdmin(payload);
      if (!user) throw new HttpError(401, 'Akun admin tidak ditemukan.', 'USER_NOT_FOUND');
      return { data: issueTokens(user) };
    }, 'Gagal memperbarui sesi.'),
  );

  router.post(
    '/auth/logout',
    route(() => ({ message: 'Berhasil keluar.' }), 'Gagal keluar.'),
  );

  router.get(
    '/auth/me',
    requireAdminAuth,
    route<AuthenticatedRequest>((req) => {
      const user = resolveAdmin(req.user!);
      if (!user) throw new HttpError(404, 'Akun admin tidak ditemukan.');
      return { data: user };
    }, 'Gagal memeriksa sesi.'),
  );

  router.post(
    '/auth/change-password',
    requireAdminAuth,
    route<AuthenticatedRequest>((req) => {
      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword || String(newPassword).length < 6) {
        throw badRequest('Kata sandi baru minimal 6 karakter.');
      }
      changePassword(req.user!, String(currentPassword), String(newPassword));
      return { message: 'Kata sandi berhasil diperbarui.' };
    }, 'Gagal mengubah kata sandi.'),
  );

  return router;
}
