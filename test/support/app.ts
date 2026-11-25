import fs from 'fs';
import path from 'path';
import { createPrisma } from '../../server/infrastructure/prisma.js';
import { createServices } from '../../server/app.js';
import { seedDatabase } from '../../server/db/seed.js';

// One connection pool per test file: the embedded database accepts only a handful of connections.
let shared: ReturnType<typeof createPrisma> | undefined;

/** Fresh demo data and the real services on the shared test database. */
export async function freshServices() {
  const db = (shared ??= createPrisma());
  await seedDatabase(db);
  return { db, services: createServices(db) };
}

/** Puts a small file where an upload would have put it and returns its public URL. */
export function fakeUpload(category: 'moments' | 'voice', name: string) {
  const dir = path.join(process.env.UPLOAD_DIR!, category);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]));
  return `/uploads/${category}/${name}`;
}
