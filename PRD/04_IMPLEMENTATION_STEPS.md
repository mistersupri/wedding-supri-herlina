# PRD 04: Implementation Steps & Maintenance Guide

## 1. Riwayat Pengembangan

### Fase 1: Fondasi (selesai)
- **Backend:** skema Prisma, seed data demo, REST API Express (undangan, acara, galeri, ucapan, tamu, auth), JWT, lapisan route → service → repository.
- **Frontend:** TanStack Query, klien API bertipe, cover amplop, hero dan hitung mundur, profil mempelai, acara dan peta, galeri dan lightbox, kisah cinta, buku tamu, amplop digital, pemutar musik.
- **CMS:** login, edit konten, galeri, kisah, rekening, tema dan musik, moderasi ucapan.

### Fase 2: Tamu terdaftar dan template (selesai)
- Daftar tamu dengan kode 4 karakter, kartu tamu ber-QR, meja penerima tamu dengan pemindai QR, statistik kehadiran.
- Empat template tambahan (Gulungan Kenangan, Bilik Foto, Cozy Home, Layar Perak) di atas Nusantara; preset warna batik.
- Buku tamu dengan pesan suara dan transkripsi Gemini.
- Photo Moments: kamera sekali pakai, look film, antrean unggah, galeri bersama, layar besar, aturan kamera di CMS.
- Deploy Docker (aplikasi + PostgreSQL), health check, shutdown halus.

### Fase 3: Pengerasan dan kelengkapan (selesai, branch `claude/bold-darwin-53ljt8`)
| Tahap | Hasil |
|---|---|
| **1. Keamanan** | Pembatas laju per IP; header keamanan; validasi unggahan dari isi berkas, nama acak, pembersihan berkas yatim; alamat dan rekening hanya setelah kode valid; pesan suara sebagai berkas (JSON ≤ 1 MB); `timingSafeEqual`, kode dari `crypto.randomInt`; reset demo butuh konfirmasi dan mati di produksi; `SEED_DEMO=false` |
| **2. Bug** | Reaksi atomik dan whitelist emoji; kuota foto dalam satu transaksi; validasi URL foto dan satu berkas satu foto; check-in berulang tidak menimpa; nama ambigu ditolak; whitelist field edit tamu; kode undangan diulang saat bentrok |
| **3. Fitur** | Kirim WhatsApp berurutan dan pesan yang dapat diubah; ekspor CSV; ucapan terikat kode undangan (migrasi); ZIP foto, setujui semua, angka foto menunggu; tes otomatis dan CI; skrip backup dan restore |
| **4. Kehadiran dan kamera** | Konfirmasi hadir mandiri dengan verifikasi lokasi (opsional, mati bawaan; verifikasi aktif bawaan); saklar *wajib check-in* untuk kamera (mati bawaan); kartu QR dalam PDF bergaya template |
| **5. Offline** | Service worker, manifest, data tamu tersimpan di perangkat, antrean RSVP dan ucapan |
| **Logo** | Logo cincin pada favicon dan CMS |

### Urutan migrasi
`init` → `guest_camera` → `wish_guest_code` → `camera_require_checkin` → `self_checkin`. Setiap migrasi telah diuji pada database kosong dan pada data lama.

## 2. Alur Kerja Pengembangan
```bash
yarn install        # sekaligus membuat Prisma Client
yarn dev:local      # http://localhost:3000, PostgreSQL embedded, data demo
yarn lint           # tsc --noEmit
yarn test           # Vitest: unit + database (PGlite) tanpa konfigurasi
yarn build          # client (dist/) dan server (dist/server.mjs)
```
- **Tes database** membangun skema dari berkas migrasi asli, jadi perubahan skema ikut teruji. Satu klien Prisma per berkas tes (PGlite membatasi koneksi).
- **Service worker** hanya aktif di build produksi. Untuk mencobanya lokal: `yarn build`, lalu `NODE_ENV=production ADMIN_PASSWORD=... JWT_SECRET=... JWT_REFRESH_SECRET=... yarn dev:local`. Di mode dev, worker lama otomatis dilepas.
- **CI:** `.github/workflows/ci.yml` menjalankan lint, tes, dan build. Build image di OneDev (`.onedev-buildspec.yml`) belum menjalankan tes.

## 3. Praktik Pemeliharaan
- **Menambah template:** buat folder di `src/features/invitation/templates/`, daftarkan di `registry.ts` dan `shared/templates.ts`, tambahkan gaya kartu QR di `src/features/moments/qrCard/draw.ts` dan daftar font di `fonts.ts`. Service worker dan precache mengikuti otomatis.
- **Mengubah skema:** tulis migrasi SQL baru (jangan mengedit yang lama); sertakan perubahan data lama; tambahkan tes database.
- **Mengubah aturan akses:** ubah di service server dulu, lalu cerminkan di antarmuka; tambahkan tes.
- **Menjaga kontrak offline:** endpoint publik baru yang perlu tersedia offline harus didaftarkan di `API_READS` (dan `WARM_API` bila perlu) pada `src/offline/sw.js`. Endpoint tulis tidak boleh di-cache.
- **Keamanan akun:** kata sandi admin utama hanya dari `ADMIN_PASSWORD`; kata sandi akun tersimpan di-hash bcrypt.
- **Header `Permissions-Policy`:** kamera, mikrofon, dan geolokasi harus tetap `(self)`; ada tes yang menjaganya.
- **Data pribadi:** `backups/`, `uploads/`, `.env*`, dan `.local-db/` tidak boleh di-commit (sudah di `.gitignore`).

## 4. Backlog dan Ide Lanjutan
Belum dikerjakan; urut kasar menurut nilai.

| Ide | Catatan |
|---|---|
| Antarmuka manajemen akun admin | Model `AdminUser` dan login sudah mendukung; belum ada layar atau endpoint untuk membuat, mengubah, menghapus admin |
| Pencabutan sesi | `logout` belum membatalkan refresh token; token lama tetap berlaku sampai habis setelah kata sandi diganti |
| Kartu QR per tamu | Kartu bernama dan berkode untuk dicetak di meja; sekarang hanya satu QR untuk seluruh acara |
| Pengiriman RSVP latar belakang | Background Sync hanya didukung Chrome Android; sekarang antrean terkirim saat halaman dibuka |
| Font di-host sendiri | Menghilangkan ketergantungan Google Fonts untuk font situs dan PDF |
| Thumbnail dan kompresi di server | Resize dengan `sharp` untuk galeri besar |
| Pembatas laju bersama | Pembatas sekarang di memori satu proses; replika perlu penyimpanan bersama |
| Langkah tes di OneDev | Samakan dengan GitHub Actions |
| Multi-pernikahan | Saat ini satu database per pernikahan |
