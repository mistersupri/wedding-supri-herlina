import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';
import { config } from '../config.js';

export type Db = PrismaClient;

export function createPrisma(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: config.databaseUrl });
  return new PrismaClient({ adapter });
}

export { Prisma } from './generated/prisma/client.js';
