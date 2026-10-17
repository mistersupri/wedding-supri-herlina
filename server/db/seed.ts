import type { Db } from '../infrastructure/prisma.js';
import { createDemoData } from './demoData.js';
import type { LegacyData } from './legacyData.js';
import { isTemplateId } from '../../shared/templates.js';

const LEGACY_THEMES: Record<string, string> = { natural: 'sogan', gold: 'sogan', ivory: 'sogan', rose: 'jambon', sage: 'gadung' };
const THEMES = ['sogan', 'wedel', 'gadung', 'jambon'];

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const date = (v: unknown) => {
  const d = new Date(str(v));
  return Number.isNaN(d.getTime()) ? new Date() : d;
};
const key = (name: string) => name.trim().toLowerCase();

/** Replace every table's contents with `data`. Used for the demo seed, "reset to demo" and JSON import. */
export async function seedDatabase(db: Db, data: LegacyData = createDemoData()) {
  const inv = data.invitation;
  const theme = str(inv.themeColor, 'sogan');

  await db.$transaction(async (tx) => {
    await tx.photoMoment.deleteMany();
    await tx.guestWish.deleteMany();
    await tx.invitedGuest.deleteMany();
    await tx.galleryPhoto.deleteMany();
    await tx.event.deleteMany();
    await tx.loveStory.deleteMany();
    await tx.giftAccount.deleteMany();
    await tx.photoFrameSetting.deleteMany();
    await tx.invitation.deleteMany();

    await tx.invitation.create({
      data: {
        id: 'main',
        groomName: str(inv.groomName),
        groomShortName: str(inv.groomShortName),
        groomParents: str(inv.groomParents),
        groomInstagram: str(inv.groomInstagram) || null,
        groomPhoto: str(inv.groomPhoto),
        brideName: str(inv.brideName),
        brideShortName: str(inv.brideShortName),
        brideParents: str(inv.brideParents),
        brideInstagram: str(inv.brideInstagram) || null,
        bridePhoto: str(inv.bridePhoto),
        heroImage: str(inv.heroImage),
        heroVideoUrl: str(inv.heroVideoUrl) || null,
        heroMediaType: inv.heroMediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE',
        quoteText: str(inv.quoteText),
        quoteSource: str(inv.quoteSource),
        weddingDate: date(inv.weddingDate),
        countdownTarget: date(inv.countdownTarget || inv.weddingDate),
        musicUrl: str(inv.musicUrl),
        musicTitle: str(inv.musicTitle),
        whatsappNumber: str(inv.whatsappNumber),
        whatsappTemplate: str(inv.whatsappTemplate),
        templateId: isTemplateId(inv.templateId) ? inv.templateId : 'nusantara',
        themeColor: THEMES.includes(theme) ? theme : LEGACY_THEMES[theme] || 'sogan',
      },
    });

    await tx.giftAccount.createMany({
      data: (inv.giftInfo || []).map((g, i) => ({
        bankName: g.bankName,
        accountNumber: g.accountNumber || '',
        accountHolder: g.accountHolder,
        isQris: Boolean(g.isQris || g.qrisImageUrl || g.qrCodeUrl),
        qrisImageUrl: g.qrisImageUrl || g.qrCodeUrl || null,
        orderIndex: i,
      })),
    });
    await tx.loveStory.createMany({
      data: (inv.loveStories || []).map((s, i) => ({ year: s.year, title: s.title, description: s.description, photoUrl: s.photoUrl || null, orderIndex: i })),
    });
    await tx.event.createMany({
      data: (data.events || []).map(({ id: _id, ...e }) => ({ ...e, mapsEmbedUrl: e.mapsEmbedUrl || null, dressCode: e.dressCode || null, notes: e.notes || null })),
    });
    await tx.galleryPhoto.createMany({
      data: (data.gallery || []).map(({ id: _id, ...p }) => ({
        ...p,
        caption: p.caption || null,
        thumbnailUrl: p.thumbnailUrl || null,
        mediaType: p.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      })),
    });

    const seenNames = new Set<string>();
    await tx.guestWish.createMany({
      data: (data.guests || [])
        .filter((w) => !seenNames.has(key(w.guestName)) && seenNames.add(key(w.guestName)))
        .map((w) => ({
          guestName: w.guestName,
          guestKey: key(w.guestName),
          relationship: w.relationship,
          attendanceStatus: w.attendanceStatus,
          numberOfGuests: w.numberOfGuests || 1,
          message: w.message,
          voiceUrl: w.voiceUrl || null,
          reply: w.reply || null,
          isHidden: Boolean(w.isHidden),
          createdAt: date(w.createdAt),
        })),
    });
    await tx.invitedGuest.createMany({
      data: (data.invitedGuests || []).map((g) => ({
        name: g.name,
        slug: g.slug.toUpperCase(),
        phone: g.phone || '',
        instagram: g.instagram || '',
        category: g.category || 'Umum',
        pax: g.pax || 2,
        tableNumber: g.tableNumber || '',
        customNote: g.customNote || '',
        invitationSent: Boolean(g.invitationSent),
        invitationSentAt: g.invitationSentAt ? date(g.invitationSentAt) : null,
        isCheckedIn: Boolean(g.isCheckedIn),
        checkInTime: g.checkInTime ? date(g.checkInTime) : null,
        checkInMethod: g.checkInMethod || null,
        actualPax: g.actualPax ?? null,
        souvenirGiven: Boolean(g.souvenirGiven),
        createdAt: date(g.createdAt),
      })),
    });
    await tx.photoMoment.createMany({
      data: (data.photoMoments || []).map((m) => ({
        guestName: m.guestName,
        guestSlug: m.guestSlug || null,
        photoUrl: m.photoUrl,
        caption: m.caption || '',
        likesCount: m.likesCount || 0,
        reactions: m.reactions || {},
        createdAt: date(m.createdAt),
      })),
    });
    if (data.photoFrameConfig) {
      await tx.photoFrameSetting.create({ data: { id: 'main', ...data.photoFrameConfig, frameName: data.photoFrameConfig.frameName || null } });
    }
  });
}

/** First run: fill an empty database with the demo invitation. */
export async function seedIfEmpty(db: Db) {
  if ((await db.invitation.count()) === 0) {
    await seedDatabase(db);
    console.log('Database kosong: data demo undangan sudah diisi.');
  }
}

