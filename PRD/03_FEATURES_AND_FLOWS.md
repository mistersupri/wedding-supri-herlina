# PRD 03: Features & User Flows

## 1. Guest View Features
1. **Interactive Opening Envelope / Cover**:
   - Mempelai mengarahkan nama tamu dari parameter URL (misal `?to=Bapak+Budi` atau input manual).
   - Tombol "Buka Undangan" membuka layar dengan animasi lembut dan memicu lagu latar otomatis (*auto-play background music*).
2. **Hero & Countdown Timer**:
   - Tampilan foto kedua mempelai dengan tipografi serif klasik.
   - Hitung mundur hari, jam, menit, dan detik menuju tanggal resepsi dengan transisi halus.
3. **Mempelai Pria & Wanita**:
   - Informasi detail kedua mempelai, nama orang tua, dan link akun sosial media.
4. **Detail Acara & Lokasi**:
   - Kartu waktu pelaksanaan untuk Akad Nikah & Resepsi.
   - Tombol navigasi "Buka Google Maps" dan fitur "Tambah ke Google Calendar".
   - Embed peta interaktif lokasi acara.
5. **Love Story & Gallery**:
   - Linimasa momen perjalanan cinta mempelai.
   - Galeri foto dengan filter kategori dan pop-up Lightbox resolusi penuh.
6. **Buku Tamu Digital (Guestbook) & Ucapan**:
   - Formulir kirim ucapan, doa restu, status kehadiran, dan jumlah tamu.
   - Feed ucapan tamu dengan pagination / filter status kehadiran.
   - Efek confetti perayaan saat ucapan berhasil terkirim.
7. **Direct WhatsApp RSVP**:
   - Pilihan instan bagi tamu untuk mengonfirmasi kehadiran langsung ke nomor WhatsApp calon pengantin.
   - Generator teks WhatsApp otomatis yang memuat nama tamu, status kehadiran, dan doa restu.
8. **Tanda Kasih / Digital Envelope**:
   - Nomor rekening dan alamat kirim kado dengan tombol "Salin Nomor Rekening" one-click copy.
9. **Floating Audio Player**:
   - Pemutar musik terapung di sudut layar dengan animasi piringan hitam/not musik dan kontrol Play/Pause.

## 2. Admin & CMS Dashboard Features
1. **Admin Authentication**:
   - Sistem login berbasis JWT & hash password bcrypt untuk keamanan penuh tanpa ketergantungan Firebase.
   - Manajemen akun admin (tambah admin baru, ubah password, hapus admin).
2. **Content Management (CMS)**:
   - **General & Couple Data**: Edit nama mempelai, orang tua, foto, kutipan, dan link sosial media.
   - **Event Schedules**: Tambah / sunting sesi acara, tanggal, jam, alamat, dan link Google Maps.
   - **Gallery Manager**: Tambah foto baru via URL/upload, atur kategori, dan urutan.
   - **Love Story Timeline**: Tambah dan edit cerita perjalanan cinta.
   - **Music & Theme Settings**: Ubah URL lagu latar dan ganti palet tema warna (Rose, Sage, Gold, Ivory).
   - **Wedding Gift Accounts**: Atur nomor rekening bank / dompet digital.
   - **WhatsApp Config**: Atur nomor tujuan dan template pesan otomatis.
3. **Guestbook Moderation & Analytics**:
   - Statistik total tamu yang mengonfirmasi: Hadir, Tidak Hadir, Ragu, serta total estimasi porsi tamu.
   - Moderasi komentar (sembunyikan pesan spam, hapus ucapan, atau berikan balasan langsung dari mempelai).
   - Ekspor data daftar ucapan dan RSVP ke format CSV/Excel.
