import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { cmsApi, publicApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { formatDateTime } from '../../../lib/format.js';
import { buildFramePresets } from '@shared/photoFrames';
import { useDebounce } from '../../../hooks/useDebounce.js';
import { PageHeader, Pagination, Panel, Stat, usePagination } from '../../../components/cms/CmsPage.js';
import { MediaField } from '../../../components/cms/MediaField.js';
import { useToast } from '../../../components/cms/Toast.js';
import { Button } from '../../../components/ui/Button.js';
import { Checkbox, Input } from '../../../components/ui/Field.js';
import { ConfirmDialog } from '../../../components/ui/Modal.js';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/StateView.js';
import { CameraRulesPanel } from '../../../components/cms/moments/CameraRulesPanel.js';
import { QrCardPanel } from '../../../components/cms/moments/QrCardPanel.js';
import { CommentsDialog } from '../../../components/cms/moments/CommentsDialog.js';
import { lookById } from '../../../features/moments/film/looks.js';
import type { PhotoFrameConfig, PhotoMoment } from '@shared/types';

const FramePanel: React.FC = () => {
  const client = useQueryClient();
  const notify = useToast();
  const { data: invitation } = useQuery({ queryKey: queryKeys.invitation, queryFn: publicApi.invitation });
  const { data } = useQuery({ queryKey: queryKeys.cms.frame, queryFn: cmsApi.photoMoments.frame });
  const [form, setForm] = useState<PhotoFrameConfig | null>(null);
  const presets = useMemo(
    () => buildFramePresets(invitation?.groomShortName || 'Mempelai', invitation?.brideShortName || 'Pengantin'),
    [invitation],
  );

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: cmsApi.photoMoments.saveFrame,
    onSuccess: (saved) => {
      client.setQueryData(queryKeys.cms.frame, saved);
      notify('Bingkai foto tersimpan.');
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  if (!form) return null;
  const isCustom = !presets.some((p) => p.dataUrl === form.frameOverlayUrl);

  return (
    <Panel
      title="Bingkai acara"
      description="Pilihan bingkai khusus acara Anda di kamera tamu, di samping bingkai putih dan hitam bawaan."
      actions={
        <Button onClick={() => save.mutate(form)} loading={save.isPending}>
          Simpan bingkai
        </Button>
      }
      className="mb-6"
    >
      <Checkbox label="Tawarkan bingkai acara" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
      <div role="radiogroup" aria-label="Pilihan bingkai" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {presets.map((p) => {
          const active = form.frameOverlayUrl === p.dataUrl;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setForm({ ...form, frameOverlayUrl: p.dataUrl, frameName: p.name })}
              className={`rounded-sm border p-2 text-left ${active ? 'border-primary ring-2 ring-primary' : 'border-line hover:border-field'}`}
            >
              <span className="relative block aspect-[4/5] overflow-hidden rounded-xs bg-[linear-gradient(135deg,#8a7a68,#c9b79d)]">
                <img src={p.dataUrl} alt="" className="absolute inset-0 h-full w-full" />
              </span>
              <span className="mt-2 block text-sm font-semibold">{p.name}</span>
              <span className="block text-xs text-ink-soft">{p.description}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-5">
        <MediaField
          label="Atau unggah bingkai sendiri"
          category="general"
          aspect="portrait"
          maxDimension={1600}
          value={isCustom ? form.frameOverlayUrl : ''}
          onChange={(url) => setForm({ ...form, frameOverlayUrl: url, frameName: 'Bingkai unggahan' })}
          hint="PNG transparan dengan rasio 4:5 (misal 800 × 1000 px)."
        />
      </div>
    </Panel>
  );
};

export const CMSPhotoMomentsTab: React.FC = () => {
  const client = useQueryClient();
  const notify = useToast();
  const query = useQuery({ queryKey: queryKeys.cms.photoMoments, queryFn: cmsApi.photoMoments.list });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PENDING'>('ALL');
  const [toDelete, setToDelete] = useState<PhotoMoment | null>(null);
  const [commentsOf, setCommentsOf] = useState<PhotoMoment | null>(null);
  const q = useDebounce(search, 250).trim().toLowerCase();
  const moments = query.data || [];
  const filtered = useMemo(
    () =>
      moments.filter(
        (m) =>
          (filter === 'ALL' || m.approved === false) &&
          (!q ||
            m.guestName.toLowerCase().includes(q) ||
            (m.guestSlug || '').toLowerCase().includes(q) ||
            (m.caption || '').toLowerCase().includes(q)),
      ),
    [moments, q, filter],
  );
  const pager = usePagination(filtered, 24);

  const remove = useMutation({
    mutationFn: cmsApi.photoMoments.remove,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.cms.photoMoments });
      notify('Foto tamu dihapus.');
      setToDelete(null);
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const approve = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) => cmsApi.photoMoments.approve(id, approved),
    onSuccess: (saved) => {
      client.invalidateQueries({ queryKey: queryKeys.cms.photoMoments });
      notify(saved.approved ? 'Foto tampil di galeri tamu.' : 'Foto disembunyikan dari tamu.');
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });
  const pendingCount = moments.filter((m) => m.approved === false).length;

  return (
    <>
      <PageHeader
        title="Photo Moments"
        description="Kamera sekali pakai di HP tamu: look film, efek, bingkai, galeri bersama, dan layar besar."
        actions={
          <Button variant="secondary" onClick={() => query.refetch()} loading={query.isRefetching}>
            Muat ulang
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Foto" value={moments.length} />
        <Stat label="Menunggu dicek" value={pendingCount} />
        <Stat label="Tamu memotret" value={new Set(moments.map((m) => m.guestSlug || m.guestName)).size} />
        <Stat label="Komentar" value={moments.reduce((a, m) => a + (m.commentsCount || 0), 0)} />
      </div>

      <CameraRulesPanel />
      <QrCardPanel />
      <FramePanel />

      <div role="group" aria-label="Saring foto" className="mb-3 flex gap-1">
        {(
          [
            ['ALL', `Semua (${moments.length})`],
            ['PENDING', `Menunggu dicek (${pendingCount})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
            className={`min-h-11 rounded-sm px-4 text-sm font-semibold ${filter === id ? 'bg-primary text-on-primary' : 'text-ink-soft hover:bg-paper-2'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="relative block">
        <span className="sr-only">Cari foto</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama tamu, kode, atau keterangan"
          className="pl-9"
        />
      </label>

      {query.isLoading ? (
        <LoadingState label="Memuat foto tamu..." />
      ) : query.isError ? (
        <ErrorState title="Foto tamu belum bisa dimuat." onRetry={() => query.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={moments.length ? 'Tidak ada foto yang cocok' : 'Belum ada foto dari tamu'}
          detail={moments.length ? undefined : 'Foto akan muncul setelah tamu yang hadir memakai kamera Photo Moments.'}
        />
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {pager.slice.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-md border border-line bg-card">
              <a
                href={m.photoUrl}
                target="_blank"
                rel="noreferrer"
                className="block aspect-[4/5] bg-paper-2"
                aria-label={`Buka foto dari ${m.guestName} di tab baru`}
              >
                <img src={m.photoUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
              </a>
              <div className="p-3">
                <p className="truncate text-sm font-semibold">{m.guestName}</p>
                <p className="text-xs text-ink-soft">
                  {formatDateTime(m.createdAt)}
                  {m.look && m.look !== 'none' ? ` · ${lookById(m.look).code}` : ''}
                  {m.likesCount ? ` · ${m.likesCount} reaksi` : ''}
                </p>
                {m.approved === false && (
                  <p className="mt-1 inline-block rounded-xs bg-maybe-bg px-2 py-0.5 text-xs font-semibold text-maybe">Menunggu dicek</p>
                )}
                {m.caption && <p className="mt-1 line-clamp-2 text-sm">{m.caption}</p>}
                <div className="mt-2 flex flex-wrap gap-1">
                  <Button
                    variant={m.approved === false ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => approve.mutate({ id: m.id, approved: m.approved === false })}
                    loading={approve.isPending && approve.variables?.id === m.id}
                  >
                    {m.approved === false ? 'Tayangkan' : 'Sembunyikan'}
                  </Button>
                  {Boolean(m.commentsCount) && (
                    <Button variant="ghost" size="sm" onClick={() => setCommentsOf(m)}>
                      {m.commentsCount} komentar
                    </Button>
                  )}
                  <a
                    href={m.originalUrl || m.photoUrl}
                    download
                    className="inline-flex min-h-11 items-center rounded-sm px-3 text-[13px] font-semibold hover:bg-paper-2"
                  >
                    Unduh
                  </a>
                  <Button variant="ghost" size="sm" className="text-no" onClick={() => setToDelete(m)}>
                    Hapus
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination {...pager} onPage={pager.setPage} noun="foto" />

      <CommentsDialog photo={commentsOf} onClose={() => setCommentsOf(null)} />

      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus foto ini?"
        message={`Foto dari ${toDelete?.guestName} akan hilang dari galeri tamu. Jatah fotonya kembali bertambah satu.`}
        confirmLabel="Hapus foto"
        busy={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </>
  );
};
