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
    for (let i = 0; i < 4; i++) slug += SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)];
    if (!taken.has(slug)) return slug;
  }
  throw new HttpError(409, 'Kode undangan 4 karakter sudah habis terpakai.');
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
      const taken = await repo.slugs();
      const requested = input.slug?.trim().toUpperCase() || '';
      const slug = requested.length === 4 && !taken.has(requested) ? requested : randomSlug(taken);
      return repo.create({ ...cleanInput(input), slug });
    },

    async createMany(inputs: InvitedGuestInput[]) {
      if (!Array.isArray(inputs) || inputs.length === 0) throw badRequest('Daftar tamu kosong.');
      const taken = await repo.slugs();
      const created: InvitedGuest[] = [];
      for (const input of inputs.filter((g) => g.name?.trim())) {
        const slug = randomSlug(taken);
        taken.add(slug);
        created.push(await repo.create({ ...cleanInput(input), slug }));
      }
      return created;
    },

    async update(id: string, patch: Partial<InvitedGuest>) {
      const current = await mustFind(id);
      const { id: _id, createdAt: _c, updatedAt: _u, ...data } = patch;
      if (data.slug && data.slug.toUpperCase() !== current.slug) {
        data.slug = data.slug.trim().toUpperCase();
        const owner = await repo.findBySlug(data.slug);
        if (owner && owner.id !== id) throw new HttpError(409, `Kode ${data.slug} sudah dipakai tamu lain.`);
      }
      if (data.invitationSent !== undefined) {
        data.invitationSentAt = data.invitationSent ? current.invitationSentAt || new Date().toISOString() : null;
      }
      return (await repo.update(id, data)) ?? Promise.reject(notFound('Tamu tidak ditemukan.'));
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
      const guest =
        (identifier.id && (await repo.findById(identifier.id))) ||
        (identifier.slug && (await repo.findBySlug(identifier.slug))) ||
        (identifier.nameQuery && (await repo.findByName(identifier.nameQuery))) ||
        null;
      if (!guest) throw notFound('Tamu tidak ada di daftar undangan.');

      const alreadyCheckedIn = guest.isCheckedIn;
      const updated = (await repo.update(guest.id, {
        isCheckedIn: true,
        checkInTime: guest.checkInTime || new Date().toISOString(),
        checkInMethod: options.method || (identifier.slug ? 'QR_SCAN' : 'MANUAL'),
        actualPax: options.actualPax !== undefined ? Number(options.actualPax) : guest.actualPax || guest.pax,
        souvenirGiven: options.souvenirGiven ?? true,
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
