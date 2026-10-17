import type { Db } from '../infrastructure/prisma.js';
import type { GalleryCategory, GalleryPhoto, GiftAccount, LoveStoryItem, MediaType, WeddingEvent } from '../../shared/types.js';

/**
 * The four ordered content lists (events, love stories, gift accounts, gallery) share one shape:
 * list by orderIndex, create, update by id, delete by id. Updates and deletes report "not found" as null/false.
 */
export interface OrderedRepository<T extends { id: string }> {
  list(): Promise<T[]>;
  create(input: Omit<T, 'id'>): Promise<T>;
  createMany(inputs: Omit<T, 'id'>[]): Promise<T[]>;
  update(id: string, patch: Partial<T>): Promise<T | null>;
  remove(id: string): Promise<boolean>;
  count(): Promise<number>;
}

const isNotFound = (err: unknown) => (err as { code?: string })?.code === 'P2025';

async function orNull<T>(op: Promise<T>): Promise<T | null> {
  try {
    return await op;
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

const opt = (v: string | null) => v ?? undefined;
const strip = <T extends object>(patch: T) => {
  const { id: _id, ...rest } = patch as T & { id?: string };
  return rest;
};

export function eventRepository(db: Db): OrderedRepository<WeddingEvent> {
  const map = (r: Awaited<ReturnType<Db['event']['create']>>): WeddingEvent => ({
    ...r,
    mapsEmbedUrl: opt(r.mapsEmbedUrl),
    dressCode: opt(r.dressCode),
    notes: opt(r.notes),
  });
  return {
    list: async () => (await db.event.findMany({ orderBy: { orderIndex: 'asc' } })).map(map),
    create: async (input) => map(await db.event.create({ data: input })),
    createMany: async (inputs) => Promise.all(inputs.map(async (input) => map(await db.event.create({ data: input })))),
    update: async (id, patch) => orNull(db.event.update({ where: { id }, data: strip(patch) }).then(map)),
    remove: async (id) => (await orNull(db.event.delete({ where: { id } }))) !== null,
    count: () => db.event.count(),
  };
}

export function storyRepository(db: Db): OrderedRepository<LoveStoryItem> {
  const map = ({ orderIndex: _o, ...r }: Awaited<ReturnType<Db['loveStory']['create']>>): LoveStoryItem => ({ ...r, photoUrl: opt(r.photoUrl) });
  return {
    list: async () => (await db.loveStory.findMany({ orderBy: [{ orderIndex: 'asc' }, { year: 'asc' }] })).map(map),
    create: async (input) => map(await db.loveStory.create({ data: { ...input, orderIndex: await db.loveStory.count() } })),
    createMany: async (inputs) => {
      const out: LoveStoryItem[] = [];
      for (const input of inputs) out.push(map(await db.loveStory.create({ data: { ...input, orderIndex: out.length } })));
      return out;
    },
    update: async (id, patch) => orNull(db.loveStory.update({ where: { id }, data: strip(patch) }).then(map)),
    remove: async (id) => (await orNull(db.loveStory.delete({ where: { id } }))) !== null,
    count: () => db.loveStory.count(),
  };
}

export function giftRepository(db: Db): OrderedRepository<GiftAccount> {
  const map = ({ orderIndex: _o, ...r }: Awaited<ReturnType<Db['giftAccount']['create']>>): GiftAccount => ({ ...r, qrisImageUrl: opt(r.qrisImageUrl) });
  return {
    list: async () => (await db.giftAccount.findMany({ orderBy: { orderIndex: 'asc' } })).map(map),
    create: async (input) => map(await db.giftAccount.create({ data: { ...input, orderIndex: await db.giftAccount.count() } })),
    createMany: async (inputs) => {
      const out: GiftAccount[] = [];
      for (const input of inputs) out.push(map(await db.giftAccount.create({ data: { ...input, orderIndex: out.length } })));
      return out;
    },
    update: async (id, patch) => orNull(db.giftAccount.update({ where: { id }, data: strip(patch) }).then(map)),
    remove: async (id) => (await orNull(db.giftAccount.delete({ where: { id } }))) !== null,
    count: () => db.giftAccount.count(),
  };
}

export function galleryRepository(db: Db): OrderedRepository<GalleryPhoto> {
  const map = (r: Awaited<ReturnType<Db['galleryPhoto']['create']>>): GalleryPhoto => ({
    ...r,
    caption: opt(r.caption),
    thumbnailUrl: opt(r.thumbnailUrl),
    category: r.category as GalleryCategory,
    mediaType: r.mediaType as MediaType,
  });
  const toData = (p: Partial<GalleryPhoto>) => strip(p) as Omit<Partial<GalleryPhoto>, 'id'>;
  return {
    list: async () => (await db.galleryPhoto.findMany({ orderBy: { orderIndex: 'asc' } })).map(map),
    create: async (input) => map(await db.galleryPhoto.create({ data: toData(input) as Omit<GalleryPhoto, 'id'> })),
    createMany: async (inputs) => {
      const start = await db.galleryPhoto.count();
      return db.$transaction(
        inputs.map((input, i) => db.galleryPhoto.create({ data: { ...(toData(input) as Omit<GalleryPhoto, 'id'>), orderIndex: input.orderIndex || start + i + 1 } })),
      ).then((rows) => rows.map(map));
    },
    update: async (id, patch) => orNull(db.galleryPhoto.update({ where: { id }, data: toData(patch) }).then(map)),
    remove: async (id) => (await orNull(db.galleryPhoto.delete({ where: { id } }))) !== null,
    count: () => db.galleryPhoto.count(),
  };
}
