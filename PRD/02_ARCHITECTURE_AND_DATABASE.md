# PRD 02: Architecture & Database Schema

## 1. Arsitektur Sistem
Satu aplikasi full-stack: SPA React yang dilayani oleh server Express yang sama dengan API-nya.

```
 HP tamu / browser admin
 ┌───────────────────────────────────────────────┐
 │ React SPA (Vite)            Service worker    │
 │ TanStack Query              (cache + offline) │
 │ IndexedDB: antrean foto,    localStorage:     │
 │ antrean ucapan              kode tamu, detail │
 └───────────────────────┬───────────────────────┘
                         │ HTTPS (reverse proxy) · JSON · multipart
 ┌───────────────────────▼───────────────────────┐
 │ Express (server/app.ts)                       │
 │  header keamanan → pembatas permintaan        │
 │  → /uploads (statis, nosniff, sandbox)        │
 │  → /api: uploadRoutes · publicRoutes          │
 │          authRoutes · cmsRoutes (requireAdmin)│
 └───────────────────────┬───────────────────────┘
        route() ─ satu jalur error · HttpError
 ┌───────────────────────▼───────────────────────┐
 │ Services   (aturan bisnis, tanpa Prisma)      │
 │ Repositories (satu-satunya yang menyentuh DB) │
 └──────────┬───────────────────────┬────────────┘
            ▼                       ▼
   PostgreSQL (Prisma 7)     Disk: /app/uploads
                             (foto, suara, galeri)
            Opsional: Google Gemini (transkripsi suara)
```

### 1.1. Struktur Folder
| Folder | Isi |
|---|---|
| `server/http` | `routes/` (public, auth, cms), `middleware/` (requireAdmin, rateLimit, securityHeaders), `uploads.ts`, `fileType.ts`, `zip.ts`, `http.ts` |
| `server/services` | `guestService`, `guestbookService`, `photoMomentService`, `attendanceService`, `invitationService`, `authService`, `exportService`, `csv`, `uploadCleanup` |
| `server/repositories` | Akses data per agregat; mengubah baris Prisma menjadi tipe di `shared/` |
| `server/db` | Seed demo, impor JSON lama |
| `shared/` | Tipe bersama (`types.ts`), daftar template, bingkai foto, `geo.ts` (jarak, parsing koordinat) |
| `src/features/invitation` | Konteks undangan, hook akses tamu dan RSVP, lima template |
| `src/features/moments` | Kamera, look film, antrean unggah, feed, **kartu QR PDF** (`qrCard/`) |
| `src/offline` | Service worker (`sw.js`), pendaftaran, antrean ucapan |
| `src/pages/cms` | Halaman dan tab CMS |
| `prisma/migrations` | Migrasi SQL berurutan |
| `scripts` | `dev-local`, `offlinePlugin` (membangun `sw.js`), `backup.sh`, `restore.sh` |
| `test` | Tes unit dan tes database |
| `docs`, `PRD` | Panduan backup, dokumen produk |

### 1.2. Pola Kode
- **Lapisan tipis:** route hanya membaca request dan memanggil service; service tidak mengimpor Prisma; repository tidak berisi aturan bisnis.
- **`route()`** membungkus semua handler: kesalahan `HttpError` menjadi JSON `{ success:false, code, message }`, kesalahan validasi Prisma menjadi 400, sisanya 500 tanpa membocorkan detail.
- **Bentuk respons:** `{ success: true, ...data }`. Klien memakai `publicApi` dan `cmsApi` di `src/lib/api.ts`.
- **Tipe bersama** di `shared/` dipakai server dan klien agar kontrak API tidak menyimpang.

## 2. Model Data (Prisma / PostgreSQL)
Satu database untuk satu pernikahan. Baris konfigurasi tunggal memakai `id = "main"`.

### 2.1. Konten undangan
- **`Invitation`** (`id "main"`): `groomName/ShortName/Parents/Instagram/Photo`, `brideName/ShortName/Parents/Instagram/Photo`, `heroImage`, `heroVideoUrl`, `heroMediaType` (IMAGE | VIDEO), `quoteText`, `quoteSource`, `weddingDate`, `countdownTarget`, `musicUrl`, `musicTitle`, `whatsappNumber`, `whatsappTemplate`, `templateId` (`nusantara` | `gulungan` | `bilik` | `cozy` | `layar`), `themeColor` (`sogan` | `wedel` | `gadung` | `jambon`, hanya untuk Nusantara).
- **`Event`**: `title`, `date`, `startTime`, `endTime`, `venueName`, `address`, `mapsUrl`, `mapsEmbedUrl`, `dressCode`, `notes`, `orderIndex`.
- **`LoveStory`**: `year`, `title`, `description`, `photoUrl`, `orderIndex`.
- **`GiftAccount`**: `bankName`, `accountNumber`, `accountHolder`, `isQris`, `qrisImageUrl`, `orderIndex`.
- **`GalleryPhoto`**: `title`, `url`, `caption`, `category` (PREWEDDING | ENGAGEMENT | MOMENTS | CEREMONY), `mediaType` (IMAGE | VIDEO), `thumbnailUrl`, `orderIndex`.

### 2.2. Tamu dan kehadiran
- **`InvitedGuest`**: `name`, `slug` (kode 4 karakter, unik), `phone`, `instagram`, `category`, `pax`, `tableNumber`, `customNote`, `invitationSent` + `invitationSentAt`, `isCheckedIn`, `checkInTime`, `checkInMethod` (`QR_SCAN` | `MANUAL` | `SELF`), `actualPax`, `souvenirGiven`.
- **`GuestWish`**: `guestName`, `relationship`, `attendanceStatus` (HADIR | TIDAK_HADIR | RAGU), `numberOfGuests`, `message`, `voiceUrl`, `reply`, `isHidden`. **Satu ucapan per kode undangan:** `guestKey` unik (`code:<KODE>`; ucapan anonim lama memakai nama huruf kecil) dan `guestSlug` (tidak pernah dikirim ke halaman publik).
- **`AttendanceSetting`** (`main`): `selfCheckIn` (bawaan **mati**), `verifyLocation` (bawaan **aktif**), `venueLat`, `venueLng`, `radiusMeters` (bawaan 150).

### 2.3. Photo Moments
- **`PhotoMoment`**: `guestName`, `guestSlug`, `photoUrl` (salinan feed ±1080 px), `originalUrl` (ukuran asli), `caption`, `look`, `approved`, `likesCount`, `reactions` (JSON emoji → jumlah), `commentsCount`.
- **`PhotoComment`**: `momentId` (cascade), `guestName`, `guestSlug`, `text`.
- **`CameraSetting`** (`main`): `access` (INVITED | ANYONE; nilai lama CHECKED_IN dibaca sebagai INVITED + `requireCheckIn`), **`requireCheckIn`** (bawaan **mati**), `framesPerGuest` (bawaan 15, 1 sampai 50), `cameraOpen`, `moderation`, `visibility` (ALL | OWN), `download` (NONE | OWN | ALL), `enabledLooks`, `defaultLook`, `screenEnabled`.
- **`PhotoFrameSetting`** (`main`): `enabled`, `frameOverlayUrl`, `frameName`, `allowGuestToggle`.

### 2.4. Akun
- **`AdminUser`**: `username`, `email`, `name`, `passwordHash` (bcrypt), `role` (SUPERADMIN | ADMIN). Admin utama **tidak disimpan di database**: namanya dari `ADMIN_USERNAME`, kata sandinya dari `ADMIN_PASSWORD`, dikenali lewat id `adm_env_01`.

### 2.5. Migrasi
| Migrasi | Isi |
|---|---|
| `20261017000000_init` | Seluruh skema awal |
| `20261021000000_guest_camera` | Komentar foto dan aturan kamera |
| `20261115000000_wish_guest_code` | `GuestWish.guestSlug`; ucapan lama ditautkan ke tamu bernama sama bila unik |
| `20261116000000_camera_require_checkin` | `requireCheckIn`; mode CHECKED_IN diubah menjadi INVITED + saklar aktif |
| `20261116010000_self_checkin` | `CheckInMethod.SELF` dan `AttendanceSetting` |

Migrasi dijalankan otomatis (`prisma migrate deploy`) saat kontainer menyala. Tes database membangun skema dari berkas migrasi yang sama.

## 3. Permukaan API
Semua di bawah `/api`. Tanda: 🔒 butuh token admin, ⏱ dibatasi laju.

| Kelompok | Endpoint |
|---|---|
| **Publik** | `GET /invitation` (tanpa alamat, peta, rekening) · `POST /public/guest-details` ⏱ (alamat + rekening, butuh kode) · `POST /public/verify-access`, `GET /public/guest/:slug` ⏱ · `GET/POST /public/guestbook` ⏱ · `POST /public/check-in` ⏱ (konfirmasi hadir mandiri) |
| **Photo Moments (publik)** | `GET /public/photo-moments` (feed), `POST` ⏱ · `GET /public/photo-moments/config`, `/frame-config`, `/screen` · komentar `GET/POST /public/photo-moments/:id/comments` ⏱ · `POST /public/photo-moments/:id/react` ⏱ |
| **Unggah** | `POST /upload` (tamu: kategori `moments` dan `voice`; selain itu 🔒) ⏱ · `POST /upload/batch` 🔒 |
| **Auth** | `POST /auth/login`, `/auth/refresh` ⏱ · `/auth/logout` · 🔒 `GET /auth/me`, `POST /auth/change-password` |
| **CMS** 🔒 | `/cms/stats`, `/cms/general`, `/cms/couple`, `/cms/theme` · CRUD `/cms/events`, `/stories`, `/gifts`, `/gallery` (+`/batch`) · `/cms/guests` (moderasi ucapan) · `/cms/invited-guests` (+`/batch`, `/batch-sent`) · `/cms/presensi/check-in`, `/undo`, `/stats` · **`/cms/attendance-settings`** · `/cms/photo-moments` (+`/settings`, `/frame-config`, `/:id/approval`, **`/approve-all`**, `/comments/:id`) |
| **Ekspor** 🔒 | `GET /cms/export/guests.csv`, `/cms/export/wishes.csv` · `POST /cms/export/photos-ticket` lalu `GET /export/photos.zip?t=<tiket>` |
| **Sistem** | `GET /health` · `POST /admin/reset-default` 🔒 (butuh konfirmasi, mati di produksi) |

## 4. Keamanan
| Area | Rancangan |
|---|---|
| **Rahasia** | Di produksi server menolak menyala bila `ADMIN_PASSWORD`, `JWT_SECRET`, atau `JWT_REFRESH_SECRET` kosong. Perbandingan kata sandi admin memakai `timingSafeEqual`. |
| **Token** | Access 1 jam, refresh 7 hari (jenis token dicek). Unduhan ZIP memakai **tiket 60 detik** satu tujuan, supaya token asli tidak masuk URL. |
| **Pembatas laju** (per IP, memori, jendela tetap) | login 10 / 15 mnt · kode undangan 60 / 10 mnt · ucapan 60 / 10 mnt · komentar 60 / 10 mnt · reaksi 300 / mnt · unggah tamu dan foto 300 / 10 mnt · check-in mandiri 40 / 10 mnt. Butuh `TRUST_PROXY` benar di belakang proxy. |
| **Header** | `nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy: camera/microphone/geolocation=(self)`, HSTS di produksi. `/uploads` tambahan: CSP `sandbox`, CORP same-origin. |
| **Unggahan** | Jenis dibaca dari isi berkas (JPEG, PNG, GIF, WebP, AVIF, HEIC, MP4, MOV, WebM, MP3, OGG, WAV, M4A); SVG dan HTML ditolak; nama berkas diacak. Tamu: foto ≤ 10 MB, suara ≤ 5 MB. Admin ≤ 100 MB, batch ≤ 30 berkas. Berkas tamu yang tidak pernah dipakai dihapus setelah 24 jam. |
| **Isi JSON** | Maksimal 1 MB; berkas besar lewat `/upload`. |
| **Data tersaring** | Alamat, peta, rekening tidak ada di `GET /invitation`; kode undangan tidak ada di daftar ucapan; CSV menetralkan rumus (`=`, `+`, `-`, `@`). |
| **Lokasi** | Posisi dari peramban, diperiksa server (haversine). Mencegah konfirmasi dari rumah, bukan pengaman mutlak. |

## 5. Arsitektur Offline
- **Service worker** (`src/offline/sw.js`) dibangun bersama aplikasi oleh `scripts/offlinePlugin.ts`: daftar berkas hasil build dan versinya (hash) disisipkan ke `/sw.js`. Halaman CMS tidak ikut di-precache.
- **Strategi:** halaman dan pembacaan API publik *network-first* (cadangan setelah 3,5 detik, saat jaringan gagal, atau saat 5xx); berkas ber-hash dari precache; foto unggahan *cache-first* (maks. 300); font *stale-while-revalidate*. Video, audio, semua penulisan, CMS, dan auth tidak pernah disimpan.
- **Kunjungan pertama:** saat service worker terpasang ia langsung mengambil data undangan dan aturan kamera (halaman pertama belum dikendalikannya); foto undangan diambil di latar belakang oleh halaman.
- **Sisi tamu:** kode tamu dan detail alamat/rekening disimpan di perangkat, sehingga tamu tetap terbuka. Kegagalan jaringan menjadi `ApiError.offline` dengan pesan yang jelas.
- **Antrean:** foto (`wedding-moments`, IndexedDB) dan ucapan/RSVP termasuk rekaman suara (`wedding-wishes`) terkirim sendiri saat sinyal kembali.
- **Versi baru:** menunggu tamu menekan *Muat ulang*, supaya halaman yang terbuka tidak kehilangan berkasnya.

## 6. Konfigurasi
| Variabel | Fungsi | Bawaan |
|---|---|---|
| `DATABASE_URL` | Koneksi PostgreSQL (Compose menyusunnya sendiri) | wajib di luar `dev:local` |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Admin utama | `admin` / **wajib** di produksi |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Tanda tangan sesi | **wajib** di produksi |
| `POSTGRES_PASSWORD` (`_USER`, `_DB`) | Compose | wajib untuk Compose |
| `GEMINI_API_KEY` | Transkripsi pesan suara | kosong = tanpa transkripsi |
| `TRUST_PROXY` | Jumlah proxy di depan aplikasi | 1 di Compose |
| `SEED_DEMO` | `false` = jangan isi data demo saat database kosong | `true` |
| `ALLOW_DEMO_RESET` | Mengizinkan tombol reset demo di produksi | `false` |
| `PORT`, `UPLOAD_DIR`, `APP_PORT`, `APP_BIND` | Jaringan dan penyimpanan | 3000, `./uploads`, 3000, `127.0.0.1` |

## 7. Deployment dan Operasional
- **Lokal:** `yarn dev:local` (PGlite di `.local-db`, migrasi dan data demo otomatis).
- **Produksi:** `docker compose up -d --build` (aplikasi non-root + PostgreSQL 17, tidak dibuka ke host), HTTPS lewat reverse proxy, health check `/api/health`, shutdown halus saat `SIGTERM`.
- **Backup:** `scripts/backup.sh` dan `restore.sh` untuk database dan volume unggahan; panduan di [`docs/BACKUP.md`](../docs/BACKUP.md).
- **CI:** GitHub Actions menjalankan `yarn lint`, `yarn test`, dan `yarn build` pada setiap push.
