import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

/** Files from /public that guest pages use. logo.png (large, shown only in the CMS) is left out on purpose. */
const PUBLIC_FILES = ['manifest.webmanifest', 'favicon.png', 'icon-192.png', 'apple-touch-icon.png', 'media/envelope-opener.webm'];

/** Pages and chunks only the admin needs; they stay out of the guests' precache and are cached when first visited. */
const ADMIN_ONLY = /\/src\/pages\/cms\/|\/src\/pages\/MomentsScreenPage/;

interface ChunkInfo {
  type: 'chunk';
  fileName: string;
  facadeModuleId: string | null;
  isEntry: boolean;
  imports: string[];
  dynamicImports: string[];
  viteMetadata?: { importedCss: Set<string>; importedAssets: Set<string> };
}

/**
 * Chunks reachable from the entry without passing through an admin page, plus their styles and assets.
 * Template, camera and shared chunks are in; the CMS (about half of the build) is out.
 */
export function guestFiles(bundle: Record<string, { type: string } & Partial<ChunkInfo>>): string[] {
  const chunks = Object.values(bundle).filter((o): o is ChunkInfo => o.type === 'chunk');
  const byName = new Map(chunks.map((c) => [c.fileName, c]));
  const files = new Set<string>();
  const queue = chunks.filter((c) => c.isEntry);
  while (queue.length) {
    const chunk = queue.pop()!;
    if (files.has(chunk.fileName)) continue;
    if (chunk.facadeModuleId && ADMIN_ONLY.test(chunk.facadeModuleId.replace(/\\/g, '/'))) continue;
    files.add(chunk.fileName);
    chunk.viteMetadata?.importedCss.forEach((f) => files.add(f));
    chunk.viteMetadata?.importedAssets.forEach((f) => files.add(f));
    for (const name of [...chunk.imports, ...chunk.dynamicImports]) {
      const next = byName.get(name);
      if (next) queue.push(next);
    }
  }
  return [...files].sort();
}

/** The worker source with the file list and a version (a hash of source, list and icon bytes) filled in. */
export function renderServiceWorker(source: string, urls: string[], publicDir: string): { code: string; version: string } {
  const hash = crypto.createHash('sha1').update(source).update(JSON.stringify(urls));
  for (const file of PUBLIC_FILES) {
    const full = path.join(publicDir, file);
    if (fs.existsSync(full)) hash.update(fs.readFileSync(full));
  }
  const version = hash.digest('hex').slice(0, 10);
  const code = source
    .replace(/\/\*__VERSION__\*\/\s*'[^']*'/, `'${version}'`)
    .replace(/\/\*__PRECACHE_URLS__\*\/\s*\[\]/, JSON.stringify(urls, null, 2));
  return { code, version };
}

/** Emits /sw.js with the precache list of this build. Build only; in development no worker is registered. */
export function offlinePlugin(): Plugin {
  const publicDir = path.resolve('public');
  return {
    name: 'offline-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const built = guestFiles(bundle as never).map((f) => `/${f}`);
      const urls = ['/', ...PUBLIC_FILES.filter((f) => fs.existsSync(path.join(publicDir, f))).map((f) => `/${f}`), ...built];
      const { code } = renderServiceWorker(fs.readFileSync(path.resolve('src/offline/sw.js'), 'utf8'), urls, publicDir);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: code });
    },
  };
}
