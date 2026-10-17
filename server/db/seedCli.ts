/** `yarn db:seed` / `prisma db seed`: replace everything with the demo invitation. */
import 'dotenv/config';
import { createPrisma } from '../infrastructure/prisma.js';
import { seedDatabase } from './seed.js';

const db = createPrisma();
await seedDatabase(db);
await db.$disconnect();
console.log('Data demo selesai diisi.');
