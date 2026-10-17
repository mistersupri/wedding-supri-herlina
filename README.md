# Undangan Pernikahan & Buku Tamu

Undangan pernikahan digital dengan CMS: sampul berisi nama tamu, jadwal acara, galeri, buku tamu dengan RSVP dan pesan suara, amplop digital, kartu tamu ber-QR, meja penerima tamu dengan pemindai QR, dan kamera Photo Moments untuk tamu yang sudah hadir.

Arah visual (Jawa / Nusantara modern, motif kawung, palet batik) dan alasan tiap keputusan ada di [`DESIGN.md`](DESIGN.md).

## Menjalankan di lokal

Prasyarat: Node.js 20+ dan Yarn 1.

```bash
yarn install         # sekaligus membuat Prisma Client
yarn dev:local       # http://localhost:3000
```

`yarn dev:local` tidak butuh `DATABASE_URL` dan tidak butuh PostgreSQL terpasang. Skrip ini menyalakan PostgreSQL bawaan (PGlite) di `127.0.0.1:54329`, menyimpan datanya di folder `.local-db/`, menjalankan migrasi Prisma, mengisi data demo bila database masih kosong, lalu menyalakan server. Data tetap ada setelah server dimatikan. Untuk mulai dari nol: `yarn db:reset-local`.

File `.env` bersifat opsional untuk lokal. Salin `.env.example` bila ingin mengganti kata sandi admin (bawaan `admin` / `admin123`).

- Undangan: `/`. Tautan pribadi tamu: `/?to=Nama%20Tamu&c=KODE`
- CMS: `/cms` (login dengan `ADMIN_USERNAME` / `ADMIN_PASSWORD`)
- Kamera tamu: `/photo-moments?c=KODE` (terbuka setelah tamu dicatat hadir)

## Template undangan

Pilih di CMS, menu **Template & musik**. Semua template membaca data yang sama (mempelai, acara, kisah, galeri, buku tamu, RSVP dengan pesan suara, amplop digital, kartu tamu ber-QR, kamera Photo Moments), jadi berganti template tidak perlu mengisi ulang apa pun.

| Template | Karakter |
|---|---|
| Nusantara | Kertas mori, motif kawung, preset warna batik (Sogan, Wedel, Gadung, Jambon). |
| Gulungan Kenangan | Kisah cinta dicetak di gulungan film, tiket per acara, hitung mundur bioskop, contact sheet galeri. |
| Bilik Foto | Mesin photobooth mencetak strip foto, papan huruf jadwal, struk lokasi, ucapan dicetak sebagai strip. |
| Cozy Home | Dunia kecil di hutan: papan kayu, rambu penunjuk, panel berbingkai kayu, surat yang mengetik sendiri. |

Foto yang tampil di template selalu foto pasangan dari menu Mempelai, Kisah, dan Galeri. Alamat lengkap dan amplop digital tetap hanya terbuka untuk tamu yang memasukkan kode undangan.

## Produksi

Siapkan PostgreSQL dan isi `DATABASE_URL`, lalu:

```bash
yarn build
NODE_ENV=production yarn start   # menjalankan migrasi, lalu server
```

Database kosong otomatis diisi data demo saat server pertama kali menyala. Perintah lain:

| Perintah | Fungsi |
|---|---|
| `yarn dev` | Server pengembangan memakai `DATABASE_URL` dari `.env`. |
| `yarn db:migrate` | Menjalankan migrasi Prisma (`prisma migrate deploy`). |
| `yarn db:seed` | Mengganti seluruh isi database dengan data demo. |
| `yarn db:import-json <file>` | Memindahkan data dari versi lama (`data/wedding_data.json`) ke PostgreSQL. |
| `yarn lint` | Pemeriksaan TypeScript untuk server dan klien. |

Mengubah `prisma/schema.prisma`: buat migrasi baru terhadap PostgreSQL biasa dengan `yarn prisma migrate dev --name <nama>` (PGlite tidak mendukung shadow database yang dibutuhkan perintah ini).

## Variabel environment

| Nama | Fungsi |
|---|---|
| `DATABASE_URL` | Koneksi PostgreSQL. Wajib untuk `yarn dev` dan produksi; tidak perlu untuk `yarn dev:local`. |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Akun admin utama. Kata sandinya hanya bisa diubah di sini. |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Kunci tanda tangan sesi admin. Wajib diganti di produksi. |
| `GEMINI_API_KEY` | Opsional. Menyalin pesan suara tamu menjadi teks. |
| `PORT` | Port server, bawaan 3000. |
| `UPLOAD_DIR` | Folder file unggahan, bawaan `./uploads`. |
| `LOCAL_DB_PORT`, `LOCAL_DB_DIR` | Opsional, hanya untuk `yarn dev:local`. Bawaan `54329` dan `.local-db`. |

## Struktur

Server memakai lapisan yang saling bergantung ke dalam: route HTTP hanya memanggil service, service hanya memanggil repository, dan hanya repository yang mengenal Prisma.

```
prisma/               schema.prisma, migrasi SQL
scripts/dev-local.ts  PostgreSQL bawaan (PGlite) untuk yarn dev:local
shared/               tipe, daftar template, preset bingkai foto (dipakai server dan klien)
server/
  index.ts            titik masuk: Prisma, seed bila kosong, listen
  app.ts              komposisi: repository -> service -> route; Express + Vite
  config.ts           env dan path
  infrastructure/     Prisma Client (adapter pg), Gemini
  repositories/       akses data per tabel, memetakan baris Prisma ke tipe domain
  services/           aturan bisnis: undangan, buku tamu, tamu & presensi, Photo Moments, auth
  http/               route() pembungkus galat, middleware admin, unggahan, routes/
  db/                 data demo, seed, impor JSON lama
src/
  features/invitation/
    InvitationContext.tsx  data undangan, tamu terverifikasi, sampul, musik, kartu tamu
    hooks/            useGuestAccess, useGuestbook, useRsvpForm, useUnlockForm (React Query)
    templates/        registry + nusantara/, gulungan/, bilik/, cozy/, shared/
  lib/                api.ts (klien HTTP), queryKeys, format, theme, calendar
  components/ui/      Button, Field, Modal, Lightbox, StateView, Kawung
  components/wedding/ seksi template Nusantara, buku tamu, Photo Moments
  components/cms/     komponen CMS
  pages/              halaman undangan, Photo Moments, CMS
```

Template tidak menerima props: semua dibaca dari `InvitationContext` dan hook di `features/invitation/hooks`, jadi menambah template baru cukup membuat satu folder dan mendaftarkannya di `templates/registry.ts` dan `shared/templates.ts`.
