import fs from 'fs/promises';
import path from 'path';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { config } from './config.js';
import type { Db } from './infrastructure/prisma.js';
import { eventRepository, galleryRepository, giftRepository, storyRepository } from './repositories/contentRepositories.js';
import {
  adminRepository,
  attendanceSettingRepository,
  cameraSettingRepository,
  frameRepository,
  invitedGuestRepository,
  photoCommentRepository,
  photoMomentRepository,
  wishRepository,
} from './repositories/guestRepositories.js';
import { invitationRepository } from './repositories/invitationRepository.js';
import { attendanceService } from './services/attendanceService.js';
import { authService } from './services/authService.js';
import { exportService } from './services/exportService.js';
import { guestService } from './services/guestService.js';
import { guestbookService } from './services/guestbookService.js';
import { invitationService } from './services/invitationService.js';
import { photoMomentService } from './services/photoMomentService.js';
import { seedDatabase } from './db/seed.js';
import { uploadRoutes } from './http/uploads.js';
import { publicRoutes } from './http/routes/public.js';
import { authRoutes } from './http/routes/auth.js';
import { cmsRoutes } from './http/routes/cms.js';
import { securityHeaders, uploadStaticOptions } from './http/middleware/securityHeaders.js';
import { guestFromQuery, withShareTags } from './http/share.js';
import { cleanupOrphanUploads } from './services/uploadCleanup.js';

/** Wire repositories into services. Routes only ever see this object. */
export function createServices(db: Db) {
  const content = {
    events: eventRepository(db),
    stories: storyRepository(db),
    gifts: giftRepository(db),
    gallery: galleryRepository(db),
  };
  const wishes = wishRepository(db);
  const invitedGuests = invitedGuestRepository(db);
  const cameraSettings = cameraSettingRepository(db);

  const guestsService = guestService(invitedGuests, wishes.statusBySlug);
  const attendanceSettings = attendanceSettingRepository(db);
  const attendance = attendanceService({ settings: attendanceSettings, guests: invitedGuests, guestService: guestsService });

  return {
    content,
    attendance,
    invitation: invitationService({
      invitation: invitationRepository(db),
      wishes,
      cameraSettings,
      attendanceRules: attendance.publicRules,
      moments: photoMomentRepository(db),
      ...content,
    }),
    guestbook: guestbookService(wishes, invitedGuests),
    guests: guestsService,
    moments: photoMomentService({
      moments: photoMomentRepository(db),
      comments: photoCommentRepository(db),
      frames: frameRepository(db),
      settings: cameraSettings,
      guests: invitedGuests,
    }),
    exports: exportService({ guests: invitedGuests, wishes, moments: photoMomentRepository(db), uploadDir: config.uploadDir }),
    auth: authService(adminRepository(db)),
    resetDemo: () => seedDatabase(db),
    /** Deletes uploaded files that never became part of a photo, wish or gallery entry. */
    cleanupUploads: () => cleanupOrphanUploads(db, config.uploadDir),
    /** Readiness: the database answers. */
    ping: async () => {
      await db.$queryRaw`SELECT 1`;
    },
  };
}

export type Services = ReturnType<typeof createServices>;

export async function createApp(services: Services) {
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  app.get('/api/health', async (_req, res) => {
    try {
      await services.ping();
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'database unavailable' });
    }
  });

  app.use(express.json({ limit: config.jsonBodyLimit }));
  app.use('/uploads', express.static(config.uploadDir, uploadStaticOptions));

  app.use('/api', uploadRoutes(), publicRoutes(services), authRoutes(services), cmsRoutes(services));
  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' });
  });

  // The invitation page carries the couple's names and photo in its HTML, so WhatsApp can preview the link.
  let shareCache: { at: number; info: Awaited<ReturnType<Services['invitation']['shareInfo']>> } | null = null;
  const shareInfo = async () => {
    if (!shareCache || Date.now() - shareCache.at > 30_000) shareCache = { at: Date.now(), info: await services.invitation.shareInfo() };
    return shareCache.info;
  };
  const invitationHtml = async (req: Request, html: string) => {
    try {
      const origin = `${req.protocol}://${req.get('host')}`;
      return withShareTags(html, await shareInfo(), origin, req.originalUrl.split('#')[0], guestFromQuery(req.query.to ?? req.query.guest ?? req.query.nama));
    } catch {
      // No invitation yet (or the database is down): the generic page is still better than an error.
      return html;
    }
  };

  if (config.isProduction) {
    // The worker and manifest are not fingerprinted, so browsers must check them on every load to notice a new version.
    app.get(['/sw.js', '/manifest.webmanifest'], (req, res, next) => {
      res.setHeader('Cache-Control', 'no-cache');
      if (req.path === '/sw.js') res.setHeader('Service-Worker-Allowed', '/');
      next();
    });
    // Vite fingerprints everything under /assets, so it can be cached for good; index.html must always be revalidated.
    app.use('/assets', express.static(path.join(config.distDir, 'assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(config.distDir, { index: false }));
    app.get('*', (req, res) => {
      // A missing file must be a 404, never the HTML shell: a browser or the service worker would take it for the script.
      if (path.extname(req.path)) {
        res.status(404).type('text/plain').send('Not found');
        return;
      }
      res.setHeader('Cache-Control', 'no-cache');
      if (req.path === '/') {
        void fs.readFile(path.join(config.distDir, 'index.html'), 'utf8').then(
          async (html) => res.type('html').send(await invitationHtml(req, html)),
          () => res.sendFile(path.join(config.distDir, 'index.html')),
        );
        return;
      }
      res.sendFile(path.join(config.distDir, 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.get('/', async (req, res, next) => {
      try {
        const raw = await fs.readFile(path.join(process.cwd(), 'index.html'), 'utf8');
        res.status(200).type('html').send(await invitationHtml(req, await vite.transformIndexHtml(req.originalUrl, raw)));
      } catch (err) {
        next(err);
      }
    });
    // Vite types its middleware as a connect server; Express accepts it as a handler at runtime.
    app.use(vite.middlewares as unknown as express.RequestHandler);
  }

  // Errors raised outside `route()` (body parser, multer limits) still answer in JSON.
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran file melebihi batas.' : 'File tidak dapat diterima.';
      res.status(400).json({ success: false, message });
      return;
    }
    if ((err as { type?: string }).type === 'entity.too.large') {
      res.status(413).json({ success: false, message: 'Data yang dikirim terlalu besar.' });
      return;
    }
    if ((err as { type?: string }).type === 'entity.parse.failed') {
      res.status(400).json({ success: false, message: 'Format data tidak valid.' });
      return;
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan di server.' });
  });

  return app;
}
