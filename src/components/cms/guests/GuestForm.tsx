import React, { useState } from 'react';
import { parsePhone } from '@shared/phone';
import { checkInstagram, cleanInstagram } from '../../../lib/inputs.js';
import { Checkbox, Field, Input, Select, Textarea } from '../../ui/Field.js';
import { InstagramField, PhoneField } from '../../ui/fields.js';
import { required, useFormErrors } from '../useFormErrors.js';
import type { InvitedGuest, InvitedGuestInput } from '@shared/types';

export const GUEST_CATEGORIES = ['Keluarga', 'Sahabat', 'VIP', 'Rekan Kerja', 'Umum'];

export const emptyGuest = (): InvitedGuestInput => ({
  name: '',
  category: 'Keluarga',
  pax: 2,
  phone: '',
  instagram: '',
  tableNumber: '',
  customNote: '',
  invitationSent: false,
});

export const guestToInput = (g: InvitedGuest): InvitedGuestInput => ({
  name: g.name,
  category: g.category,
  pax: g.pax,
  phone: g.phone || '',
  instagram: g.instagram || '',
  tableNumber: g.tableNumber || '',
  customNote: g.customNote || '',
  invitationSent: Boolean(g.invitationSent),
});

export const GuestForm: React.FC<{ id: string; initial: InvitedGuestInput; onSubmit: (input: InvitedGuestInput) => void }> = ({
  id,
  initial,
  onSubmit,
}) => {
  const [form, setForm] = useState(initial);
  const { errors, clear, validate, formRef } = useFormErrors<'name' | 'phone' | 'instagram' | 'pax'>();
  const set = <K extends keyof InvitedGuestInput>(key: K, value: InvitedGuestInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key in errors) clear(key as 'name');
  };

  return (
    <form
      id={id}
      ref={formRef}
      noValidate
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const phone = (form.phone || '').trim();
        const ok = validate({
          name: required(form.name, 'Nama'),
          phone: phone && !parsePhone(phone) ? 'Nomor belum benar. Contoh: 0812-3456-7890.' : null,
          instagram: checkInstagram(form.instagram || ''),
          pax: !form.pax || form.pax < 1 || form.pax > 20 ? 'Isi 1 sampai 20 kursi.' : null,
        });
        if (ok) onSubmit({ ...form, name: form.name.trim() });
      }}
    >
      <Field
        label="Nama di undangan"
        hint="Ditulis persis seperti di sampul, contoh: Bpk. Budi & Keluarga"
        error={errors.name}
        counter={{ value: form.name.length, max: 120 }}
        className="sm:col-span-2"
      >
        {(p) => (
          <Input
            {...p}
            required
            maxLength={120}
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="next"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        )}
      </Field>
      <Field label="Kategori">
        {(p) => (
          <Select {...p} value={form.category} onChange={(e) => set('category', e.target.value)}>
            {GUEST_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Jumlah kursi" error={errors.pax} hint="Batas jumlah orang yang bisa dicatat hadir.">
        {(p) => (
          <Input
            {...p}
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            step={1}
            required
            value={form.pax}
            onChange={(e) => set('pax', Number(e.target.value) || 0)}
          />
        )}
      </Field>
      <PhoneField optional value={form.phone || ''} onChange={(v) => set('phone', v)} error={errors.phone} />
      <Field label="Meja" aside="opsional">
        {(p) => (
          <Input {...p} maxLength={40} autoComplete="off" value={form.tableNumber} onChange={(e) => set('tableNumber', e.target.value)} placeholder="Meja A2" />
        )}
      </Field>
      <InstagramField className="sm:col-span-2" value={form.instagram || ''} onChange={(v) => set('instagram', v)} error={errors.instagram} />
      <Field label="Catatan internal" aside="opsional" counter={{ value: (form.customNote || '').length, max: 500 }} hint="Hanya terlihat oleh admin." className="sm:col-span-2">
        {(p) => <Textarea {...p} rows={2} maxLength={500} value={form.customNote} onChange={(e) => set('customNote', e.target.value)} />}
      </Field>
      <Checkbox
        className="sm:col-span-2"
        label="Undangan sudah dikirim"
        checked={Boolean(form.invitationSent)}
        onChange={(e) => set('invitationSent', e.target.checked)}
      />
    </form>
  );
};

/** Column titles the import understands (case and punctuation ignored), in the order of the template. */
export const IMPORT_COLUMNS = [
  { key: 'name', title: 'Nama', aliases: ['nama', 'name', 'nama tamu'] },
  { key: 'category', title: 'Kategori', aliases: ['kategori', 'category', 'grup', 'group'] },
  { key: 'pax', title: 'Kursi', aliases: ['kursi', 'pax', 'jumlah', 'jumlah kursi', 'seat', 'seats'] },
  { key: 'phone', title: 'Telepon', aliases: ['telepon', 'telp', 'no telepon', 'nomor telepon', 'hp', 'no hp', 'nomor hp', 'wa', 'whatsapp', 'phone'] },
  { key: 'tableNumber', title: 'Meja', aliases: ['meja', 'table', 'no meja', 'nomor meja'] },
  { key: 'customNote', title: 'Catatan', aliases: ['catatan', 'note', 'notes', 'keterangan'] },
  { key: 'instagram', title: 'Instagram', aliases: ['instagram', 'ig'] },
] as const;
type ImportKey = (typeof IMPORT_COLUMNS)[number]['key'];

const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Rows of cells (from a pasted list, a CSV or an Excel sheet) to guests. A first row of known column titles
 * (Nama, Kategori, Kursi, Telepon, Meja, Catatan, Instagram, in any order) picks the columns; without titles the
 * order is that of the template. Only the name is required. Numbers and Instagram names are tidied, and anything
 * that cannot be read is reported in `issues` (and left blank) instead of failing the whole list.
 */
export function parseGuestRows(rows: string[][]): { guests: InvitedGuestInput[]; issues: string[]; hasHeader: boolean } {
  const issues: string[] = [];
  const guests: InvitedGuestInput[] = [];
  const titled = rows[0]?.map((c) => IMPORT_COLUMNS.find((col) => (col.aliases as readonly string[]).includes(norm(c)))?.key);
  const hasHeader = Boolean(titled && titled.includes('name'));
  const order: (ImportKey | undefined)[] = hasHeader ? titled! : IMPORT_COLUMNS.map((c) => c.key);
  rows.forEach((cells, i) => {
    if (hasHeader && i === 0) return;
    const row = i + 1;
    const get = (key: ImportKey) => {
      const at = order.indexOf(key);
      return at >= 0 ? (cells[at] ?? '').trim() : '';
    };
    const name = get('name');
    if (!name) return;
    const phone = get('phone');
    const parsed = phone ? parsePhone(phone) : null;
    if (phone && !parsed) issues.push(`Baris ${row} (${name}): nomor "${phone}" tidak terbaca, dikosongkan.`);
    const instagram = get('instagram');
    const handle = instagram ? cleanInstagram(instagram) : '';
    const badHandle = handle && checkInstagram(handle);
    if (badHandle) issues.push(`Baris ${row} (${name}): Instagram "${instagram}" tidak valid, dikosongkan.`);
    const pax = get('pax');
    const seats = Number(pax);
    if (pax && !(seats >= 1 && seats <= 50)) issues.push(`Baris ${row} (${name}): jumlah kursi "${pax}" tidak valid, dipakai 2.`);
    guests.push({
      name,
      category: get('category') || 'Umum',
      pax: seats >= 1 && seats <= 50 ? Math.round(seats) : 2,
      phone: parsed ? parsed.display : '',
      tableNumber: get('tableNumber'),
      customNote: get('customNote'),
      instagram: badHandle ? '' : handle,
    });
  });
  return { guests, issues, hasHeader };
}

/** One guest per line, columns separated by comma or tab (what pasting from a spreadsheet gives). */
export function parseGuestLinesWithIssues(text: string): { guests: InvitedGuestInput[]; issues: string[] } {
  const { guests, issues } = parseGuestRows(
    text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.split(/\t|,/).map((p) => p.trim())),
  );
  return { guests, issues };
}

export const parseGuestLines = (text: string) => parseGuestLinesWithIssues(text).guests;
