import type { Db, Prisma } from '../infrastructure/prisma.js';
import type {
  AdminUser,
  AttendanceSettings,
  AttendanceStatus,
  CameraSettings,
  GuestWish,
  InvitedGuest,
  PhotoComment,
  PhotoFrameConfig,
  PhotoMoment,
} from '../../shared/types.js';

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const isNotFound = (err: unknown) => (err as { code?: string })?.code === 'P2025';
async function orNull<T>(op: Promise<T>): Promise<T | null> {
  try {
    return await op;
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export const guestKey = (name: string) => name.trim().toLowerCase();
/** Wish identity of an invited guest. */
export const wishKeyFor = (slug: string) => `code:${slug.trim().toUpperCase()}`;

// --- Guestbook wishes ---

type WishRow = Awaited<ReturnType<Db['guestWish']['create']>>;
const toWish = ({ guestKey: _k, guestSlug: _s, ...r }: WishRow): GuestWish => ({
  ...r,
  attendanceStatus: r.attendanceStatus as AttendanceStatus,
  createdAt: r.createdAt.toISOString(),
});

export function wishRepository(db: Db) {
  return {
    async list(filter: { status?: AttendanceStatus; search?: string; includeHidden: boolean }): Promise<GuestWish[]> {
      const q = filter.search?.trim();
      const rows = await db.guestWish.findMany({
        where: {
          ...(filter.includeHidden ? {} : { isHidden: false }),
          ...(filter.status ? { attendanceStatus: filter.status } : {}),
          ...(q
            ? {
                OR: [
                  { guestName: { contains: q, mode: 'insensitive' } },
                  { message: { contains: q, mode: 'insensitive' } },
                  { relationship: { contains: q, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map(toWish);
    },

    /** RSVP answer of every invited guest who has written, by invitation code. */
    async statusBySlug(): Promise<Map<string, AttendanceStatus>> {
      const rows = await db.guestWish.findMany({ where: { guestSlug: { not: null } }, select: { guestSlug: true, attendanceStatus: true } });
      return new Map(rows.map((r) => [r.guestSlug!.toUpperCase(), r.attendanceStatus as AttendanceStatus]));
    },

    async recent(take: number) {
      return (await db.guestWish.findMany({ orderBy: { createdAt: 'desc' }, take })).map(toWish);
    },

    async findBySlug(slug: string): Promise<GuestWish | null> {
      const row = await db.guestWish.findUnique({ where: { guestKey: wishKeyFor(slug) } });
      return row ? toWish(row) : null;
    },

    /** One wish per invitation code: a second submission updates the attendance (and message, if given). */
    async upsert(input: Omit<GuestWish, 'id' | 'createdAt' | 'isHidden' | 'reply'>, slug: string): Promise<GuestWish> {
      const key = wishKeyFor(slug);
      const row = await db.guestWish.upsert({
        where: { guestKey: key },
        create: { ...input, voiceUrl: input.voiceUrl ?? null, guestKey: key, guestSlug: slug },
        update: {
          attendanceStatus: input.attendanceStatus,
          numberOfGuests: input.numberOfGuests,
          ...(input.message ? { message: input.message } : {}),
          ...(input.voiceUrl !== undefined ? { voiceUrl: input.voiceUrl } : {}),
        },
      });
      return toWish(row);
    },

    async setReply(id: string, reply: string) {
      return orNull(db.guestWish.update({ where: { id }, data: { reply: reply || null } }).then(toWish));
    },

    async toggleHidden(id: string) {
      const row = await db.guestWish.findUnique({ where: { id } });
      if (!row) return null;
      return toWish(await db.guestWish.update({ where: { id }, data: { isHidden: !row.isHidden } }));
    },

    async remove(id: string) {
      return (await orNull(db.guestWish.delete({ where: { id } }))) !== null;
    },

    async stats() {
      const groups = await db.guestWish.groupBy({ by: ['attendanceStatus'], _count: { _all: true }, _sum: { numberOfGuests: true } });
      const of = (s: AttendanceStatus) => groups.find((g) => g.attendanceStatus === s);
      const attending = of('HADIR');
      return {
        totalWishes: groups.reduce((n, g) => n + g._count._all, 0),
        attendingCount: attending?._count._all ?? 0,
        declinedCount: of('TIDAK_HADIR')?._count._all ?? 0,
        tentativeCount: of('RAGU')?._count._all ?? 0,
        totalGuestSeats: attending?._sum.numberOfGuests ?? 0,
      };
    },
  };
}

// --- Invited guests (4-character codes) ---

type InvitedRow = Awaited<ReturnType<Db['invitedGuest']['create']>>;
const toInvited = (r: InvitedRow): InvitedGuest => ({
  ...r,
  invitationSentAt: iso(r.invitationSentAt),
  firstOpenedAt: iso(r.firstOpenedAt),
  lastOpenedAt: iso(r.lastOpenedAt),
  lastRemindedAt: iso(r.lastRemindedAt),
  checkInTime: iso(r.checkInTime),
  checkInMethod: r.checkInMethod,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

type InvitedWrite = Partial<Omit<InvitedGuest, 'id' | 'createdAt' | 'updatedAt'>>;
const invitedData = (p: InvitedWrite) => {
  const { invitationSentAt, checkInTime, ...rest } = p;
  return {
    ...rest,
    ...(invitationSentAt !== undefined ? { invitationSentAt: invitationSentAt ? new Date(invitationSentAt) : null } : {}),
    ...(checkInTime !== undefined ? { checkInTime: checkInTime ? new Date(checkInTime) : null } : {}),
  };
};

export function invitedGuestRepository(db: Db) {
  return {
    async list(): Promise<InvitedGuest[]> {
      return (await db.invitedGuest.findMany({ orderBy: [{ isCheckedIn: 'asc' }, { name: 'asc' }] })).map(toInvited);
    },
    async findById(id: string) {
      const r = await db.invitedGuest.findUnique({ where: { id } });
      return r ? toInvited(r) : null;
    },
    async findBySlug(slug: string) {
      const r = await db.invitedGuest.findUnique({ where: { slug: slug.trim().toUpperCase() } });
      return r ? toInvited(r) : null;
    },
    /** Exact (case-insensitive) matches first; only when there are none, partial matches. At most `take` rows. */
    async findByName(name: string, take = 2): Promise<InvitedGuest[]> {
      const q = name.trim();
      if (!q) return [];
      const exact = await db.invitedGuest.findMany({ where: { name: { equals: q, mode: 'insensitive' } }, take });
      const rows = exact.length ? exact : await db.invitedGuest.findMany({ where: { name: { contains: q, mode: 'insensitive' } }, take });
      return rows.map(toInvited);
    },
    async slugs(): Promise<Set<string>> {
      return new Set((await db.invitedGuest.findMany({ select: { slug: true } })).map((g) => g.slug));
    },
    async create(data: InvitedWrite & { name: string; slug: string }) {
      return toInvited(await db.invitedGuest.create({ data: { ...invitedData(data), name: data.name, slug: data.slug } }));
    },
    async update(id: string, patch: InvitedWrite) {
      return orNull(db.invitedGuest.update({ where: { id }, data: invitedData(patch) }).then(toInvited));
    },
    async markSent(ids: string[], sent: boolean): Promise<number> {
      const where = { id: { in: ids } };
      if (!sent) return (await db.invitedGuest.updateMany({ where, data: { invitationSent: false, invitationSentAt: null } })).count;
      // Keep the first "sent" time when a guest is marked again.
      await db.invitedGuest.updateMany({ where: { ...where, invitationSentAt: null }, data: { invitationSentAt: new Date() } });
      return (await db.invitedGuest.updateMany({ where, data: { invitationSent: true } })).count;
    },
    /**
     * Notes that the guest opened their invitation. Opening again within `windowMs` is the same visit
     * (a double tap, a reload), so it is not counted twice. Resolves to false for an unknown code.
     */
    async recordOpen(slug: string, windowMs = 60_000): Promise<boolean> {
      const code = slug.trim().toUpperCase();
      const now = new Date();
      await db.invitedGuest.updateMany({ where: { slug: code, firstOpenedAt: null }, data: { firstOpenedAt: now } });
      const counted = await db.invitedGuest.updateMany({
        where: { slug: code, OR: [{ lastOpenedAt: null }, { lastOpenedAt: { lt: new Date(now.getTime() - windowMs) } }] },
        data: { lastOpenedAt: now, openCount: { increment: 1 } },
      });
      if (counted.count === 0) await db.invitedGuest.updateMany({ where: { slug: code }, data: { lastOpenedAt: now } });
      return (await db.invitedGuest.count({ where: { slug: code } })) > 0;
    },
    /** A WhatsApp reminder went out to these guests. */
    async markReminded(ids: string[]): Promise<number> {
      return (await db.invitedGuest.updateMany({ where: { id: { in: ids } }, data: { lastRemindedAt: new Date(), reminderCount: { increment: 1 } } })).count;
    },
    async remove(id: string) {
      return (await orNull(db.invitedGuest.delete({ where: { id } }))) !== null;
    },
    async removeMany(ids: string[]): Promise<number> {
      return (await db.invitedGuest.deleteMany({ where: { id: { in: ids } } })).count;
    },
    async updateMany(ids: string[], patch: InvitedWrite): Promise<number> {
      return (await db.invitedGuest.updateMany({ where: { id: { in: ids } }, data: invitedData(patch) })).count;
    },
  };
}

// --- Photo moments & frame ---

type MomentRow = Awaited<ReturnType<Db['photoMoment']['create']>>;
const toMoment = (r: MomentRow): PhotoMoment => ({
  ...r,
  guestSlug: r.guestSlug ?? undefined,
  originalUrl: r.originalUrl ?? undefined,
  look: r.look ?? undefined,
  reactions: (r.reactions ?? {}) as Record<string, number>,
  createdAt: r.createdAt.toISOString(),
});

/** Whose photos a feed request may return. `own` matches the viewer by code, else by name. */
export interface MomentScope {
  /** Only approved photos, plus the viewer's own pending ones. */
  approvedOrOwn: boolean;
  /** Only the viewer's photos. */
  ownOnly: boolean;
  own?: { slug?: string; name?: string };
}

function ownWhere(own: MomentScope['own']): Prisma.PhotoMomentWhereInput | null {
  if (own?.slug) return { guestSlug: own.slug };
  if (own?.name) return { guestName: { equals: own.name.trim(), mode: 'insensitive' } };
  return null;
}

function scopeWhere(scope: MomentScope): Prisma.PhotoMomentWhereInput {
  const own = ownWhere(scope.own);
  if (scope.ownOnly) return own ?? { id: '__none__' };
  if (scope.approvedOrOwn) return own ? { OR: [{ approved: true }, own] } : { approved: true };
  return {};
}

export function photoMomentRepository(db: Db) {
  return {
    async page(skip: number, take: number, scope: MomentScope) {
      const where = scopeWhere(scope);
      const [rows, total] = await db.$transaction([
        db.photoMoment.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
        db.photoMoment.count({ where }),
      ]);
      return { data: rows.map(toMoment), total };
    },
    /** Newest approved photos, for the big screen. */
    async latestApproved(take: number) {
      return (await db.photoMoment.findMany({ where: { approved: true }, orderBy: { createdAt: 'desc' }, take })).map(toMoment);
    },
    async countPending() {
      return db.photoMoment.count({ where: { approved: false } });
    },
    async approveAllPending() {
      return (await db.photoMoment.updateMany({ where: { approved: false }, data: { approved: true } })).count;
    },
    async countApproved() {
      return db.photoMoment.count({ where: { approved: true } });
    },
    async all() {
      return (await db.photoMoment.findMany({ orderBy: { createdAt: 'desc' } })).map(toMoment);
    },
    /** Frames used so far: a collage counts as many as the shots it holds. */
    async countBySlug(slug: string) {
      return (await db.photoMoment.aggregate({ where: { guestSlug: slug }, _sum: { frames: true } }))._sum.frames ?? 0;
    },
    async countByName(name: string) {
      return (await db.photoMoment.aggregate({ where: { guestName: { equals: name.trim(), mode: 'insensitive' } }, _sum: { frames: true } }))._sum.frames ?? 0;
    },
    /** True when this uploaded file is already attached to a photo. */
    async urlInUse(urls: string[]) {
      return (await db.photoMoment.count({ where: { OR: [{ photoUrl: { in: urls } }, { originalUrl: { in: urls } }] } })) > 0;
    },
    /**
     * Adds a photo only while the guest is under their frame limit. The count and the insert run in one
     * transaction behind a per-guest lock, so photos uploaded in parallel cannot slip past the limit.
     * Resolves to null when the limit is reached.
     */
    async createWithinQuota(
      who: { slug?: string; name: string },
      limit: number,
      data: {
        guestName: string;
        guestSlug?: string;
        photoUrl: string;
        originalUrl?: string;
        caption: string;
        look?: string;
        approved: boolean;
        frames: number;
      },
    ) {
      const lockKey = who.slug ? `moment:slug:${who.slug}` : `moment:name:${who.name.trim().toLowerCase()}`;
      return db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
        const where = who.slug ? { guestSlug: who.slug } : { guestName: { equals: who.name.trim(), mode: 'insensitive' as const } };
        const used = (await tx.photoMoment.aggregate({ where, _sum: { frames: true } }))._sum.frames ?? 0;
        if (used + data.frames > limit) return null;
        return toMoment(await tx.photoMoment.create({ data }));
      });
    },
    async create(data: {
      guestName: string;
      guestSlug?: string;
      photoUrl: string;
      originalUrl?: string;
      caption: string;
      look?: string;
      approved: boolean;
    }) {
      return toMoment(await db.photoMoment.create({ data }));
    },
    async findById(id: string) {
      const r = await db.photoMoment.findUnique({ where: { id } });
      return r ? toMoment(r) : null;
    },
    /**
     * Adds or removes one reaction. The photo row is locked while its counts are read and written, so
     * simultaneous taps cannot overwrite each other, and `likesCount` is always the sum of `reactions`.
     */
    async react(id: string, emoji: string, delta: 1 | -1) {
      return db.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<{ reactions: unknown }[]>`SELECT "reactions" FROM "PhotoMoment" WHERE "id" = ${id} FOR UPDATE`;
        if (rows.length === 0) return null;
        const reactions = { ...((rows[0].reactions ?? {}) as Record<string, number>) };
        reactions[emoji] = Math.max(0, (reactions[emoji] || 0) + delta);
        if (reactions[emoji] === 0) delete reactions[emoji];
        const likesCount = Object.values(reactions).reduce((sum, n) => sum + n, 0);
        return toMoment(await tx.photoMoment.update({ where: { id }, data: { reactions, likesCount } }));
      });
    },
    async setApproved(id: string, approved: boolean) {
      return orNull(db.photoMoment.update({ where: { id }, data: { approved } }).then(toMoment));
    },
    async remove(id: string) {
      return (await orNull(db.photoMoment.delete({ where: { id } }))) !== null;
    },
  };
}

type CommentRow = Awaited<ReturnType<Db['photoComment']['create']>>;
const toComment = (r: CommentRow): PhotoComment => ({ ...r, guestSlug: r.guestSlug ?? undefined, createdAt: r.createdAt.toISOString() });

export function photoCommentRepository(db: Db) {
  return {
    async list(momentId: string) {
      return (await db.photoComment.findMany({ where: { momentId }, orderBy: { createdAt: 'asc' }, take: 200 })).map(toComment);
    },
    /** Adds the comment and bumps the photo's counter in one transaction. */
    async create(data: { momentId: string; guestName: string; guestSlug?: string; text: string }) {
      const [row] = await db.$transaction([
        db.photoComment.create({ data }),
        db.photoMoment.update({ where: { id: data.momentId }, data: { commentsCount: { increment: 1 } } }),
      ]);
      return toComment(row);
    },
    async remove(id: string) {
      const row = await db.photoComment.findUnique({ where: { id } });
      if (!row) return false;
      await db.$transaction([
        db.photoComment.delete({ where: { id } }),
        db.photoMoment.update({ where: { id: row.momentId }, data: { commentsCount: { decrement: 1 } } }),
      ]);
      return true;
    },
  };
}

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  access: 'INVITED',
  requireCheckIn: false,
  framesPerGuest: 15,
  cameraOpen: true,
  moderation: false,
  visibility: 'ALL',
  download: 'OWN',
  enabledLooks: [],
  defaultLook: 'none',
  screenEnabled: true,
};

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  selfCheckIn: false,
  verifyLocation: true,
  venueLat: null,
  venueLng: null,
  radiusMeters: 150,
};

export function cameraSettingRepository(db: Db) {
  // CHECKED_IN is the retired "invited and checked in" mode; it reads as INVITED with the switch on.
  const map = ({ id: _id, access, requireCheckIn, ...r }: Awaited<ReturnType<Db['cameraSetting']['create']>>): CameraSettings => ({
    ...r,
    access: access === 'ANYONE' ? 'ANYONE' : 'INVITED',
    requireCheckIn: requireCheckIn || access === 'CHECKED_IN',
  });
  return {
    async get(): Promise<CameraSettings> {
      const r = await db.cameraSetting.findUnique({ where: { id: 'main' } });
      return r ? map(r) : DEFAULT_CAMERA_SETTINGS;
    },
    async save(settings: CameraSettings) {
      return map(await db.cameraSetting.upsert({ where: { id: 'main' }, create: { id: 'main', ...settings }, update: settings }));
    },
  };
}

export function attendanceSettingRepository(db: Db) {
  const map = ({ id: _id, ...r }: Awaited<ReturnType<Db['attendanceSetting']['create']>>): AttendanceSettings => r;
  return {
    async get(): Promise<AttendanceSettings> {
      const r = await db.attendanceSetting.findUnique({ where: { id: 'main' } });
      return r ? map(r) : DEFAULT_ATTENDANCE_SETTINGS;
    },
    async save(settings: AttendanceSettings) {
      return map(await db.attendanceSetting.upsert({ where: { id: 'main' }, create: { id: 'main', ...settings }, update: settings }));
    },
  };
}

export function frameRepository(db: Db) {
  const map = (r: Awaited<ReturnType<Db['photoFrameSetting']['create']>>): PhotoFrameConfig => ({
    enabled: r.enabled,
    frameOverlayUrl: r.frameOverlayUrl,
    frameName: r.frameName ?? undefined,
    allowGuestToggle: r.allowGuestToggle,
    photoInFront: r.photoInFront,
    photoInset: { top: r.photoInsetTop, right: r.photoInsetRight, bottom: r.photoInsetBottom, left: r.photoInsetLeft },
    photoManualArea: r.photoManualArea,
    photoBorder: r.photoBorder,
    photoBorderColor: r.photoBorderColor,
    photoGap: r.photoGap,
  });
  const columns = ({ photoInset, ...rest }: PhotoFrameConfig) => ({
    ...rest,
    ...(photoInset ? { photoInsetTop: photoInset.top, photoInsetRight: photoInset.right, photoInsetBottom: photoInset.bottom, photoInsetLeft: photoInset.left } : {}),
  });
  return {
    async get() {
      const r = await db.photoFrameSetting.findUnique({ where: { id: 'main' } });
      return r ? map(r) : null;
    },
    async save(config: PhotoFrameConfig) {
      return map(await db.photoFrameSetting.upsert({ where: { id: 'main' }, create: { id: 'main', ...columns(config) }, update: columns(config) }));
    },
  };
}

// --- Admin accounts (besides the env superadmin) ---

export type StoredAdmin = AdminUser & { passwordHash: string };

export function adminRepository(db: Db) {
  const map = (r: Awaited<ReturnType<Db['adminUser']['create']>>): StoredAdmin => ({ ...r, createdAt: r.createdAt.toISOString() });
  return {
    async findByUsername(username: string) {
      const r = await db.adminUser.findFirst({ where: { username: { equals: username.trim(), mode: 'insensitive' } } });
      return r ? map(r) : null;
    },
    async findById(id: string) {
      const r = await db.adminUser.findUnique({ where: { id } });
      return r ? map(r) : null;
    },
    async setPassword(id: string, passwordHash: string) {
      await db.adminUser.update({ where: { id }, data: { passwordHash } });
    },
  };
}
