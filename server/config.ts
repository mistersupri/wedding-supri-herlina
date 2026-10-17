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

export const config = {
  port: Number(process.env.PORT) || 3000,
  isProduction: process.env.NODE_ENV === 'production',
  get databaseUrl() {
    return requireDatabaseUrl();
  },
  distDir: path.join(cwd, 'dist'),
  uploadDir: process.env.UPLOAD_DIR || path.join(cwd, 'uploads'),
  jsonBodyLimit: '25mb',
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },
  jwt: {
    accessSecret: process.env.JWT_SECRET || 'wedding_invitation_secret_jwt_key_2026',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'wedding_invitation_refresh_jwt_key_2026_refresh_secret',
  },
  photoMomentsPerGuest: 3,
};

/** The env-configured superadmin is never stored in the database; it is matched by this id. */
export const ENV_ADMIN_ID = 'adm_env_01';
