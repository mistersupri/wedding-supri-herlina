import 'dotenv/config';
import path from 'path';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { config } from './config.js';
import { uploadRoutes } from './uploads.js';
import { publicRoutes } from './routes/public.js';
import { authRoutes } from './routes/auth.js';
import { cmsRoutes } from './routes/cms.js';

async function start() {
  const app = express();

  app.use(express.json({ limit: config.jsonBodyLimit }));
  app.use('/uploads', express.static(config.uploadDir));

  app.use('/api', uploadRoutes(), publicRoutes(), authRoutes(), cmsRoutes());
  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' });
  });

  if (config.isProduction) {
    app.use(express.static(config.distDir));
    app.get('*', (_req, res) => res.sendFile(path.join(config.distDir, 'index.html')));
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
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

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`Wedding app listening on http://localhost:${config.port}`);
  });
}

start();
