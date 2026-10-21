import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Maximize } from 'lucide-react';
import { publicApi } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';
import { coupleNames } from '../lib/format.js';
import { useThemePreset } from '../lib/theme.js';
import { LoadingState } from '../components/ui/StateView.js';
import type { PhotoMoment } from '@shared/types';

const HOLD_MS = 6500;
const POLL_MS = 12000;

/**
 * The big screen at the venue: guests' photos one after another, newest first, with a QR to join.
 * New arrivals jump the queue so people see their shot within seconds of sending it.
 */
export const MomentsScreenPage: React.FC = () => {
  const { data: invitation } = useQuery({ queryKey: queryKeys.invitation, queryFn: publicApi.invitation });
  const screen = useQuery({ queryKey: queryKeys.photoScreen, queryFn: publicApi.screen, refetchInterval: POLL_MS, retry: false });
  useThemePreset(invitation);
  const [order, setOrder] = useState<PhotoMoment[]>([]);
  const [index, setIndex] = useState(0);
  const seen = useRef(new Set<string>());
  const root = useRef<HTMLDivElement>(null);

  // Merge each poll: unseen photos go next in line, the rest keep cycling.
  useEffect(() => {
    const incoming = screen.data?.data || [];
    if (!incoming.length) return;
    const fresh = incoming.filter((p) => !seen.current.has(p.id));
    fresh.forEach((p) => seen.current.add(p.id));
    setOrder((prev) => {
      if (!prev.length) return incoming;
      const keep = prev.filter((p) => incoming.some((i) => i.id === p.id));
      const at = Math.min(index + 1, keep.length);
      return [...keep.slice(0, at), ...fresh, ...keep.slice(at)];
    });
    // `index` is read only to place new photos; the merge reruns on new data, not on each slide.
  }, [screen.data]);

  useEffect(() => {
    if (order.length < 2) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % order.length), HOLD_MS);
    return () => clearTimeout(t);
  }, [index, order.length]);

  const joinUrl = useMemo(() => `${window.location.origin}/photo-moments`, []);
  const names = invitation ? coupleNames(invitation) : '';
  const current = order[index % Math.max(1, order.length)];

  useEffect(() => {
    document.title = names ? `Layar foto · ${names}` : 'Layar foto';
  }, [names]);

  if (screen.isLoading) return <LoadingState label="Menyiapkan layar..." className="on-deep min-h-dvh" />;

  return (
    <div ref={root} className="on-deep fixed inset-0 grid cursor-none grid-cols-1 overflow-hidden lg:grid-cols-[1fr_22rem]">
      <div className="relative min-h-0 overflow-hidden bg-black">
        {order.map((p, i) => (
          <figure
            key={p.id}
            className={`absolute inset-0 m-0 transition-opacity duration-1000 ${i === index ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden={i !== index}
          >
            <img
              src={p.photoUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
            />
            <img
              src={p.photoUrl}
              alt={p.caption || `Foto dari ${p.guestName}`}
              className={`relative mx-auto h-full object-contain transition-transform ease-linear ${i === index ? 'scale-105 duration-[7000ms]' : 'scale-100 duration-0'}`}
            />
          </figure>
        ))}
        {current ? (
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-10 pt-24 pb-8">
            <p className="font-display text-4xl italic">{current.guestName}</p>
            {current.caption && <p className="mt-2 max-w-3xl text-xl text-on-deep-soft">{current.caption}</p>}
          </figcaption>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-10 text-center">
            <p className="font-display text-5xl italic">{screen.isError ? 'Layar foto sedang dimatikan' : 'Menunggu foto pertama'}</p>
            <p className="mt-4 text-xl text-on-deep-soft">Pindai kode di samping dan jadi yang pertama tampil di sini.</p>
          </div>
        )}
      </div>

      <aside className="hidden flex-col items-center justify-center gap-6 bg-deep p-8 text-center lg:flex">
        <p className="text-sm tracking-[0.3em] text-on-deep-soft uppercase">Kamera tamu</p>
        <p className="font-display text-4xl leading-tight italic">{names}</p>
        <div className="rounded-md bg-white p-4">
          <QRCodeSVG value={joinUrl} size={200} level="M" title="Kode QR kamera tamu" />
        </div>
        <p className="text-lg leading-snug">Pindai, jepret, dan fotomu tampil di layar ini.</p>
        <p className="text-sm text-on-deep-soft">{screen.data?.total ?? 0} foto sudah masuk</p>
        <button
          type="button"
          onClick={() => root.current?.requestFullscreen?.().catch(() => undefined)}
          className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-on-deep/30 px-4 text-sm hover:bg-white/10"
        >
          <Maximize className="h-4 w-4" aria-hidden="true" /> Layar penuh
        </button>
      </aside>
    </div>
  );
};
