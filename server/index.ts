import 'dotenv/config';
import { config } from './config.js';
import { createPrisma } from './infrastructure/prisma.js';
import { seedIfEmpty } from './db/seed.js';
import { createApp, createServices } from './app.js';

const db = createPrisma();
await seedIfEmpty(db);
const app = await createApp(createServices(db));

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`Wedding app listening on http://localhost:${config.port}`);
});

// `docker stop` sends SIGTERM: finish in-flight requests, release the pool, then exit.
let stopping = false;
const shutdown = (signal: string) => {
  if (stopping) return;
  stopping = true;
  console.log(`${signal} diterima, menutup server...`);
  server.close(async () => {
    await db.$disconnect().catch(() => undefined);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
