import crypto from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import express, { type NextFunction, type Request, type Response, type Router } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { requireAdmin } from './middleware/requireAdmin.js';
import { limits } from './middleware/rateLimit.js';
import { detectFile, type DetectedType } from './fileType.js';
import { badRequest, route } from './http.js';
import type { UploadCategory } from '../../shared/types.js';

const CATEGORIES: UploadCategory[] = ['hero', 'gallery', 'couples', 'moments', 'voice', 'general'];
/** What an anonymous guest may upload, and the kinds of file each accepts. */
const GUEST_RULES: Partial<Record<UploadCategory, { kinds: DetectedType['kind'][]; maxBytes: number }>> = {
  moments: { kinds: ['image'], maxBytes: 10 * 1024 * 1024 },
  voice: { kinds: ['audio', 'video'], maxBytes: 5 * 1024 * 1024 },
};
const ADMIN_MAX_BYTES = 100 * 1024 * 1024;

for (const category of CATEGORIES) {
  fs.mkdirSync(path.join(config.uploadDir, category), { recursive: true });
}

const categoryOf = (req: Request): UploadCategory => {
  const raw = String(req.query.category || 'general');
  return CATEGORIES.includes(raw as UploadCategory) ? (raw as UploadCategory) : 'general';
};

/** Files land under a random name first; the real extension is decided after looking inside the file. */
const storage = multer.diskStorage({
  destination: (req, _file, cb) => cb(null, path.join(config.uploadDir, categoryOf(req))),
  filename: (_req, _file, cb) => cb(null, `${crypto.randomUUID()}.part`),
});

const adminUpload = multer({ storage, limits: { fileSize: ADMIN_MAX_BYTES } });
const guestUpload = multer({ storage, limits: { fileSize: Math.max(...Object.values(GUEST_RULES).map((r) => r!.maxBytes)) } });

/** Admin uploads need a valid token; anonymous guests may only reach the categories in GUEST_RULES. */
function gate(req: Request, res: Response, next: NextFunction) {
  if (req.headers.authorization) {
    res.locals.isAdmin = true;
    return requireAdmin(req, res, next);
  }
  if (GUEST_RULES[categoryOf(req)]) return limits.guestUpload(req, res, next);
  return requireAdmin(req, res, next);
}

const pickUploader = (res: Response) => (res.locals.isAdmin ? adminUpload : guestUpload);

const discard = (files: Express.Multer.File[]) => Promise.all(files.map((f) => fsp.rm(f.path, { force: true })));

/**
 * Look inside each uploaded file, reject anything that is not a known image, video or audio format,
 * and give it a random name with the extension of what it really is.
 */
async function finalize(req: Request, res: Response, files: Express.Multer.File[]) {
  const category = categoryOf(req);
  const guestRule = res.locals.isAdmin ? undefined : GUEST_RULES[category];
  try {
    for (const file of files) {
      const type = await detectFile(file.path);
      if (!type) throw badRequest('Format file tidak didukung. Gunakan gambar, video, atau audio.');
      if (guestRule && (!guestRule.kinds.includes(type.kind) || file.size > guestRule.maxBytes)) {
        throw badRequest(category === 'voice' ? 'Hanya rekaman suara (maks. 5 MB) yang bisa diunggah.' : 'Hanya foto (maks. 10 MB) yang bisa diunggah.');
      }
      const name = `${crypto.randomUUID()}.${type.ext}`;
      const target = path.join(path.dirname(file.path), name);
      await fsp.rename(file.path, target);
      file.path = target;
      file.filename = name;
      file.mimetype = type.mime;
    }
  } catch (err) {
    await discard(files);
    throw err;
  }
}

const describe = (req: Request, file: Express.Multer.File) => ({
  url: `/uploads/${categoryOf(req)}/${file.filename}`,
  filename: file.filename,
  originalName: file.originalname,
  size: file.size,
  mimetype: file.mimetype,
});

export function uploadRoutes(): Router {
  const router = express.Router();

  router.post(
    '/upload',
    gate,
    (req, res, next) => pickUploader(res).single('file')(req, res, next),
    route(async (req, res) => {
      if (!req.file) throw badRequest('Tidak ada file yang diterima.');
      await finalize(req, res, [req.file]);
      return describe(req, req.file);
    }, 'Gagal mengunggah file.'),
  );

  router.post(
    '/upload/batch',
    (req, res, next) => {
      res.locals.isAdmin = true;
      next();
    },
    requireAdmin,
    adminUpload.array('files', 30),
    route(async (req, res) => {
      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length === 0) throw badRequest('Tidak ada file yang diunggah.');
      await finalize(req, res, files);
      return { files: files.map((file) => describe(req, file)) };
    }, 'Gagal mengunggah file.'),
  );

  return router;
}
