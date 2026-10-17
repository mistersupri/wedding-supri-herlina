import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken, type TokenPayload } from '../../services/authService.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Silakan masuk sebagai admin.' });
    return;
  }
  const { payload, expired } = verifyAccessToken(header.substring(7));
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
