import type express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../../config.js';

/** Baseline headers for every response. A full Content-Security-Policy is left out on purpose: the page embeds Google Maps and third-party media. */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // The guest camera and voice notes need the camera and microphone of this origin only.
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  if (config.isProduction) res.setHeader('Strict-Transport-Security', 'max-age=15552000');
  next();
}

/**
 * Uploaded files are user-supplied: never let the browser run them as a page.
 * Filenames are random and never reused, so they are safe to cache for a long time.
 */
export const uploadStaticOptions: NonNullable<Parameters<typeof express.static>[1]> = {
  index: false,
  dotfiles: 'deny',
  maxAge: '30d',
  immutable: true,
  setHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox");
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  },
};
