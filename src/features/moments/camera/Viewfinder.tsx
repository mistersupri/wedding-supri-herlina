import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Frame, Images, RefreshCcw, Undo2, X } from 'lucide-react';
import { COLLAGE_LAYOUTS, collageLabel, type CollageLayout } from '../film/collage.js';
import { FrameCounter } from './FrameCounter.js';

interface ViewfinderProps {
  remaining: number;
  onShot: (source: HTMLCanvasElement | HTMLImageElement) => void;
  onClose: () => void;
  /** The guide is 9:16 (a Story) instead of 4:5. */
  story?: boolean;
  /** Present when the couple has an event frame: whether it is used, and a switch to turn it off. */
  frame?: { on: boolean; onChange: (on: boolean) => void };
  /** Photo-strip mode: how many shots make one picture, what has been taken so far, and the shape of each cell. */
  collage: {
    layout: CollageLayout;
    onLayout: (layout: CollageLayout) => void;
    cellRatio: number;
    /** Small previews of the shots already taken for this sheet. */
    taken: string[];
    onUndo: () => void;
  };
}

/** A tiny diagram of the layout: one block per photo. */
const LayoutIcon: React.FC<{ layout: CollageLayout }> = ({ layout }) => {
  const cells =
    layout === 1
      ? [[3, 2, 14, 20]]
      : layout === 2
        ? [[3, 2, 14, 9], [3, 13, 14, 9]]
        : layout === 3
          ? [[3, 2, 14, 6], [3, 9, 14, 6], [3, 16, 14, 6]]
          : [[3, 2, 6.5, 9], [10.5, 2, 6.5, 9], [3, 13, 6.5, 9], [10.5, 13, 6.5, 9]];
  return (
    <svg viewBox="0 0 20 24" width="20" height="24" aria-hidden="true" fill="currentColor">
      {cells.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="1" />
      ))}
    </svg>
  );
};

/** Grab the current video frame at full resolution, mirrored for the selfie camera like the preview. */
function grab(video: HTMLVideoElement, mirror: boolean) {
  const c = document.createElement('canvas');
  c.width = video.videoWidth;
  c.height = video.videoHeight;
  const ctx = c.getContext('2d')!;
  if (mirror) {
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0);
  return c;
}

/**
 * The live camera. The guide (4:5, or 9:16 for a Story) shows what the photo will hold; anything outside is cropped,
 * and the darkroom can still nudge it. When the camera is blocked or missing, the phone's gallery
 * is the way in.
 */
export const Viewfinder: React.FC<ViewfinderProps> = ({ remaining, onShot, onClose, story = false, frame, collage }) => {
  const { layout, taken } = collage;
  const ratio = layout === 1 ? (story ? 9 / 16 : 4 / 5) : collage.cellRatio;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('environment');
  const [state, setState] = useState<'starting' | 'live' | 'blocked'>('starting');
  const [flash, setFlash] = useState(false);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const start = useCallback(async (mode: 'user' | 'environment') => {
    stop();
    setState('starting');
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('blocked');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setState('live');
    } catch {
      setState('blocked');
    }
  }, []);

  useEffect(() => {
    start(facing);
    return stop;
  }, [facing, start]);

  const shoot = () => {
    const video = videoRef.current;
    if (!video || state !== 'live' || !video.videoWidth) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    navigator.vibrate?.(30);
    onShot(grab(video, facing === 'user'));
  };

  const pick = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => onShot(img);
    img.src = url;
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-2 py-2">
        <button type="button" className="cam-icon" onClick={onClose} aria-label="Tutup kamera">
          <X className="h-6 w-6" />
        </button>
        <FrameCounter remaining={remaining} />
        <button
          type="button"
          className="cam-icon"
          onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
          disabled={state === 'blocked'}
          aria-label="Ganti kamera depan atau belakang"
        >
          <RefreshCcw className="h-5 w-5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-3">
        <div className="cam-window" style={{ width: `min(100%, 30rem, calc((100dvh - ${layout > 1 ? 23 : 18}rem) * ${ratio}))`, aspectRatio: String(ratio) }}>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`h-full w-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`}
          />
          <span className="cam-thirds" aria-hidden="true" />
          {layout > 1 && (
            <span className="cam-ratio" aria-live="polite">
              Foto {taken.length + 1} dari {layout}
            </span>
          )}
          {layout === 1 && (
            <span className="cam-ratio" aria-hidden="true">
              {story ? '9:16' : '4:5'}
            </span>
          )}
          {frame && (
            <button
              type="button"
              role="switch"
              aria-checked={frame.on}
              aria-label="Pakai bingkai acara"
              className="cam-frame-switch"
              onClick={() => frame.onChange(!frame.on)}
            >
              <Frame className="h-4 w-4" aria-hidden="true" />
              Bingkai
              <span className="cam-switch" aria-hidden="true" />
            </button>
          )}
          {flash && <span className="cam-flash" aria-hidden="true" />}
          {state === 'blocked' && (
            <div className="cam-blocked">
              <p className="font-semibold">Kamera belum bisa dibuka.</p>
              <p className="mt-1 text-sm opacity-80">Izinkan akses kamera di peramban, atau pilih foto dari galeri HP.</p>
              <button type="button" className="cam-pill mt-4" onClick={() => fileRef.current?.click()}>
                Pilih dari galeri
              </button>
              <button type="button" className="cam-link mt-2" onClick={() => start(facing)}>
                Coba buka kamera lagi
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 px-3 pt-3">
        <div role="radiogroup" aria-label="Susunan foto" className="flex gap-2">
          {COLLAGE_LAYOUTS.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={layout === n}
              aria-label={`${collageLabel(n)}, memakai ${n} frame`}
              title={`${collageLabel(n)} · memakai ${n} frame`}
              disabled={n > remaining}
              className={`cam-layout ${layout === n ? 'is-on' : ''}`}
              onClick={() => collage.onLayout(n)}
            >
              <LayoutIcon layout={n} />
            </button>
          ))}
        </div>
        {layout > 1 && (
          <p className="cam-hint">Kolase ini memakai {layout} frame</p>
        )}
        {layout > 1 && (
          <div className="flex min-h-10 items-center gap-1.5" aria-label="Foto yang sudah diambil">
            {Array.from({ length: layout }, (_, i) => (
              <span key={i} className={`cam-slot ${i === taken.length ? 'is-next' : ''}`} style={{ aspectRatio: String(collage.cellRatio) }}>
                {taken[i] ? <img src={taken[i]} alt={`Foto ${i + 1}`} /> : i + 1}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 items-center px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          className="cam-icon justify-self-start"
          onClick={() => fileRef.current?.click()}
          aria-label="Pilih foto dari galeri HP"
        >
          <Images className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={shoot}
          disabled={state !== 'live' || remaining <= 0}
          aria-label="Jepret"
          className="cam-shutter justify-self-center"
        >
          <span />
        </button>
        {taken.length > 0 ? (
          <button type="button" className="cam-icon justify-self-end" onClick={collage.onUndo} aria-label="Ulangi foto terakhir">
            <Undo2 className="h-6 w-6" />
          </button>
        ) : (
          <span />
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
};
