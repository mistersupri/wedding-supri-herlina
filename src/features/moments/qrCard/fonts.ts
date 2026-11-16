import type { TemplateId } from '@shared/types';

/** The Google Fonts each invitation template uses, and the faces the card draws with. */
const FONTS: Record<TemplateId, { family: string; faces: string[] }> = {
  nusantara: {
    family: 'family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600&family=Plus+Jakarta+Sans:wght@400;500;600;700',
    faces: ['italic 500 40px Fraunces', '500 40px "Plus Jakarta Sans"', '700 40px "Plus Jakarta Sans"'],
  },
  gulungan: {
    family: 'family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Pinyon+Script&family=VT323',
    faces: ['400 40px "EB Garamond"', 'italic 400 40px "EB Garamond"', '400 40px "Pinyon Script"', '400 40px VT323'],
  },
  bilik: {
    family:
      'family=Fraunces:opsz,wght@9..144,400;9..144,800&family=Instrument+Sans:wght@400;600&family=Courier+Prime:wght@400;700&family=DotGothic16&family=Reenie+Beanie',
    faces: ['800 40px Fraunces', '600 40px "Instrument Sans"', '700 40px "Courier Prime"', '400 40px "Courier Prime"', '400 40px DotGothic16', '400 40px "Reenie Beanie"'],
  },
  cozy: {
    family: 'family=Nunito:ital,wght@0,600;0,700;0,800;0,900;1,700',
    faces: ['900 40px Nunito', '800 40px Nunito', '700 40px Nunito'],
  },
  layar: {
    family: 'family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@400;500&family=IBM+Plex+Mono:wght@400',
    faces: ['italic 400 40px "Cormorant Garamond"', '400 40px "Cormorant Garamond"', '400 40px Jost', '500 40px Jost', '400 40px "IBM Plex Mono"'],
  },
};

const TIMEOUT_MS = 8000;
const withTimeout = <T>(p: Promise<T>, fallback: T) => Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), TIMEOUT_MS))]);

const added = new Map<string, Promise<void>>();

/**
 * Loads the template's web fonts so the canvas draws with them. Offline, or when a font cannot be fetched,
 * this still resolves (after a short wait) and the card falls back to a system face rather than failing.
 */
export function ensureFonts(template: TemplateId): Promise<void> {
  const { family, faces } = FONTS[template];
  let ready = added.get(template);
  if (!ready) {
    ready = new Promise<void>((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?${family}&display=swap`;
      link.onload = () => resolve();
      link.onerror = () => resolve();
      document.head.appendChild(link);
    });
    added.set(template, ready);
  }
  return withTimeout(
    ready.then(() => Promise.all(faces.map((f) => document.fonts.load(f, 'AaBb 0123 Ñ')))).then(() => undefined),
    undefined,
  );
}
