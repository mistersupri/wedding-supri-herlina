import React, { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, Copy, ExternalLink, Eye, FileSpreadsheet, FileText, Hash, MessageCircle, MessageSquareText, Pencil, Plus, Search, Send, Tag, Trash2, Undo2, Upload, Users, X } from 'lucide-react';
import { cmsApi, publicApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { coupleNames, formatDateTime, guestInvitationUrl, timeAgo } from '../../../lib/format.js';
import { loadTemplate, renderInvite, whatsappLink, type MessageKind } from '../../../lib/inviteMessage.js';
import { buildXlsx } from '../../../lib/xlsx.js';
import { useDebounce } from '../../../hooks/useDebounce.js';
import { useCopy } from '../../../hooks/useCopy.js';
import { Stat } from '../CmsPage.js';
import { useToast } from '../Toast.js';
import { InviteQueueModal, InviteTemplateModal, type QueueJob } from './InviteSender.js';
import { GuestImportModal } from './GuestImportModal.js';
import { GUEST_CATEGORIES, GuestForm, emptyGuest, guestToInput } from './GuestForm.js';
import { Button, buttonClass } from '../../ui/Button.js';
import { Field, Input, Select } from '../../ui/Field.js';
import { ConfirmDialog, Modal } from '../../ui/Modal.js';
import { Chip, StatusChip } from '../../ui/StatusChip.js';
import { EmptyState, ErrorState, LoadingState, Spinner } from '../../ui/StateView.js';
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

/** The three groups of guests who still need a nudge, and which filters list them. */
const SEGMENTS: {
  id: 'unopened' | 'openedNoRsvp' | 'noRsvp';
  label: string;
  detail: string;
  kind: MessageKind;
  filters: Pick<GuestListQuery, 'sent' | 'opened' | 'rsvp'>;
}[] = [
  { id: 'unopened', label: 'Belum membuka', detail: 'Sudah dikirimi undangan tetapi belum membukanya.', kind: 'reminderUnopened', filters: { sent: 'SENT', opened: 'UNOPENED', rsvp: 'ALL' } },
  { id: 'openedNoRsvp', label: 'Membuka, belum RSVP', detail: 'Sudah membaca undangan, belum mengisi kehadiran.', kind: 'reminderRsvp', filters: { sent: 'ALL', opened: 'OPENED', rsvp: 'NOT_REPLIED' } },
  { id: 'noRsvp', label: 'Belum RSVP', detail: 'Semua yang belum mengisi kehadiran, dibuka atau tidak.', kind: 'reminderRsvp', filters: { sent: 'ALL', opened: 'ALL', rsvp: 'NOT_REPLIED' } },
];

export const InvitedGuestsPanel: React.FC = () => {
  const client = useQueryClient();
  const notify = useToast();
  const { copy, copied } = useCopy();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [sent, setSent] = useState<'ALL' | 'SENT' | 'UNSENT'>('ALL');
  const [attendance, setAttendance] = useState<'ALL' | 'CHECKED_IN' | 'NOT_CHECKED_IN'>('ALL');
  const [opened, setOpened] = useState<'ALL' | 'OPENED' | 'UNOPENED'>('ALL');
  const [rsvp, setRsvp] = useState<'ALL' | 'REPLIED' | 'NOT_REPLIED'>('ALL');
  const [sort, setSort] = useState<NonNullable<GuestListQuery['sort']>>('NAME');
  const [pageSize, setPageSize] = useState(15);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ guest: InvitedGuest | null } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [job, setJob] = useState<QueueJob | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [templateKind, setTemplateKind] = useState<MessageKind>('invite');
  const [template, setTemplate] = useState(() => loadTemplate('invite'));
  const [toDelete, setToDelete] = useState<InvitedGuest | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [bulkEdit, setBulkEdit] = useState<Edit>(null);
  const [busy, setBusy] = useState(false);
  const q = useDebounce(search, 300).trim();

  const params: GuestListQuery = { search: q, category, sent, attendance, opened, rsvp, sort };
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
  const markReminded = useMutation({
    mutationFn: (id: string) => cmsApi.invitedGuests.bulk([id], { action: 'reminded' }),
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
        ['Nama', 'Kategori', 'Kursi', 'Telepon', 'Meja', 'Catatan', 'Instagram', 'Kode', 'Terkirim', 'Dibuka', 'Terakhir dibuka', 'Hadir'],
        ...list.map((g) => [g.name, g.category, String(g.pax), g.phone || '', g.tableNumber || '', g.customNote || '', g.instagram || '', g.slug, g.invitationSent ? 'ya' : '', g.firstOpenedAt ? 'ya' : '', g.lastOpenedAt ? formatDateTime(g.lastOpenedAt) : '', g.isCheckedIn ? 'ya' : '']),
      ];
      const url = URL.createObjectURL(buildXlsx(rows, 'Tamu', [26, 14, 8, 20, 10, 28, 18, 8, 10, 10, 20, 8]));
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
  const openInviteQueue = async () => {
    setBusy(true);
    try {
      const guests = selected.size ? await selectedGuests() : await fetchAllMatching({ ...params, sent: 'UNSENT' });
      setJob({ kind: 'invite', title: 'Kirim undangan berurutan', guests });
      setQueueOpen(true);
    } catch (e) {
      onError(e as Error);
    } finally {
      setBusy(false);
    }
  };
  const openReminderQueue = async (segment: (typeof SEGMENTS)[number]) => {
    setBusy(true);
    try {
      const guests = await fetchAllMatching({ category: 'ALL', attendance: 'ALL', ...segment.filters });
      setJob({ kind: segment.kind, title: `Kirim pengingat: ${segment.label.toLowerCase()}`, guests });
      setQueueOpen(true);
    } catch (e) {
      onError(e as Error);
    } finally {
      setBusy(false);
    }
  };
  const showSegment = (segment: (typeof SEGMENTS)[number]) => {
    setSearch('');
    setCategory('ALL');
    setAttendance('ALL');
    setSent(segment.filters.sent ?? 'ALL');
    setOpened(segment.filters.opened ?? 'ALL');
    setRsvp(segment.filters.rsvp ?? 'ALL');
    document.getElementById('guest-list')?.scrollIntoView({ block: 'start' });
  };
  const editTemplate = (kind: MessageKind) => {
    setTemplateKind(kind);
    setTemplateOpen(true);
  };

  const filtersActive = Boolean(q) || category !== 'ALL' || sent !== 'ALL' || opened !== 'ALL' || rsvp !== 'ALL' || attendance !== 'ALL';

  return (
    <div>
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label="Undangan" value={stats.totalInvited} detail={`${stats.totalPaxAllocated} kursi`} />
          <Stat
            label="Sudah dikirim"
            value={result?.sentCount ?? 0}
            detail={`${stats.totalInvited ? Math.round(((result?.sentCount ?? 0) / stats.totalInvited) * 100) : 0}% dari daftar`}
          />
          <Stat
            label="Sudah dibuka"
            value={result?.openedCount ?? 0}
            detail={`${stats.totalInvited ? Math.round(((result?.openedCount ?? 0) / stats.totalInvited) * 100) : 0}% dari daftar`}
          />
          <Stat label="Sudah hadir" value={stats.totalCheckedIn} detail={`${stats.totalActualPax} orang datang`} />
          <div className="col-span-2 lg:col-span-1 [&>div]:h-full">
            <Stat label="Belum hadir" value={stats.totalRemaining} detail={`dari ${stats.totalInvited} undangan`} />
          </div>
        </div>
      )}

      {result && (
        <section aria-labelledby="reminder-title" className="mb-6 rounded-md border border-line bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <h3 id="reminder-title" className="flex items-center gap-2 font-semibold">
              <BellRing className="h-4 w-4 text-prada-ink" aria-hidden="true" /> Pengingat tamu
            </h3>
            <Button variant="ghost" size="sm" onClick={() => editTemplate('reminderRsvp')}>
              <MessageSquareText className="h-4 w-4" aria-hidden="true" /> Atur pesan pengingat
            </Button>
          </div>
          <ul className="divide-y divide-line">
            {SEGMENTS.map((seg) => {
              const count = result.reminders[seg.id];
              return (
                <li key={seg.id} className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[auto_1fr_auto]">
                  <span className="display-numeral w-10 text-3xl leading-none">{count}</span>
                  <div className="min-w-0">
                    <p className="font-semibold">{seg.label}</p>
                    <p className="text-sm text-ink-soft">{seg.detail}</p>
                  </div>
                  <div className="col-span-2 flex flex-wrap gap-2 md:col-span-1">
                    <Button variant="secondary" size="sm" disabled={count === 0} onClick={() => showSegment(seg)}>
                      <Eye className="h-4 w-4" aria-hidden="true" /> Lihat daftar
                    </Button>
                    <Button size="sm" disabled={count === 0} loading={busy} onClick={() => openReminderQueue(seg)}>
                      <Send className="h-4 w-4" aria-hidden="true" /> Kirim pengingat
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div id="guest-list" className="flex scroll-mt-4 flex-col gap-3">
        <div className="flex flex-col gap-2">
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <label>
              <span className="sr-only">Kategori</span>
              <Select value={category} onChange={(e) => setCategory(e.target.value)} className={category !== 'ALL' ? '!border-primary' : ''}>
                <option value="ALL">Kategori</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </label>
            <label>
              <span className="sr-only">Status kirim</span>
              <Select value={sent} onChange={(e) => setSent(e.target.value as typeof sent)} className={sent !== 'ALL' ? '!border-primary' : ''}>
                <option value="ALL">Pengiriman</option>
                <option value="UNSENT">Belum dikirim</option>
                <option value="SENT">Sudah dikirim</option>
              </Select>
            </label>
            <label>
              <span className="sr-only">Status dibuka</span>
              <Select value={opened} onChange={(e) => setOpened(e.target.value as typeof opened)} className={opened !== 'ALL' ? '!border-primary' : ''}>
                <option value="ALL">Dibuka</option>
                <option value="OPENED">Sudah dibuka</option>
                <option value="UNOPENED">Belum dibuka</option>
              </Select>
            </label>
            <label>
              <span className="sr-only">Status RSVP</span>
              <Select value={rsvp} onChange={(e) => setRsvp(e.target.value as typeof rsvp)} className={rsvp !== 'ALL' ? '!border-primary' : ''}>
                <option value="ALL">RSVP</option>
                <option value="REPLIED">Sudah RSVP</option>
                <option value="NOT_REPLIED">Belum RSVP</option>
              </Select>
            </label>
            <label>
              <span className="sr-only">Status kehadiran</span>
              <Select value={attendance} onChange={(e) => setAttendance(e.target.value as typeof attendance)} className={attendance !== 'ALL' ? '!border-primary' : ''}>
                <option value="ALL">Kehadiran</option>
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
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setEditing({ guest: null })} className="w-full sm:order-last sm:ml-auto sm:w-auto">
            <Plus className="h-4 w-4" aria-hidden="true" /> Tambah tamu
          </Button>
          <Button variant="secondary" loading={busy} onClick={openInviteQueue}>
            <Send className="h-4 w-4" aria-hidden="true" /> Kirim undangan
          </Button>
          <Button variant="secondary" onClick={() => editTemplate('invite')}>
            <MessageSquareText className="h-4 w-4" aria-hidden="true" /> Atur pesan
          </Button>
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" aria-hidden="true" /> Impor daftar
          </Button>
          <Button variant="secondary" loading={busy} onClick={exportXlsx}>
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Ekspor Excel
          </Button>
          <Button variant="secondary" onClick={() => cmsApi.exportGuests().catch((e: Error) => notify(e.message, 'error'))}>
            <FileText className="h-4 w-4" aria-hidden="true" /> Ekspor CSV
          </Button>
        </div>
      </div>

      {selected.size > 0 && (
        <div
          role="region"
          aria-label="Aksi untuk tamu terpilih"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-primary bg-card px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgb(0_0_0/0.12)] md:sticky md:top-2 md:bottom-auto md:mt-4 md:flex md:items-center md:gap-3 md:rounded-md md:border md:px-3 md:py-2 md:shadow-md"
        >
          <div className="flex items-center justify-between gap-2 md:flex-1">
            <p className="min-w-0 pl-1 text-sm font-semibold">
              {selected.size} tamu dipilih
              {!allMatchingSelected && total > selected.size && (
                <button type="button" className="ml-2 min-h-11 font-normal whitespace-nowrap text-primary underline underline-offset-4" onClick={() => setSelected(new Set(result?.ids))}>
                  Pilih semua {total}
                </button>
              )}
            </p>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              <X className="h-4 w-4" aria-hidden="true" /> Batal
            </Button>
          </div>
          <div className="mt-1 grid grid-cols-3 gap-1.5 md:mt-0 md:flex md:flex-wrap md:justify-end">
            <Button variant="secondary" size="sm" disabled={bulk.isPending} onClick={() => bulk.mutate({ action: 'sent', value: true })}>
              <CheckCheck className="h-4 w-4" aria-hidden="true" /> Terkirim
            </Button>
            <Button variant="secondary" size="sm" disabled={bulk.isPending} onClick={() => bulk.mutate({ action: 'sent', value: false })}>
              <Undo2 className="h-4 w-4" aria-hidden="true" /> Belum kirim
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setBulkEdit({ kind: 'category', value: categories[0] ?? 'Umum' })}>
              <Tag className="h-4 w-4" aria-hidden="true" /> Kategori
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setBulkEdit({ kind: 'pax', value: '2' })}>
              <Users className="h-4 w-4" aria-hidden="true" /> Kursi
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setBulkEdit({ kind: 'table', value: '' })}>
              <Hash className="h-4 w-4" aria-hidden="true" /> Meja
            </Button>
            <Button variant="danger" size="sm" onClick={() => setBulkDelete(true)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Hapus
            </Button>
          </div>
        </div>
      )}

      <div className={`mt-4 overflow-hidden rounded-md border border-line bg-card ${selected.size > 0 ? 'mb-20 md:mb-0' : ''}`}>
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
                  <li key={g.id} className={`grid grid-cols-[auto_1fr] items-center gap-x-1 gap-y-1 p-3 pr-4 md:grid-cols-[auto_1fr_auto] md:gap-x-3 md:p-4 ${selected.has(g.id) ? 'bg-paper-2' : ''}`}>
                    <label className="flex h-11 w-11 items-center justify-center">
                      <span className="sr-only">Pilih {g.name}</span>
                      <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={selected.has(g.id)} onChange={() => toggle(g.id)} />
                    </label>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <p className="font-semibold break-words">{g.name}</p>
                        <span className="display-numeral rounded-xs bg-paper-2 px-1.5 text-sm tracking-widest">{g.slug}</span>
                        {g.isCheckedIn && <Chip tone="ok">Hadir</Chip>}
                        {g.firstOpenedAt ? (
                          <span title={`Pertama dibuka ${formatDateTime(g.firstOpenedAt)}`}>
                            <Chip tone="ok">
                              <Eye className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                              Dibuka{g.lastOpenedAt ? ` ${timeAgo(g.lastOpenedAt)}` : ''}
                              {(g.openCount ?? 0) > 1 ? ` · ${g.openCount}×` : ''}
                            </Chip>
                          </span>
                        ) : (
                          g.invitationSent && <Chip tone="neutral">Belum dibuka</Chip>
                        )}
                        {g.rsvp ? <StatusChip status={g.rsvp} suffix="RSVP" /> : g.firstOpenedAt && <Chip tone="maybe">Belum RSVP</Chip>}
                        {(g.reminderCount ?? 0) > 0 && g.lastRemindedAt && (
                          <Chip tone="neutral">Diingatkan {g.reminderCount}× · {timeAgo(g.lastRemindedAt)}</Chip>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm break-words text-ink-soft">
                        {g.category} · {g.pax} kursi{g.tableNumber ? ` · ${g.tableNumber}` : ''}
                        {g.phone ? ` · ${g.phone}` : ''}
                      </p>
                    </div>
                    <div className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-1 md:justify-end">
                      {wa ? (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => !g.invitationSent && markSent.mutate({ ids: [g.id], value: true })}
                          className={buttonClass('primary', 'sm')}
                        >
                          <MessageCircle className="h-4 w-4" aria-hidden="true" /> Kirim WhatsApp<span className="sr-only"> ke {g.name}</span>
                        </a>
                      ) : (
                        <Button variant="secondary" size="sm" onClick={() => copy(inviteMessage(g), g.id)}>
                          {copied === g.id ? <CheckCheck className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                          {copied === g.id ? 'Pesan tersalin' : 'Salin pesan'}
                        </Button>
                      )}
                      <Button variant="secondary" size="sm" onClick={() => setEditing({ guest: g })}>
                        <Pencil className="h-4 w-4" aria-hidden="true" /> Ubah<span className="sr-only"> {g.name}</span>
                      </Button>
                      <details className="group w-full md:w-auto">
                        <summary className={`${buttonClass('ghost', 'sm')} cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden`}>
                          Lainnya <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                        </summary>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <Button variant="secondary" size="sm" aria-pressed={Boolean(g.invitationSent)} onClick={() => markSent.mutate({ ids: [g.id], value: !g.invitationSent })}>
                            <CheckCheck className="h-4 w-4" aria-hidden="true" /> {g.invitationSent ? 'Batalkan terkirim' : 'Tandai terkirim'}
                          </Button>
                          <a href={guestInvitationUrl(g)} target="_blank" rel="noreferrer" className={buttonClass('secondary', 'sm')}>
                            <ExternalLink className="h-4 w-4" aria-hidden="true" /> Buka undangan<span className="sr-only"> {g.name}</span>
                          </a>
                          <Button variant="danger" size="sm" onClick={() => setToDelete(g)}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" /> Hapus<span className="sr-only"> {g.name}</span>
                          </Button>
                        </div>
                      </details>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {total > 0 && (
        <nav aria-label="Halaman tamu" className={`mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-sm text-ink-soft ${selected.size > 0 ? 'mb-20 md:mb-0' : ''}`}>
          <p>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} dari {total}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label>
              <span className="sr-only">Tamu per halaman</span>
              <Select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="!min-h-11 !w-auto !py-1">
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n} / hal
                  </option>
                ))}
              </Select>
            </label>
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Sebelumnya
            </Button>
            <label className="flex items-center gap-1">
              <span className="sr-only">Nomor halaman</span>
              <Input
                type="number"
                min={1}
                max={pages}
                inputMode="numeric"
                value={page}
                onChange={(e) => setPage(Math.min(pages, Math.max(1, Number(e.target.value) || 1)))}
                className="!min-h-11 !w-14 !px-1 text-center"
              />
              <span aria-hidden="true">/ {pages}</span>
            </label>
            <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Berikutnya <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </nav>
      )}

      <InviteTemplateModal
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        couple={couple}
        sample={guests[0]}
        initialKind={templateKind}
        onSaved={(kind, text) => kind === 'invite' && setTemplate(text)}
      />
      <InviteQueueModal
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        job={job}
        couple={couple}
        onSent={(kind, id) => (kind === 'invite' ? markSent.mutate({ ids: [id], value: true }) : markReminded.mutate(id))}
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
