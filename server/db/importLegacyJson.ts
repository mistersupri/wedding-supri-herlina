/**
 * Move data from the previous JSON-file store into PostgreSQL:
 *   yarn db:import-json data/wedding_data.json
 * This replaces everything currently in the database. Stored admin accounts are kept only when
 * their username differs from ADMIN_USERNAME (the env admin always wins).
 */
import 'dotenv/config';
import fs from 'fs';
import { config } from '../config.js';
import { createPrisma } from '../infrastructure/prisma.js';
import { seedDatabase } from './seed.js';
import type { LegacyData } from './legacyData.js';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error('Pakai: yarn db:import-json <path ke wedding_data.json>');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, 'utf-8')) as LegacyData;
const db = createPrisma();
await seedDatabase(db, data);

for (const admin of data.admins || []) {
  if (admin.username.toLowerCase() === config.admin.username.toLowerCase()) continue;
  await db.adminUser.upsert({
    where: { username: admin.username },
    create: { username: admin.username, email: admin.email, name: admin.name, passwordHash: admin.passwordHash, role: admin.role },
    update: {},
  });
}

await db.$disconnect();
console.log(`Impor selesai dari ${file}.`);
