import { useEffect } from 'react';
import type { ThemePreset, ThemeSettings } from '@shared/types';

export interface ThemeOption {
  id: ThemePreset;
  name: string;
  description: string;
  /** Swatches for the CMS picker: paper, primary, deep. Mirrors src/index.css. */
  swatches: [string, string, string];
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'sogan',
    name: 'Sogan',
    description: 'Cokelat soga di atas kain mori, dengan pita nila.',
    swatches: ['#F4ECDF', '#6E3B1E', '#1F2338'],
  },
  { id: 'wedel', name: 'Wedel', description: 'Biru nila tua yang tenang dan resmi.', swatches: ['#F0EEE8', '#2C3B63', '#161C30'] },
  { id: 'gadung', name: 'Gadung', description: 'Hijau gadung melati, segar dan teduh.', swatches: ['#F1EEE2', '#3E5A3A', '#1F2B1E'] },
  {
    id: 'jambon',
    name: 'Jambon',
    description: 'Merah soga yang hangat untuk suasana meriah.',
    swatches: ['#F6ECE6', '#8A3838', '#341A1C'],
  },
];

/**
 * Applies the look to <html data-theme>. Nusantara uses the couple's colour preset; every other
 * template carries its own palette (see index.css), so shared dialogs match it. Restores the default on unmount.
 */
export function useThemePreset(theme: Pick<ThemeSettings, 'templateId' | 'themeColor'> | undefined) {
  const value = !theme ? 'sogan' : theme.templateId && theme.templateId !== 'nusantara' ? theme.templateId : theme.themeColor || 'sogan';
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = value;
    return () => {
      root.dataset.theme = 'sogan';
    };
  }, [value]);
}
