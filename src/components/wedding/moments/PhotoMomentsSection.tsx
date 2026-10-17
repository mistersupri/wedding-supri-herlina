import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { formatTime } from '../../../lib/format.js';
import { IconButton } from '../../ui/Button.js';
import { Lightbox } from '../../ui/Lightbox.js';
import { EmptyState, ErrorState, LoadingState, Spinner } from '../../ui/StateView.js';
import { CameraSheet } from './CameraSheet.js';
import { useMoments } from './useMoments.js';
import type { PhotoMoment, PublicGuest } from '@shared/types';

const EMOJIS = ['❤️', '😍', '🎉', '👏', '😊', '🙏'];
const PER_GUEST = 3;

const totalReactions = (p: PhotoMoment) =>
  p.reactions ? Object.values(p.reactions).reduce((a, b) => a + (Number(b) || 0), 0) : p.likesCount || 0;

interface PhotoMomentsSectionProps {
  guest: PublicGuest;
  coupleNames: string;
  onBack: () => void;
}

/**
 * The in-venue guest gallery. It is dark on purpose: it is used inside a dim reception hall,
 * and photos read best against the deep wedel tone.
 */
export const PhotoMomentsSection: React.FC<PhotoMomentsSectionProps> = ({ guest, coupleNames, onBack }) => {
  const m = useMoments(guest);
  const [tab, setTab] = useState<'all' | 'mine'>('all');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const frame = useQuery({ queryKey: queryKeys.photoFrame, queryFn: publicApi.frameConfig }).data ?? null;
  const [shareNote, setShareNote] = useState('');
  const sentinel = useRef<HTMLDivElement>(null);

  const items = useMemo(() => (tab === 'mine' ? m.moments.filter(m.isMine) : m.moments), [tab, m.moments, m.isMine]);
  const mineCount = useMemo(() => m.moments.filter(m.isMine).length, [m.moments, m.isMine]);
  const remaining = Math.max(0, PER_GUEST - m.userCount);
  const current = openIndex !== null ? items[openIndex] : null;

  // Load the next page as the end of the grid scrolls into view.
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
    setShareNote('Peramban ini tidak bisa membagikan file. Unduh fotonya, lalu kirim dari galeri ponsel.');
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pt-3 pb-32">
      <header className="flex items-center gap-2">
        <IconButton tone="deep" label="Kembali ke undangan" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </IconButton>
        <div>
          <h1 className="font-display text-2xl italic">Photo Moments</h1>
          <p className="text-sm text-on-deep-soft">{coupleNames}</p>
        </div>
      </header>

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

      <div className="mt-6">
        {m.status === 'loading' ? (
          <LoadingState label="Memuat foto tamu..." />
        ) : m.status === 'error' ? (
          <ErrorState title="Foto belum bisa dimuat." onRetry={m.reload} />
        ) : items.length === 0 ? (
          <EmptyState
            title={tab === 'mine' ? 'Anda belum mengambil foto' : 'Belum ada foto'}
            detail={`Setiap tamu bisa mengirim hingga ${PER_GUEST} foto dari lokasi acara.`}
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
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 bg-gradient-to-t from-deep/90 to-transparent p-2 pt-8">
                    <span className="truncate text-sm font-semibold">{photo.guestName}</span>
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
          disabled={remaining <= 0}
          className="inline-flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-sm bg-on-deep px-6 font-semibold text-deep hover:bg-white disabled:opacity-60"
        >
          <Camera className="h-5 w-5" aria-hidden="true" />
          {remaining > 0 ? `Ambil foto (sisa ${remaining})` : `Batas ${PER_GUEST} foto sudah terpakai`}
        </button>
      </div>

      {cameraOpen && (
        <CameraSheet
          guest={guest}
          remaining={remaining}
          frame={frame}
          onClose={() => setCameraOpen(false)}
          onSaved={() => {
            setCameraOpen(false);
            setTab('mine');
            m.reload();
          }}
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
                <p className="text-sm text-on-deep-soft">{formatTime(current.createdAt)}</p>
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
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => share(current)}
                  className="min-h-11 flex-1 rounded-sm bg-on-deep px-4 text-sm font-semibold text-deep hover:bg-white"
                >
                  Bagikan
                </button>
                <a
                  href={current.photoUrl}
                  download={`momen-${current.id}.jpg`}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-sm border border-on-deep/30 px-4 text-sm font-semibold hover:bg-white/10"
                >
                  Unduh foto
                </a>
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
