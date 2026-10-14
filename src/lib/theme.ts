import { useEffect } from 'react';
import type { ThemePreset } from '../types.js';

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

/** Applies a preset to <html data-theme>. Restores the default on unmount. */
export function useThemePreset(preset: ThemePreset | undefined) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = preset || 'sogan';
    return () => {
      root.dataset.theme = 'sogan';
    };
  }, [preset]);
}
