import path from 'path';

const cwd = process.cwd();

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL belum diatur. Untuk pengembangan lokal jalankan `yarn dev:local` (PostgreSQL bawaan, tanpa konfigurasi), ' +
        'atau isi DATABASE_URL di file .env.',
    );
  }
  return url;
}

const isProduction = process.env.NODE_ENV === 'production';

/** In production a missing secret is a startup error, never a silent fallback to a value published in this repo. */
function secret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProduction) throw new Error(`${name} wajib diisi di produksi. Lihat .env.example.`);
  return devFallback;
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  isProduction,
  get databaseUrl() {
    return requireDatabaseUrl();
  },
  distDir: path.join(cwd, 'dist'),
  uploadDir: process.env.UPLOAD_DIR || path.join(cwd, 'uploads'),
  jsonBodyLimit: '25mb',
  /** Hops of reverse proxy in front of the app (Nginx, Caddy, a load balancer), for correct client IPs. */
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: secret('ADMIN_PASSWORD', 'admin123'),
  },
  jwt: {
    accessSecret: secret('JWT_SECRET', 'wedding_invitation_secret_jwt_key_2026'),
    refreshSecret: secret('JWT_REFRESH_SECRET', 'wedding_invitation_refresh_jwt_key_2026_refresh_secret'),
  },
};

/** The env-configured superadmin is never stored in the database; it is matched by this id. */
export const ENV_ADMIN_ID = 'adm_env_01';
