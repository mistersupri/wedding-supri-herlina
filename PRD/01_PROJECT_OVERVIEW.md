# PRD 01: Project Overview & Vision

> Versi dokumen: 2.0 (diperbarui 20 November 2026). Dokumen ini menggambarkan produk **seperti yang ada di kode**. Fitur yang belum dibuat ditandai jelas sebagai backlog di PRD 04.

## 1. Executive Summary
**Wedding Invitation & Guestbook Platform** adalah aplikasi web undangan pernikahan digital untuk pasangan Indonesia. Satu server melayani tiga hal:

1. **Undangan publik** yang dibuka tamu dari tautan WhatsApp, dalam salah satu dari lima template visual.
2. **CMS admin** tempat mempelai mengelola isi undangan, daftar tamu, kehadiran di hari H, dan foto tamu.
3. **Kamera tamu (Photo Moments)** yang berjalan di peramban HP tamu selama acara, lengkap dengan layar besar untuk proyektor.

Setiap tamu terdaftar menerima **kode undangan 4 karakter** (misal `R7K2`) yang membuka bagian pribadi undangan: alamat lengkap, amplop digital, konfirmasi kehadiran, kartu tamu ber-QR, dan kamera. Seluruh undangan **tetap bisa dibuka tanpa internet** setelah dibuka sekali.

## 2. Core Objectives
1. **Pengalaman tamu yang personal**: cover bernama tamu, musik latar, hitung mundur, galeri, kisah cinta, jadwal dan peta, buku tamu dengan pesan suara, semuanya dalam gaya visual yang dipilih pasangan.
2. **Privasi bertingkat**: alamat acara, tautan peta, dan rekening amplop tidak keluar dari server sebelum kode undangan valid.
3. **Hari H yang lancar**: meja penerima tamu dengan pemindai QR, konfirmasi hadir mandiri dari HP (dengan verifikasi lokasi), dan statistik kehadiran waktu nyata.
4. **Kenangan bersama**: kamera sekali pakai di HP tamu, galeri bersama, layar besar, dan unduhan seluruh foto setelah acara.
5. **Andal di lapangan**: sinyal di gedung sering buruk. Undangan, kartu tamu, dan kamera harus tetap jalan; RSVP yang gagal terkirim tidak boleh hilang.
6. **Mudah dioperasikan**: satu perintah untuk pengembangan lokal tanpa konfigurasi, satu Docker Compose untuk produksi, backup dan restore dengan satu skrip.

## 3. Target Audience
| Peran | Kebutuhan utama |
|---|---|
| **Tamu undangan** | Membuka undangan dari WhatsApp di HP, melihat jadwal dan lokasi, mengirim RSVP dan doa, menunjukkan kartu QR, memotret saat acara. Usia beragam, sinyal kadang buruk. |
| **Mempelai / wedding organizer (admin)** | Mengisi dan mengubah isi undangan, mengelola daftar tamu, mengirim undangan, memantau RSVP, memoderasi ucapan dan foto, mengunduh kenangan. |
| **Penerima tamu (petugas meja)** | Memindai kartu tamu atau mencari nama, mencatat jumlah orang dan suvenir. Memakai akun admin yang sama. |

## 4. Ruang Lingkup
**Dalam cakupan:** satu pasangan per instalasi (satu database per pernikahan), satu atau lebih sesi acara, ratusan sampai sekitar seribu tamu, bahasa Indonesia.

**Di luar cakupan (saat ini):** banyak pasangan dalam satu instalasi (multi-tenant), pembayaran, pengiriman WhatsApp otomatis lewat API (pengiriman dilakukan manual lewat tautan `wa.me`), aplikasi native, dan manajemen akun admin lewat antarmuka (lihat backlog di PRD 04).

## 5. Tech Stack
| Lapisan | Teknologi |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS v4, Motion, Lucide Icons, TanStack Query v5 |
| Backend | Node.js 22, Express 4, REST JSON di bawah `/api` |
| Database | **PostgreSQL** lewat Prisma 7 (`@prisma/adapter-pg`). Lokal tanpa instalasi: PGlite (PostgreSQL embedded) lewat `yarn dev:local` |
| Autentikasi | JWT (access 1 jam, refresh 7 hari) dan bcrypt; akun utama dari variabel lingkungan |
| Penyimpanan berkas | Disk lokal (`UPLOAD_DIR`, volume Docker `uploads`) |
| AI opsional | Google Gemini untuk menyalin pesan suara menjadi teks (`GEMINI_API_KEY`) |
| Offline | Service worker buatan sendiri, Web App Manifest, IndexedDB |
| Kualitas | `tsc --noEmit`, Vitest (147 tes, termasuk tes database PGlite), GitHub Actions |
| Deploy | Dockerfile multi-stage, Docker Compose (aplikasi + PostgreSQL 17), reverse proxy HTTPS di depannya |

Tidak ada Firebase, SQLite, atau layanan pihak ketiga yang wajib selain font Google Fonts (dan Gemini bila diaktifkan).

## 6. Prinsip Produk
- **Server yang memutuskan.** Aturan akses (kode undangan, wajib check-in, kuota foto, radius lokasi) diperiksa di server; antarmuka hanya mencerminkannya.
- **Gagal dengan jelas, bukan diam-diam.** Pesan error berbahasa Indonesia yang menyebut penyebab dan langkah berikutnya, termasuk saat offline.
- **Data tamu itu pribadi.** Daftar tamu, nomor telepon, dan foto tidak pernah masuk repositori atau log; kode undangan tidak pernah muncul di daftar ucapan publik.
- **Desain tetap pada arah yang dipilih.** Arah visual Jawa/Nusantara modern dan aturan tiap template ada di [`DESIGN.md`](../DESIGN.md).

## 7. Kriteria Keberhasilan
- Tamu membuka undangan dari tautan WhatsApp, menemukan jadwal dan lokasi, dan mengirim RSVP tanpa bantuan.
- Petugas meja memproses satu tamu kurang dari 10 detik dengan QR.
- Undangan yang sudah pernah dibuka tetap tampil penuh saat server dimatikan.
- Daftar tamu, RSVP, dan foto dapat diekspor (CSV, ZIP) dan dicadangkan, sehingga data tidak terkunci di aplikasi.
