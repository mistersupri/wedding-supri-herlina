import fs from 'fs';
import os from 'os';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const MIGRATIONS = path.resolve('prisma/migrations');
const PORT = 54_330 + Math.floor(Math.random() * 500);

/** One embedded PostgreSQL for the whole run, built from the real migration files. */
export default async function setup() {
  const db = await PGlite.create();
  for (const dir of fs.readdirSync(MIGRATIONS).filter((d) => /^\d+_/.test(d)).sort()) {
    await db.exec(fs.readFileSync(path.join(MIGRATIONS, dir, 'migration.sql'), 'utf8'));
  }
  const server = new PGLiteSocketServer({ db, port: PORT, host: '127.0.0.1', maxConnections: 10 });
  await server.start();

  const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'wedding-test-uploads-'));
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres?sslmode=disable`;
  process.env.UPLOAD_DIR = uploads;

  return async () => {
    await server.stop();
    await db.close();
    fs.rmSync(uploads, { recursive: true, force: true });
  };
}
