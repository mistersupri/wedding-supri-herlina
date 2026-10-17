import 'dotenv/config';
import { config } from './config.js';
import { createPrisma } from './infrastructure/prisma.js';
import { seedIfEmpty } from './db/seed.js';
import { createApp, createServices } from './app.js';

const db = createPrisma();
await seedIfEmpty(db);
const app = await createApp(createServices(db));

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Wedding app listening on http://localhost:${config.port}`);
});
