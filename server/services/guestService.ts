import crypto from 'crypto';
import { HttpError, badRequest, notFound } from '../http/http.js';
import type { invitedGuestRepository } from '../repositories/guestRepositories.js';
import type { InvitedGuest, InvitedGuestInput, PresensiStats, PublicGuest } from '../../shared/types.js';

const SLUG_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const toPublicGuest = (g: InvitedGuest): PublicGuest => ({
  id: g.id,
  name: g.name,
  slug: g.slug,
  category: g.category,
  pax: g.pax,
  tableNumber: g.tableNumber,
  isCheckedIn: g.isCheckedIn,
  checkInTime: g.checkInTime,
});

function randomSlug(taken: Set<string>): string {
  for (let attempt = 0; attempt < 1000; attempt++) {
    let slug = '';
    for (let i = 0; i < 4; i++) slug += SLUG_ALPHABET[crypto.randomInt(SLUG_ALPHABET.length)];
    if (!taken.has(slug)) return slug;
  }
  throw new HttpError(409, 'Kode undangan 4 karakter sudah habis terpakai.');
}

const isUniqueViolation = (err: unknown) => (err as { code?: string })?.code === 'P2002';
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const wholeNumber = (v: unknown, min: number, max: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : undefined;
};

/** The only fields an admin edit may change; ids, timestamps and check-in state go through their own routes. */
function editableFields(patch: Record<string, unknown>) {
  const out: Partial<InvitedGuest> = {};
  if (patch.name !== undefined) {
    const name = text(patch.name, 120);
    if (!name) throw badRequest('Nama tamu wajib diisi.');
    out.name = name;
  }
  if (patch.phone !== undefined) out.phone = text(patch.phone, 40);
  if (patch.instagram !== undefined) out.instagram = text(patch.instagram, 60);
  if (patch.category !== undefined) out.category = text(patch.category, 40) || 'Umum';
  if (patch.pax !== undefined) out.pax = wholeNumber(patch.pax, 1, 50) ?? 2;
  if (patch.tableNumber !== undefined) out.tableNumber = text(patch.tableNumber, 40);
  if (patch.customNote !== undefined) out.customNote = text(patch.customNote, 500);
  if (patch.invitationSent !== undefined) out.invitationSent = Boolean(patch.invitationSent);
  if (patch.slug !== undefined) out.slug = text(patch.slug, 4).toUpperCase();
  return out;
}

const cleanInput = (input: InvitedGuestInput) => ({
  name: input.name.trim(),
  phone: input.phone?.trim() || '',
  instagram: input.instagram?.trim() || '',
  category: input.category || 'Umum',
  pax: Math.max(1, Number(input.pax) || 2),
  tableNumber: input.tableNumber?.trim() || '',
  customNote: input.customNote?.trim() || '',
  invitationSent: Boolean(input.invitationSent),
  invitationSentAt: input.invitationSent ? new Date().toISOString() : null,
});

/** Invited-guest list, 4-character access codes, and the reception check-in. */
export function guestService(repo: ReturnType<typeof invitedGuestRepository>) {
  const stats = (guests: InvitedGuest[]): PresensiStats => {
    const s: PresensiStats = { totalInvited: guests.length, totalPaxAllocated: 0, totalCheckedIn: 0, totalActualPax: 0, totalRemaining: 0, totalSouvenirsGiven: 0 };
    for (const g of guests) {
      s.totalPaxAllocated += g.pax || 1;
      if (!g.isCheckedIn) continue;
      s.totalCheckedIn++;
      s.totalActualPax += g.actualPax || g.pax || 1;
      if (g.souvenirGiven) s.totalSouvenirsGiven++;
    }
    s.totalRemaining = s.totalInvited - s.totalCheckedIn;
    return s;
  };

  const mustFind = async (id: string) => (await repo.findById(id)) ?? Promise.reject(notFound('Tamu tidak ditemukan.'));

  return {
    async verify(code: string) {
      const clean = code.trim().toUpperCase();
      if (clean.length !== 4) return { isValid: false, guest: null, message: 'Kode undangan terdiri dari 4 karakter.' };
      const guest = await repo.findBySlug(clean);
      return guest
        ? { isValid: true, guest: toPublicGuest(guest), message: `Selamat datang, ${guest.name}.` }
        : { isValid: false, guest: null, message: 'Kode ini tidak ada di daftar undangan.' };
    },

    async list(filter = 'ALL', search = '') {
      const q = search.trim().toLowerCase();
      const all = await repo.list();
      const data = all
        .filter((g) => {
          if (filter === 'ALL') return true;
          if (filter === 'CHECKED_IN') return g.isCheckedIn;
          if (filter === 'NOT_CHECKED_IN') return !g.isCheckedIn;
          return g.category.toLowerCase() === filter.toLowerCase();
        })
        .filter((g) => !q || [g.name, g.slug, g.phone, g.tableNumber, g.category].some((v) => (v || '').toLowerCase().includes(q)));
      return { data, stats: stats(all) };
    },

    async stats() {
      return stats(await repo.list());
    },

    async create(input: InvitedGuestInput) {
      if (!input.name?.trim()) throw badRequest('Nama tamu wajib diisi.');
      const requested = input.slug?.trim().toUpperCase() || '';
      if (requested && (await repo.findBySlug(requested))) throw new HttpError(409, `Kode ${requested} sudah dipakai tamu lain.`);
      // Another admin may take the same random code between the check and the insert; draw again then.
      for (let attempt = 0; attempt < 5; attempt++) {
        const slug = requested.length === 4 && attempt === 0 ? requested : randomSlug(await repo.slugs());
        try {
          return await repo.create({ ...cleanInput(input), slug });
        } catch (err) {
          if (!isUniqueViolation(err)) throw err;
        }
      }
      throw new HttpError(409, 'Gagal membuat kode undangan unik. Coba lagi.');
    },

    async createMany(inputs: InvitedGuestInput[]) {
      if (!Array.isArray(inputs) || inputs.length === 0) throw badRequest('Daftar tamu kosong.');
      const taken = await repo.slugs();
      const created: InvitedGuest[] = [];
      for (const input of inputs.filter((g) => g.name?.trim())) {
        let guest: InvitedGuest | undefined;
        for (let attempt = 0; attempt < 5 && !guest; attempt++) {
          const slug = randomSlug(taken);
          taken.add(slug);
          try {
            guest = await repo.create({ ...cleanInput(input), slug });
          } catch (err) {
            if (!isUniqueViolation(err)) throw err;
          }
        }
        if (!guest) throw new HttpError(409, 'Gagal membuat kode undangan unik. Coba lagi.');
        created.push(guest);
      }
      return created;
    },

    async update(id: string, patch: Record<string, unknown>) {
      const current = await mustFind(id);
      const data = editableFields(patch ?? {});
      if (data.slug !== undefined) {
        if (data.slug.length !== 4) throw badRequest('Kode undangan harus 4 karakter.');
        if (data.slug !== current.slug) {
          const owner = await repo.findBySlug(data.slug);
          if (owner && owner.id !== id) throw new HttpError(409, `Kode ${data.slug} sudah dipakai tamu lain.`);
        }
      }
      if (data.invitationSent !== undefined) {
        data.invitationSentAt = data.invitationSent ? current.invitationSentAt || new Date().toISOString() : null;
      }
      try {
        return (await repo.update(id, data)) ?? Promise.reject(notFound('Tamu tidak ditemukan.'));
      } catch (err) {
        if (isUniqueViolation(err)) throw new HttpError(409, `Kode ${data.slug} sudah dipakai tamu lain.`);
        throw err;
      }
    },

    async markSent(ids: string[], sent: boolean) {
      if (!Array.isArray(ids) || ids.length === 0) throw badRequest('Tidak ada tamu yang dipilih.');
      return { updatedCount: await repo.markSent(ids, sent) };
    },

    async remove(id: string) {
      if (!(await repo.remove(id))) throw notFound('Tamu tidak ditemukan.');
    },

    async checkIn(
      identifier: { id?: string; slug?: string; nameQuery?: string },
      options: { actualPax?: number; souvenirGiven?: boolean; method?: 'QR_SCAN' | 'MANUAL' },
    ) {
      let guest: InvitedGuest | null = null;
      if (identifier.id) guest = await repo.findById(String(identifier.id));
      if (!guest && identifier.slug) guest = await repo.findBySlug(String(identifier.slug));
      if (!guest && identifier.nameQuery) {
        // A partial name that fits several guests must not check in whoever happens to come first.
        const matches = await repo.findByName(String(identifier.nameQuery));
        if (matches.length > 1) throw new HttpError(409, 'Nama itu cocok dengan beberapa tamu. Cari dengan nama lengkap atau kode undangan.');
        guest = matches[0] ?? null;
      }
      if (!guest) throw notFound('Tamu tidak ada di daftar undangan.');

      const alreadyCheckedIn = guest.isCheckedIn;
      const pax = wholeNumber(options.actualPax, 1, 100);
      const souvenir = typeof options.souvenirGiven === 'boolean' ? options.souvenirGiven : undefined;

      // A second scan or tap must not rewrite the first check-in: time and method stay, and only the
      // figures the receptionist explicitly sent (guests count, souvenir) are updated.
      const updated = alreadyCheckedIn
        ? pax === undefined && souvenir === undefined
          ? guest
          : (await repo.update(guest.id, {
              ...(pax !== undefined ? { actualPax: pax } : {}),
              ...(souvenir !== undefined ? { souvenirGiven: souvenir } : {}),
            }))!
        : (await repo.update(guest.id, {
            isCheckedIn: true,
            checkInTime: new Date().toISOString(),
            checkInMethod: options.method === 'MANUAL' || options.method === 'QR_SCAN' ? options.method : identifier.slug ? 'QR_SCAN' : 'MANUAL',
            actualPax: pax ?? guest.pax,
            souvenirGiven: souvenir ?? true,
          }))!;
      return {
        guest: updated,
        alreadyCheckedIn,
        message: alreadyCheckedIn ? `${guest.name} sudah tercatat hadir sebelumnya.` : `${guest.name} tercatat hadir.`,
        stats: stats(await repo.list()),
      };
    },

    async undoCheckIn(id: string) {
      const guest = await mustFind(id);
      const updated = (await repo.update(id, { isCheckedIn: false, checkInTime: null, checkInMethod: null, actualPax: null, souvenirGiven: false }))!;
      return { guest: updated, message: `Kehadiran ${guest.name} dibatalkan.`, stats: stats(await repo.list()) };
    },
  };
}

export type GuestService = ReturnType<typeof guestService>;
