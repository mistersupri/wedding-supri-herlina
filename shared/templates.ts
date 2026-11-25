import type { TemplateId, TextKey } from './types.js';

/** What each template actually reads from the couple's content, so the CMS only asks for what will show. */
export interface TemplateContent {
  /** none: no full-screen opening; single: one photo or video; multi: a sequence of photos and videos. */
  hero: 'none' | 'single' | 'multi';
  /** Whether the love-story entries show their photo. */
  storyPhoto: boolean;
  /** Text slots the template lets the couple word themselves, with what each one is for. */
  texts: { key: TextKey; label: string; hint: string; multiline?: boolean }[];
  /** Where the gallery appears, in the template's own words, for the Galeri page. */
  galleryNote: string;
}

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  description: string;
  /** Background, surface, accent: swatches for the CMS picker. */
  swatches: [string, string, string];
  /** Whether the CMS colour presets (Sogan, Wedel, ...) change this template. */
  usesColorPreset: boolean;
  content: TemplateContent;
}

export const TEMPLATES: TemplateInfo[] = [
  {
    id: 'nusantara',
    name: 'Nusantara',
    description: 'Kertas mori, motif kawung, dan pita nila. Warna bisa diganti dengan preset batik.',
    swatches: ['#F4ECDF', '#6E3B1E', '#1F2338'],
    usesColorPreset: true,
    content: {
      hero: 'single',
      storyPhoto: true,
      texts: [{ key: 'closing', label: 'Kalimat penutup', hint: 'Tampil di pita nila paling bawah, di atas nama mempelai.', multiline: true }],
      galleryNote: 'Foto dan video tampil sebagai kisi dengan tampilan layar penuh saat diketuk.',
    },
  },
  {
    id: 'gulungan',
    name: 'Gulungan Kenangan',
    description: 'Kisah kalian diputar seperti gulungan film: tiket adegan, contact sheet, dan hitung mundur bioskop.',
    swatches: ['#34352F', '#F3ECC9', '#C8453A'],
    usesColorPreset: false,
    content: {
      hero: 'multi',
      storyPhoto: true,
      texts: [{ key: 'credits', label: 'Baris "pemeran pendukung"', hint: 'Baris terakhir di kredit penutup, setelah lokasi acara.' }],
      galleryNote: 'Foto dan video tampil sebagai contact sheet. Bila Layar pembuka kosong, video dan foto pertama galeri ikut diputar di layar lebar.',
    },
  },
  {
    id: 'bilik',
    name: 'Bilik Foto',
    description: 'Mesin photobooth yang mencetak strip foto, papan huruf jadwal, dan struk lokasi.',
    swatches: ['#EFE8DC', '#221D1A', '#B42A2F'],
    usesColorPreset: false,
    content: {
      hero: 'none',
      storyPhoto: false,
      texts: [{ key: 'receiptNote', label: 'Catatan di struk lokasi', hint: 'Baris terakhir pada struk, contoh: terima kasih sudah datang.' }],
      galleryNote: 'Foto dan video dicetak sebagai strip photobooth.',
    },
  },
  {
    id: 'cozy',
    name: 'Cozy Home',
    description: 'Dunia kecil di tengah hutan: papan kayu, rambu penunjuk, dan surat dalam bingkai kayu.',
    swatches: ['#AFD9D5', '#FFFDF0', '#9C5C2D'],
    usesColorPreset: false,
    content: {
      hero: 'none',
      storyPhoto: false,
      texts: [
        {
          key: 'letter',
          label: 'Isi surat',
          hint: 'Diketik otomatis di kotak surat. Gunakan {nama} untuk nama tamu, {mempelai} untuk nama kalian, dan {tanggal} untuk tanggal pernikahan.',
          multiline: true,
        },
      ],
      galleryNote: 'Foto dan video tampil dalam papan Album kami.',
    },
  },
  {
    id: 'layar',
    name: 'Layar Perak',
    description: 'Kertas hangat dan emas: sampul amplop bersegel dengan video pembuka, anggrek berjatuhan, film strip, polaroid, dan kredit penutup.',
    swatches: ['#EAE0CC', '#3B2E25', '#A8835A'],
    usesColorPreset: false,
    content: {
      hero: 'multi',
      storyPhoto: false,
      texts: [
        { key: 'greetingTitle', label: 'Judul salam', hint: 'Baris pembuka di bawah header, contoh: Assalamu’alaikum Warahmatullahi Wabarakatuh.' },
        { key: 'greetingBody', label: 'Isi salam', hint: 'Dua sampai tiga kalimat undangan setelah judul salam.', multiline: true },
        { key: 'closing', label: 'Kalimat penutup', hint: 'Tampil di kredit penutup setelah ucapan Terima Kasih.', multiline: true },
      ],
      galleryNote: 'Foto dan video tampil sebagai polaroid di atas pita film. Bila Layar pembuka kosong, video dan foto pertama galeri ikut diputar di layar sampul.',
    },
  },
];

export const isTemplateId = (value: unknown): value is TemplateId => TEMPLATES.some((t) => t.id === value);

export const templateInfo = (id: unknown): TemplateInfo => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
