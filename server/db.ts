import fs from 'fs';
import path from 'path';
import { hashPassword, getEnvAdminCredentials } from './auth.js';
import {
  InvitationData,
  WeddingEvent,
  GalleryPhoto,
  GuestWish,
  AdminUser,
  LoveStoryItem,
  GiftAccount,
  CMSCoupleData,
  CMSThemeData,
  CMSStatsData,
  InvitedGuest,
  PresensiStats,
  PhotoMoment,
  PhotoFrameConfig,
} from '../src/types.js';

interface StoredAdminUser extends AdminUser {
  passwordHash: string;
}

interface DatabaseSchema {
  invitation: Omit<InvitationData, 'events' | 'gallery' | 'stats'>;
  events: WeddingEvent[];
  gallery: GalleryPhoto[];
  guests: GuestWish[];
  invitedGuests: InvitedGuest[];
  admins: StoredAdminUser[];
  photoMoments?: PhotoMoment[];
  photoFrameConfig?: PhotoFrameConfig;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'wedding_data.json');

const DEFAULT_DATA: DatabaseSchema = {
  invitation: {
    id: 'inv_main_01',
    groomName: 'Arya Pradipta, S.T.',
    groomShortName: 'Arya',
    groomParents: 'Putra Pertama dari Bpk. Bambang Sutrisno & Ibu Sri Rahayu',
    groomInstagram: 'aryapradipta',
    groomPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    brideName: 'Nadhira Kirana, S.Ds.',
    brideShortName: 'Nadhira',
    brideParents: 'Putri Kedua dari Bpk. H. Hendra Wijaya & Ibu Hj. Ratna Dewi',
    brideInstagram: 'nadhirakirana',
    bridePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    weddingDate: '2026-11-20T08:00:00.000Z',
    countdownTarget: '2026-11-20T08:00:00.000Z',
    heroImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1920&q=80',
    heroVideoUrl: 'https://cdn.pixabay.com/video/2020/05/25/40131-424930060_large.mp4',
    heroMediaType: 'IMAGE',
    quoteText: 'Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.',
    quoteSource: 'QS. Ar-Rum: 21',
    musicUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=romantic-wedding-113548.mp3',
    musicTitle: 'Canon in D (Romantic Piano)',
    whatsappNumber: '6281234567890',
    whatsappTemplate: 'Halo Arya & Nadhira, Saya {nama_tamu} ingin mengonfirmasi bahwa saya {status_kehadiran} pada acara pernikahan kalian ({jumlah_tamu} orang). Pesan/Doa: {ucapan}',
    themeColor: 'natural',
    giftInfo: [
      {
        id: 'gift_1',
        bankName: 'Bank Central Asia (BCA)',
        accountNumber: '8830192811',
        accountHolder: 'Arya Pradipta',
        qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=BCA-8830192811-AryaPradipta',
      },
      {
        id: 'gift_2',
        bankName: 'Bank Mandiri',
        accountNumber: '1370019283741',
        accountHolder: 'Nadhira Kirana',
      },
    ],
    loveStories: [
      {
        id: 'story_1',
        year: '2021',
        title: 'Pertemuan Pertama di Kampus',
        description: 'Kami pertama kali bertegur sapa di perpustakaan universitas saat mengerjakan tugas akhir bersama. Berawal dari diskusi kecil hingga obrolan tanpa henti.',
        photoUrl: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 'story_2',
        year: '2023',
        title: 'Komitmen & Hubungan Serius',
        description: 'Setelah melalui suka dan duka bersama serta saling mengenal keluarga, kami memutuskan untuk melangkah ke jenjang yang lebih serius.',
        photoUrl: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 'story_3',
        year: '2025',
        title: 'Hari Lamaran (Engagement)',
        description: 'Di hadapan kedua keluarga besar, kami mengikat janji pertunangan untuk menyatukan dua keluarga dalam satu ikatan suci.',
        photoUrl: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80',
      },
    ],
  },
  events: [
    {
      id: 'event_1',
      title: 'Akad Nikah',
      date: 'Jumat, 20 November 2026',
      startTime: '08:00 WIB',
      endTime: '10:00 WIB',
      venueName: 'Masjid Agung Al-Azhar',
      address: 'Jl. Sisingamangaraja No.1, Selong, Kebayoran Baru, Jakarta Selatan',
      mapsUrl: 'https://maps.google.com/?q=Masjid+Agung+Al-Azhar+Jakarta',
      mapsEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.275466847847!2d106.79635777499042!3d-6.227370893760773!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f14e7a83d6cb%3A0xe54e58a2d1d0ee6e!2sMasjid%20Agung%20Al-Azhar!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid',
      dressCode: 'Baju Kurung / Kemeja Batik / Putih Bersih',
      notes: 'Khusus keluarga inti dan saksi akad nikah',
      orderIndex: 1,
    },
    {
      id: 'event_2',
      title: 'Resepsi Pernikahan',
      date: 'Sabtu, 21 November 2026',
      startTime: '11:00 WIB',
      endTime: '15:00 WIB',
      venueName: 'Grand Ballroom Hotel Mulia Senayan',
      address: 'Jl. Asia Afrika, Gelora, Tanah Abang, Jakarta Pusat',
      mapsUrl: 'https://maps.google.com/?q=Hotel+Mulia+Senayan+Jakarta',
      mapsEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.386001239616!2d106.79720337499033!3d-6.212711893775191!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f14bb7ea19bf%3A0x6a059dc5b4fefea3!2sHotel%20Mulia%20Senayan%20Jakarta!5e0!3m2!1sid!2sid!4v1700000000001!5m2!1sid!2sid',
      dressCode: 'Formal Attire / Pastel & Earth Tone',
      notes: 'Disediakan area photobooth & kids corner',
      orderIndex: 2,
    },
  ],
  gallery: [
    {
      id: 'gal_vid_1',
      title: 'Cinematic Teaser Prewedding',
      url: 'https://cdn.pixabay.com/video/2021/08/04/83863-584752250_large.mp4',
      caption: 'Momen romantis di pantai saat matahari terbenam',
      category: 'PREWEDDING',
      mediaType: 'VIDEO',
      orderIndex: 0,
    },
    {
      id: 'gal_1',
      title: 'Romansa Senja',
      url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
      caption: 'Senja terindah saat menatap masa depan bersama',
      category: 'PREWEDDING',
      mediaType: 'IMAGE',
      orderIndex: 1,
    },
    {
      id: 'gal_2',
      title: 'Senyuman Bahagia',
      url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80',
      caption: 'Tawa yang senantiasa menyejukkan hati',
      category: 'PREWEDDING',
      orderIndex: 2,
    },
    {
      id: 'gal_3',
      title: 'Hari Pertunangan',
      url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
      caption: 'Momen berharga saat cincin tersemat di jari',
      category: 'ENGAGEMENT',
      orderIndex: 3,
    },
    {
      id: 'gal_4',
      title: 'Langkah Bersama',
      url: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1200&q=80',
      caption: 'Berjalan beriringan menapaki babak baru kehidupan',
      category: 'MOMENTS',
      orderIndex: 4,
    },
    {
      id: 'gal_5',
      title: 'Kasih Abadi',
      url: 'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?auto=format&fit=crop&w=1200&q=80',
      caption: 'Dua hati yang dipersatukan oleh ketulusan',
      category: 'MOMENTS',
      orderIndex: 5,
    },
    {
      id: 'gal_6',
      title: 'Dekapan Hangat',
      url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80',
      caption: 'Bersama membangun mahligai rumah tangga yang sakinah',
      category: 'PREWEDDING',
      orderIndex: 6,
    },
  ],
  guests: [
    {
      id: 'guest_1',
      guestName: 'Dimas Wicaksono',
      relationship: 'Sahabat Kuliah',
      attendanceStatus: 'HADIR',
      numberOfGuests: 2,
      message: 'Selamat untuk Arya dan Nadhira! Semoga menjadi keluarga yang sakinah, mawaddah, warahmah. Lancar sampai hari H ya bro!',
      reply: 'Terima kasih banyak bro Dimas! Ditunggu kehadirannya bersama pasangan ya.',
      isHidden: false,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'guest_2',
      guestName: 'Keluarga Besar Bpk. Rahmat',
      relationship: 'Keluarga Besar',
      attendanceStatus: 'HADIR',
      numberOfGuests: 4,
      message: 'Barakallahu lakuma wa baraka alaikuma wa jamaa bainakuma fii khair. Turut berbahagia untuk kedua mempelai.',
      reply: 'Aamiin YRA. Matur suwun Om Rahmat dan keluarga.',
      isHidden: false,
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      id: 'guest_3',
      guestName: 'Clarissa Maharani',
      relationship: 'Rekan Kerja Nadhira',
      attendanceStatus: 'HADIR',
      numberOfGuests: 1,
      message: 'Nadhira cantik banget! Selamat ya cantikk, semoga langgeng selamanya dan bahagia selalu sama mas Arya.',
      reply: null,
      isHidden: false,
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
  ],
  invitedGuests: [
    {
      id: 'inv_gst_1',
      name: 'Bpk. H. Rahmat & Ibu Hj. Siti',
      slug: 'R7K2',
      phone: '6281234567801',
      category: 'VIP',
      pax: 2,
      tableNumber: 'VIP A-01',
      customNote: 'Keluarga sesepuh mempelai pria',
      isCheckedIn: false,
      checkInTime: null,
      checkInMethod: null,
      actualPax: null,
      souvenirGiven: false,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: 'inv_gst_2',
      name: 'Dr. Budi Santoso & Partner',
      slug: 'B4S8',
      phone: '6281234567802',
      category: 'VIP',
      pax: 2,
      tableNumber: 'VIP B-02',
      customNote: 'Dosen Pembimbing & Rekan Kerja',
      isCheckedIn: false,
      checkInTime: null,
      checkInMethod: null,
      actualPax: null,
      souvenirGiven: false,
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
    {
      id: 'inv_gst_3',
      name: 'Sarah Amelia, S.Ds.',
      slug: 'S9A1',
      phone: '6281234567803',
      category: 'Sahabat',
      pax: 2,
      tableNumber: 'Meja 03',
      customNote: 'Sahabat SMA Nadhira',
      isCheckedIn: false,
      checkInTime: null,
      checkInMethod: null,
      actualPax: null,
      souvenirGiven: false,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'inv_gst_4',
      name: 'Dimas Pratama & Istri',
      slug: 'D2P6',
      phone: '6281234567804',
      category: 'Rekan Kerja',
      pax: 2,
      tableNumber: 'Meja 05',
      customNote: 'Tim Engineering',
      isCheckedIn: false,
      checkInTime: null,
      checkInMethod: null,
      actualPax: null,
      souvenirGiven: false,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'inv_gst_5',
      name: 'Anissa Rahmawati',
      slug: 'A8R3',
      phone: '6281234567805',
      category: 'Sahabat',
      pax: 1,
      tableNumber: 'Meja 04',
      customNote: 'Bridesmaid',
      isCheckedIn: false,
      checkInTime: null,
      checkInMethod: null,
      actualPax: null,
      souvenirGiven: false,
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
  ],
  admins: [
    {
      id: 'adm_1',
      username: 'admin',
      email: 'admin@wedding.com',
      name: 'Super Admin Pengantin',
      passwordHash: hashPassword('admin123'),
      role: 'SUPERADMIN',
      createdAt: new Date().toISOString(),
    },
  ],
  photoMoments: [],
};

class WeddingDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
    this.ensureEnvAdminExists();
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_DATA,
          ...parsed,
          invitation: { ...DEFAULT_DATA.invitation, ...parsed.invitation },
          invitedGuests: parsed.invitedGuests && parsed.invitedGuests.length > 0 ? parsed.invitedGuests : DEFAULT_DATA.invitedGuests,
          photoMoments: Array.isArray(parsed.photoMoments) ? parsed.photoMoments : [],
        };
      }
    } catch (err) {
      console.error('Error loading database file, using fallback defaults:', err);
    }
    this.saveData(DEFAULT_DATA);
    return DEFAULT_DATA;
  }

  private saveData(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database file:', err);
    }
  }

  private ensureEnvAdminExists() {
    const envCreds = getEnvAdminCredentials();
    const existing = this.data.admins.find(
      (a) => a.username.toLowerCase() === envCreds.username.toLowerCase()
    );
    if (!existing) {
      this.data.admins.unshift({
        id: 'adm_env_01',
        username: envCreds.username,
        email: `${envCreds.username}@wedding.com`,
        name: 'Admin Utama (Env)',
        passwordHash: hashPassword(envCreds.password),
        role: 'SUPERADMIN',
        createdAt: new Date().toISOString(),
      });
      this.saveData(this.data);
    }
  }

  // --- Full Invitation Data ---
  public getInvitationData(): InvitationData {
    const stats = this.getRSVPStats();
    return {
      ...this.data.invitation,
      events: [...this.data.events].sort((a, b) => a.orderIndex - b.orderIndex),
      gallery: [...this.data.gallery].sort((a, b) => a.orderIndex - b.orderIndex),
      stats,
    };
  }

  public updateInvitation(updated: Partial<InvitationData>): InvitationData {
    this.data.invitation = {
      ...this.data.invitation,
      ...updated,
    };
    this.saveData(this.data);
    return this.getInvitationData();
  }

  // --- Granular CMS & Public Data Slices ---

  // 1. Couple & Quote (for /cms/mempelai & couple section)
  public getCoupleData(): CMSCoupleData {
    const inv = this.data.invitation;
    return {
      groomName: inv.groomName,
      groomShortName: inv.groomShortName,
      groomParents: inv.groomParents,
      groomInstagram: inv.groomInstagram,
      groomPhoto: inv.groomPhoto,
      brideName: inv.brideName,
      brideShortName: inv.brideShortName,
      brideParents: inv.brideParents,
      brideInstagram: inv.brideInstagram,
      bridePhoto: inv.bridePhoto,
      heroImage: inv.heroImage,
      heroVideoUrl: inv.heroVideoUrl,
      heroMediaType: inv.heroMediaType,
      quoteText: inv.quoteText,
      quoteSource: inv.quoteSource,
    };
  }

  public updateCoupleData(updates: Partial<CMSCoupleData>): CMSCoupleData {
    this.data.invitation = {
      ...this.data.invitation,
      ...updates,
    };
    this.saveData(this.data);
    return this.getCoupleData();
  }

  // 2. Theme & Visual Settings (for /cms/tema)
  public getThemeData(): CMSThemeData {
    const inv = this.data.invitation;
    return {
      themeColor: inv.themeColor,
      musicUrl: inv.musicUrl,
      musicTitle: inv.musicTitle,
      weddingDate: inv.weddingDate,
      countdownTarget: inv.countdownTarget,
      whatsappNumber: inv.whatsappNumber,
      whatsappTemplate: inv.whatsappTemplate,
    };
  }

  public updateThemeData(updates: Partial<CMSThemeData>): CMSThemeData {
    this.data.invitation = {
      ...this.data.invitation,
      ...updates,
    };
    this.saveData(this.data);
    return this.getThemeData();
  }

  // 3. Stats & Overview (for /cms/overview)
  public getCMSStats(): CMSStatsData {
    const stats = this.getRSVPStats();
    const counts = {
      eventsCount: this.data.events.length,
      galleryCount: this.data.gallery.length,
      storiesCount: this.data.invitation.loveStories.length,
      giftsCount: this.data.invitation.giftInfo.length,
    };
    const recentGuests = this.data.guests.slice(0, 5);
    return { stats, counts, recentGuests };
  }

  // 4. Events Operations (for /cms/acara)
  public getEvents(): WeddingEvent[] {
    return [...this.data.events].sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public createEvent(event: Omit<WeddingEvent, 'id'>): WeddingEvent {
    const newEvent: WeddingEvent = {
      ...event,
      id: `event_${Date.now()}`,
      orderIndex: event.orderIndex || this.data.events.length + 1,
    };
    this.data.events.push(newEvent);
    this.saveData(this.data);
    return newEvent;
  }

  public updateEvent(id: string, eventUpdate: Partial<WeddingEvent>): WeddingEvent | null {
    const idx = this.data.events.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    this.data.events[idx] = { ...this.data.events[idx], ...eventUpdate };
    this.saveData(this.data);
    return this.data.events[idx];
  }

  public deleteEvent(id: string): boolean {
    const beforeLen = this.data.events.length;
    this.data.events = this.data.events.filter((e) => e.id !== id);
    if (this.data.events.length !== beforeLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // 5. Love Story Operations (for /cms/cerita)
  public getLoveStories(): LoveStoryItem[] {
    return [...(this.data.invitation.loveStories || [])];
  }

  public createLoveStory(story: Omit<LoveStoryItem, 'id'>): LoveStoryItem {
    const newStory: LoveStoryItem = {
      ...story,
      id: `story_${Date.now()}`,
    };
    if (!this.data.invitation.loveStories) {
      this.data.invitation.loveStories = [];
    }
    this.data.invitation.loveStories.push(newStory);
    this.saveData(this.data);
    return newStory;
  }

  public updateLoveStory(id: string, update: Partial<LoveStoryItem>): LoveStoryItem | null {
    if (!this.data.invitation.loveStories) return null;
    const idx = this.data.invitation.loveStories.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.data.invitation.loveStories[idx] = { ...this.data.invitation.loveStories[idx], ...update };
    this.saveData(this.data);
    return this.data.invitation.loveStories[idx];
  }

  public deleteLoveStory(id: string): boolean {
    if (!this.data.invitation.loveStories) return false;
    const beforeLen = this.data.invitation.loveStories.length;
    this.data.invitation.loveStories = this.data.invitation.loveStories.filter((s) => s.id !== id);
    if (this.data.invitation.loveStories.length !== beforeLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // 6. Gift Accounts Operations (for /cms/kado)
  public getGiftAccounts(): GiftAccount[] {
    return [...(this.data.invitation.giftInfo || [])];
  }

  public createGiftAccount(gift: Omit<GiftAccount, 'id'>): GiftAccount {
    const newGift: GiftAccount = {
      ...gift,
      id: `gift_${Date.now()}`,
    };
    if (!this.data.invitation.giftInfo) {
      this.data.invitation.giftInfo = [];
    }
    this.data.invitation.giftInfo.push(newGift);
    this.saveData(this.data);
    return newGift;
  }

  public updateGiftAccount(id: string, update: Partial<GiftAccount>): GiftAccount | null {
    if (!this.data.invitation.giftInfo) return null;
    const idx = this.data.invitation.giftInfo.findIndex((g) => g.id === id);
    if (idx === -1) return null;
    this.data.invitation.giftInfo[idx] = { ...this.data.invitation.giftInfo[idx], ...update };
    this.saveData(this.data);
    return this.data.invitation.giftInfo[idx];
  }

  public deleteGiftAccount(id: string): boolean {
    if (!this.data.invitation.giftInfo) return false;
    const beforeLen = this.data.invitation.giftInfo.length;
    this.data.invitation.giftInfo = this.data.invitation.giftInfo.filter((g) => g.id !== id);
    if (this.data.invitation.giftInfo.length !== beforeLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // 7. Gallery Operations (for /cms/galeri)
  public getGallery(): GalleryPhoto[] {
    return [...this.data.gallery].sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public createGalleryPhoto(photo: Omit<GalleryPhoto, 'id'>): GalleryPhoto {
    const newPhoto: GalleryPhoto = {
      ...photo,
      id: `gal_${Date.now()}`,
      orderIndex: photo.orderIndex || this.data.gallery.length + 1,
    };
    this.data.gallery.push(newPhoto);
    this.saveData(this.data);
    return newPhoto;
  }

  public createBatchGalleryPhotos(photos: Omit<GalleryPhoto, 'id'>[]): GalleryPhoto[] {
    const currentMax = this.data.gallery.length;
    const created: GalleryPhoto[] = photos.map((p, idx) => ({
      ...p,
      id: `gal_${Date.now()}_${idx}`,
      orderIndex: p.orderIndex || currentMax + idx + 1,
    }));
    this.data.gallery.push(...created);
    this.saveData(this.data);
    return created;
  }

  public updateGalleryPhoto(id: string, photoUpdate: Partial<GalleryPhoto>): GalleryPhoto | null {
    const idx = this.data.gallery.findIndex((g) => g.id === id);
    if (idx === -1) return null;
    this.data.gallery[idx] = { ...this.data.gallery[idx], ...photoUpdate };
    this.saveData(this.data);
    return this.data.gallery[idx];
  }

  public deleteGalleryPhoto(id: string): boolean {
    const beforeLen = this.data.gallery.length;
    this.data.gallery = this.data.gallery.filter((g) => g.id !== id);
    if (this.data.gallery.length !== beforeLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // 8. Guests & RSVP Operations (for /cms/tamu & public guestbook)
  public getPublicGuests(): GuestWish[] {
    return this.data.guests
      .filter((g) => !g.isHidden)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getAllGuests(filterStatus?: string, search?: string): GuestWish[] {
    let list = [...this.data.guests].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (filterStatus && filterStatus !== 'ALL') {
      list = list.filter((g) => g.attendanceStatus === filterStatus);
    }

    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (g) =>
          g.guestName.toLowerCase().includes(q) ||
          g.message.toLowerCase().includes(q) ||
          g.relationship.toLowerCase().includes(q)
      );
    }

    return list;
  }

  public addGuestWish(payload: Omit<GuestWish, 'id' | 'createdAt' | 'isHidden' | 'reply'>): GuestWish {
    const existingIdx = this.data.guests.findIndex(
      (g) => g.guestName.toLowerCase().trim() === payload.guestName.toLowerCase().trim()
    );
    if (existingIdx !== -1) {
      const existing = this.data.guests[existingIdx];
      this.data.guests[existingIdx] = {
        ...existing,
        attendanceStatus: payload.attendanceStatus,
        numberOfGuests: Number(payload.numberOfGuests) || 1,
        message: payload.message ? payload.message : existing.message,
        voiceUrl: payload.voiceUrl !== undefined ? payload.voiceUrl : existing.voiceUrl,
      };
      this.saveData(this.data);
      return this.data.guests[existingIdx];
    }

    const newGuest: GuestWish = {
      ...payload,
      id: `guest_${Date.now()}`,
      numberOfGuests: Number(payload.numberOfGuests) || 1,
      reply: null,
      isHidden: false,
      createdAt: new Date().toISOString(),
    };
    this.data.guests.unshift(newGuest);
    this.saveData(this.data);
    return newGuest;
  }

  public replyToGuest(id: string, replyMessage: string): GuestWish | null {
    const idx = this.data.guests.findIndex((g) => g.id === id);
    if (idx === -1) return null;
    this.data.guests[idx].reply = replyMessage;
    this.saveData(this.data);
    return this.data.guests[idx];
  }

  public toggleGuestVisibility(id: string): GuestWish | null {
    const idx = this.data.guests.findIndex((g) => g.id === id);
    if (idx === -1) return null;
    this.data.guests[idx].isHidden = !this.data.guests[idx].isHidden;
    this.saveData(this.data);
    return this.data.guests[idx];
  }

  public deleteGuest(id: string): boolean {
    const beforeLen = this.data.guests.length;
    this.data.guests = this.data.guests.filter((g) => g.id !== id);
    if (this.data.guests.length !== beforeLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public getRSVPStats() {
    const totalWishes = this.data.guests.length;
    let attendingCount = 0;
    let declinedCount = 0;
    let tentativeCount = 0;
    let totalGuestSeats = 0;

    for (const g of this.data.guests) {
      if (g.attendanceStatus === 'HADIR') {
        attendingCount++;
        totalGuestSeats += g.numberOfGuests || 1;
      } else if (g.attendanceStatus === 'TIDAK_HADIR') {
        declinedCount++;
      } else {
        tentativeCount++;
      }
    }

    return {
      totalWishes,
      attendingCount,
      declinedCount,
      tentativeCount,
      totalGuestSeats,
    };
  }

  // --- Invited Guests Management & Presensi (Slug 4-Char & Check-in) ---

  /**
   * Helper to generate a unique 4-character uppercase alphanumeric code
   */
  public generateUniqueSlug(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const maxAttempts = 1000;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let result = '';
      for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      // Check collision
      const exists = this.data.invitedGuests.some(
        (g) => g.slug.toUpperCase() === result.toUpperCase()
      );
      if (!exists) {
        return result;
      }
    }
    // Fallback if full
    return Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  public getAllInvitedGuests(filter?: string, search?: string): InvitedGuest[] {
    let result = [...this.data.invitedGuests];

    if (filter && filter !== 'ALL') {
      if (filter === 'CHECKED_IN') {
        result = result.filter((g) => g.isCheckedIn);
      } else if (filter === 'NOT_CHECKED_IN') {
        result = result.filter((g) => !g.isCheckedIn);
      } else {
        result = result.filter(
          (g) => g.category.toLowerCase() === filter.toLowerCase()
        );
      }
    }

    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.slug.toLowerCase().includes(q) ||
          (g.phone && g.phone.includes(q)) ||
          (g.tableNumber && g.tableNumber.toLowerCase().includes(q)) ||
          g.category.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => {
      // Checked in at the bottom or sorted by name
      if (a.isCheckedIn !== b.isCheckedIn) {
        return a.isCheckedIn ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  public findInvitedGuestBySlug(slug: string): InvitedGuest | null {
    if (!slug) return null;
    const cleanSlug = slug.trim().toUpperCase();
    return (
      this.data.invitedGuests.find(
        (g) => g.slug.toUpperCase() === cleanSlug
      ) || null
    );
  }

  public findInvitedGuestById(id: string): InvitedGuest | null {
    return this.data.invitedGuests.find((g) => g.id === id) || null;
  }

  public createInvitedGuest(payload: {
    name: string;
    slug?: string;
    phone?: string;
    instagram?: string;
    category?: string;
    pax?: number;
    tableNumber?: string;
    customNote?: string;
    invitationSent?: boolean;
  }): InvitedGuest {
    let slug = payload.slug ? payload.slug.trim().toUpperCase() : '';
    if (!slug || slug.length !== 4 || this.findInvitedGuestBySlug(slug)) {
      slug = this.generateUniqueSlug();
    }

    const newGuest: InvitedGuest = {
      id: `inv_gst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: payload.name.trim(),
      slug,
      phone: payload.phone?.trim() || '',
      instagram: payload.instagram?.trim() || '',
      category: payload.category || 'Umum',
      pax: Number(payload.pax) || 2,
      tableNumber: payload.tableNumber?.trim() || '',
      customNote: payload.customNote?.trim() || '',
      invitationSent: Boolean(payload.invitationSent),
      invitationSentAt: payload.invitationSent ? new Date().toISOString() : null,
      isCheckedIn: false,
      checkInTime: null,
      checkInMethod: null,
      actualPax: null,
      souvenirGiven: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.invitedGuests.push(newGuest);
    this.saveData(this.data);
    return newGuest;
  }

  public createBatchInvitedGuests(
    guestsList: Array<{
      name: string;
      category?: string;
      pax?: number;
      phone?: string;
      instagram?: string;
      tableNumber?: string;
      customNote?: string;
      invitationSent?: boolean;
    }>
  ): InvitedGuest[] {
    const createdList: InvitedGuest[] = [];
    const now = new Date().toISOString();

    for (const item of guestsList) {
      if (!item.name || !item.name.trim()) continue;
      const slug = this.generateUniqueSlug();
      const guest: InvitedGuest = {
        id: `inv_gst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: item.name.trim(),
        slug,
        phone: item.phone?.trim() || '',
        instagram: item.instagram?.trim() || '',
        category: item.category || 'Umum',
        pax: Number(item.pax) || 2,
        tableNumber: item.tableNumber?.trim() || '',
        customNote: item.customNote?.trim() || '',
        invitationSent: Boolean(item.invitationSent),
        invitationSentAt: item.invitationSent ? now : null,
        isCheckedIn: false,
        checkInTime: null,
        checkInMethod: null,
        actualPax: null,
        souvenirGiven: false,
        createdAt: now,
        updatedAt: now,
      };
      this.data.invitedGuests.push(guest);
      createdList.push(guest);
    }

    this.saveData(this.data);
    return createdList;
  }

  public updateInvitedGuest(
    id: string,
    payload: Partial<InvitedGuest>
  ): InvitedGuest | null {
    const idx = this.data.invitedGuests.findIndex((g) => g.id === id);
    if (idx === -1) return null;

    // If slug is changed, ensure uniqueness
    if (payload.slug && payload.slug.toUpperCase() !== this.data.invitedGuests[idx].slug.toUpperCase()) {
      const existing = this.findInvitedGuestBySlug(payload.slug);
      if (existing && existing.id !== id) {
        throw new Error(`Slug ${payload.slug} sudah digunakan oleh tamu lain.`);
      }
      payload.slug = payload.slug.toUpperCase();
    }

    if (payload.invitationSent !== undefined) {
      if (payload.invitationSent && !this.data.invitedGuests[idx].invitationSent) {
        payload.invitationSentAt = new Date().toISOString();
      } else if (!payload.invitationSent) {
        payload.invitationSentAt = null;
      }
    }

    this.data.invitedGuests[idx] = {
      ...this.data.invitedGuests[idx],
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    this.saveData(this.data);
    return this.data.invitedGuests[idx];
  }

  public batchUpdateInvitationSent(
    ids: string[],
    sentStatus: boolean
  ): { updatedCount: number } {
    const now = new Date().toISOString();
    let count = 0;

    this.data.invitedGuests = this.data.invitedGuests.map((g) => {
      if (ids.includes(g.id)) {
        count++;
        return {
          ...g,
          invitationSent: sentStatus,
          invitationSentAt: sentStatus ? (g.invitationSentAt || now) : null,
          updatedAt: now,
        };
      }
      return g;
    });

    if (count > 0) {
      this.saveData(this.data);
    }
    return { updatedCount: count };
  }

  public deleteInvitedGuest(id: string): boolean {
    const beforeLen = this.data.invitedGuests.length;
    this.data.invitedGuests = this.data.invitedGuests.filter((g) => g.id !== id);
    if (this.data.invitedGuests.length !== beforeLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public checkInGuest(
    identifier: { id?: string; slug?: string; nameQuery?: string },
    options: {
      actualPax?: number;
      souvenirGiven?: boolean;
      method?: 'QR_SCAN' | 'MANUAL';
    } = {}
  ): { success: boolean; guest?: InvitedGuest; message?: string; alreadyCheckedIn?: boolean } {
    let guest: InvitedGuest | null = null;

    if (identifier.id) {
      guest = this.findInvitedGuestById(identifier.id);
    } else if (identifier.slug) {
      guest = this.findInvitedGuestBySlug(identifier.slug);
    } else if (identifier.nameQuery) {
      const q = identifier.nameQuery.toLowerCase().trim();
      guest =
        this.data.invitedGuests.find(
          (g) => g.name.toLowerCase().trim() === q
        ) ||
        this.data.invitedGuests.find(
          (g) => g.name.toLowerCase().includes(q)
        ) || null;
    }

    if (!guest) {
      return {
        success: false,
        message: 'Tamu undangan tidak ditemukan dalam daftar terdaftar.',
      };
    }

    const idx = this.data.invitedGuests.findIndex((g) => g.id === guest!.id);
    const wasAlreadyCheckedIn = this.data.invitedGuests[idx].isCheckedIn;

    this.data.invitedGuests[idx] = {
      ...this.data.invitedGuests[idx],
      isCheckedIn: true,
      checkInTime: this.data.invitedGuests[idx].checkInTime || new Date().toISOString(),
      checkInMethod: options.method || (identifier.slug ? 'QR_SCAN' : 'MANUAL'),
      actualPax: options.actualPax !== undefined ? Number(options.actualPax) : (this.data.invitedGuests[idx].actualPax || this.data.invitedGuests[idx].pax),
      souvenirGiven: options.souvenirGiven !== undefined ? options.souvenirGiven : true,
      updatedAt: new Date().toISOString(),
    };

    this.saveData(this.data);
    return {
      success: true,
      guest: this.data.invitedGuests[idx],
      alreadyCheckedIn: wasAlreadyCheckedIn,
      message: wasAlreadyCheckedIn
        ? `Tamu ${guest.name} sudah tercatat presensi sebelumnya.`
        : `Presensi ${guest.name} berhasil dicatat!`,
    };
  }

  public undoCheckIn(id: string): { success: boolean; guest?: InvitedGuest; message?: string } {
    const idx = this.data.invitedGuests.findIndex((g) => g.id === id);
    if (idx === -1) {
      return { success: false, message: 'Tamu tidak ditemukan.' };
    }

    this.data.invitedGuests[idx] = {
      ...this.data.invitedGuests[idx],
      isCheckedIn: false,
      checkInTime: null,
      checkInMethod: null,
      actualPax: null,
      souvenirGiven: false,
      updatedAt: new Date().toISOString(),
    };

    this.saveData(this.data);
    return {
      success: true,
      guest: this.data.invitedGuests[idx],
      message: 'Status presensi tamu berhasil dibatalkan.',
    };
  }

  public getPresensiStats(): PresensiStats {
    const guests = this.data.invitedGuests;
    const totalInvited = guests.length;
    let totalPaxAllocated = 0;
    let totalCheckedIn = 0;
    let totalActualPax = 0;
    let totalSouvenirsGiven = 0;

    for (const g of guests) {
      totalPaxAllocated += g.pax || 1;
      if (g.isCheckedIn) {
        totalCheckedIn++;
        totalActualPax += g.actualPax || g.pax || 1;
        if (g.souvenirGiven) {
          totalSouvenirsGiven++;
        }
      }
    }

    return {
      totalInvited,
      totalPaxAllocated,
      totalCheckedIn,
      totalActualPax,
      totalRemaining: Math.max(0, totalInvited - totalCheckedIn),
      totalSouvenirsGiven,
    };
  }

  // --- Admin User Operations ---
  public findAdminByUsername(username: string): StoredAdminUser | null {
    return this.data.admins.find((a) => a.username.toLowerCase() === username.toLowerCase()) || null;
  }

  public findAdminById(id: string): StoredAdminUser | null {
    return this.data.admins.find((a) => a.id === id) || null;
  }

  public getAdminsList(): AdminUser[] {
    return this.data.admins.map(({ passwordHash, ...safeUser }) => safeUser);
  }

  public createAdmin(admin: { username: string; email: string; name: string; password: string; role?: 'SUPERADMIN' | 'ADMIN' }): AdminUser {
    const newAdmin: StoredAdminUser = {
      id: `adm_${Date.now()}`,
      username: admin.username,
      email: admin.email,
      name: admin.name,
      passwordHash: hashPassword(admin.password),
      role: admin.role || 'ADMIN',
      createdAt: new Date().toISOString(),
    };
    this.data.admins.push(newAdmin);
    this.saveData(this.data);
    const { passwordHash, ...safe } = newAdmin;
    return safe;
  }

  public updateAdminPassword(id: string, newPasswordHash: string): boolean {
    const admin = this.data.admins.find((a) => a.id === id);
    if (!admin) return false;
    admin.passwordHash = newPasswordHash;
    this.saveData(this.data);
    return true;
  }

  public deleteAdmin(id: string): boolean {
    if (this.data.admins.length <= 1) {
      return false; // Prevent deleting the only admin
    }
    const beforeLen = this.data.admins.length;
    this.data.admins = this.data.admins.filter((a) => a.id !== id);
    if (this.data.admins.length !== beforeLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // --- Photo Moments Operations ---
  public getPhotoMoments(): PhotoMoment[] {
    return this.data.photoMoments || [];
  }

  public getGuestPhotoCount(guestName: string, guestSlug?: string): number {
    let resolvedSlug = guestSlug ? guestSlug.trim().toUpperCase() : undefined;
    if (!resolvedSlug && guestName) {
      const nameNorm = guestName.toLowerCase().trim();
      if (nameNorm && nameNorm !== 'tamu undangan') {
        const matched = (this.data.invitedGuests || []).find(
          (g) => g.name.trim().toLowerCase() === nameNorm
        );
        if (matched?.slug) {
          resolvedSlug = matched.slug.trim().toUpperCase();
        }
      }
    }

    if (resolvedSlug) {
      return (this.data.photoMoments || []).filter(
        (p) => p.guestSlug && p.guestSlug.toUpperCase().trim() === resolvedSlug
      ).length;
    }
    if (!guestName) return 0;
    const nameNorm = guestName.toLowerCase().trim();
    if (nameNorm === 'tamu undangan') return 0;
    return (this.data.photoMoments || []).filter(
      (p) => p.guestName.toLowerCase().trim() === nameNorm
    ).length;
  }

  public addPhotoMoment(payload: { guestName: string; guestSlug?: string; photoUrl: string; caption?: string }): { success: boolean; photo?: PhotoMoment; message?: string } {
    if (!this.data.photoMoments) {
      this.data.photoMoments = [];
    }

    let finalSlug = payload.guestSlug ? payload.guestSlug.trim().toUpperCase() : undefined;
    if (!finalSlug && payload.guestName) {
      const cleanName = payload.guestName.trim().toLowerCase();
      if (cleanName && cleanName !== 'tamu undangan') {
        const matchedGuest = (this.data.invitedGuests || []).find(
          (g) => g.name.trim().toLowerCase() === cleanName
        );
        if (matchedGuest?.slug) {
          finalSlug = matchedGuest.slug.trim().toUpperCase();
        }
      }
    }

    const currentCount = this.getGuestPhotoCount(payload.guestName, finalSlug);
    if (currentCount >= 3) {
      return {
        success: false,
        message: 'Batas maksimal 3 foto per tamu telah tercapai.',
      };
    }

    const newPhoto: PhotoMoment = {
      id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      guestName: payload.guestName?.trim() || 'Tamu Undangan',
      guestSlug: finalSlug,
      photoUrl: payload.photoUrl,
      caption: payload.caption?.trim() || '',
      createdAt: new Date().toISOString(),
      likesCount: 0,
    };

    this.data.photoMoments.unshift(newPhoto);
    this.saveData(this.data);
    return {
      success: true,
      photo: newPhoto,
    };
  }

  public reactPhotoMoment(
    id: string,
    emoji: string = '❤️',
    action: 'add' | 'remove' = 'add'
  ): { success: boolean; likesCount: number; reactions: Record<string, number> } {
    if (!this.data.photoMoments) this.data.photoMoments = [];
    const photo = this.data.photoMoments.find((p) => p.id === id);
    if (photo) {
      if (!photo.reactions) photo.reactions = {};
      const currentEmojiCount = photo.reactions[emoji] || 0;

      if (action === 'add') {
        photo.reactions[emoji] = currentEmojiCount + 1;
        photo.likesCount = (photo.likesCount || 0) + 1;
      } else if (action === 'remove') {
        photo.reactions[emoji] = Math.max(0, currentEmojiCount - 1);
        if (photo.reactions[emoji] === 0) {
          delete photo.reactions[emoji];
        }
        photo.likesCount = Math.max(0, (photo.likesCount || 0) - 1);
      }

      this.saveData(this.data);
      return { success: true, likesCount: photo.likesCount || 0, reactions: photo.reactions };
    }
    return { success: false, likesCount: 0, reactions: {} };
  }

  public deletePhotoMoment(id: string): { success: boolean; message?: string } {
    if (!this.data.photoMoments) this.data.photoMoments = [];
    const index = this.data.photoMoments.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.data.photoMoments.splice(index, 1);
      this.saveData(this.data);
      return { success: true };
    }
    return { success: false, message: 'Foto tidak ditemukan.' };
  }

  public likePhotoMoment(id: string, action: 'add' | 'remove' = 'add'): { success: boolean; likesCount: number } {
    const res = this.reactPhotoMoment(id, '❤️', action);
    return { success: res.success, likesCount: res.likesCount };
  }

  public getPhotoFrameConfig(): PhotoFrameConfig {
    if (!this.data.photoFrameConfig) {
      const defaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000"><rect x="20" y="20" width="760" height="960" fill="none" stroke="#d97706" stroke-width="4" rx="16"/><rect x="30" y="30" width="740" height="940" fill="none" stroke="#f59e0b" stroke-width="2" rx="12"/><path d="M 30 90 L 90 30 M 30 110 L 110 30 M 40 40 L 120 40 L 40 120 Z" fill="none" stroke="#d97706" stroke-width="2"/><circle cx="60" cy="60" r="8" fill="#f59e0b"/><path d="M 770 90 L 710 30 M 770 110 L 690 30 M 760 40 L 680 40 L 760 120 Z" fill="none" stroke="#d97706" stroke-width="2"/><circle cx="740" cy="60" r="8" fill="#f59e0b"/><path d="M 30 910 L 90 970 M 30 890 L 110 970 M 40 960 L 120 960 L 40 880 Z" fill="none" stroke="#d97706" stroke-width="2"/><circle cx="60" cy="940" r="8" fill="#f59e0b"/><path d="M 770 910 L 710 970 M 770 890 L 690 970 M 760 960 L 680 960 L 760 880 Z" fill="none" stroke="#d97706" stroke-width="2"/><circle cx="740" cy="940" r="8" fill="#f59e0b"/><rect x="150" y="900" width="500" height="60" rx="15" fill="#1c1917" opacity="0.88" stroke="#f59e0b" stroke-width="2"/><text x="400" y="938" font-family="'Playfair Display', serif, sans-serif" font-size="24" font-weight="bold" fill="#fbbf24" text-anchor="middle">Arya &amp; Nadhira Wedding</text></svg>`;
      const defaultUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(defaultSvg);
      this.data.photoFrameConfig = {
        enabled: true,
        frameOverlayUrl: defaultUrl,
        frameName: 'Gold Elegance Wedding Frame',
        allowGuestToggle: true,
      };
      this.saveData(this.data);
    }
    return this.data.photoFrameConfig;
  }

  public updatePhotoFrameConfig(payload: Partial<PhotoFrameConfig>): PhotoFrameConfig {
    const current = this.getPhotoFrameConfig();
    this.data.photoFrameConfig = {
      ...current,
      ...payload,
    };
    this.saveData(this.data);
    return this.data.photoFrameConfig;
  }

  public resetToDefault() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.ensureEnvAdminExists();
    this.saveData(this.data);
    return this.getInvitationData();
  }
}

export const db = new WeddingDatabase();
