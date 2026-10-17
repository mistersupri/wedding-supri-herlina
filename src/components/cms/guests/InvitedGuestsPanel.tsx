import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { cmsApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { guestInvitationUrl } from '../../../lib/format.js';
import { useDebounce } from '../../../hooks/useDebounce.js';
import { useCopy } from '../../../hooks/useCopy.js';
import { Pagination, Stat, usePagination } from '../CmsPage.js';
import { useToast } from '../Toast.js';
import { GUEST_CATEGORIES, GuestForm, emptyGuest, guestToInput, parseGuestLines } from './GuestForm.js';
import { Button } from '../../ui/Button.js';
import { Field, Input, Select, Textarea } from '../../ui/Field.js';
import { ConfirmDialog, Modal } from '../../ui/Modal.js';
import { Chip } from '../../ui/StatusChip.js';
import { EmptyState, ErrorState, LoadingState } from '../../ui/StateView.js';
import type { InvitedGuest, InvitedGuestInput } from '@shared/types';

const inviteMessage = (g: InvitedGuest) =>
  `Kepada Yth. Bapak/Ibu/Saudara/i *${g.name}*\n\n` +
  `Tanpa mengurangi rasa hormat, kami mengundang Anda untuk hadir di acara pernikahan kami.\n\n` +
  `Undangan pribadi Anda:\n${guestInvitationUrl(g)}\n\nKode undangan: *${g.slug}*\n\nTerima kasih atas doa dan kehadirannya.`;

const waLink = (g: InvitedGuest) => {
  const phone = (g.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '62');
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(inviteMessage(g))}` : null;
};

export const InvitedGuestsPanel: React.FC = () => {
  const client = useQueryClient();
  const notify = useToast();
  const { copy, copied } = useCopy();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [sent, setSent] = useState<'ALL' | 'SENT' | 'UNSENT'>('ALL');
  const [editing, setEditing] = useState<{ guest: InvitedGuest | null } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [toDelete, setToDelete] = useState<InvitedGuest | null>(null);
  const q = useDebounce(search, 250).trim().toLowerCase();

  const query = useQuery({ queryKey: queryKeys.cms.invitedGuests, queryFn: () => cmsApi.invitedGuests.list() });
  const guests = query.data?.data || [];
  const stats = query.data?.stats;

  const filtered = useMemo(
    () =>
      guests.filter(
        (g) =>
          (category === 'ALL' || g.category === category) &&
          (sent === 'ALL' || (sent === 'SENT') === Boolean(g.invitationSent)) &&
          (!q || [g.name, g.slug, g.phone, g.tableNumber].some((v) => (v || '').toLowerCase().includes(q))),
      ),
    [guests, category, sent, q],
  );
  const pager = usePagination(filtered, 15);
  const sentCount = guests.filter((g) => g.invitationSent).length;

  const refresh = () => client.invalidateQueries({ queryKey: queryKeys.cms.invitedGuests });
  const onError = (err: Error) => notify(err.message, 'error');

  const save = useMutation({
    mutationFn: ({ id, input }: { id?: string; input: InvitedGuestInput }) =>
      id ? cmsApi.invitedGuests.update(id, input) : cmsApi.invitedGuests.create(input),
    onSuccess: (g, { id }) => {
      refresh();
      notify(id ? 'Data tamu diperbarui.' : `${g.name} ditambahkan dengan kode ${g.slug}.`);
      setEditing(null);
    },
    onError,
  });
  const importMany = useMutation({
    mutationFn: cmsApi.invitedGuests.createMany,
    onSuccess: (created) => {
      refresh();
      notify(`${created.length} tamu ditambahkan.`);
      setImportText('');
      setImportOpen(false);
    },
    onError,
  });
  const markSent = useMutation({
    mutationFn: ({ ids, value }: { ids: string[]; value: boolean }) => cmsApi.invitedGuests.markSent(ids, value),
    onSuccess: refresh,
    onError,
  });
  const remove = useMutation({
    mutationFn: cmsApi.invitedGuests.remove,
    onSuccess: () => {
      refresh();
      notify('Tamu dihapus dari daftar.');
      setToDelete(null);
    },
    onError,
  });

  const parsed = parseGuestLines(importText);

  return (
    <div>
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Undangan" value={stats.totalInvited} detail={`${stats.totalPaxAllocated} kursi`} />
          <Stat
            label="Sudah dikirim"
            value={sentCount}
            detail={`${guests.length ? Math.round((sentCount / guests.length) * 100) : 0}% dari daftar`}
          />
          <Stat label="Sudah hadir" value={stats.totalCheckedIn} detail={`${stats.totalActualPax} orang datang`} />
          <Stat label="Belum hadir" value={stats.totalRemaining} />
        </div>
      )}

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Cari tamu</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, kode, telepon, meja" className="pl-9" />
        </label>
        <div className="grid grid-cols-2 gap-2 lg:flex">
          <label>
            <span className="sr-only">Kategori</span>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="ALL">Semua kategori</option>
              {GUEST_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </label>
          <label>
            <span className="sr-only">Status kirim</span>
            <Select value={sent} onChange={(e) => setSent(e.target.value as typeof sent)}>
              <option value="ALL">Semua status</option>
              <option value="UNSENT">Belum dikirim</option>
              <option value="SENT">Sudah dikirim</option>
            </Select>
          </label>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            Impor daftar
          </Button>
          <Button onClick={() => setEditing({ guest: null })}>Tambah tamu</Button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-line bg-card">
        {query.isLoading ? (
          <LoadingState label="Memuat daftar tamu..." />
        ) : query.isError ? (
          <ErrorState title="Daftar tamu belum bisa dimuat." onRetry={() => query.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={guests.length ? 'Tidak ada tamu yang cocok' : 'Daftar tamu masih kosong'}
            detail={guests.length ? 'Ubah kata kunci atau saringan.' : 'Tambah satu per satu atau impor dari daftar.'}
          />
        ) : (
          <ul className="divide-y divide-line">
            {pager.slice.map((g) => {
              const wa = waLink(g);
              return (
                <li key={g.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold break-words">{g.name}</p>
                      <span className="display-numeral rounded-xs bg-paper-2 px-1.5 text-sm tracking-widest">{g.slug}</span>
                      {g.isCheckedIn && <Chip tone="ok">Hadir</Chip>}
                    </div>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {g.category} · {g.pax} kursi{g.tableNumber ? ` · ${g.tableNumber}` : ''}
                      {g.phone ? ` · ${g.phone}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <label className="mr-1 flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-[var(--primary)]"
                        checked={Boolean(g.invitationSent)}
                        onChange={(e) => markSent.mutate({ ids: [g.id], value: e.target.checked })}
                      />
                      Terkirim
                    </label>
                    {wa ? (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => !g.invitationSent && markSent.mutate({ ids: [g.id], value: true })}
                        className="inline-flex min-h-11 items-center rounded-sm bg-primary px-3.5 text-[13px] font-semibold text-on-primary hover:bg-primary-hover"
                      >
                        Kirim WA
                      </a>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => copy(inviteMessage(g), g.id)}>
                        {copied === g.id ? 'Pesan tersalin' : 'Salin pesan'}
                      </Button>
                    )}
                    <a
                      href={guestInvitationUrl(g)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center rounded-sm px-3 text-[13px] font-semibold hover:bg-paper-2"
                    >
                      Buka
                    </a>
                    <Button variant="ghost" size="sm" onClick={() => setEditing({ guest: g })}>
                      Ubah
                    </Button>
                    <Button variant="ghost" size="sm" className="text-no" onClick={() => setToDelete(g)}>
                      Hapus
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Pagination {...pager} onPage={pager.setPage} noun="tamu" />
        {pager.slice.some((g) => !g.invitationSent) && (
          <Button variant="ghost" size="sm" onClick={() => markSent.mutate({ ids: pager.slice.map((g) => g.id), value: true })}>
            Tandai halaman ini terkirim
          </Button>
        )}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.guest ? 'Ubah tamu' : 'Tambah tamu'}
        description={editing?.guest ? `Kode undangan: ${editing.guest.slug}` : 'Kode 4 karakter dibuat otomatis.'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button type="submit" form="guest-form" loading={save.isPending}>
              Simpan
            </Button>
          </>
        }
      >
        {editing && (
          <GuestForm
            key={editing.guest?.id || 'new'}
            id="guest-form"
            initial={editing.guest ? guestToInput(editing.guest) : emptyGuest()}
            onSubmit={(input) => save.mutate({ id: editing.guest?.id, input })}
          />
        )}
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Impor daftar tamu"
        description="Satu tamu per baris. Bisa ditempel langsung dari spreadsheet."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setImportOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => importMany.mutate(parsed)} disabled={parsed.length === 0} loading={importMany.isPending}>
              Impor {parsed.length || ''} tamu
            </Button>
          </>
        }
      >
        <Field label="Daftar tamu" hint="Urutan kolom: Nama, Kategori, Kursi, Telepon, Meja, Catatan, Instagram. Hanya nama yang wajib.">
          {(p) => (
            <Textarea
              {...p}
              rows={9}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="font-mono text-sm"
              placeholder={'Budi Santoso, VIP, 2, 0812345678, Meja A1\nSiti Aminah & Suami, Sahabat, 2'}
            />
          )}
        </Field>
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus tamu?"
        message={`${toDelete?.name} (kode ${toDelete?.slug}) akan dihapus. Tautan undangannya tidak lagi membuka fitur tamu.`}
        confirmLabel="Hapus tamu"
        busy={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  );
};
