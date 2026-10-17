import type { Db } from '../infrastructure/prisma.js';
import type { AdminUser, AttendanceStatus, GuestWish, InvitedGuest, PhotoFrameConfig, PhotoMoment } from '../../shared/types.js';

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

// --- Guestbook wishes ---

type WishRow = Awaited<ReturnType<Db['guestWish']['create']>>;
const toWish = ({ guestKey: _k, ...r }: WishRow): GuestWish => ({
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

    async recent(take: number) {
      return (await db.guestWish.findMany({ orderBy: { createdAt: 'desc' }, take })).map(toWish);
    },

    /** One wish per guest name: a second submission updates the attendance (and message, if given). */
    async upsert(input: Omit<GuestWish, 'id' | 'createdAt' | 'isHidden' | 'reply'>): Promise<GuestWish> {
      const key = guestKey(input.guestName);
      const row = await db.guestWish.upsert({
        where: { guestKey: key },
        create: { ...input, voiceUrl: input.voiceUrl ?? null, guestKey: key },
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
    async findByName(name: string) {
      const q = name.trim();
      const exact = await db.invitedGuest.findFirst({ where: { name: { equals: q, mode: 'insensitive' } } });
      const r = exact ?? (await db.invitedGuest.findFirst({ where: { name: { contains: q, mode: 'insensitive' } } }));
      return r ? toInvited(r) : null;
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
    async remove(id: string) {
      return (await orNull(db.invitedGuest.delete({ where: { id } }))) !== null;
    },
  };
}

// --- Photo moments & frame ---

type MomentRow = Awaited<ReturnType<Db['photoMoment']['create']>>;
const toMoment = (r: MomentRow): PhotoMoment => ({
  ...r,
  guestSlug: r.guestSlug ?? undefined,
  reactions: (r.reactions ?? {}) as Record<string, number>,
  createdAt: r.createdAt.toISOString(),
});

export function photoMomentRepository(db: Db) {
  return {
    async page(skip: number, take: number) {
      const [rows, total] = await db.$transaction([db.photoMoment.findMany({ orderBy: { createdAt: 'desc' }, skip, take }), db.photoMoment.count()]);
      return { data: rows.map(toMoment), total };
    },
    async all() {
      return (await db.photoMoment.findMany({ orderBy: { createdAt: 'desc' } })).map(toMoment);
    },
    async countBySlug(slug: string) {
      return db.photoMoment.count({ where: { guestSlug: slug } });
    },
    async countByName(name: string) {
      return db.photoMoment.count({ where: { guestName: { equals: name.trim(), mode: 'insensitive' } } });
    },
    async create(data: { guestName: string; guestSlug?: string; photoUrl: string; caption: string }) {
      return toMoment(await db.photoMoment.create({ data }));
    },
    async findById(id: string) {
      const r = await db.photoMoment.findUnique({ where: { id } });
      return r ? toMoment(r) : null;
    },
    async saveReactions(id: string, reactions: Record<string, number>, likesCount: number) {
      return toMoment(await db.photoMoment.update({ where: { id }, data: { reactions, likesCount } }));
    },
    async remove(id: string) {
      return (await orNull(db.photoMoment.delete({ where: { id } }))) !== null;
    },
  };
}

export function frameRepository(db: Db) {
  const map = (r: Awaited<ReturnType<Db['photoFrameSetting']['create']>>): PhotoFrameConfig => ({
    enabled: r.enabled,
    frameOverlayUrl: r.frameOverlayUrl,
    frameName: r.frameName ?? undefined,
    allowGuestToggle: r.allowGuestToggle,
  });
  return {
    async get() {
      const r = await db.photoFrameSetting.findUnique({ where: { id: 'main' } });
      return r ? map(r) : null;
    },
    async save(config: PhotoFrameConfig) {
      return map(await db.photoFrameSetting.upsert({ where: { id: 'main' }, create: { id: 'main', ...config }, update: config }));
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
