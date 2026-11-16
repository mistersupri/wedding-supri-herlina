import fs from 'fs/promises';
import path from 'path';
import type { Db } from '../infrastructure/prisma.js';

const HOUR = 3_600_000;
/** Younger files may still be on their way to being registered by a slow upload queue. */
const MIN_AGE_MS = 24 * HOUR;
const PART_MIN_AGE_MS = HOUR;

const fileName = (url: string | null | undefined) => (url ? path.basename(url) : '');

async function sweep(dir: string, keep: Set<string>, now: number): Promise<number> {
  let removed = 0;
  let names: string[] = [];
  try {
    names = await fs.readdir(dir);
  } catch {
    return 0;
  }
  for (const name of names) {
    const full = path.join(dir, name);
    try {
      const stat = await fs.stat(full);
      if (!stat.isFile()) continue;
      const age = now - stat.mtimeMs;
      const abandoned = name.endsWith('.part') ? age > PART_MIN_AGE_MS : !keep.has(name) && age > MIN_AGE_MS;
      if (abandoned) {
        await fs.rm(full, { force: true });
        removed++;
      }
    } catch {
      // The file vanished or is unreadable; the next sweep will look again.
    }
  }
  return removed;
}

/**
 * Guest uploads happen before the photo or wish is saved, so a dropped connection or a rejected photo
 * leaves a file nobody points to. Remove such files once they are a day old.
 * Only the two guest-writable folders are touched; admin uploads are never deleted here.
 */
export async function cleanupOrphanUploads(db: Db, uploadDir: string): Promise<number> {
  const now = Date.now();
  const [moments, wishes] = await Promise.all([
    db.photoMoment.findMany({ select: { photoUrl: true, originalUrl: true } }),
    db.guestWish.findMany({ where: { voiceUrl: { not: null } }, select: { voiceUrl: true } }),
  ]);
  const momentFiles = new Set(moments.flatMap((m) => [fileName(m.photoUrl), fileName(m.originalUrl)]));
  const voiceFiles = new Set(wishes.map((w) => fileName(w.voiceUrl)));
  return (await sweep(path.join(uploadDir, 'moments'), momentFiles, now)) + (await sweep(path.join(uploadDir, 'voice'), voiceFiles, now));
}
