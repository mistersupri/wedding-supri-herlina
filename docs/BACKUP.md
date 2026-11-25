# Backup dan pemulihan

Data undangan ada di dua tempat pada deploy Docker Compose:

| Isi | Lokasi | Dicadangkan oleh |
|---|---|---|
| Tamu, ucapan, RSVP, check-in, pengaturan, daftar foto | PostgreSQL (volume `pgdata`) | `pg_dump` |
| Foto tamu, pesan suara, foto galeri, video | Volume `uploads` | `tar` |

Keduanya harus dicadangkan bersama. Database hanya menyimpan alamat berkas, jadi database tanpa folder unggahan akan menampilkan foto yang rusak.

## Mencadangkan

Jalankan dari folder yang berisi `docker-compose.yml`, saat aplikasi menyala:

```bash
./scripts/backup.sh            # hasil di ./backups
./scripts/backup.sh /mnt/disk  # atau ke folder lain
```

Hasilnya dua berkas dengan cap waktu yang sama: `db-<waktu>.sql.gz` dan `uploads-<waktu>.tar.gz`.

Skrip membaca `POSTGRES_USER` dan `POSTGRES_DB` dari `.env` (bawaan: `undangan`). Cadangan database konsisten walau aplikasi sedang dipakai. Foto yang sedang diunggah di detik yang sama bisa belum ikut, tidak masalah untuk cadangan rutin.

### Jadwal yang disarankan

- **Sebelum hari H:** satu cadangan setelah daftar tamu dan isi undangan final.
- **Saat acara:** cadangan tiap 1 jam selama foto tamu masuk. Contoh `crontab -e` (jalankan di jam acara saja, sesuaikan jalur folder):

  ```cron
  0 * * * * cd /opt/undangan && ./scripts/backup.sh /opt/undangan-backups >> /opt/undangan-backups/backup.log 2>&1
  ```

- **Sesudah acara:** satu cadangan akhir, lalu unduh ZIP foto dari CMS (Photo Moments, Unduh semua foto) sebagai salinan yang mudah dibuka.

### Simpan di luar server

Cadangan yang hanya ada di server yang sama akan ikut hilang bila server hilang. Salin ke tempat lain, misalnya:

```bash
rsync -av /opt/undangan-backups/ pengguna@server-lain:/backup/undangan/
# atau ke penyimpanan cloud dengan rclone:
rclone copy /opt/undangan-backups remote:undangan-backup
```

Cadangan berisi data pribadi tamu (nama, nomor telepon). Simpan dengan akses terbatas.

## Memulihkan

```bash
./scripts/restore.sh backups/db-20261120-210000.sql.gz backups/uploads-20261120-210000.tar.gz
```

Skrip meminta Anda mengetik `RESTORE`, menghentikan aplikasi, **mengganti** database (dan folder unggahan bila tar diberikan), lalu menyalakan aplikasi lagi. Argumen kedua boleh dikosongkan bila hanya database yang perlu dipulihkan.

Setelah pulih, cek `docker compose ps` (harus `healthy`), buka `/cms`, dan lihat beberapa foto tamu.

## Uji sebelum dibutuhkan

Cadangan yang belum pernah dicoba dipulihkan belum bisa dipercaya. Satu kali sebelum acara, pulihkan ke server percobaan (atau komputer lain dengan Docker) dan pastikan daftar tamu serta foto muncul.

## Catatan

- Perintah `docker compose down -v` menghapus kedua volume. Jangan dipakai di server produksi tanpa cadangan.
- Tombol "Kembalikan ke data demo" di CMS menghapus semua tabel dan mati di produksi kecuali `ALLOW_DEMO_RESET=true`. Jangan aktifkan menjelang acara.
- Folder `backups/` sudah masuk `.gitignore`, supaya data tamu tidak ikut ter-commit.
