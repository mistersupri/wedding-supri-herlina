import { readLocal, writeLocal } from './guestSession.js';
import { guestInvitationUrl } from './format.js';

const TEMPLATE_KEY = 'wedding_cms_invite_template';

export const DEFAULT_INVITE_TEMPLATE =
  'Kepada Yth. Bapak/Ibu/Saudara/i *{nama}*\n\n' +
  'Tanpa mengurangi rasa hormat, kami {mempelai} mengundang Anda untuk hadir di acara pernikahan kami.\n\n' +
  'Undangan pribadi Anda:\n{link}\n\nKode undangan: *{kode}*\n\nTerima kasih atas doa dan kehadirannya.';

/** The messages the couple sends over WhatsApp: the invitation itself, and two reminders. */
export type MessageKind = 'invite' | 'reminderUnopened' | 'reminderRsvp';

export const MESSAGE_KINDS: { id: MessageKind; label: string; detail: string }[] = [
  { id: 'invite', label: 'Undangan', detail: 'Pesan pertama berisi tautan pribadi.' },
  { id: 'reminderUnopened', label: 'Pengingat belum dibuka', detail: 'Untuk tamu yang sudah dikirimi tetapi belum membuka undangan.' },
  { id: 'reminderRsvp', label: 'Pengingat RSVP', detail: 'Untuk tamu yang belum mengisi konfirmasi kehadiran.' },
];

export const DEFAULT_TEMPLATES: Record<MessageKind, string> = {
  invite: DEFAULT_INVITE_TEMPLATE,
  reminderUnopened:
    'Kepada Yth. Bapak/Ibu/Saudara/i *{nama}*\n\n' +
    'Kami {mempelai} ingin memastikan undangan pernikahan kami sudah sampai kepada Anda. Silakan dibuka lewat tautan pribadi berikut:\n{link}\n\n' +
    'Kode undangan: *{kode}*\n\nTerima kasih.',
  reminderRsvp:
    'Kepada Yth. Bapak/Ibu/Saudara/i *{nama}*\n\n' +
    'Agar persiapan acara berjalan baik, mohon kesediaan Anda mengonfirmasi kehadiran di bagian Ucapan pada undangan berikut:\n{link}\n\n' +
    'Kode undangan: *{kode}*\n\nSalam hangat dari {mempelai}.',
};

const KEYS: Record<MessageKind, string> = {
  invite: TEMPLATE_KEY,
  reminderUnopened: 'wedding_cms_reminder_unopened_template',
  reminderRsvp: 'wedding_cms_reminder_rsvp_template',
};

export const loadTemplate = (kind: MessageKind) => {
  const saved = readLocal<string>(KEYS[kind], '');
  return saved.trim() ? saved : DEFAULT_TEMPLATES[kind];
};
export const saveTemplate = (kind: MessageKind, template: string) => writeLocal(KEYS[kind], template);

export const INVITE_PLACEHOLDERS = ['{nama}', '{kode}', '{link}', '{mempelai}'] as const;

export const loadInviteTemplate = () => {
  const saved = readLocal<string>(TEMPLATE_KEY, '');
  return saved.trim() ? saved : DEFAULT_INVITE_TEMPLATE;
};
export const saveInviteTemplate = (template: string) => writeLocal(TEMPLATE_KEY, template);

/** Fills the template for one guest. `mempelai` is the couple's names, e.g. "Arya & Nadhira". */
export function renderInvite(template: string, guest: { name: string; slug: string }, mempelai: string) {
  const values: Record<string, string> = {
    '{nama}': guest.name,
    '{kode}': guest.slug,
    '{link}': guestInvitationUrl(guest),
    '{mempelai}': mempelai,
  };
  return template.replace(/\{nama\}|\{kode\}|\{link\}|\{mempelai\}/g, (token) => values[token]);
}

/** Indonesian mobile number in international form without "+", or '' when it cannot be a phone number. */
export function whatsappNumber(raw: string | undefined) {
  let digits = (raw || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith('8')) digits = `62${digits}`;
  return digits.length >= 9 && digits.length <= 15 ? digits : '';
}

export const whatsappLink = (phone: string | undefined, message: string) => {
  const number = whatsappNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
};
