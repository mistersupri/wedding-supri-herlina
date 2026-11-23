import { PhotoThumb } from '../../../components/ui/PhotoThumb.js';
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { cmsApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { formatDateTime } from '../../../lib/format.js';
import { useDebounce } from '../../../hooks/useDebounce.js';
import { PageHeader, Pagination, Stat, usePagination } from '../../../components/cms/CmsPage.js';
import { useToast } from '../../../components/cms/Toast.js';
import { Button } from '../../../components/ui/Button.js';
import { Checkbox, Input } from '../../../components/ui/Field.js';
import { ConfirmDialog } from '../../../components/ui/Modal.js';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/StateView.js';
import { CameraRulesPanel } from '../../../components/cms/moments/CameraRulesPanel.js';
import { QrCardPanel } from '../../../components/cms/moments/QrCardPanel.js';
import { CommentsDialog } from '../../../components/cms/moments/CommentsDialog.js';
import { FramePanel } from '../../../components/cms/moments/FramePanel.js';
import { lookById } from '../../../features/moments/film/looks.js';
import type { PhotoMoment } from '@shared/types';

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
      client.invalidateQueries({ queryKey: queryKeys.cms.stats });
      notify(saved.approved ? 'Foto tampil di galeri tamu.' : 'Foto disembunyikan dari tamu.');
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });
  const pendingCount = moments.filter((m) => m.approved === false).length;
  const [includeHidden, setIncludeHidden] = useState(false);
  const approveAll = useMutation({
    mutationFn: cmsApi.photoMoments.approveAll,
    onSuccess: (res) => {
      client.invalidateQueries({ queryKey: queryKeys.cms.photoMoments });
      client.invalidateQueries({ queryKey: queryKeys.cms.stats });
      notify(res.count ? `${res.count} foto tampil di galeri tamu.` : 'Tidak ada foto yang menunggu.');
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  return (
    <>
      <PageHeader
        title="Photo Moments"
        description="Kamera sekali pakai di HP tamu: look film, efek, bingkai, galeri bersama, dan layar besar."
        actions={
          <>
            <Button variant="secondary" onClick={() => cmsApi.photoMoments.downloadZip(includeHidden).catch((e: Error) => notify(e.message, 'error'))}>
              Unduh semua foto (ZIP)
            </Button>
            <Button variant="secondary" onClick={() => query.refetch()} loading={query.isRefetching}>
              Muat ulang
            </Button>
          </>
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

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Checkbox label="ZIP juga memuat foto yang disembunyikan" checked={includeHidden} onChange={(e) => setIncludeHidden(e.target.checked)} />
        {pendingCount > 0 && (
          <Button variant="secondary" size="sm" onClick={() => approveAll.mutate()} loading={approveAll.isPending}>
            Tayangkan semua yang menunggu ({pendingCount})
          </Button>
        )}
      </div>

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
          type="search" inputMode="search" enterKeyHint="search" autoComplete="off" placeholder="Cari nama tamu, kode, atau keterangan"
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
        <ul className="mt-4 grid grid-cols-2 items-start gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {pager.slice.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-md border border-line bg-card">
              <a
                href={m.photoUrl}
                target="_blank"
                rel="noreferrer"
                className="block bg-paper-2"
                aria-label={`Buka foto dari ${m.guestName} di tab baru`}
              >
                <PhotoThumb src={m.photoUrl} />
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
