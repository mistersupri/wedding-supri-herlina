import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { PERMISSIONS_POLICY, securityHeaders } from '../../server/http/middleware/securityHeaders.js';

describe('securityHeaders', () => {
  const headers: Record<string, string> = {};
  const res = { setHeader: (k: string, v: string) => void (headers[k] = v) } as unknown as Response;
  const next = vi.fn();
  securityHeaders({} as Request, res, next);

  it('sniffing and framing protections are on', () => {
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('SAMEORIGIN');
    expect(next).toHaveBeenCalled();
  });

  it('keeps the features guests use available to this site: camera, microphone and location', () => {
    expect(headers['Permissions-Policy']).toBe(PERMISSIONS_POLICY);
    for (const feature of ['camera', 'microphone', 'geolocation']) expect(PERMISSIONS_POLICY).toContain(`${feature}=(self)`);
  });
});
