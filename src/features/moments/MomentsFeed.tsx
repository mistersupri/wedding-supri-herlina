import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, MessageCircle } from 'lucide-react';
import { formatTime } from '../../lib/format.js';
import { IconButton } from '../../components/ui/Button.js';
import { Lightbox } from '../../components/ui/Lightbox.js';
import { EmptyState, ErrorState, LoadingState, Spinner } from '../../components/ui/StateView.js';
import { lookById } from './film/looks.js';
import { CameraSheet } from './camera/CameraSheet.js';
import { CommentThread } from './CommentThread.js';
import { UploadTray } from './UploadTray.js';
import { useMoments } from './useMoments.js';
import { useUploadQueue } from './upload/useUploadQueue.js';
import type { CameraConfig, MomentIdentity, PhotoMoment } from '@shared/types';

const EMOJIS = ['❤️', '😍', '🎉', '👏', '😊', '🙏'];

const totalReactions = (p: PhotoMoment) =>
  p.reactions ? Object.values(p.reactions).reduce((a, b) => a + (Number(b) || 0), 0) : p.likesCount || 0;

interface MomentsFeedProps {
  identity: MomentIdentity;
  config: CameraConfig;
  coupleNames: string;
  onBack: () => void;
}

/**
 * The in-venue guest gallery and the door to the camera. Dark on purpose: it is used inside a dim
 * reception hall, and photos read best on the template's deep tone.
 */
export const MomentsFeed: React.FC<MomentsFeedProps> = ({ identity, config, coupleNames, onBack }) => {
  const { settings } = config;
  const m = useMoments(identity);
  const { refresh } = m;
  const onUploaded = useCallback(() => {
    refresh();
  }, [refresh]);
  const queue = useUploadQueue(onUploaded);
  const ownOnly = settings.visibility === 'OWN';
  const [tab, setTab] = useState<'all' | 'mine'>(ownOnly ? 'mine' : 'all');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [shareNote, setShareNote] = useState('');
  const sentinel = useRef<HTMLDivElement>(null);

  const items = useMemo(() => (tab === 'mine' ? m.moments.filter(m.isMine) : m.moments), [tab, m.moments, m.isMine]);
  const mineCount = useMemo(() => m.moments.filter(m.isMine).length, [m.moments, m.isMine]);
  const remaining = Math.max(0, settings.framesPerGuest - m.userCount - queue.pending);
  const current = openIndex !== null ? items[openIndex] : null;
  const canDownload = (p: PhotoMoment) => settings.download === 'ALL' || (settings.download === 'OWN' && m.isMine(p));

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !m.hasMore) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && m.loadMore(), { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, [m.hasMore, m.loadMore, items.length]);

  const share = async (photo: PhotoMoment) => {
    const text = `Foto dari ${photo.guestName} di pernikahan ${coupleNames}`;
    try {
      const blob = await (await fetch(photo.photoUrl)).blob();
      const file = new File([blob], `momen-${photo.id}.jpg`, { type: blob.type || 'image/jpeg' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
    setShareNote('Peramban ini tidak bisa membagikan file langsung. Simpan fotonya dulu, lalu kirim dari galeri HP.');
  };

  const cameraLabel = !settings.cameraOpen
    ? 'Kamera sudah ditutup'
    : remaining > 0
      ? `Buka kamera · ${remaining} frame lagi`
      : `Jatah ${settings.framesPerGuest} frame sudah terpakai`;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-3 pb-32">
      <UploadTray jobs={queue.jobs} onRetry={queue.retry} onDiscard={queue.discard} />

      <header className="flex items-center gap-2">
        <IconButton tone="deep" label="Kembali ke undangan" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </IconButton>
        <div>
          <h1 className="font-display text-2xl italic">Kamera tamu</h1>
          <p className="text-sm text-on-deep-soft">
            {coupleNames} · {identity.name}
          </p>
        </div>
      </header>

      {!ownOnly && (
        <div role="group" aria-label="Tampilkan foto" className="mt-5 grid grid-cols-2 gap-1 rounded-sm bg-deep-2 p-1">
          {(
            [
              ['all', `Semua (${m.moments.length}${m.hasMore ? '+' : ''})`],
              ['mine', `Foto saya (${mineCount})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
              className={`min-h-11 rounded-xs text-sm font-semibold ${tab === id ? 'bg-on-deep text-deep' : 'text-on-deep-soft hover:text-on-deep'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {settings.moderation && (
        <p className="mt-3 text-sm text-on-deep-soft">Foto baru dicek mempelai dulu sebelum tampil untuk tamu lain.</p>
      )}

      <div className="mt-6">
        {m.status === 'loading' ? (
          <LoadingState label="Memuat foto tamu..." />
        ) : m.status === 'error' ? (
          <ErrorState title="Foto belum bisa dimuat." onRetry={m.reload} />
        ) : items.length === 0 ? (
          <EmptyState
            title={tab === 'mine' ? 'Belum ada foto dari Anda' : 'Belum ada foto'}
            detail={`Setiap tamu punya ${settings.framesPerGuest} frame. Jepret suasana acara dan kirim ke galeri.`}
          />
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:gap-3">
            {items.map((photo, i) => {
              const mine = m.myReactions[photo.id];
              const count = totalReactions(photo);
              return (
                <li key={photo.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(i)}
                    aria-label={`Buka foto dari ${photo.guestName}`}
                    className="block aspect-[4/5] w-full overflow-hidden rounded-xs bg-deep-2"
                  >
                    <img src={photo.photoUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                  {photo.approved === false && (
                    <span className="absolute top-1.5 left-1.5 rounded-xs bg-deep/85 px-2 py-1 text-xs font-semibold">Menunggu dicek</span>
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 bg-gradient-to-t from-deep/90 to-transparent p-2 pt-8">
                    <span className="truncate text-sm font-semibold">{photo.guestName}</span>
                    {Boolean(photo.commentsCount) && (
                      <span className="flex shrink-0 items-center gap-1 text-xs text-on-deep-soft">
                        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        {photo.commentsCount}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => m.react(photo.id, mine || '❤️')}
                    aria-pressed={Boolean(mine)}
                    aria-label={mine ? `Batalkan reaksi ${mine}` : 'Beri reaksi hati'}
                    className={`absolute top-1.5 right-1.5 inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xs px-2 text-sm ${
                      mine ? 'bg-on-deep text-deep' : 'bg-deep/70 text-on-deep'
                    }`}
                  >
                    <span aria-hidden="true">{mine || '♡'}</span>
                    {count > 0 && <span className="font-semibold">{count}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div ref={sentinel} className="flex justify-center py-6">
          {m.loadingMore ? (
            <Spinner className="h-5 w-5 text-on-deep-soft" />
          ) : (
            m.hasMore &&
            m.status === 'ready' && (
              <button
                type="button"
                onClick={m.loadMore}
                className="min-h-11 rounded-sm border border-on-deep/30 px-4 text-sm font-semibold hover:bg-white/10"
              >
                Muat foto lain
              </button>
            )
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center bg-gradient-to-t from-deep via-deep/90 to-transparent px-4 pt-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => setCameraOpen(true)}
          disabled={!settings.cameraOpen || remaining <= 0}
          className="inline-flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-on-deep px-6 font-semibold text-deep hover:bg-white disabled:opacity-60"
        >
          <Camera className="h-5 w-5" aria-hidden="true" />
          {cameraLabel}
        </button>
      </div>

      {cameraOpen && (
        <CameraSheet
          identity={identity}
          config={config}
          remaining={remaining}
          onClose={() => setCameraOpen(false)}
          onQueued={() => setTab(ownOnly ? 'mine' : tab)}
        />
      )}

      <Lightbox
        open={current !== null}
        label="Foto tamu"
        index={openIndex ?? 0}
        count={items.length}
        itemKey={current?.id || ''}
        onClose={() => {
          setOpenIndex(null);
          setShareNote('');
        }}
        onIndexChange={setOpenIndex}
        footer={
          current && (
            <div className="mx-auto max-w-md space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold">
                  {current.guestName}
                  {m.isMine(current) && <span className="ml-2 text-sm font-normal text-prada-on-deep">foto Anda</span>}
                </p>
                <p className="text-sm text-on-deep-soft">
                  {current.look && current.look !== 'none' ? `${lookById(current.look).code} ${lookById(current.look).name} · ` : ''}
                  {formatTime(current.createdAt)}
                </p>
              </div>
              {current.caption && <p className="text-[15px] text-on-deep-soft">{current.caption}</p>}
              <div role="group" aria-label="Reaksi" className="no-scrollbar flex gap-1.5 overflow-x-auto">
                {EMOJIS.map((emoji) => {
                  const selected = m.myReactions[current.id] === emoji;
                  const n = current.reactions?.[emoji] || 0;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`${selected ? 'Batalkan' : 'Beri'} reaksi ${emoji}${n ? `, ${n}` : ''}`}
                      onClick={() => m.react(current.id, emoji)}
                      className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-xs px-2.5 ${
                        selected ? 'bg-on-deep text-deep' : 'bg-deep-2 hover:bg-white/10'
                      }`}
                    >
                      <span aria-hidden="true">{emoji}</span>
                      {n > 0 && <span className="text-sm font-semibold">{n}</span>}
                    </button>
                  );
                })}
              </div>
              <CommentThread momentId={current.id} identity={identity} onCount={m.refresh} />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => share(current)}
                  className="min-h-11 flex-1 rounded-sm bg-on-deep px-4 text-sm font-semibold text-deep hover:bg-white"
                >
                  Bagikan
                </button>
                {canDownload(current) && (
                  <a
                    href={current.originalUrl || current.photoUrl}
                    download={`momen-${current.id}.jpg`}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-sm border border-on-deep/30 px-4 text-sm font-semibold hover:bg-white/10"
                  >
                    Simpan ukuran asli
                  </a>
                )}
              </div>
              {shareNote && (
                <p role="status" className="text-sm text-on-deep-soft">
                  {shareNote}
                </p>
              )}
            </div>
          )
        }
      >
        {current && (
          <img
            src={current.photoUrl}
            alt={current.caption || `Foto dari ${current.guestName}`}
            className="max-h-full max-w-full object-contain"
          />
        )}
      </Lightbox>
    </div>
  );
};
