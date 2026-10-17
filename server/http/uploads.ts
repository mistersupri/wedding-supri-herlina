import fs from 'fs';
import path from 'path';
import express, { type NextFunction, type Request, type Response, type Router } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { requireAdmin } from './middleware/requireAdmin.js';
import { badRequest, route } from './http.js';
import type { UploadCategory } from '../../shared/types.js';

const CATEGORIES: UploadCategory[] = ['hero', 'gallery', 'couples', 'moments', 'general'];
const MB = 1024 * 1024;

for (const category of CATEGORIES) {
  fs.mkdirSync(path.join(config.uploadDir, category), { recursive: true });
}

const categoryOf = (req: Request): UploadCategory => {
  const raw = String(req.query.category || 'general');
  return CATEGORIES.includes(raw as UploadCategory) ? (raw as UploadCategory) : 'general';
};

const storage = multer.diskStorage({
  destination: (req, _file, cb) => cb(null, path.join(config.uploadDir, categoryOf(req))),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const ext = path.extname(safe) || '.bin';
    const base = path.basename(safe, ext).slice(0, 60);
    cb(null, `${base}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`);
  },
});

/** Admins upload hero videos and gallery media, so their limit is generous. */
const adminUpload = multer({ storage, limits: { fileSize: 100 * MB } });

/** Guests may only upload a photo-moment image. */
const guestUpload = multer({
  storage,
  limits: { fileSize: 10 * MB },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

/** Photo moments are the one upload a guest makes; every other category needs an admin token. */
function gate(req: Request, res: Response, next: NextFunction) {
  if (categoryOf(req) === 'moments' && !req.headers.authorization) return next();
  return requireAdmin(req, res, next);
}

const pickUploader = (req: Request) => (req.headers.authorization ? adminUpload : guestUpload);

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
    (req, res, next) => pickUploader(req).single('file')(req, res, next),
    route((req) => {
      if (!req.file) throw badRequest('Tidak ada file gambar yang diterima.');
      return describe(req, req.file);
    }, 'Gagal mengunggah file.'),
  );

  router.post(
    '/upload/batch',
    requireAdmin,
    adminUpload.array('files', 30),
    route((req) => {
      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length === 0) throw badRequest('Tidak ada file yang diunggah.');
      return { files: files.map((file) => describe(req, file)) };
    }, 'Gagal mengunggah file.'),
  );

  return router;
}
