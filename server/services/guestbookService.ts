import path from 'path';
import { config } from '../config.js';
import { badRequest, notFound } from '../http/http.js';
import { transcribeAudioWithGemini } from '../infrastructure/gemini.js';
import type { wishRepository } from '../repositories/guestRepositories.js';
import type { AttendanceStatus } from '../../shared/types.js';

const ATTENDANCE: AttendanceStatus[] = ['HADIR', 'TIDAK_HADIR', 'RAGU'];
const VOICE_FALLBACK = '[Voice Note] Ucapan dikirim lewat rekaman suara.';

export interface WishInput {
  guestName?: string;
  relationship?: string;
  attendanceStatus?: string;
  numberOfGuests?: number | string;
  message?: string;
  voiceUrl?: string | null;
}

/** Voice notes are files under /uploads/voice; anything else (legacy data URLs, other paths) is ignored. */
const VOICE_URL = /^\/uploads\/voice\/[A-Za-z0-9-]+\.[a-z0-9]{2,4}$/;
const voicePath = (url: string) => path.join(config.uploadDir, 'voice', path.basename(url));

/** Prefer the typed message; when only a voice note came in, ask Gemini for a transcript. */
async function resolveMessage(message: string, voiceUrl: string | null) {
  const typed = message.trim();
  if (voiceUrl && (!typed || typed.startsWith('[Voice Note]'))) {
    return (await transcribeAudioWithGemini(voicePath(voiceUrl))) || typed || VOICE_FALLBACK;
  }
  return typed || 'Selamat untuk kedua mempelai!';
}

export function guestbookService(wishes: ReturnType<typeof wishRepository>) {
  return {
    async publicList() {
      const [data, stats] = await Promise.all([wishes.list({ includeHidden: false }), wishes.stats()]);
      return { data, stats };
    },

    async submit(input: WishInput) {
      const status = input.attendanceStatus as AttendanceStatus;
      if (!input.guestName?.trim() || !ATTENDANCE.includes(status)) throw badRequest('Nama dan status kehadiran wajib diisi.');
      const voiceUrl = typeof input.voiceUrl === 'string' && VOICE_URL.test(input.voiceUrl) ? input.voiceUrl : null;
      if (input.voiceUrl && !voiceUrl) throw badRequest('Pesan suara tidak valid. Rekam ulang atau tulis ucapan Anda.');
      return wishes.upsert({
        guestName: input.guestName.trim(),
        relationship: input.relationship?.trim() || 'Tamu Undangan',
        attendanceStatus: status,
        numberOfGuests: Math.max(1, Number(input.numberOfGuests) || 1),
        message: await resolveMessage(input.message || '', voiceUrl),
        voiceUrl,
      });
    },

    async cmsList(status: string, search: string) {
      const filter = ATTENDANCE.includes(status as AttendanceStatus) ? (status as AttendanceStatus) : undefined;
      const [data, stats] = await Promise.all([wishes.list({ status: filter, search, includeHidden: true }), wishes.stats()]);
      return { data, stats };
    },

    async reply(id: string, reply: string) {
      return (await wishes.setReply(id, reply.trim())) ?? Promise.reject(notFound('Ucapan tidak ditemukan.'));
    },

    async toggleVisibility(id: string) {
      return (await wishes.toggleHidden(id)) ?? Promise.reject(notFound('Ucapan tidak ditemukan.'));
    },

    async remove(id: string) {
      if (!(await wishes.remove(id))) throw notFound('Ucapan tidak ditemukan.');
    },
  };
}

export type GuestbookService = ReturnType<typeof guestbookService>;
