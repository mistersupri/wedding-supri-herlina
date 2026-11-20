# PRD 03: Features & User Flows

## 1. Pengalaman Tamu (Undangan Publik)

### 1.1. Cover dan tautan pribadi
- Tautan pribadi: `/?to=Nama+Tamu&c=KODE`. Nama tampil di cover; `c` membuka bagian pribadi secara otomatis. Parameter `to` juga dikenali sebagai `guest` atau `nama`.
- Tanpa tautan pribadi, tamu bisa mengetik **kode undangan 4 karakter**. Kode yang valid disimpan di perangkat dan ditaruh di alamat halaman.
- Tombol *Buka undangan* membuka cover dan memulai musik latar (gestur pengguna yang disyaratkan peramban).

### 1.2. Lima template
Semua template membaca data yang sama, jadi berganti template tidak perlu mengisi ulang apa pun. Detail visual di [`DESIGN.md`](../DESIGN.md).

| Template | Karakter |
|---|---|
| **Nusantara** (bawaan) | Kertas mori, motif kawung, preset warna batik Sogan / Wedel / Gadung / Jambon |
| **Gulungan Kenangan** | Kisah di gulungan film, tiket per acara, hitung mundur bioskop, layar lebar video prewedding |
| **Bilik Foto** | Mesin photobooth, papan huruf jadwal, struk lokasi, ucapan sebagai strip foto |
| **Cozy Home** | Dunia kecil di hutan, papan kayu, surat yang mengetik sendiri |
| **Layar Perak** | Program bioskop gading dan emas, tiket tayang, lembar kontak, credit roll |

### 1.3. Isi undangan
Hero (foto atau video) dan hitung mundur · profil mempelai dengan orang tua dan Instagram · kutipan · kisah cinta · jadwal acara dan *Tambah ke Google Calendar* · galeri foto dan video dengan lightbox · buku tamu · tanda kasih · pemutar musik terapung · navigasi bawah (Mempelai, Acara, Galeri, Ucapan, Kado, Kartu, Kamera).

### 1.4. Bagian yang terkunci kode undangan
| Terbuka tanpa kode | Hanya dengan kode valid |
|---|---|
| Nama mempelai, tanggal, jam, nama tempat, galeri, kisah, ucapan terkirim | **Alamat lengkap, tautan dan peta tersemat**, **rekening dan QRIS**, formulir RSVP, kartu tamu ber-QR, konfirmasi hadir mandiri, kamera |

Penguncian dilakukan **di server**: respons publik tidak memuat alamat dan rekening; keduanya diambil lewat `POST /public/guest-details` setelah kode terverifikasi.

### 1.5. RSVP dan ucapan
- Satu ucapan per kode undangan. Tamu memilih Hadir / Tidak hadir / Ragu, jumlah orang (maksimal sesuai kursi yang dijatah), lalu menulis ucapan dan/atau **merekam pesan suara**.
- Pesan suara diunggah sebagai berkas; bila `GEMINI_API_KEY` ada dan tamu hanya merekam, server menyalinnya menjadi teks (batas 20 detik; gagal = teks cadangan).
- Setelah terkirim: confetti, ringkasan, kartu tamu, dan tombol *Kabari mempelai lewat WhatsApp* (templat pesan dari CMS).
- **Ubah kehadiran satu kali**; teks ucapan tetap. Mengubah kehadiran tanpa teks tidak menimpa ucapan.
- **Tanpa sinyal:** konfirmasi dan ucapan (termasuk rekaman) disimpan di HP dan terkirim otomatis saat sinyal kembali. Tamu melihat kartu *Tersimpan di HP Anda* dengan *Kirim sekarang* dan *Batalkan dan ubah*.

### 1.6. Kartu tamu
Modal berisi nama, kategori, kursi, meja, **QR dan kode 4 karakter**, status hadir, dan tombol salin tautan pribadi. Dipakai petugas meja untuk memindai. Tetap tampil offline.

### 1.7. Konfirmasi hadir mandiri (opsional, diatur di CMS)
- Tombol *Saya sudah di lokasi* di kartu tamu dan di halaman kamera.
- Dengan **verifikasi lokasi** (bawaan aktif), peramban membaca posisi HP dan server menerima hanya bila dalam radius dari koordinat acara. Pesan penolakan menyebut jaraknya.
- Tercatat sebagai check-in metode *Mandiri* dengan jumlah hadir sesuai kursi dan tanpa suvenir.

### 1.8. Kamera tamu (Photo Moments), `/photo-moments`
- **Akses:** tamu berkode; atau siapa saja yang mengetik nama (mode untuk QR di meja). Bila *wajib check-in* aktif, tamu berkode harus tercatat hadir dulu; halaman menawarkan konfirmasi dari HP.
- **Memotret:** kamera depan atau belakang, atau pilih dari galeri HP; hasil 4:5 yang bisa digeser, di-zoom, diputar. 20 look film (Terang, Kalem, Hangat, Nyeleneh) dengan kekuatan; debu, light bleed, grain, 9 setelan manual, cap tanggal, dan bingkai (putih, hitam, dua dengan teks, bingkai acara).
- **Mengirim:** foto masuk antrean di HP (ukuran asli dan salinan feed), terkirim di belakang layar dengan progres, dan menunggu sinyal bila offline. Jatah foto per tamu seperti kamera sekali pakai (bawaan 15).
- **Galeri bersama:** feed, reaksi (6 emoji), komentar, unduh ukuran asli sesuai aturan, tab *Foto saya*.
- **Layar besar**, `/photo-moments/layar`: slideshow foto terbaru dengan QR untuk proyektor.

### 1.9. Offline dan dapat dipasang
Setelah dibuka sekali dengan internet, undangan, kartu tamu, dan kamera tetap terbuka tanpa sinyal atau saat server mati. Peramban menawarkan *Tambahkan ke layar utama*. Pita di atas halaman memberi tahu saat offline atau saat versi baru tersedia. Batasan: video hero, musik, peta tersemat, dan foto dari alamat luar tidak tersimpan.

## 2. CMS Admin (`/cms`)

| Menu | Fungsi |
|---|---|
| **Ringkasan** | Statistik RSVP (hadir, tidak, ragu, jumlah kursi), jumlah konten, ucapan terbaru |
| **Mempelai & sampul** | Nama, orang tua, Instagram, foto, hero (foto atau video), kutipan |
| **Jadwal acara** | Sesi, tanggal dan jam, tempat, alamat, tautan peta, busana, catatan |
| **Kisah** | Linimasa kisah cinta dengan foto |
| **Galeri** | Foto dan video, kategori, urutan, unggah massal |
| **Rekening & QRIS** | Rekening bank, e-wallet, gambar QRIS |
| **Template & musik** | Pilih template dan preset warna, musik latar, tanggal, WhatsApp dan templat balasan |
| **Daftar tamu & ucapan** | *Tamu undangan*: tambah, ubah, impor dari spreadsheet, kode otomatis, saring, **kirim WhatsApp per tamu atau berurutan**, **pesan yang bisa diubah**, tanda terkirim, **ekspor CSV**. *Ucapan & RSVP*: cari, saring, balas, sembunyikan, hapus, ekspor CSV |
| **Meja penerima tamu** | **Aturan konfirmasi hadir mandiri** (aktif/mati, verifikasi lokasi, koordinat, radius); pemindai QR, cari nama, jumlah orang, suvenir, batalkan; statistik hadir |
| **Photo Moments** | Aturan kamera (akses, **wajib check-in**, jatah, tutup kamera, cek dulu, visibilitas, unduhan, look), bingkai acara, **kartu QR PDF**, daftar foto dengan setujui/sembunyikan/hapus dan komentar, **setujui semua**, **unduh semua foto (ZIP)**, angka foto menunggu di menu |
| **Pengaturan** | Ubah kata sandi, kembalikan ke data demo (mati di produksi) |

### 2.1. Pengiriman undangan
Pesan memakai penanda `{nama}`, `{kode}`, `{link}`, `{mempelai}`. *Kirim berurutan* menampilkan tamu satu per satu (hanya yang punya nomor dan belum terkirim), membuka WhatsApp, menandai terkirim, lalu lanjut. Pesan tersimpan di perangkat admin.

### 2.2. Kartu QR PDF
Satu QR untuk seluruh acara (`/photo-moments`) dalam gaya salah satu template (bawaan: template aktif; Nusantara mengikuti preset warna), ukuran A4, A5, atau A6, 300 dpi. QR bisa diklik di pembaca PDF dan terbaca pemindai pada ukuran kecil.

### 2.3. Ekspor
- **CSV tamu:** kode, nama, kategori, kursi, telepon, meja, status kirim, status dan metode hadir, jumlah hadir, suvenir, tautan pribadi.
- **CSV ucapan:** nama, hubungan, kehadiran, jumlah, ucapan, balasan, status tampil.
- **ZIP foto:** satu folder per tamu (ukuran asli) dan `daftar-foto.csv`.
- File CSV memakai BOM UTF-8 dan menetralkan sel yang diawali `=`, `+`, `-`, `@`.

## 3. Alur Utama

**A. Undangan sampai ke tamu.** Admin mengisi daftar tamu → *Kirim berurutan* membuka WhatsApp dengan tautan pribadi → tamu membuka tautan → server memverifikasi kode → alamat dan rekening dimuat dan disimpan di perangkat.

**B. RSVP.** Tamu membuka bagian Ucapan → memilih kehadiran, jumlah, menulis atau merekam → server menyimpan satu ucapan per kode (jumlah dibatasi sesuai kursi) → ringkasan dan kartu tamu. Tanpa sinyal: ucapan masuk antrean lokal dan terkirim kemudian.

**C. Check-in di hari H (tiga jalur).**
1. *Scan QR:* petugas memindai kartu tamu → tamu terpilih → atur jumlah dan suvenir → catat.
2. *Cari nama:* ketik nama atau kode; nama sebagian yang cocok dengan beberapa tamu ditolak sampai lebih spesifik.
3. *Mandiri:* tamu menekan *Saya sudah di lokasi* → server memeriksa kode dan jarak → tercatat. Scan atau ketukan kedua tidak mengubah waktu dan metode pertama.

**D. Photo Moments.** Tamu membuka kamera (QR meja atau tautan) → identitas diperiksa menurut aturan akses dan wajib check-in → jepret, pilih look → foto masuk antrean → server memeriksa berkas dan jatah (satu transaksi) → masuk feed, atau menunggu persetujuan bila *cek dulu* aktif → tampil di layar besar.

**E. Setelah acara.** Admin menayangkan atau menyembunyikan foto → *Unduh semua foto (ZIP)* → ekspor CSV tamu dan ucapan → cadangan akhir (`scripts/backup.sh`).

## 4. Aturan Bisnis
| Aturan | Nilai |
|---|---|
| Kode undangan | 4 karakter dari `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`, unik, tidak peka huruf besar-kecil; kode yang diminta dan sudah dipakai ditolak (409) |
| Ucapan | Satu per kode; nama, hubungan, dan batas kursi diambil dari daftar tamu |
| Ubah kehadiran | Satu kali per tamu, per perangkat |
| Check-in berulang | Tidak mengubah waktu atau metode pertama; hanya jumlah dan suvenir yang dikirim eksplisit |
| Check-in mandiri | Mati bawaan. Verifikasi lokasi aktif bawaan; radius 20 sampai 5000 m (bawaan 150). Toleransi akurasi GPS maksimal 50 m; akurasi di atas 300 m ditolak |
| Wajib check-in untuk kamera | Mati bawaan; berlaku untuk tamu berkode, juga di mode "Siapa saja" |
| Jatah foto | 1 sampai 50 per tamu (bawaan 15), dihitung per kode (atau per nama bila tanpa kode); pengecekan dan penyimpanan atomik |
| Foto | Satu berkas hanya untuk satu foto; harus berkas nyata di folder `moments` |
| Reaksi | 6 emoji yang ditawarkan; jumlah tidak pernah negatif |
| Kamera ditutup | Foto baru ditolak; foto yang sudah masuk tetap aman; komentar tetap bisa |
| Pesan suara | Hanya berkas yang disimpan server; data URL lama ditolak |
