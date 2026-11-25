import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { rateLimit } from '../../server/http/middleware/rateLimit.js';

function call(limiter: ReturnType<typeof rateLimit>, ip: string) {
  const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  limiter({ ip } as Request, res, next);
  return { res, next };
}

describe('rateLimit', () => {
  it('lets requests through up to the limit, then answers 429 with Retry-After', () => {
    const limiter = rateLimit({ max: 2, windowMs: 60_000 });
    expect(call(limiter, '1.1.1.1').next).toHaveBeenCalled();
    expect(call(limiter, '1.1.1.1').next).toHaveBeenCalled();
    const blocked = call(limiter, '1.1.1.1');
    expect(blocked.next).not.toHaveBeenCalled();
    expect(blocked.res.status).toHaveBeenCalledWith(429);
    expect(blocked.res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
  });

  it('counts each client separately', () => {
    const limiter = rateLimit({ max: 1, windowMs: 60_000 });
    call(limiter, '1.1.1.1');
    expect(call(limiter, '2.2.2.2').next).toHaveBeenCalled();
  });

  it('starts a new window once the old one has passed', () => {
    vi.useFakeTimers();
    const limiter = rateLimit({ max: 1, windowMs: 1000 });
    call(limiter, '3.3.3.3');
    expect(call(limiter, '3.3.3.3').next).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1500);
    expect(call(limiter, '3.3.3.3').next).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
