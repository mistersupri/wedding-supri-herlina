import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx server/db/seedCli.ts',
  },
  datasource: {
    // `yarn dev:local` injects this from the embedded PGlite server; otherwise set it in .env.
    url: process.env.DATABASE_URL,
  },
});
