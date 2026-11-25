# PRD 05: Completion Summary & CMS User Guide

## 1. Status Implementasi Fitur

Status: **Selesai** = ada di kode dan teruji; **Sebagian** = ada dengan batasan yang disebut; **Belum** = backlog (PRD 04).

### Undangan tamu
| Fitur | Status | Catatan |
| :--- | :--- | :--- |
| Cover bernama tamu, musik latar, hitung mundur | Selesai | Nama dari `?to=`, musik mulai saat cover dibuka |
| Lima template + empat preset warna Nusantara | Selesai | Nusantara, Gulungan Kenangan, Bilik Foto, Cozy Home, Layar Perak |
| Profil, kisah, jadwal, peta, Google Calendar | Selesai | Peta tersemat tidak tersedia offline |
| Galeri foto dan video dengan lightbox | Selesai | |
| Kode undangan 4 karakter | Selesai | Dari tautan, atau diketik; tersimpan di perangkat |
| Alamat dan rekening hanya setelah kode valid | Selesai | Disaring di server |
| Amplop digital (rekening, salin, QRIS) | Selesai | |
| RSVP dan ucapan (satu per kode) | Selesai | Batas kursi sesuai daftar |
| Pesan suara dan transkripsi | Selesai | Transkripsi butuh `GEMINI_API_KEY` |
| Balasan WhatsApp ke mempelai | Selesai | Templat dari CMS |
| Kartu tamu ber-QR | Selesai | |
| Konfirmasi hadir mandiri + verifikasi lokasi | Selesai | Mati bawaan; verifikasi aktif bawaan; butuh HTTPS dan izin lokasi |
| Kamera Photo Moments dan layar besar | Selesai | 20 look film |
| Wajib check-in untuk kamera | Selesai | Mati bawaan |
| Mode offline dan dapat dipasang | Selesai | Kunjungan pertama butuh internet; video, musik, peta tidak tersimpan |
| RSVP dan foto saat offline | Selesai | Terkirim saat halaman dibuka dan ada sinyal |

### CMS dan operasional
| Fitur | Status | Catatan |
| :--- | :--- | :--- |
| Login admin, JWT, ubah kata sandi | Selesai | Admin utama dari variabel lingkungan |
| Edit mempelai, acara, kisah, galeri, rekening, tema, musik | Selesai | |
| Daftar tamu: tambah, impor, saring, kode otomatis | Selesai | |
| Kirim WhatsApp per tamu dan berurutan, pesan dapat diubah | Selesai | Pesan tersimpan di perangkat admin |
| Meja penerima tamu (QR, cari nama, jumlah, suvenir) | Selesai | |
| Pengaturan kehadiran mandiri (koordinat, radius, saklar) | Selesai | |
| Status undangan dibuka (chip per tamu, statistik, saringan, ekspor) | Selesai | Dicatat saat tamu berkode menekan *Buka undangan* |
| Moderasi ucapan (balas, sembunyikan, hapus) | Selesai | |
| Moderasi foto, setujui semua, hitung foto menunggu | Selesai | |
| Kartu QR PDF per template | Selesai | A4, A5, A6, 300 dpi |
| Ekspor CSV tamu dan ucapan, ZIP foto | Selesai | |
| Backup dan restore | Sebagian | Skrip ditulis dan diperiksa sintaksnya; belum dijalankan terhadap Docker sungguhan, uji sebelum hari H |
| Tes otomatis dan CI | Selesai | 147 tes; GitHub Actions. OneDev belum |
| Manajemen akun admin lewat antarmuka | **Belum** | Backlog |
| Pencabutan sesi saat keluar | **Belum** | Backlog |

---

## 2. Panduan CMS

### Masuk
Buka `/cms` (login di `/cms/login`).
- **Lokal:** `admin` / `admin123` (hanya untuk pengembangan).
- **Produksi:** nama pengguna dan kata sandi dari `ADMIN_USERNAME` dan `ADMIN_PASSWORD`. Kata sandi admin utama hanya bisa diganti di variabel lingkungan.

### Menyiapkan undangan
1. **Mempelai & sampul:** nama, orang tua, foto, hero, kutipan. **Jadwal acara:** sesi, alamat, tautan peta. **Kisah**, **Galeri**, **Rekening & QRIS**.
2. **Template & musik:** pilih template (dan preset warna untuk Nusantara), musik latar, tanggal, nomor dan templat WhatsApp untuk balasan tamu.

### Mengundang tamu
1. **Daftar tamu & ucapan → Tamu undangan:** tambah satu per satu, atau *Impor daftar* (satu tamu per baris: Nama, Kategori, Kursi, Telepon, Meja, Catatan, Instagram; hanya nama yang wajib). Kode 4 karakter dibuat otomatis.
2. Tombol **Pesan**: ubah isi undangan. Penanda `{nama}`, `{kode}`, `{link}`, `{mempelai}`; `{link}` wajib ada.
3. **Kirim WA** per tamu, atau **Kirim berurutan**: WhatsApp terbuka dengan pesan siap; tamu ditandai terkirim; lanjut ke tamu berikutnya.
4. Pantau **Sudah dikirim** dan **Sudah hadir** di kartu statistik. **Ekspor CSV** untuk katering atau WO.

### Tautan pribadi tamu
- `https://domain-anda.com/?to=Nama+Tamu&c=KODE`: nama tampil di cover dan bagian pribadi langsung terbuka.
- `?guest=` dan `?nama=` dikenali sebagai pengganti `?to=`. Tanpa `c`, tamu mengetik kodenya.

### Hari H: meja penerima tamu
1. Buka **Meja penerima tamu**; nyalakan kamera untuk memindai QR di kartu tamu, atau cari nama atau kode.
2. Atur jumlah orang dan suvenir, lalu catat. *Batalkan* bila salah orang.
3. **Konfirmasi kehadiran oleh tamu** (panel di atas halaman yang sama):
   - Centang *Tamu boleh konfirmasi hadir sendiri*.
   - Biarkan *Verifikasi lokasi* aktif, lalu isi koordinat: tempel dari Google Maps, *Ambil dari tautan peta acara*, atau berdiri di lokasi dan tekan *Pakai lokasi saya sekarang*. Cek dengan *Periksa di peta*.
   - Atur radius (100 sampai 300 m cocok untuk gedung). Matikan verifikasi bila sinyal lokasi di dalam gedung buruk; kode undangan yang valid sudah cukup.
   - Simpan. Coba sekali dari HP sebelum acara.

### Photo Moments
1. **Aturan kamera:** siapa yang boleh memotret (*Tamu undangan* atau *Siapa saja*), **Tamu undangan wajib check-in dulu** (mati bawaan), jatah foto, tutup kamera, cek dulu sebelum tayang, siapa melihat apa, boleh unduh apa, look film yang tersedia.
2. **Kartu QR untuk meja:** pilih gaya kartu dan ukuran kertas, ubah judul bila perlu, lalu **Unduh PDF** atau **Buka untuk cetak**. Untuk QR di meja pilih akses *Siapa saja* agar tamu cukup menulis nama.
3. **Layar besar:** *Buka layar besar* (`/photo-moments/layar`) di proyektor.
4. **Moderasi:** angka di menu menunjukkan foto yang menunggu. *Tayangkan semua yang menunggu* atau setujui satu per satu; hapus foto atau komentar yang tidak pantas.
5. **Setelah acara:** **Unduh semua foto (ZIP)**, satu folder per tamu dengan ukuran asli. Centang kotak bila foto yang disembunyikan ikut.

### Ucapan dan RSVP
**Daftar tamu & ucapan → Ucapan & RSVP:** cari, saring kehadiran, balas, sembunyikan, atau hapus; **Ekspor CSV**.

### Pengaturan
Ubah kata sandi akun tersimpan. *Kembalikan ke data demo* menghapus **semua** data dan mati di produksi kecuali `ALLOW_DEMO_RESET=true`; jangan diaktifkan menjelang acara.

---

## 3. Checklist Persiapan Acara
| Kapan | Yang dikerjakan |
|---|---|
| **Sebelum deploy** | Isi `.env` (kata sandi admin, `JWT_*`, `POSTGRES_PASSWORD`); pastikan `TRUST_PROXY` sesuai jumlah proxy; pasang HTTPS; atur `SEED_DEMO=false` bila tidak ingin data demo |
| **H-14 sampai H-7** | Isi konten undangan; impor daftar tamu; ubah pesan undangan; coba satu tautan di HP |
| **H-7** | Kirim undangan berurutan; minta tamu membukanya sekali dengan internet agar tersedia offline; cadangan pertama dan **uji restore** ke server percobaan |
| **H-1** | Isi koordinat dan radius, coba konfirmasi hadir mandiri dari HP di lokasi; cetak kartu QR PDF; atur aturan kamera; cadangan |
| **Hari H** | Nyalakan meja penerima tamu; proyektor ke layar besar; cadangan tiap jam (cron); pantau foto menunggu |
| **Sesudah** | Cadangan akhir; unduh ZIP foto dan CSV; tutup kamera bila perlu |

## 4. Pemecahan Masalah
| Gejala | Penyebab dan solusi |
|---|---|
| Tamu ditolak: "Terlalu banyak percobaan" | Pembatas laju. Bila banyak tamu memakai satu Wi-Fi, tunggu beberapa menit; pastikan `TRUST_PROXY` benar |
| Semua tamu saling memblokir | `TRUST_PROXY` salah, semua pengunjung terbaca sebagai satu IP |
| Tombol lokasi: "Akses lokasi ditolak" | Tamu belum mengizinkan lokasi untuk situs ini, atau halaman bukan HTTPS |
| "Anda masih sekitar … dari lokasi acara" | Di luar radius, atau koordinat acara salah. Periksa dengan *Periksa di peta*, perbesar radius, atau matikan verifikasi |
| Kamera menahan tamu di halaman "tercatat hadir" | *Wajib check-in* aktif. Check-in di meja, lewat tombol konfirmasi hadir, atau matikan opsinya |
| Undangan tidak terbuka offline | Tamu belum pernah membukanya dengan internet; atau bukan HTTPS |
| Tamu tidak melihat perubahan terbaru | Pita *Versi baru tersedia* belum ditekan; tutup lalu buka lagi |
| PDF kartu memakai font biasa | Font Google tidak terunduh (offline); ulangi dengan internet |
| Ucapan lama tidak muncul sebagai "milik" tamu | Ucapan anonim lama tanpa kode; tamu bernama sama lebih dari satu tidak ditautkan otomatis |

## 5. Riwayat Dokumen
| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | 2026-10 | PRD awal (rancangan Firebase-free, SQLite, buku tamu, WhatsApp RSVP) |
| 2.0 | 2026-11-20 | Disesuaikan dengan kode: PostgreSQL, tamu terdaftar, lima template, Photo Moments, keamanan, ucapan per kode, kehadiran mandiri berlokasi, wajib check-in kamera, kartu QR PDF, mode offline dan antrean, tes, CI, backup. Fitur lama yang tidak pernah ada di kode (manajemen akun admin lewat UI, tema Rose/Sage) dikeluarkan atau ditandai backlog |
