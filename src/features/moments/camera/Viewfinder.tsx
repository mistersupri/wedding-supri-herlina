import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Images, RefreshCcw, X } from 'lucide-react';
import { FrameCounter } from './FrameCounter.js';

interface ViewfinderProps {
  remaining: number;
  onShot: (source: HTMLCanvasElement | HTMLImageElement) => void;
  onClose: () => void;
}

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
 * The live camera. The 4:5 guide shows exactly what the photo will hold; anything outside is cropped,
 * and the darkroom can still nudge it. When the camera is blocked or missing, the phone's gallery
 * is the way in.
 */
export const Viewfinder: React.FC<ViewfinderProps> = ({ remaining, onShot, onClose }) => {
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
        <div className="cam-window" style={{ width: 'min(100%, 30rem, calc((100dvh - 14rem) * 0.8))' }}>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`h-full w-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`}
          />
          <span className="cam-thirds" aria-hidden="true" />
          <span className="cam-ratio" aria-hidden="true">
            4:5
          </span>
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

      <div className="grid grid-cols-3 items-center px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
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
        <span />
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
};
