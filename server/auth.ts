import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import { config, ENV_ADMIN_ID } from './config.js';
import { db } from './db/index.js';
import { HttpError } from './http.js';
import type { AdminUser } from '../src/types.js';

export interface TokenPayload {
  id: string;
  username: string;
  role: string;
  name: string;
  type?: 'access' | 'refresh';
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

const ACCESS_TTL_SECONDS = 3600;

export const hashPassword = (password: string) => bcrypt.hashSync(password, 10);
export const comparePassword = (password: string, hash: string) => bcrypt.compareSync(password, hash);

function envAdminProfile(): AdminUser {
  return {
    id: ENV_ADMIN_ID,
    username: config.admin.username,
    email: `${config.admin.username}@wedding.local`,
    name: 'Admin Utama',
    role: 'SUPERADMIN',
    createdAt: new Date().toISOString(),
  };
}

const isEnvAdmin = (idOrUsername: { id?: string; username?: string }) =>
  idOrUsername.id === ENV_ADMIN_ID || idOrUsername.username?.toLowerCase() === config.admin.username.toLowerCase();

const withoutHash = ({ passwordHash: _hash, ...admin }: AdminUser & { passwordHash: string }): AdminUser => admin;

/** Check credentials against the env superadmin first, then stored admin accounts. */
export function authenticate(username: string, password: string): AdminUser | null {
  const name = username.trim();
  if (isEnvAdmin({ username: name })) {
    return password === config.admin.password ? envAdminProfile() : null;
  }
  const stored = db.findAdminByUsername(name);
  return stored && comparePassword(password, stored.passwordHash) ? withoutHash(stored) : null;
}

/** Look up the admin a token was issued to; null when the account no longer exists. */
export function resolveAdmin(payload: Pick<TokenPayload, 'id' | 'username'>): AdminUser | null {
  if (isEnvAdmin(payload)) return envAdminProfile();
  const stored = db.findAdminById(payload.id);
  return stored ? withoutHash(stored) : null;
}

export function issueTokens(user: AdminUser) {
  const claims = { id: user.id, username: user.username, role: user.role, name: user.name };
  return {
    accessToken: jwt.sign({ ...claims, type: 'access' }, config.jwt.accessSecret, { expiresIn: ACCESS_TTL_SECONDS }),
    refreshToken: jwt.sign({ ...claims, type: 'refresh' }, config.jwt.refreshSecret, { expiresIn: '7d' }),
    expiresIn: ACCESS_TTL_SECONDS,
    user,
  };
}

function verify(token: string, secret: string, type: 'access' | 'refresh') {
  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    if (decoded.type && decoded.type !== type) return { payload: null, expired: false };
    return { payload: decoded, expired: false };
  } catch (err) {
    return { payload: null, expired: (err as Error)?.name === 'TokenExpiredError' };
  }
}

export const verifyRefreshToken = (token: string) => verify(token, config.jwt.refreshSecret, 'refresh');

export function changePassword(user: TokenPayload, currentPassword: string, newPassword: string) {
  if (isEnvAdmin(user)) {
    throw new HttpError(400, 'Kata sandi akun utama diatur lewat ADMIN_PASSWORD di file environment server.');
  }
  const stored = db.findAdminById(user.id);
  if (!stored || !comparePassword(currentPassword, stored.passwordHash)) {
    throw new HttpError(400, 'Kata sandi saat ini salah.');
  }
  db.updateAdminPassword(stored.id, hashPassword(newPassword));
}

export function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Silakan masuk sebagai admin.' });
    return;
  }

  const { payload, expired } = verify(header.substring(7), config.jwt.accessSecret, 'access');
  if (!payload) {
    res.status(401).json({
      success: false,
      code: expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      message: expired ? 'Sesi berakhir. Silakan masuk lagi.' : 'Token login tidak valid.',
    });
    return;
  }

  req.user = payload;
  next();
}
