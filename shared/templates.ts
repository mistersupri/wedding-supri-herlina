import type { TemplateId } from './types.js';

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  description: string;
  /** Background, surface, accent: swatches for the CMS picker. */
  swatches: [string, string, string];
  /** Whether the CMS colour presets (Sogan, Wedel, ...) change this template. */
  usesColorPreset: boolean;
}

export const TEMPLATES: TemplateInfo[] = [
  {
    id: 'nusantara',
    name: 'Nusantara',
    description: 'Kertas mori, motif kawung, dan pita nila. Warna bisa diganti dengan preset batik.',
    swatches: ['#F4ECDF', '#6E3B1E', '#1F2338'],
    usesColorPreset: true,
  },
  {
    id: 'gulungan',
    name: 'Gulungan Kenangan',
    description: 'Kisah kalian diputar seperti gulungan film: tiket adegan, contact sheet, dan hitung mundur bioskop.',
    swatches: ['#34352F', '#F3ECC9', '#C8453A'],
    usesColorPreset: false,
  },
  {
    id: 'bilik',
    name: 'Bilik Foto',
    description: 'Mesin photobooth yang mencetak strip foto, papan huruf jadwal, dan struk lokasi.',
    swatches: ['#EFE8DC', '#221D1A', '#B42A2F'],
    usesColorPreset: false,
  },
  {
    id: 'cozy',
    name: 'Cozy Home',
    description: 'Dunia kecil di tengah hutan: papan kayu, rambu penunjuk, dan surat dalam bingkai kayu.',
    swatches: ['#AFD9D5', '#FFFDF0', '#9C5C2D'],
    usesColorPreset: false,
  },
];

export const isTemplateId = (value: unknown): value is TemplateId => TEMPLATES.some((t) => t.id === value);
