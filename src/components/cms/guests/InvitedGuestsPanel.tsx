import React, { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { cmsApi, publicApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { coupleNames, guestInvitationUrl } from '../../../lib/format.js';
import { loadInviteTemplate, renderInvite, whatsappLink } from '../../../lib/inviteMessage.js';
import { buildXlsx } from '../../../lib/xlsx.js';
import { useDebounce } from '../../../hooks/useDebounce.js';
import { useCopy } from '../../../hooks/useCopy.js';
import { Stat } from '../CmsPage.js';
import { useToast } from '../Toast.js';
import { InviteQueueModal, InviteTemplateModal } from './InviteSender.js';
import { GuestImportModal } from './GuestImportModal.js';
import { GUEST_CATEGORIES, GuestForm, emptyGuest, guestToInput } from './GuestForm.js';
import { Button, IconButton } from '../../ui/Button.js';
import { Field, Input, Select } from '../../ui/Field.js';
import { ConfirmDialog, Modal } from '../../ui/Modal.js';
import { Chip } from '../../ui/StatusChip.js';
import { EmptyState, ErrorState, LoadingState } from '../../ui/StateView.js';
import type { GuestBulkAction, GuestListQuery, InvitedGuest, InvitedGuestInput } from '@shared/types';

const PAGE_SIZES = [15, 30, 50, 100];
type Edit = { kind: 'category' | 'pax' | 'table'; value: string } | null;

/** Every guest matching the filters, fetched page by page (for export and the sending queue). */
async function fetchAllMatching(q: GuestListQuery) {
  const out: InvitedGuest[] = [];
  for (let page = 1; ; page++) {
    const res = await cmsApi.invitedGuests.page({ ...q, page, pageSize: 200 });
    out.push(...res.data);
    if (out.length >= res.total || res.data.length === 0) return out;
  }
}

export const InvitedGuestsPanel: React.FC = () => {
  const client = useQueryClient();
  const notify = useToast();
  const { copy, copied } = useCopy();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [sent, setSent] = useState<'ALL' | 'SENT' | 'UNSENT'>('ALL');
  const [attendance, setAttendance] = useState<'ALL' | 'CHECKED_IN' | 'NOT_CHECKED_IN'>('ALL');
  const [sort, setSort] = useState<NonNullable<GuestListQuery['sort']>>('NAME');
  const [pageSize, setPageSize] = useState(15);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ guest: InvitedGuest | null } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [queueGuests, setQueueGuests] = useState<InvitedGuest[] | null>(null);
  const [template, setTemplate] = useState(loadInviteTemplate);
  const [toDelete, setToDelete] = useState<InvitedGuest | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [bulkEdit, setBulkEdit] = useState<Edit>(null);
  const [busy, setBusy] = useState(false);
  const q = useDebounce(search, 300).trim();

  const params: GuestListQuery = { search: q, category, sent, attendance, sort };
  const filterKey = JSON.stringify(params);
  // A new search or filter starts at page 1; an old selection stays only while the list is unchanged.
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [filterKey, pageSize]);

  const query = useQuery({
    queryKey: [...queryKeys.cms.invitedGuests, 'page', filterKey, page, pageSize],
    queryFn: () => cmsApi.invitedGuests.page({ ...params, page, pageSize }),
    placeholderData: keepPreviousData,
  });
  const result = query.data;
  const guests = result?.data ?? [];
  const total = result?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const stats = result?.stats;
  const categories = useMemo(() => [...new Set([...(result?.categories ?? []), ...GUEST_CATEGORIES])].sort((a, b) => a.localeCompare(b, 'id')), [result?.categories]);

  const invitation = useQuery({ queryKey: queryKeys.invitation, queryFn: publicApi.invitation, staleTime: 5 * 60_000 });
  const couple = invitation.data ? coupleNames(invitation.data) : 'kami';
  const inviteMessage = (g: InvitedGuest) => renderInvite(template, g, couple);
  const waLink = (g: InvitedGuest) => whatsappLink(g.phone, inviteMessage(g));

  const refresh = () => client.invalidateQueries({ queryKey: queryKeys.cms.invitedGuests });
  const onError = (err: Error) => notify(err.message, 'error');

  const pageIds = guests.map((g) => g.id);
  const pageSelected = pageIds.filter((id) => selected.has(id)).length;
  const allMatchingSelected = total > 0 && (result?.ids ?? []).every((id) => selected.has(id));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const togglePage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (pageSelected === pageIds.length) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  const ids = [...selected];

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
    mutationFn: ({ guests: list, skip }: { guests: InvitedGuestInput[]; skip: boolean }) => cmsApi.invitedGuests.createMany(list, skip),
    onSuccess: (res) => {
      refresh();
      notify(res.message || `${res.created.length} tamu ditambahkan.`);
      setImportOpen(false);
    },
    onError,
  });
  const markSent = useMutation({
    mutationFn: ({ ids: list, value }: { ids: string[]; value: boolean }) => cmsApi.invitedGuests.markSent(list, value),
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
  const bulk = useMutation({
    mutationFn: (op: GuestBulkAction) => cmsApi.invitedGuests.bulk(ids, op),
    onSuccess: (res, op) => {
      refresh();
      notify(`${res.count} tamu diperbarui.`);
      setBulkEdit(null);
      if (op.action === 'delete') {
        setBulkDelete(false);
        setSelected(new Set());
      }
    },
    onError,
  });

  const selectedGuests = async () => {
    const all = await fetchAllMatching(params);
    return all.filter((g) => selected.has(g.id));
  };
  const exportXlsx = async () => {
    setBusy(true);
    try {
      const list = selected.size ? await selectedGuests() : await fetchAllMatching(params);
      const rows = [
        ['Nama', 'Kategori', 'Kursi', 'Telepon', 'Meja', 'Catatan', 'Instagram', 'Kode', 'Terkirim', 'Hadir'],
        ...list.map((g) => [g.name, g.category, String(g.pax), g.phone || '', g.tableNumber || '', g.customNote || '', g.instagram || '', g.slug, g.invitationSent ? 'ya' : '', g.isCheckedIn ? 'ya' : '']),
      ];
      const url = URL.createObjectURL(buildXlsx(rows, 'Tamu', [26, 14, 8, 20, 10, 28, 18, 8, 10, 8]));
      const a = Object.assign(document.createElement('a'), { href: url, download: 'daftar-tamu.xlsx' });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      onError(e as Error);
    } finally {
      setBusy(false);
    }
  };
  const openQueue = async () => {
    setBusy(true);
    try {
      setQueueGuests(selected.size ? await selectedGuests() : await fetchAllMatching({ ...params, sent: 'UNSENT' }));
    } catch (e) {
      onError(e as Error);
    } finally {
      setBusy(false);
    }
  };

  const filtersActive = Boolean(q) || category !== 'ALL' || sent !== 'ALL' || attendance !== 'ALL';

  return (
    <div>
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Undangan" value={stats.totalInvited} detail={`${stats.totalPaxAllocated} kursi`} />
          <Stat
            label="Sudah dikirim"
            value={result?.sentCount ?? 0}
            detail={`${stats.totalInvited ? Math.round(((result?.sentCount ?? 0) / stats.totalInvited) * 100) : 0}% dari daftar`}
          />
          <Stat label="Sudah hadir" value={stats.totalCheckedIn} detail={`${stats.totalActualPax} orang datang`} />
          <Stat label="Belum hadir" value={stats.totalRemaining} />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Cari tamu</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="search" inputMode="search" enterKeyHint="search" autoComplete="off" placeholder="Cari nama, kode, telepon, meja, Instagram"
              className="pl-9"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex">
            <label>
              <span className="sr-only">Kategori</span>
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="ALL">Semua kategori</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </label>
            <label>
              <span className="sr-only">Status kirim</span>
              <Select value={sent} onChange={(e) => setSent(e.target.value as typeof sent)}>
                <option value="ALL">Semua pengiriman</option>
                <option value="UNSENT">Belum dikirim</option>
                <option value="SENT">Sudah dikirim</option>
              </Select>
            </label>
            <label>
              <span className="sr-only">Status kehadiran</span>
              <Select value={attendance} onChange={(e) => setAttendance(e.target.value as typeof attendance)}>
                <option value="ALL">Semua kehadiran</option>
                <option value="CHECKED_IN">Sudah hadir</option>
                <option value="NOT_CHECKED_IN">Belum hadir</option>
              </Select>
            </label>
            <label>
              <span className="sr-only">Urutkan</span>
              <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                <option value="NAME">Urut nama</option>
                <option value="NEWEST">Terbaru ditambahkan</option>
                <option value="CATEGORY">Urut kategori</option>
                <option value="CODE">Urut kode</option>
              </Select>
            </label>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button variant="secondary" onClick={() => setTemplateOpen(true)}>
            Pesan
          </Button>
          <Button variant="secondary" loading={busy} onClick={openQueue}>
            Kirim berurutan
          </Button>
          <Button variant="secondary" loading={busy} onClick={exportXlsx}>
            Ekspor Excel
          </Button>
          <Button variant="secondary" onClick={() => cmsApi.exportGuests().catch((e: Error) => notify(e.message, 'error'))}>
            Ekspor CSV
          </Button>
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            Impor Excel / daftar
          </Button>
          <Button onClick={() => setEditing({ guest: null })}>Tambah tamu</Button>
        </div>
      </div>

      {selected.size > 0 && (
        <div role="region" aria-label="Aksi untuk tamu terpilih" className="sticky top-2 z-10 mt-4 flex flex-wrap items-center gap-2 rounded-md border border-primary bg-card p-3 shadow-md">
          <p className="mr-auto text-sm font-semibold">
            {selected.size} tamu dipilih
            {!allMatchingSelected && total > selected.size && (
              <button type="button" className="ml-2 font-normal text-primary underline underline-offset-4" onClick={() => setSelected(new Set(result?.ids))}>
                Pilih semua {total} yang cocok
              </button>
            )}
          </p>
          <Button size="sm" variant="secondary" loading={bulk.isPending} onClick={() => bulk.mutate({ action: 'sent', value: true })}>
            Tandai terkirim
          </Button>
          <Button size="sm" variant="secondary" loading={bulk.isPending} onClick={() => bulk.mutate({ action: 'sent', value: false })}>
            Tandai belum
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setBulkEdit({ kind: 'category', value: categories[0] ?? 'Umum' })}>
            Ubah kategori
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setBulkEdit({ kind: 'pax', value: '2' })}>
            Ubah kursi
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setBulkEdit({ kind: 'table', value: '' })}>
            Atur meja
          </Button>
          <Button size="sm" variant="ghost" className="text-no" onClick={() => setBulkDelete(true)}>
            Hapus
          </Button>
          <IconButton label="Batalkan pilihan" onClick={() => setSelected(new Set())}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-md border border-line bg-card">
        {query.isLoading ? (
          <LoadingState label="Memuat daftar tamu..." />
        ) : query.isError ? (
          <ErrorState title="Daftar tamu belum bisa dimuat." onRetry={() => query.refetch()} />
        ) : guests.length === 0 ? (
          <EmptyState
            title={filtersActive ? 'Tidak ada tamu yang cocok' : 'Daftar tamu masih kosong'}
            detail={filtersActive ? 'Ubah kata kunci atau saringan.' : 'Tambah satu per satu atau impor dari file Excel.'}
          />
        ) : (
          <>
            <label className="flex min-h-11 items-center gap-3 border-b border-line bg-paper-2 px-4 text-sm font-semibold">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--primary)]"
                checked={pageSelected === pageIds.length}
                ref={(el) => {
                  if (el) el.indeterminate = pageSelected > 0 && pageSelected < pageIds.length;
                }}
                onChange={togglePage}
              />
              Pilih halaman ini
              <span className="ml-auto font-normal text-ink-soft">{total} tamu</span>
            </label>
            <ul className={`divide-y divide-line transition-opacity ${query.isPlaceholderData ? 'opacity-60' : ''}`}>
              {guests.map((g) => {
                const wa = waLink(g);
                return (
                  <li key={g.id} className={`grid gap-3 p-4 md:grid-cols-[auto_1fr_auto] md:items-center ${selected.has(g.id) ? 'bg-paper-2' : ''}`}>
                    <label className="flex min-h-11 min-w-11 items-center justify-center">
                      <span className="sr-only">Pilih {g.name}</span>
                      <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={selected.has(g.id)} onChange={() => toggle(g.id)} />
                    </label>
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
          </>
        )}
      </div>

      {total > 0 && (
        <nav aria-label="Halaman tamu" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
          <p>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} dari {total} tamu
          </p>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2">
              Per halaman
              <Select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="!min-h-9 !w-auto !py-1">
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </label>
            <IconButton label="Halaman sebelumnya" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-5 w-5" />
            </IconButton>
            <label className="flex items-center gap-1">
              <span className="sr-only">Halaman</span>
              <Input
                type="number"
                min={1}
                max={pages}
                value={page}
                onChange={(e) => setPage(Math.min(pages, Math.max(1, Number(e.target.value) || 1)))}
                className="!min-h-9 !w-16 !px-2 !py-1 text-center"
              />
              / {pages}
            </label>
            <IconButton label="Halaman berikutnya" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-5 w-5" />
            </IconButton>
          </div>
        </nav>
      )}

      <InviteTemplateModal
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        couple={couple}
        sample={guests[0]}
        onSaved={setTemplate}
      />
      <InviteQueueModal
        open={queueGuests !== null}
        onClose={() => setQueueGuests(null)}
        guests={queueGuests ?? []}
        template={template}
        couple={couple}
        onSent={(id) => markSent.mutate({ ids: [id], value: true })}
      />

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

      <GuestImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        busy={importMany.isPending}
        onImport={(list, skip) => importMany.mutate({ guests: list, skip })}
      />

      <Modal
        open={bulkEdit !== null}
        onClose={() => setBulkEdit(null)}
        title={bulkEdit?.kind === 'category' ? 'Ubah kategori' : bulkEdit?.kind === 'pax' ? 'Ubah jumlah kursi' : 'Atur nomor meja'}
        description={`Berlaku untuk ${selected.size} tamu terpilih.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setBulkEdit(null)}>
              Batal
            </Button>
            <Button
              loading={bulk.isPending}
              onClick={() =>
                bulkEdit &&
                bulk.mutate(
                  bulkEdit.kind === 'pax'
                    ? { action: 'pax', value: Number(bulkEdit.value) }
                    : bulkEdit.kind === 'category'
                      ? { action: 'category', value: bulkEdit.value }
                      : { action: 'table', value: bulkEdit.value },
                )
              }
              disabled={bulkEdit?.kind === 'category' && !bulkEdit.value.trim()}
            >
              Terapkan
            </Button>
          </>
        }
      >
        {bulkEdit && (
          <Field
            label={bulkEdit.kind === 'category' ? 'Kategori' : bulkEdit.kind === 'pax' ? 'Kursi per tamu' : 'Nomor meja'}
            hint={bulkEdit.kind === 'table' ? 'Kosongkan untuk menghapus nomor meja.' : undefined}
          >
            {(p) =>
              bulkEdit.kind === 'pax' ? (
                <Input {...p} type="number" min={1} max={50} inputMode="numeric" value={bulkEdit.value} onChange={(e) => setBulkEdit({ ...bulkEdit, value: e.target.value })} />
              ) : (
                <Input
                  {...p}
                  list={bulkEdit.kind === 'category' ? 'guest-categories' : undefined}
                  maxLength={40}
                  value={bulkEdit.value}
                  onChange={(e) => setBulkEdit({ ...bulkEdit, value: e.target.value })}
                />
              )
            }
          </Field>
        )}
        <datalist id="guest-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Modal>

      <ConfirmDialog
        open={bulkDelete}
        title={`Hapus ${selected.size} tamu?`}
        message="Tamu terpilih dihapus dari daftar dan tautan undangannya tidak lagi membuka fitur tamu. Tindakan ini tidak bisa dibatalkan."
        confirmLabel={`Hapus ${selected.size} tamu`}
        busy={bulk.isPending}
        onCancel={() => setBulkDelete(false)}
        onConfirm={() => bulk.mutate({ action: 'delete' })}
      />

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
