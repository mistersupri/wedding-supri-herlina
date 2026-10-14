import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';

const JWT_ACCESS_SECRET = process.env.JWT_SECRET || 'wedding_invitation_secret_jwt_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'wedding_invitation_refresh_jwt_key_2026_refresh_secret';
const ENV_ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ENV_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

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

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

// Generate Access Token (Short-lived: 1 hour)
export function generateAccessToken(payload: Omit<TokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'access' }, JWT_ACCESS_SECRET, { expiresIn: '1h' });
}

// Generate Refresh Token (Long-lived: 7 days)
export function generateRefreshToken(payload: Omit<TokenPayload, 'type'>): string {
  return jwt.sign({ id: payload.id, username: payload.username, role: payload.role, name: payload.name, type: 'refresh' }, JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
}

// Generate both tokens simultaneously
export function generateTokenPair(payload: Omit<TokenPayload, 'type'>) {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  return {
    accessToken,
    refreshToken,
    token: accessToken, // backward compatibility
    expiresIn: 3600, // 1 hour in seconds
  };
}

// Legacy helper for backward compatibility
export function generateToken(payload: TokenPayload): string {
  return generateAccessToken(payload);
}

// Verify Access Token
export function verifyAccessToken(token: string): { payload: TokenPayload | null; expired: boolean } {
  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as TokenPayload;
    return { payload: decoded, expired: false };
  } catch (err: any) {
    const expired = err?.name === 'TokenExpiredError';
    return { payload: null, expired };
  }
}

// Verify Refresh Token
export function verifyRefreshToken(token: string): { payload: TokenPayload | null; expired: boolean } {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
    if (decoded.type && decoded.type !== 'refresh') {
      return { payload: null, expired: false };
    }
    return { payload: decoded, expired: false };
  } catch (err: any) {
    const expired = err?.name === 'TokenExpiredError';
    return { payload: null, expired };
  }
}

// Legacy verifyToken helper
export function verifyToken(token: string): TokenPayload | null {
  const res = verifyAccessToken(token);
  return res.payload;
}

export function getEnvAdminCredentials() {
  return {
    username: ENV_ADMIN_USERNAME,
    password: ENV_ADMIN_PASSWORD,
  };
}

export function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Akses ditolak. Token otentikasi admin diperlukan.',
    });
  }

  const token = authHeader.substring(7);
  const { payload, expired } = verifyAccessToken(token);

  if (expired) {
    return res.status(401).json({
      success: false,
      code: 'TOKEN_EXPIRED',
      message: 'Sesi login telah berakhir. Silakan segarkan token Anda.',
    });
  }

  if (!payload) {
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Token login tidak valid.',
    });
  }

  req.user = payload;
  next();
}

