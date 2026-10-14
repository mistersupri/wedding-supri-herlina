# Undangan Pernikahan & Buku Tamu

Undangan pernikahan digital dengan CMS: sampul berisi nama tamu, jadwal acara, galeri, buku tamu dengan RSVP dan pesan suara, amplop digital, kartu tamu ber-QR, meja penerima tamu dengan pemindai QR, dan kamera Photo Moments untuk tamu yang sudah hadir.

Arah visual (Jawa / Nusantara modern, motif kawung, palet batik) dan alasan tiap keputusan ada di [`DESIGN.md`](DESIGN.md).

## Menjalankan

Prasyarat: Node.js 20+ (atau Bun).

```bash
npm install          # atau: bun install
cp .env.example .env # lalu ganti ADMIN_PASSWORD dan JWT_SECRET
npm run dev          # http://localhost:3000
```

- Undangan: `/`. Tautan pribadi tamu: `/?to=Nama%20Tamu&c=KODE`
- CMS: `/cms` (login dengan `ADMIN_USERNAME` / `ADMIN_PASSWORD`)
- Kamera tamu: `/photo-moments?c=KODE` (terbuka setelah tamu dicatat hadir)

Produksi: `npm run build && NODE_ENV=production npm start`.

Pemeriksaan: `npm run lint` (TypeScript, termasuk komponen React).

## Variabel environment

| Nama | Fungsi |
|---|---|
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Akun admin utama. Kata sandinya hanya bisa diubah di sini. |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Kunci tanda tangan sesi admin. Wajib diganti di produksi. |
| `GEMINI_API_KEY` | Opsional. Menyalin pesan suara tamu menjadi teks. |
| `PORT` | Port server, bawaan 3000. |
| `UPLOAD_DIR` | Folder file unggahan, bawaan `./uploads`. |

## Struktur

```
server/
  index.ts          Express + Vite (dev) / file statis (produksi)
  config.ts         env dan path
  http.ts           route() pembungkus galat bersama, HttpError
  auth.ts           login, token JWT, middleware admin
  uploads.ts        unggah file (tamu hanya foto "moments")
  routes/           public.ts, auth.ts, cms.ts
  db/               penyimpanan JSON (data/wedding_data.json), seed demo, migrasi
src/
  index.css         token desain & preset tema
  lib/              api.ts (klien HTTP), format, image, theme, photoFrames, queryKeys
  hooks/            kode tamu, perekam suara, hitung mundur, salin
  components/ui/    Button, Field, Modal, Lightbox, StateView, Kawung
  components/wedding/  seksi undangan, buku tamu, Photo Moments
  components/cms/   komponen CMS (daftar tamu, meja penerima tamu, unggah media)
  pages/            halaman undangan, Photo Moments, CMS
```

Data disimpan di satu file JSON; setiap perubahan menulis ulang file itu secara atomik. Cocok untuk satu acara pernikahan.
