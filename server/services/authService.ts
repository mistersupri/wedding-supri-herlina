import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config, ENV_ADMIN_ID } from '../config.js';
import { HttpError } from '../http/http.js';
import type { adminRepository, StoredAdmin } from '../repositories/guestRepositories.js';
import type { AdminUser } from '../../shared/types.js';

export interface TokenPayload {
  id: string;
  username: string;
  role: string;
  name: string;
  type?: 'access' | 'refresh';
}

const ACCESS_TTL_SECONDS = 3600;

export const hashPassword = (password: string) => bcrypt.hashSync(password, 10);

const envAdminProfile = (): AdminUser => ({
  id: ENV_ADMIN_ID,
  username: config.admin.username,
  email: `${config.admin.username}@wedding.local`,
  name: 'Admin Utama',
  role: 'SUPERADMIN',
  createdAt: new Date().toISOString(),
});

const isEnvAdmin = (who: { id?: string; username?: string }) =>
  who.id === ENV_ADMIN_ID || who.username?.toLowerCase() === config.admin.username.toLowerCase();

const withoutHash = ({ passwordHash: _hash, ...admin }: StoredAdmin): AdminUser => admin;

function verify(token: string, secret: string, type: 'access' | 'refresh') {
  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    if (decoded.type && decoded.type !== type) return { payload: null, expired: false };
    return { payload: decoded, expired: false };
  } catch (err) {
    return { payload: null, expired: (err as Error)?.name === 'TokenExpiredError' };
  }
}

export const verifyAccessToken = (token: string) => verify(token, config.jwt.accessSecret, 'access');

export function authService(admins: ReturnType<typeof adminRepository>) {
  const issueTokens = (user: AdminUser) => {
    const claims = { id: user.id, username: user.username, role: user.role, name: user.name };
    return {
      accessToken: jwt.sign({ ...claims, type: 'access' }, config.jwt.accessSecret, { expiresIn: ACCESS_TTL_SECONDS }),
      refreshToken: jwt.sign({ ...claims, type: 'refresh' }, config.jwt.refreshSecret, { expiresIn: '7d' }),
      expiresIn: ACCESS_TTL_SECONDS,
      user,
    };
  };

  /** Look up the admin a token was issued to; null when the account no longer exists. */
  const resolveAdmin = async (payload: Pick<TokenPayload, 'id' | 'username'>): Promise<AdminUser | null> => {
    if (isEnvAdmin(payload)) return envAdminProfile();
    const stored = await admins.findById(payload.id);
    return stored ? withoutHash(stored) : null;
  };

  return {
    /** The env superadmin always wins over a stored account with the same username. */
    async login(username: string, password: string) {
      if (!username || !password) throw new HttpError(400, 'Username dan kata sandi wajib diisi.');
      let user: AdminUser | null = null;
      if (isEnvAdmin({ username: username.trim() })) {
        user = password === config.admin.password ? envAdminProfile() : null;
      } else {
        const stored = await admins.findByUsername(username);
        user = stored && bcrypt.compareSync(password, stored.passwordHash) ? withoutHash(stored) : null;
      }
      if (!user) throw new HttpError(401, 'Username atau kata sandi tidak cocok.');
      return issueTokens(user);
    },

    async refresh(refreshToken?: string) {
      if (!refreshToken) throw new HttpError(400, 'Refresh token wajib disertakan.', 'REFRESH_TOKEN_REQUIRED');
      const { payload, expired } = verify(refreshToken, config.jwt.refreshSecret, 'refresh');
      if (!payload) {
        throw expired
          ? new HttpError(401, 'Sesi berakhir. Silakan masuk lagi.', 'REFRESH_TOKEN_EXPIRED')
          : new HttpError(401, 'Refresh token tidak valid.', 'INVALID_REFRESH_TOKEN');
      }
      const user = await resolveAdmin(payload);
      if (!user) throw new HttpError(401, 'Akun admin tidak ditemukan.', 'USER_NOT_FOUND');
      return issueTokens(user);
    },

    async me(payload: TokenPayload) {
      return (await resolveAdmin(payload)) ?? Promise.reject(new HttpError(404, 'Akun admin tidak ditemukan.'));
    },

    async changePassword(user: TokenPayload, currentPassword: string, newPassword: string) {
      if (!currentPassword || !newPassword || newPassword.length < 6) throw new HttpError(400, 'Kata sandi baru minimal 6 karakter.');
      if (isEnvAdmin(user)) throw new HttpError(400, 'Kata sandi akun utama diatur lewat ADMIN_PASSWORD di file environment server.');
      const stored = await admins.findById(user.id);
      if (!stored || !bcrypt.compareSync(currentPassword, stored.passwordHash)) throw new HttpError(400, 'Kata sandi saat ini salah.');
      await admins.setPassword(stored.id, hashPassword(newPassword));
    },
  };
}

export type AuthService = ReturnType<typeof authService>;
