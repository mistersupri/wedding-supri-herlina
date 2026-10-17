/**
 * `yarn dev:local`: start the app against an embedded PostgreSQL (PGlite) so no DATABASE_URL is needed.
 * Data lives in ./.local-db and survives restarts. Delete that folder to start over from the demo seed.
 * If DATABASE_URL is already set (for example in .env), that database is used instead.
 */
import 'dotenv/config';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const DATA_DIR = path.resolve(process.env.LOCAL_DB_DIR || '.local-db');
const PORT = Number(process.env.LOCAL_DB_PORT) || 54329;

// Prisma's JS entry run with this same Node binary: node_modules/.bin/prisma is a shell script that Windows cannot spawn.
const PRISMA_CLI = createRequire(import.meta.url).resolve('prisma/build/index.js');

function prisma(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    // Async spawn keeps this process free to answer the socket server while prisma talks to it.
    const child = spawn(process.execPath, [PRISMA_CLI, ...args], { stdio: 'inherit', env: process.env });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`prisma ${args.join(' ')} keluar dengan kode ${code}`))));
  });
}

if (!process.env.DATABASE_URL) {
  const db = await PGlite.create(DATA_DIR);
  const server = new PGLiteSocketServer({ db, port: PORT, host: '127.0.0.1', maxConnections: 10 });
  await server.start();
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres?sslmode=disable`;
  console.log(`PostgreSQL lokal (PGlite) aktif di 127.0.0.1:${PORT}, data di ${path.relative(process.cwd(), DATA_DIR)}/`);

  const shutdown = async () => {
    await server.stop().catch(() => undefined);
    await db.close().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

await prisma(['migrate', 'deploy']);
await import('../server/index.ts');
