import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { guestFiles, renderServiceWorker } from '../../scripts/offlinePlugin.js';

const chunk = (fileName: string, facadeModuleId: string | null, extra: Record<string, unknown> = {}) => ({
  type: 'chunk' as const,
  fileName,
  facadeModuleId,
  isEntry: false,
  imports: [] as string[],
  dynamicImports: [] as string[],
  viteMetadata: { importedCss: new Set<string>(), importedAssets: new Set<string>() },
  ...extra,
});

describe('guestFiles', () => {
  const bundle = {
    'assets/index.js': chunk('assets/index.js', '/app/src/main.tsx', {
      isEntry: true,
      imports: ['assets/vendor.js'],
      dynamicImports: ['assets/Template.js', 'assets/CMSLayout.js', 'assets/Screen.js'],
      viteMetadata: { importedCss: new Set(['assets/index.css']), importedAssets: new Set<string>() },
    }),
    'assets/vendor.js': chunk('assets/vendor.js', null),
    'assets/Template.js': chunk('assets/Template.js', '/app/src/features/invitation/templates/x/Template.tsx', {
      imports: ['assets/shared.js'],
      viteMetadata: { importedCss: new Set(['assets/Template.css']), importedAssets: new Set(['assets/font.woff2']) },
    }),
    'assets/shared.js': chunk('assets/shared.js', null),
    'assets/CMSLayout.js': chunk('assets/CMSLayout.js', '/app/src/pages/cms/CMSLayout.tsx', { imports: ['assets/cmsOnly.js'] }),
    'assets/cmsOnly.js': chunk('assets/cmsOnly.js', null),
    'assets/Screen.js': chunk('assets/Screen.js', '/app/src/pages/MomentsScreenPage.tsx'),
    'index.html': { type: 'asset' },
  };

  it('keeps the entry, its imports, guest pages, and their styles and assets', () => {
    const files = guestFiles(bundle as never);
    expect(files).toEqual(
      expect.arrayContaining(['assets/index.js', 'assets/vendor.js', 'assets/Template.js', 'assets/shared.js', 'assets/index.css', 'assets/Template.css', 'assets/font.woff2']),
    );
  });

  it('leaves out the admin pages and what only they use', () => {
    const files = guestFiles(bundle as never);
    expect(files).not.toContain('assets/CMSLayout.js');
    expect(files).not.toContain('assets/cmsOnly.js');
    expect(files).not.toContain('assets/Screen.js');
    expect(files).not.toContain('index.html');
  });
});

describe('renderServiceWorker', () => {
  const source = "const VERSION = /*__VERSION__*/ 'dev';\nconst PRECACHE_URLS = /*__PRECACHE_URLS__*/ [];\n";
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-public-'));

  it('fills in the file list and a version', () => {
    const { code, version } = renderServiceWorker(source, ['/', '/assets/a.js'], dir);
    expect(code).toContain(`'${version}'`);
    expect(code).toContain('"/assets/a.js"');
    expect(code).not.toContain('__VERSION__');
    expect(() => new Function(code)).not.toThrow();
  });

  it('changes the version whenever the files or the worker change, and only then', () => {
    const a = renderServiceWorker(source, ['/', '/assets/a.js'], dir).version;
    expect(renderServiceWorker(source, ['/', '/assets/a.js'], dir).version).toBe(a);
    expect(renderServiceWorker(source, ['/', '/assets/b.js'], dir).version).not.toBe(a);
    expect(renderServiceWorker(`${source}// edit`, ['/', '/assets/a.js'], dir).version).not.toBe(a);
  });

  it('the real worker source has both placeholders the build replaces', () => {
    const real = fs.readFileSync('src/offline/sw.js', 'utf8');
    const { code } = renderServiceWorker(real, ['/'], dir);
    expect(code).not.toMatch(/\/\*__[A-Z_]+__\*\//);
    expect(() => new Function(code)).not.toThrow();
  });
});
