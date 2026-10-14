# PRD 05: Completion Summary & CMS User Guide

## 1. Status Implementasi Fitur

| Fitur / Modul | Deskripsi | Status |
| :--- | :--- | :--- |
| **Cover Amplop Interaktif** | Tampilan cover amplop pembuka dengan nama tamu kustom (`?to=Nama`), efek segel lilin, dan pembuka website | Selesai |
| **Musik Latar Otomatis** | Pemutar audio mengambang dengan autoplay saat amplop dibuka, toggle pause/play, dan ganti lagu via CMS | Selesai |
| **Hero & Countdown Timer** | Hitung mundur dinamis (Hari, Jam, Menit, Detik) dengan integrasi tambah acara ke Google Calendar / ICS | Selesai |
| **Profil Mempelai** | Foto bingkai lengkung elegan, nama lengkap, gelar, orang tua, dan tautan Instagram kedua mempelai | Selesai |
| **Rangkaian Acara & Lokasi** | Sesi Akad & Resepsi, waktu, dress code, tombol navigasi Google Maps, dan peta interaktif | Selesai |
| **Galeri Foto & Lightbox** | Filter kategori (Semua, Prewedding, Lamaran, dll.), grid responsif, zoom & fullscreen modal preview | Selesai |
| **Kisah Cinta (Love Story)** | Linimasa milestone perjalanan cinta dari pertama jumpa hingga lamaran | Selesai |
| **Buku Tamu Digital** | Formulir ucapan, status kehadiran (Hadir/Tidak/Ragu), jumlah porsi, animasi confetti, dan daftar doa tamu | Selesai |
| **Integrasi WhatsApp RSVP** | Tombol konfirmasi langsung ke WhatsApp pengantin dengan format pesan otomatis dan tercatat ke database | Selesai |
| **Amplop Digital & Kado** | Transfer bank digital (BCA, Mandiri, dll.), salin nomor rekening 1-klik, dan modal QRIS | Selesai |
| **Dashboard CMS Admin** | Pengelolaan lengkap data undangan, acara, galeri, kisah cinta, musik, tema warna, dan moderasi pesan | Selesai |
| **Manajemen Akun Admin** | Tambah admin baru, daftar admin terdaftar, ubah kata sandi, dan proteksi JWT | Selesai |
| **Ekspor Data RSVP ke CSV** | Unduh seluruh data kehadiran dan ucapan tamu dalam format CSV untuk koordinasi katering / WO | Selesai |
| **Preset Palet Warna** | 4 Tema elegan: Warm Rose, Sage Elegance, Champagne Gold, Classic Ivory | Selesai |

---

## 2. Panduan Kredensial & Penggunaan Admin CMS

### Kredensial Demo Bawaan:
- **Username**: `admin`
- **Password**: `admin123`
- **Akses**: Klik tombol gembok **"Admin Login"** di bagian footer paling bawah website.

### Penggunaan Fitur CMS:
1. **Mengubah Data Pengantin & Hitung Mundur**:
   - Buka tab **Data Mempelai**, ubah nama, foto URL, tanggal target hitung mundur, atau nomor WhatsApp.
   - Klik **Simpan Perubahan**.
2. **Menambah / Mengubah Acara**:
   - Buka tab **Rangkaian Acara**, klik **Tambah Sesi Acara** untuk menambahkan sesi atau klik tombol edit pada sesi yang ada.
3. **Mengunggah & Mengatur Galeri**:
   - Buka tab **Galeri Foto**, masukkan URL gambar, judul, dan pilih kategori.
4. **Moderasi & Balas Buku Tamu**:
   - Buka tab **Buku Tamu**, gunakan tombol **Sembunyikan** untuk pesan spam atau **Balas** untuk memberikan respon personal dari kedua mempelai.
5. **Menambahkan Rekening Transfer**:
   - Buka tab **Amplop & Kado**, atur nomor rekening bank atau e-wallet serta URL QRIS.
6. **Mengganti Tema & Musik**:
   - Buka tab **Musik & Tema**, pilih dari 4 palet warna bawaan dan ubah direct link MP3 lagu pengiring.
7. **Ekspor Rekap Kehadiran**:
   - Buka tab **Ringkasan & RSVP**, klik tombol hijau **Ekspor Data ke CSV (Excel)** untuk mendapatkan rekapitulasi data tamu.

---

## 3. Format Personalisasi Nama Tamu
Tautan undangan mendukung parameter kustomisasi nama tamu di URL:
- `https://domain-anda.com/?to=Bapak+Joko+Wi`
- `https://domain-anda.com/?guest=Keluarga+Besar+Budi`
- `https://domain-anda.com/?nama=Sahabat+Alumni+2018`
Nama yang dimasukkan akan tampil secara otomatis di cover amplop depan dan pesan pembuka.
