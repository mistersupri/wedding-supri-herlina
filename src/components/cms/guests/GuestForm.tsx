import React, { useState } from 'react';
import { Checkbox, Field, Input, Select, Textarea } from '../../ui/Field.js';
import type { InvitedGuest, InvitedGuestInput } from '../../../types.js';

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
  const set = <K extends keyof InvitedGuestInput>(key: K, value: InvitedGuestInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <form
      id={id}
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ ...form, name: form.name.trim() });
      }}
    >
      <Field label="Nama di undangan" hint="Ditulis persis seperti di sampul, contoh: Bpk. Budi & Keluarga" className="sm:col-span-2">
        {(p) => <Input {...p} required value={form.name} onChange={(e) => set('name', e.target.value)} />}
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
      <Field label="Jumlah kursi">
        {(p) => (
          <Input
            {...p}
            type="number"
            min={1}
            max={20}
            required
            value={form.pax}
            onChange={(e) => set('pax', Number(e.target.value) || 1)}
          />
        )}
      </Field>
      <Field label="Nomor WhatsApp" aside="opsional">
        {(p) => (
          <Input {...p} inputMode="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="08123456789" />
        )}
      </Field>
      <Field label="Meja" aside="opsional">
        {(p) => <Input {...p} value={form.tableNumber} onChange={(e) => set('tableNumber', e.target.value)} placeholder="Meja A2" />}
      </Field>
      <Field label="Instagram" aside="opsional" className="sm:col-span-2">
        {(p) => <Input {...p} value={form.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="@nama" />}
      </Field>
      <Field label="Catatan internal" aside="opsional" className="sm:col-span-2">
        {(p) => <Textarea {...p} rows={2} value={form.customNote} onChange={(e) => set('customNote', e.target.value)} />}
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

/**
 * One guest per line: Nama, Kategori, Kursi, Telepon, Meja, Catatan, Instagram.
 * Only the name is required; missing columns fall back to defaults.
 */
export function parseGuestLines(text: string): InvitedGuestInput[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, category, pax, phone, tableNumber, customNote, instagram] = line.split(/\t|,/).map((p) => p.trim());
      return {
        name,
        category: category || 'Umum',
        pax: Number(pax) || 2,
        phone: phone || '',
        tableNumber: tableNumber || '',
        customNote: customNote || '',
        instagram: instagram || '',
      };
    })
    .filter((g) => g.name);
}
