import path from 'path';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { config } from './config.js';
import type { Db } from './infrastructure/prisma.js';
import { eventRepository, galleryRepository, giftRepository, storyRepository } from './repositories/contentRepositories.js';
import { adminRepository, frameRepository, invitedGuestRepository, photoMomentRepository, wishRepository } from './repositories/guestRepositories.js';
import { invitationRepository } from './repositories/invitationRepository.js';
import { authService } from './services/authService.js';
import { guestService } from './services/guestService.js';
import { guestbookService } from './services/guestbookService.js';
import { invitationService } from './services/invitationService.js';
import { photoMomentService } from './services/photoMomentService.js';
import { seedDatabase } from './db/seed.js';
import { uploadRoutes } from './http/uploads.js';
import { publicRoutes } from './http/routes/public.js';
import { authRoutes } from './http/routes/auth.js';
import { cmsRoutes } from './http/routes/cms.js';

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

  return {
    content,
    invitation: invitationService({ invitation: invitationRepository(db), wishes, ...content }),
    guestbook: guestbookService(wishes),
    guests: guestService(invitedGuests),
    moments: photoMomentService({ moments: photoMomentRepository(db), frames: frameRepository(db), guests: invitedGuests }),
    auth: authService(adminRepository(db)),
    resetDemo: () => seedDatabase(db),
  };
}

export type Services = ReturnType<typeof createServices>;

export async function createApp(services: Services) {
  const app = express();

  app.use(express.json({ limit: config.jsonBodyLimit }));
  app.use('/uploads', express.static(config.uploadDir));

  app.use('/api', uploadRoutes(), publicRoutes(services), authRoutes(services), cmsRoutes(services));
  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' });
  });

  if (config.isProduction) {
    app.use(express.static(config.distDir));
    app.get('*', (_req, res) => res.sendFile(path.join(config.distDir, 'index.html')));
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
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
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan di server.' });
  });

  return app;
}
