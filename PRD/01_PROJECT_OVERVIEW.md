# PRD 01: Project Overview & Vision

## 1. Executive Summary
**Wedding Invitation & Guestbook Platform** adalah aplikasi web undangan pernikahan digital interaktif, elegan, dan responsif. Aplikasi ini dirancang khusus untuk memberikan pengalaman digital yang mewah dan personal bagi para tamu undangan, serta menyediakan sistem manajemen konten (CMS / Admin Dashboard) yang komprehensif bagi calon pengantin atau wedding organizer untuk mengatur seluruh detail acara.

## 2. Core Objectives
1. **Pristine Guest Experience**: Memudahkan tamu membuka undangan digital dengan animasi pembuka amplop/cover, musik latar otomatis yang lembut, hitung mundur menuju hari bahagia, galeri foto interaktif, petunjuk lokasi dan peta terintegrasi, serta buku tamu digital interaktif.
2. **Direct WhatsApp RSVP**: Memungkinkan konfirmasi kehadiran secara instan melalui integrasi WhatsApp langsung dengan pesan otomatis yang rapi dan terformat.
3. **Full-Featured Admin CMS**: Dashboard admin yang aman dengan otentikasi login, pengelolaan profil mempelai, detail acara akad & resepsi, foto galeri, musik latar, nomor rekening tanda kasih, hingga moderasi buku tamu digital.
4. **Performance & Clean Architecture**: Dibangun dengan standard Clean Architecture menggunakan React, `@tanstack/react-query`, Express backend, dan Prisma ORM dengan SQLite/PostgreSQL layer yang tangguh tanpa ketergantungan pada Firebase.

## 3. Key Target Audience
- **Tamu Undangan (Guest)**: Mengakses melalui smartphone atau desktop untuk melihat jadwal acara, lokasi maps, galeri, mengisi ucapan, dan melakukan konfirmasi RSVP ke WhatsApp.
- **Calon Pengantin & Wedding Organizer (Admin)**: Mengelola detail acara, menambahkan admin baru, mengubah tema warna, menyunting cerita cinta, mengunggah foto, dan memoderasi ucapan tamu.

## 4. Tech Stack Specification
- **Frontend Framework**: React 19 + TypeScript + Vite
- **Data Fetching & State Management**: `@tanstack/react-query` (TanStack Query v5)
- **Styling & Design System**: Tailwind CSS v4 + Motion animations + Lucide React Icons
- **Backend Framework**: Express.js REST API on Node.js
- **Database & ORM**: Prisma ORM with SQLite file-database / PostgreSQL compatibility layer
- **Authentication**: JWT & salted Bcrypt hashing for Admin management (No Firebase)
- **Multimedia**: Audio background player with auto-play on envelope click and interactive audio toggle
