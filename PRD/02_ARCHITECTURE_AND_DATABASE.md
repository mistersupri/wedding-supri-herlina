# PRD 02: Architecture & Database Schema

## 1. System Architecture
Aplikasi dirancang menggunakan arsitektur modular Full-Stack SPA + Express REST API:

```
[ Client: React + Vite + TanStack React Query ]
                     │  HTTP / JSON
                     ▼
[ Express Server (server.ts) & API Routes (/api/*) ]
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
[ Auth Middleware (JWT) ]  [ Controller & Service Layer ]
                                │
                                ▼
                     [ Prisma ORM & Database Layer ]
                                │
                     [ SQLite / PostgreSQL Database ]
```

## 2. Prisma Database Schema
Model data relational yang digunakan dalam aplikasi:

### 2.1. Invitation (`Invitation`)
Menyimpan konfigurasi utama undangan:
- `id` (String / CUID / Int): Primary key
- `groomName`: Nama lengkap mempelai pria
- `groomShortName`: Nama panggilan mempelai pria
- `groomParents`: Nama orang tua mempelai pria
- `groomInstagram`: Handle Instagram mempelai pria
- `groomPhoto`: URL foto mempelai pria
- `brideName`: Nama lengkap mempelai wanita
- `brideShortName`: Nama panggilan mempelai wanita
- `brideParents`: Nama orang tua mempelai wanita
- `brideInstagram`: Handle Instagram mempelai wanita
- `bridePhoto`: URL foto mempelai wanita
- `weddingDate`: Tanggal utama pernikahan (ISO string)
- `countdownTarget`: Timestamp target hitung mundur
- `heroImage`: URL gambar cover hero
- `quoteText`: Kutipan ayat / kata mutiara pernikahan
- `quoteSource`: Sumber kutipan (misal QS Ar-Rum 21)
- `musicUrl`: URL audio lagu latar pernikahan
- `musicTitle`: Judul lagu latar
- `whatsappNumber`: Nomor WhatsApp tujuan konfirmasi RSVP
- `whatsappTemplate`: Template pesan otomatis WhatsApp
- `themeColor`: Preset tema warna (Rose, Sage, Gold, Ivory)
- `giftInfo`: Array JSON informasi rekening / kirim kado (Bank, No Rek, Atas Nama)
- `loveStories`: Array JSON linimasa perjalanan cinta

### 2.2. Event (`Event`)
Menyimpan detail setiap sesi acara (Akad Nikah, Pemberkatan, Resepsi, dll.):
- `id`: Primary key
- `invitationId`: Foreign key ke Invitation
- `title`: Nama sesi acara (e.g., "Akad Nikah", "Resepsi Pernikahan")
- `date`: Tanggal sesi
- `startTime`: Waktu mulai
- `endTime`: Waktu selesai
- `venueName`: Nama tempat / gedung
- `address`: Alamat lengkap lokasi
- `mapsUrl`: Link navigasi Google Maps
- `mapsEmbedUrl`: Link embed iframe peta
- `dressCode`: Rekomendasi warna busana
- `notes`: Catatan tambahan untuk tamu

### 2.3. Guest (`Guest` / Guestbook)
Menyimpan daftar ucapan, doa, dan konfirmasi kehadiran:
- `id`: Primary key
- `guestName`: Nama tamu pengirim
- `relationship`: Hubungan (Keluarga, Teman Kerja, Sahabat, Tetangga, dll.)
- `attendanceStatus`: 'HADIR' | 'TIDAK_HADIR' | 'RAGU'
- `numberOfGuests`: Jumlah orang yang hadir (1, 2, 3+)
- `message`: Isi ucapan & doa restu
- `reply`: Balasan dari admin / mempelai
- `isHidden`: Status moderasi (True/False)
- `createdAt`: Timestamp pengiriman

### 2.4. GalleryImage (`GalleryImage`)
Menyimpan foto-foto galeri pernikahan:
- `id`: Primary key
- `title`: Judul foto
- `url`: URL gambar
- `caption`: Keterangan foto
- `category`: 'PREWEDDING' | 'MOMENTS' | 'ENGAGEMENT' | 'CEREMONY'
- `orderIndex`: Urutan tampilan

### 2.5. AdminUser (`AdminUser`)
Menyimpan kredensial admin:
- `id`: Primary key
- `username`: Username unik
- `email`: Email admin
- `name`: Nama tampilan admin
- `passwordHash`: Salted Bcrypt password hash
- `role`: 'SUPERADMIN' | 'ADMIN'
- `createdAt`: Timestamp pembuatan akun
