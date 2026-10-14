# PRD 04: Implementation Steps & Maintenance Guide

## 1. Development Stages
- **Tahap 1: Inisialisasi Database & Arsitektur Backend**
  - Pembuatan Prisma Schema (`prisma/schema.prisma`) dan seeding initial wedding data & default superadmin account.
  - Setup Express REST API endpoints (`/api/invitation`, `/api/events`, `/api/gallery`, `/api/guests`, `/api/admin/*`, `/api/auth/*`).
  - Implementasi autentikasi JWT dan middleware keamanan.
- **Tahap 2: Frontend State & React Query Integration**
  - Setup `@tanstack/react-query` Provider dengan caching dan invalidasi mutasi otomatis.
  - Pembuatan API client helper terstruktur dengan TypeScript types.
- **Tahap 3: Guest Experience UI Construction**
  - Desain Cover Amplop interaktif dan audio player otomatis.
  - Pembuatan Komponen Hero & Countdown Timer dengan animasi detak waktu.
  - Komponen Mempelai, Detail Acara (Peta Google Maps & Calendar), Galeri Foto Lightbox, Cerita Cinta, dan Amplop Digital.
  - Formulir Buku Tamu Digital & Direct WhatsApp RSVP generator.
- **Tahap 4: Admin Dashboard & CMS Construction**
  - Halaman Login Admin yang aman.
  - Tab Manajemen Profil & Acara, Galeri Foto, Linimasa Kisah Cinta, Pengaturan Musik & Tema, serta Akun Admin.
  - Tab Moderasi Buku Tamu dengan filter kehadiran, statistik RSVP, dan fitur ekspor CSV.
- **Tahap 5: Verifikasi & Optimasi Kinerja**
  - Memastikan responsivitas di smartphone dan desktop.
  - Memeriksa penanganan error, optimasi loading state, dan validasi data.

## 2. Maintenance & Extension Best Practices
- **Penambahan Kategori Galeri**: Dapat ditambahkan melalui enum kategori atau string dinamis di backend.
- **Dukungan PostgreSQL**: Database layer kompatibel dengan PostgreSQL melalui Prisma connection string atau fallback database lokal berkinerja tinggi.
- **Keamanan Akun**: Password disimpan dengan salt hashing menggunakan `bcryptjs`.
