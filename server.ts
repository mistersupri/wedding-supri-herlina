import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import { transcribeAudioWithGemini } from './server/gemini.js';
import {
  comparePassword,
  generateToken,
  generateTokenPair,
  verifyRefreshToken,
  hashPassword,
  requireAdminAuth,
  getEnvAdminCredentials,
  AuthenticatedRequest,
} from './server/auth.js';

// ==========================================
// FILE UPLOAD STORAGE CONFIGURATION (ENV UPLOAD_DIR)
// ==========================================
const BASE_UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const SUB_DIRS = ['hero', 'gallery', 'couples', 'moments', 'general'];

if (!fs.existsSync(BASE_UPLOAD_DIR)) {
  fs.mkdirSync(BASE_UPLOAD_DIR, { recursive: true });
}
SUB_DIRS.forEach((subDir) => {
  const dirPath = path.join(BASE_UPLOAD_DIR, subDir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const rawCategory = (req.query.category as string) || (req.body?.category as string) || 'general';
    const sanitizedCategory = SUB_DIRS.includes(rawCategory) ? rawCategory : 'general';
    const targetDir = path.join(BASE_UPLOAD_DIR, sanitizedCategory);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const ext = path.extname(sanitizedOriginalName) || '.bin';
    const nameWithoutExt = path.basename(sanitizedOriginalName, ext);
    const uniqueName = `${nameWithoutExt}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit per file
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // Static route to serve uploaded media files directly
  app.use('/uploads', express.static(BASE_UPLOAD_DIR));

  // ==========================================
  // FILE UPLOAD API ENDPOINTS
  // ==========================================
  app.post('/api/upload', uploadMiddleware.single('file'), (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah.' });
      }
      const rawCategory = (req.query.category as string) || (req.body?.category as string) || 'general';
      const sanitizedCategory = SUB_DIRS.includes(rawCategory) ? rawCategory : 'general';
      const relativeUrl = `/uploads/${sanitizedCategory}/${req.file.filename}`;

      res.json({
        success: true,
        url: relativeUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal mengunggah file ke server.' });
    }
  });

  app.post('/api/upload/batch', uploadMiddleware.array('files', 30), (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah.' });
      }
      const rawCategory = (req.query.category as string) || (req.body?.category as string) || 'general';
      const sanitizedCategory = SUB_DIRS.includes(rawCategory) ? rawCategory : 'general';

      const uploadedFiles = files.map((file) => ({
        url: `/uploads/${sanitizedCategory}/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      }));

      res.json({
        success: true,
        files: uploadedFiles,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal mengunggah batch file ke server.' });
    }
  });

  // ==========================================
  // PUBLIC MODULAR APIS (No sensitive credentials)
  // ==========================================

  // Full invitation (backward compatibility & public main loader)
  app.get('/api/invitation', (req: Request, res: Response) => {
    try {
      const data = db.getInvitationData();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat data undangan' });
    }
  });

  // Public Couple Details
  app.get('/api/public/couple', (req: Request, res: Response) => {
    try {
      const couple = db.getCoupleData();
      res.json({ success: true, data: couple });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat data mempelai' });
    }
  });

  // Public Event Schedules
  app.get('/api/public/events', (req: Request, res: Response) => {
    try {
      const events = db.getEvents();
      res.json({ success: true, data: events });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat jadwal acara' });
    }
  });

  // Public Love Story
  app.get('/api/public/stories', (req: Request, res: Response) => {
    try {
      const stories = db.getLoveStories();
      res.json({ success: true, data: stories });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat kisah cinta' });
    }
  });

  // Public Gallery Photos
  app.get('/api/public/gallery', (req: Request, res: Response) => {
    try {
      const gallery = db.getGallery();
      res.json({ success: true, data: gallery });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat galeri foto' });
    }
  });

  // Public Gift Accounts & QRIS
  app.get('/api/public/gifts', (req: Request, res: Response) => {
    try {
      const gifts = db.getGiftAccounts();
      res.json({ success: true, data: gifts });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat nomor rekening & kado' });
    }
  });

  // Public Guestbook & Wishes
  app.get('/api/public/guestbook', (req: Request, res: Response) => {
    try {
      const guests = db.getPublicGuests();
      const stats = db.getRSVPStats();
      res.json({ success: true, data: guests, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat buku tamu' });
    }
  });

  // Public Guest Slug & Code Verification (For 4-character unique link / unlocked features)
  app.get('/api/public/guest/:slug', (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const guest = db.findInvitedGuestBySlug(slug);
      if (!guest) {
        return res.json({
          success: true,
          isValid: false,
          message: 'Kode undangan 4-karakter tidak ditemukan.',
          guest: null,
        });
      }
      res.json({
        success: true,
        isValid: true,
        guest: {
          id: guest.id,
          name: guest.name,
          slug: guest.slug,
          category: guest.category,
          pax: guest.pax,
          tableNumber: guest.tableNumber,
          isCheckedIn: guest.isCheckedIn,
          checkInTime: guest.checkInTime,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memverifikasi tamu' });
    }
  });

  // Verify access code manual check
  app.post('/api/public/verify-access', (req: Request, res: Response) => {
    try {
      const { code } = req.body;
      if (!code || typeof code !== 'string') {
        return res.json({ success: true, isValid: false, message: 'Kode undangan wajib diisi.' });
      }
      const guest = db.findInvitedGuestBySlug(code.trim());
      if (!guest) {
        return res.json({
          success: true,
          isValid: false,
          message: 'Kode 4 digit tidak ditemukan dalam daftar undangan terdaftar.',
          guest: null,
        });
      }
      res.json({
        success: true,
        isValid: true,
        message: `Selamat datang, ${guest.name}! Akses fitur undangan resmi berhasil dibuka.`,
        guest: {
          id: guest.id,
          name: guest.name,
          slug: guest.slug,
          category: guest.category,
          pax: guest.pax,
          tableNumber: guest.tableNumber,
          isCheckedIn: guest.isCheckedIn,
          checkInTime: guest.checkInTime,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memverifikasi kode akses' });
    }
  });

  // Backward compatibility alias for /api/guests
  app.get('/api/guests', (req: Request, res: Response) => {
    try {
      const guests = db.getPublicGuests();
      const stats = db.getRSVPStats();
      res.json({ success: true, data: guests, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat buku tamu' });
    }
  });

  // Submit public guest wish & RSVP
  app.post('/api/public/guestbook', async (req: Request, res: Response) => {
    try {
      const { guestName, relationship, attendanceStatus, numberOfGuests, message, voiceUrl } = req.body;
      if (!guestName || !attendanceStatus) {
        return res.status(400).json({
          success: false,
          message: 'Nama tamu dan status kehadiran wajib diisi.',
        });
      }

      let finalMessage = (message || '').trim();

      // If audio is provided and message is empty or generic fallback text, use Gemini to transcribe audio
      if (voiceUrl && (!finalMessage || finalMessage.startsWith('[Voice Note]'))) {
        const transcribedText = await transcribeAudioWithGemini(voiceUrl);
        if (transcribedText) {
          finalMessage = transcribedText;
        } else if (!finalMessage) {
          finalMessage = '[Voice Note] Ucapan dikirimkan melalui rekaman suara.';
        }
      } else if (!finalMessage) {
        finalMessage = 'Selamat untuk kedua mempelai!';
      }

      const newGuest = db.addGuestWish({
        guestName: guestName.trim(),
        relationship: relationship?.trim() || 'Tamu Undangan',
        attendanceStatus,
        numberOfGuests: Number(numberOfGuests) || 1,
        message: finalMessage,
        voiceUrl: voiceUrl || null,
      });

      res.status(201).json({
        success: true,
        message: 'Terima kasih atas doa dan konfirmasi kehadiran Anda!',
        data: newGuest,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal mengirim ucapan' });
    }
  });

  // --- Photo Moments API Routes ---
  app.get('/api/public/photo-moments/frame-config', (req: Request, res: Response) => {
    try {
      const frameConfig = db.getPhotoFrameConfig();
      res.json({ success: true, data: frameConfig });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat konfigurasi frame' });
    }
  });

  app.get('/api/public/photo-moments', (req: Request, res: Response) => {
    try {
      const moments = db.getPhotoMoments();
      const guestName = (req.query.guestName as string) || '';
      const guestSlug = (req.query.guestSlug as string) || '';
      const userCount = db.getGuestPhotoCount(guestName, guestSlug);

      const pageStr = req.query.page as string;
      const limitStr = req.query.limit as string;

      if (pageStr !== undefined || limitStr !== undefined) {
        const page = Math.max(1, parseInt(pageStr, 10) || 1);
        const limit = Math.max(1, parseInt(limitStr, 10) || 10);
        const total = moments.length;
        const startIndex = (page - 1) * limit;
        const paginatedData = moments.slice(startIndex, startIndex + limit);
        const hasMore = startIndex + limit < total;

        return res.json({
          success: true,
          data: paginatedData,
          total,
          page,
          limit,
          hasMore,
          userCount,
        });
      }

      res.json({
        success: true,
        data: moments,
        userCount,
        total: moments.length,
        hasMore: false,
        page: 1,
        limit: moments.length,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat photo moments' });
    }
  });

  app.post('/api/public/photo-moments', (req: Request, res: Response) => {
    try {
      const { guestName, guestSlug, photoUrl, caption } = req.body;
      if (!photoUrl) {
        return res.status(400).json({ success: false, message: 'Foto hasil jepretan kamera wajib ada.' });
      }

      const result = db.addPhotoMoment({
        guestName: (guestName || 'Tamu Undangan').trim(),
        guestSlug: guestSlug ? guestSlug.trim().toUpperCase() : undefined,
        photoUrl,
        caption,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menyimpan foto' });
    }
  });

  app.post('/api/public/photo-moments/:id/like', (req: Request, res: Response) => {
    try {
      const { action, emoji } = req.body || {};
      const result = db.reactPhotoMoment(req.params.id, emoji || '❤️', action || 'add');
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal memberikan like' });
    }
  });

  app.post('/api/public/photo-moments/:id/react', (req: Request, res: Response) => {
    try {
      const { emoji, action } = req.body || {};
      const result = db.reactPhotoMoment(req.params.id, emoji || '❤️', action || 'add');
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal merespons foto' });
    }
  });

  app.delete('/api/public/photo-moments/:id', (req: Request, res: Response) => {
    try {
      const success = db.deletePhotoMoment(req.params.id);
      res.json({ success, message: success ? 'Foto berhasil dihapus' : 'Foto tidak ditemukan' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal menghapus foto' });
    }
  });

  // Backward compatibility for POST /api/guests
  app.post('/api/guests', async (req: Request, res: Response) => {
    try {
      const { guestName, relationship, attendanceStatus, numberOfGuests, message, voiceUrl } = req.body;
      if (!guestName || !attendanceStatus) {
        return res.status(400).json({
          success: false,
          message: 'Nama tamu dan status kehadiran wajib diisi.',
        });
      }

      let finalMessage = (message || '').trim();

      if (voiceUrl && (!finalMessage || finalMessage.startsWith('[Voice Note]'))) {
        const transcribedText = await transcribeAudioWithGemini(voiceUrl);
        if (transcribedText) {
          finalMessage = transcribedText;
        } else if (!finalMessage) {
          finalMessage = '[Voice Note] Ucapan dikirimkan melalui rekaman suara.';
        }
      } else if (!finalMessage) {
        finalMessage = 'Selamat untuk kedua mempelai!';
      }

      const newGuest = db.addGuestWish({
        guestName: guestName.trim(),
        relationship: relationship?.trim() || 'Tamu Undangan',
        attendanceStatus,
        numberOfGuests: Number(numberOfGuests) || 1,
        message: finalMessage,
        voiceUrl: voiceUrl || null,
      });

      res.status(201).json({
        success: true,
        message: 'Terima kasih atas doa dan konfirmasi kehadiran Anda!',
        data: newGuest,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal mengirim ucapan' });
    }
  });

  // WhatsApp RSVP link generator
  app.post('/api/rsvp-whatsapp', (req: Request, res: Response) => {
    try {
      const { guestName, attendanceStatus, numberOfGuests, message } = req.body;
      const inv = db.getInvitationData();

      if (guestName && message) {
        db.addGuestWish({
          guestName: guestName.trim(),
          relationship: 'Konfirmasi WhatsApp',
          attendanceStatus: attendanceStatus || 'HADIR',
          numberOfGuests: Number(numberOfGuests) || 1,
          message: message.trim(),
        });
      }

      const statusMap: Record<string, string> = {
        HADIR: 'Hadir',
        TIDAK_HADIR: 'Tidak Hadir',
        RAGU: 'Masih Ragu',
      };

      const statusText = statusMap[attendanceStatus] || 'Hadir';
      const cleanPhone = (inv.whatsappNumber || '6281234567890').replace(/[^0-9]/g, '');

      let text = (inv.whatsappTemplate || 'Halo Arya & Nadhira, Saya {nama_tamu} mengonfirmasi {status_kehadiran}.')
        .replace(/{nama_tamu}/g, guestName || 'Tamu Undangan')
        .replace(/{status_kehadiran}/g, statusText)
        .replace(/{jumlah_tamu}/g, String(numberOfGuests || 1))
        .replace(/{ucapan}/g, message || 'Semoga acaranya lancar dan berkah.');

      const encodedText = encodeURIComponent(text);
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

      res.json({
        success: true,
        whatsappUrl,
        message: 'Link konfirmasi WhatsApp siap digunakan',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memproses RSVP WhatsApp' });
    }
  });

  // ==========================================
  // AUTHENTICATION APIS (Env Credentials + Stored Admins)
  // ==========================================
  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username dan kata sandi wajib diisi.' });
      }

      const envCreds = getEnvAdminCredentials();
      let matchedAdmin = null;

      // 1. Check environment credentials
      if (
        username.trim().toLowerCase() === envCreds.username.toLowerCase() &&
        password === envCreds.password
      ) {
        matchedAdmin = {
          id: 'adm_env_01',
          username: envCreds.username,
          email: `${envCreds.username}@wedding.com`,
          name: 'Admin Utama',
          role: 'SUPERADMIN' as const,
          createdAt: new Date().toISOString(),
        };
      } else {
        // 2. Fallback check stored admins in DB
        const dbAdmin = db.findAdminByUsername(username.trim());
        if (dbAdmin && comparePassword(password, dbAdmin.passwordHash)) {
          matchedAdmin = {
            id: dbAdmin.id,
            username: dbAdmin.username,
            email: dbAdmin.email,
            name: dbAdmin.name,
            role: dbAdmin.role,
            createdAt: dbAdmin.createdAt,
          };
        }
      }

      if (!matchedAdmin) {
        return res.status(401).json({ success: false, message: 'Username atau kata sandi tidak cocok.' });
      }

      const tokenPair = generateTokenPair({
        id: matchedAdmin.id,
        username: matchedAdmin.username,
        role: matchedAdmin.role,
        name: matchedAdmin.name,
      });

      // Return SAFE data only - NEVER return password hashes or raw secrets!
      res.json({
        success: true,
        message: 'Login berhasil.',
        data: {
          token: tokenPair.accessToken,
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresIn: tokenPair.expiresIn,
          user: matchedAdmin,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal melakukan login' });
    }
  });

  // Refresh Token Endpoint
  app.post('/api/auth/refresh', (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          code: 'REFRESH_TOKEN_REQUIRED',
          message: 'Refresh token wajib disertakan.',
        });
      }

      const { payload, expired } = verifyRefreshToken(refreshToken);
      if (expired) {
        return res.status(401).json({
          success: false,
          code: 'REFRESH_TOKEN_EXPIRED',
          message: 'Sesi perpanjangan telah berakhir. Silakan login kembali.',
        });
      }

      if (!payload) {
        return res.status(401).json({
          success: false,
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token tidak valid.',
        });
      }

      const envCreds = getEnvAdminCredentials();
      let currentUser = null;

      if (payload.id === 'adm_env_01' || payload.username.toLowerCase() === envCreds.username.toLowerCase()) {
        currentUser = {
          id: 'adm_env_01',
          username: envCreds.username,
          email: `${envCreds.username}@wedding.com`,
          name: 'Admin Utama',
          role: 'SUPERADMIN' as const,
          createdAt: new Date().toISOString(),
        };
      } else {
        const dbAdmin = db.findAdminById(payload.id);
        if (dbAdmin) {
          currentUser = {
            id: dbAdmin.id,
            username: dbAdmin.username,
            email: dbAdmin.email,
            name: dbAdmin.name,
            role: dbAdmin.role,
            createdAt: dbAdmin.createdAt,
          };
        }
      }

      if (!currentUser) {
        return res.status(401).json({
          success: false,
          code: 'USER_NOT_FOUND',
          message: 'Pengguna admin tidak ditemukan atau telah dihapus.',
        });
      }

      // Generate rotated token pair
      const newTokens = generateTokenPair({
        id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
        name: currentUser.name,
      });

      res.json({
        success: true,
        message: 'Token berhasil diperbarui.',
        data: {
          token: newTokens.accessToken,
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiresIn: newTokens.expiresIn,
          user: currentUser,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memperbarui token otentikasi' });
    }
  });

  // Logout Endpoint
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Berhasil keluar dari sesi admin.',
    });
  });

  app.get('/api/auth/me', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const envCreds = getEnvAdminCredentials();

      if (userId === 'adm_env_01' || req.user!.username.toLowerCase() === envCreds.username.toLowerCase()) {
        return res.json({
          success: true,
          data: {
            id: 'adm_env_01',
            username: envCreds.username,
            email: `${envCreds.username}@wedding.com`,
            name: 'Admin Utama',
            role: 'SUPERADMIN',
            createdAt: new Date().toISOString(),
          },
        });
      }

      const admin = db.findAdminById(userId);
      if (!admin) {
        return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      }

      res.json({
        success: true,
        data: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          createdAt: admin.createdAt,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memverifikasi sesi' });
    }
  });

  app.post('/api/auth/change-password', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password baru minimal harus 6 karakter.',
        });
      }

      const envCreds = getEnvAdminCredentials();
      if (req.user!.username.toLowerCase() === envCreds.username.toLowerCase()) {
        if (currentPassword !== envCreds.password) {
          return res.status(400).json({ success: false, message: 'Password saat ini tidak sesuai.' });
        }
        return res.json({
          success: true,
          message: 'Password akun env admin terkonfirmasi. Untuk mengubah permanen, sesuaikan ADMIN_PASSWORD pada file environment.',
        });
      }

      const admin = db.findAdminById(req.user!.id);
      if (!admin || !comparePassword(currentPassword, admin.passwordHash)) {
        return res.status(400).json({ success: false, message: 'Password saat ini tidak sesuai.' });
      }

      const newHash = hashPassword(newPassword);
      db.updateAdminPassword(admin.id, newHash);

      res.json({ success: true, message: 'Password berhasil diperbarui.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal mengubah password' });
    }
  });

  // ==========================================
  // MODULAR PROTECTED CMS APIS (One URL slice per tab)
  // ==========================================

  // 1. CMS Tab: /cms/overview (Stats & Counters)
  app.get('/api/cms/stats', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = db.getCMSStats();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat data statistik CMS' });
    }
  });

  // 2. CMS Tab: /cms/mempelai (Data Mempelai & Kutipan)
  app.get('/api/cms/couple', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = db.getCoupleData();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat data mempelai' });
    }
  });

  app.put('/api/cms/couple', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = db.updateCoupleData(req.body);
      res.json({ success: true, message: 'Data mempelai berhasil diperbarui.', data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menyimpan data mempelai' });
    }
  });

  // 3. CMS Tab: /cms/acara (Jadwal Acara Akad & Resepsi)
  app.get('/api/cms/events', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const events = db.getEvents();
      res.json({ success: true, data: events });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat jadwal acara' });
    }
  });

  app.post('/api/cms/events', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const newEvent = db.createEvent(req.body);
      res.status(201).json({ success: true, message: 'Sesi acara berhasil ditambahkan.', data: newEvent });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menambahkan acara' });
    }
  });

  app.put('/api/cms/events/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = db.updateEvent(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Acara tidak ditemukan.' });
      }
      res.json({ success: true, message: 'Sesi acara berhasil diperbarui.', data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memperbarui acara' });
    }
  });

  app.delete('/api/cms/events/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = db.deleteEvent(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Acara tidak ditemukan.' });
      }
      res.json({ success: true, message: 'Sesi acara berhasil dihapus.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menghapus acara' });
    }
  });

  // 4. CMS Tab: /cms/cerita (Linimasa Kisah Cinta)
  app.get('/api/cms/stories', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const stories = db.getLoveStories();
      res.json({ success: true, data: stories });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat kisah cinta' });
    }
  });

  app.post('/api/cms/stories', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const newStory = db.createLoveStory(req.body);
      res.status(201).json({ success: true, message: 'Milestone kisah cinta berhasil ditambahkan.', data: newStory });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menambahkan cerita' });
    }
  });

  app.put('/api/cms/stories/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = db.updateLoveStory(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Kisah cinta tidak ditemukan.' });
      }
      res.json({ success: true, message: 'Kisah cinta berhasil diperbarui.', data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memperbarui cerita' });
    }
  });

  app.delete('/api/cms/stories/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = db.deleteLoveStory(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Kisah cinta tidak ditemukan.' });
      }
      res.json({ success: true, message: 'Milestone kisah cinta berhasil dihapus.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menghapus cerita' });
    }
  });

  // 5. CMS Tab: /cms/galeri (Galeri Foto)
  app.get('/api/cms/photo-moments', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const moments = db.getPhotoMoments();
      res.json({ success: true, data: moments, total: moments.length });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat photo moments' });
    }
  });

  app.delete('/api/cms/photo-moments/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = db.deletePhotoMoment(req.params.id);
      if (!result.success) {
        return res.status(404).json({ success: false, message: 'Foto tidak ditemukan' });
      }
      res.json({ success: true, message: 'Foto jepretan tamu berhasil dihapus' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menghapus foto' });
    }
  });

  app.get('/api/cms/gallery', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const gallery = db.getGallery();
      res.json({ success: true, data: gallery });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat galeri foto' });
    }
  });

  app.post('/api/cms/gallery', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const newPhoto = db.createGalleryPhoto(req.body);
      res.status(201).json({ success: true, message: 'Foto berhasil ditambahkan ke galeri.', data: newPhoto });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menambahkan foto' });
    }
  });

  app.post('/api/cms/gallery/batch', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { photos } = req.body;
      if (!Array.isArray(photos) || photos.length === 0) {
        return res.status(400).json({ success: false, message: 'Daftar foto tidak valid.' });
      }
      const created = db.createBatchGalleryPhotos(photos);
      res.status(201).json({
        success: true,
        message: `${created.length} foto berhasil diunggah ke galeri.`,
        data: created,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal mengunggah foto batch' });
    }
  });

  app.put('/api/cms/gallery/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = db.updateGalleryPhoto(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Foto tidak ditemukan.' });
      }
      res.json({ success: true, message: 'Foto berhasil diperbarui.', data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memperbarui foto' });
    }
  });

  app.delete('/api/cms/gallery/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = db.deleteGalleryPhoto(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Foto tidak ditemukan.' });
      }
      res.json({ success: true, message: 'Foto berhasil dihapus dari galeri.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menghapus foto' });
    }
  });

  // 6. CMS Tab: /cms/tamu (Buku Tamu & RSVP Moderasi)
  app.get('/api/cms/guests', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const filter = (req.query.status as string) || 'ALL';
      const search = (req.query.search as string) || '';
      const guests = db.getAllGuests(filter, search);
      const stats = db.getRSVPStats();
      res.json({ success: true, data: guests, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal mengambil data buku tamu' });
    }
  });

  app.put('/api/cms/guests/:id/reply', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { reply } = req.body;
      const updated = db.replyToGuest(req.params.id, reply || '');
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Ucapan tamu tidak ditemukan.' });
      }
      res.json({ success: true, message: 'Balasan berhasil disimpan.', data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal membalas ucapan tamu' });
    }
  });

  app.put('/api/cms/guests/:id/visibility', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = db.toggleGuestVisibility(req.params.id);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Ucapan tamu tidak ditemukan.' });
      }
      res.json({
        success: true,
        message: updated.isHidden ? 'Ucapan disembunyikan dari publik.' : 'Ucapan kini ditampilkan ke publik.',
        data: updated,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal mengubah status visibilitas' });
    }
  });

  app.delete('/api/cms/guests/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = db.deleteGuest(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Ucapan tamu tidak ditemukan.' });
      }
      res.json({ success: true, message: 'Ucapan tamu berhasil dihapus.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menghapus ucapan tamu' });
    }
  });

  // 6b. CMS Tab: /cms/tamu (Manajemen Tamu Undangan & 4-Char Slug)
  app.get('/api/cms/invited-guests', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const filter = (req.query.filter as string) || 'ALL';
      const search = (req.query.search as string) || '';
      const guests = db.getAllInvitedGuests(filter, search);
      const stats = db.getPresensiStats();
      res.json({ success: true, data: guests, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal mengambil data daftar tamu' });
    }
  });

  app.post('/api/cms/invited-guests', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, slug, phone, category, pax, tableNumber, customNote } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Nama tamu undangan wajib diisi.' });
      }
      const newGuest = db.createInvitedGuest({
        name,
        slug,
        phone,
        category,
        pax: Number(pax) || 2,
        tableNumber,
        customNote,
      });
      res.status(201).json({
        success: true,
        message: `Tamu "${newGuest.name}" (Kode: ${newGuest.slug}) berhasil ditambahkan.`,
        data: newGuest,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menambahkan tamu' });
    }
  });

  app.post('/api/cms/invited-guests/batch', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { guests } = req.body;
      if (!Array.isArray(guests) || guests.length === 0) {
        return res.status(400).json({ success: false, message: 'Daftar tamu tidak boleh kosong.' });
      }
      const created = db.createBatchInvitedGuests(guests);
      res.status(201).json({
        success: true,
        message: `${created.length} tamu undangan berhasil ditambahkan secara serentak.`,
        data: created,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menambahkan tamu secara batch' });
    }
  });

  app.post('/api/cms/invited-guests/batch-sent', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ids, sentStatus } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'ID tamu tidak boleh kosong.' });
      }
      const result = db.batchUpdateInvitationSent(ids, Boolean(sentStatus));
      res.json({
        success: true,
        message: `${result.updatedCount} tamu berhasil ditandai status undangannya.`,
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memperbarui status pengiriman' });
    }
  });

  app.put('/api/cms/invited-guests/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = db.updateInvitedGuest(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Data tamu tidak ditemukan.' });
      }
      res.json({ success: true, message: 'Data tamu berhasil diperbarui.', data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memperbarui data tamu' });
    }
  });

  app.delete('/api/cms/invited-guests/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = db.deleteInvitedGuest(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Data tamu tidak ditemukan.' });
      }
      res.json({ success: true, message: 'Tamu berhasil dihapus dari daftar undangan.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menghapus tamu' });
    }
  });

  // 6c. CMS: Presensi & Check-in Desk (Scan QR / Manual Search)
  app.post('/api/cms/presensi/check-in', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { guestId, slug, nameQuery, actualPax, souvenirGiven, method } = req.body;
      const result = db.checkInGuest(
        { id: guestId, slug, nameQuery },
        { actualPax, souvenirGiven, method }
      );
      if (!result.success) {
        return res.status(404).json({ success: false, message: result.message });
      }
      res.json({
        success: true,
        message: result.message,
        alreadyCheckedIn: result.alreadyCheckedIn,
        guest: result.guest,
        stats: db.getPresensiStats(),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal melakukan presensi tamu' });
    }
  });

  app.post('/api/cms/presensi/undo', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { guestId } = req.body;
      if (!guestId) {
        return res.status(400).json({ success: false, message: 'ID tamu wajib disertakan.' });
      }
      const result = db.undoCheckIn(guestId);
      if (!result.success) {
        return res.status(404).json({ success: false, message: result.message });
      }
      res.json({
        success: true,
        message: result.message,
        guest: result.guest,
        stats: db.getPresensiStats(),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal membatalkan presensi' });
    }
  });

  app.get('/api/cms/presensi/stats', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = db.getPresensiStats();
      res.json({ success: true, data: stats });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat statistik presensi' });
    }
  });

  // 7. CMS Tab: /cms/kado (Rekening Bank & QRIS)
  app.get('/api/cms/gifts', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const gifts = db.getGiftAccounts();
      res.json({ success: true, data: gifts });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat data rekening' });
    }
  });

  app.post('/api/cms/gifts', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const newGift = db.createGiftAccount(req.body);
      res.status(201).json({ success: true, message: 'Rekening / Hadiah digital berhasil ditambahkan.', data: newGift });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menambahkan rekening' });
    }
  });

  app.put('/api/cms/gifts/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = db.updateGiftAccount(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Rekening tidak ditemukan.' });
      }
      res.json({ success: true, message: 'Rekening berhasil diperbarui.', data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memperbarui rekening' });
    }
  });

  app.delete('/api/cms/gifts/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = db.deleteGiftAccount(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Rekening tidak ditemukan.' });
      }
      res.json({ success: true, message: 'Rekening berhasil dihapus.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menghapus rekening' });
    }
  });

  // 8. CMS Tab: /cms/tema (Tema Preset, Musik & WhatsApp Template)
  app.get('/api/cms/theme', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = db.getThemeData();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat pengaturan tema' });
    }
  });

  app.put('/api/cms/theme', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = db.updateThemeData(req.body);
      res.json({ success: true, message: 'Pengaturan tema & visual berhasil disimpan.', data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menyimpan tema' });
    }
  });

  // 9. CMS Tab: /cms/pengaturan (Pengaturan Umum & Akun)
  app.get('/api/cms/general', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const inv = db.getInvitationData();
      res.json({
        success: true,
        data: {
          invitationId: inv.id,
          weddingDate: inv.weddingDate,
          groomShortName: inv.groomShortName,
          brideShortName: inv.brideShortName,
          adminProfile: req.user,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat pengaturan umum' });
    }
  });

  // 9b. CMS Tab: /cms/photo-moments
  app.get('/api/cms/photo-moments', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const moments = db.getPhotoMoments();
      res.json({ success: true, data: moments, total: moments.length });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal mengambil data photo moments' });
    }
  });

  app.delete('/api/cms/photo-moments/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const success = db.deletePhotoMoment(req.params.id);
      res.json({ success, message: success ? 'Foto berhasil dihapus' : 'Foto tidak ditemukan' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal menghapus foto' });
    }
  });

  app.get('/api/cms/photo-moments/frame-config', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = db.getPhotoFrameConfig();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memuat konfigurasi frame' });
    }
  });

  app.put('/api/cms/photo-moments/frame-config', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = db.updatePhotoFrameConfig(req.body);
      res.json({ success: true, message: 'Pengaturan template frame foto berhasil diperbarui!', data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menyimpan konfigurasi frame' });
    }
  });

  // Reset Demo Data
  app.post('/api/admin/reset-default', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = db.resetToDefault();
      res.json({ success: true, message: 'Data berhasil direset ke demo default.', data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal mereset data' });
    }
  });

  // Backward-compatible admin endpoints
  app.put('/api/admin/invitation', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = db.updateInvitation(req.body);
      res.json({ success: true, message: 'Data undangan berhasil disimpan.', data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memperbarui data undangan' });
    }
  });

  app.get('/api/admin/guests', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const guests = db.getAllGuests();
      const stats = db.getRSVPStats();
      res.json({ success: true, data: guests, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal mengambil data buku tamu' });
    }
  });

  // ==========================================
  // VITE DEV MIDDLEWARE OR PRODUCTION SPA SERVING
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Wedding App Server running on http://localhost:${PORT}`);
  });
}

startServer();
