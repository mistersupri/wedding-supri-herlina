import { readLocal, writeLocal } from './guestSession.js';
import { guestInvitationUrl } from './format.js';

const TEMPLATE_KEY = 'wedding_cms_invite_template';

export const DEFAULT_INVITE_TEMPLATE =
  'Kepada Yth. Bapak/Ibu/Saudara/i *{nama}*\n\n' +
  'Tanpa mengurangi rasa hormat, kami {mempelai} mengundang Anda untuk hadir di acara pernikahan kami.\n\n' +
  'Undangan pribadi Anda:\n{link}\n\nKode undangan: *{kode}*\n\nTerima kasih atas doa dan kehadirannya.';

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
