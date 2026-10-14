import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCcw, RotateCcw, X } from 'lucide-react';
import { useDialogBehaviour } from '../../ui/Modal.js';
import { IconButton } from '../../ui/Button.js';
import { Spinner } from '../../ui/StateView.js';
import { PHOTO_FILTERS, captureVideoFrame, composePhoto } from '../../../lib/image.js';
import { publicApi, uploadFile } from '../../../lib/api.js';
import type { PhotoFrameConfig, PublicGuest } from '../../../types.js';

interface CameraSheetProps {
  guest: PublicGuest;
  remaining: number;
  frame: PhotoFrameConfig | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Full-screen disposable camera: shoot, pick a filter, add a caption, send. */
export const CameraSheet: React.FC<CameraSheetProps> = ({ guest, remaining, frame, onClose, onSaved }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [shot, setShot] = useState<string | null>(null);
  const [filterId, setFilterId] = useState('normal');
  const [useFrame, setUseFrame] = useState(true);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  useDialogBehaviour(true, onClose, panelRef);

  const frameUrl = frame?.enabled && useFrame ? frame.frameOverlayUrl : undefined;
  const filter = PHOTO_FILTERS.find((f) => f.id === filterId) || PHOTO_FILTERS[0];

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startStream = useCallback(async (mode: 'user' | 'environment') => {
    stopStream();
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch {
      setError('Kamera tidak bisa dibuka. Izinkan akses kamera di peramban, lalu coba lagi.');
    }
  }, []);

  useEffect(() => {
    if (!shot) startStream(facing);
    return stopStream;
  }, [facing, shot, startStream]);

  const capture = () => {
    if (!videoRef.current) return;
    setShot(captureVideoFrame(videoRef.current, facing === 'user'));
    stopStream();
  };

  const send = async () => {
    if (!shot) return;
    setSending(true);
    setError(null);
    try {
      const blob = await composePhoto(shot, filter.css, frameUrl);
      const url = await uploadFile(new File([blob], `momen-${Date.now()}.jpg`, { type: 'image/jpeg' }), 'moments');
      await publicApi.submitPhotoMoment({ guestName: guest.name, guestSlug: guest.slug, photoUrl: url, caption: caption.trim() });
      onSaved();
    } catch (err) {
      setError((err as Error).message || 'Foto gagal dikirim. Coba lagi.');
      setSending(false);
    }
  };

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Kamera Photo Moments"
      tabIndex={-1}
      className="on-deep fixed inset-0 z-50 flex flex-col outline-none"
    >
      <div className="flex items-center justify-between px-2 py-2">
        <IconButton tone="deep" label="Tutup kamera" onClick={onClose}>
          <X className="h-6 w-6" />
        </IconButton>
        <p className="text-sm text-on-deep-soft">Sisa {remaining} foto</p>
        {!shot ? (
          <IconButton
            tone="deep"
            label="Ganti kamera depan atau belakang"
            onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
          >
            <RefreshCcw className="h-5 w-5" />
          </IconButton>
        ) : (
          <span className="w-11" />
        )}
      </div>

      {/* 4:5 viewfinder sized to whatever height the controls leave; matches the cropped capture. */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-2">
        <div
          className="relative overflow-hidden bg-black"
          style={{ width: 'min(100%, 28rem, calc((100dvh - 15rem) * 0.8))', aspectRatio: '4 / 5' }}
        >
          {shot ? (
            <img src={shot} alt="Pratinjau foto" className="h-full w-full object-cover" style={{ filter: filter.css }} />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`h-full w-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`}
            />
          )}
          {frameUrl && <img src={frameUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full" />}
          {error && (
            <p role="alert" className="absolute inset-x-4 top-4 rounded-sm bg-deep/90 p-3 text-sm">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-md px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {!shot ? (
          <div className="flex items-center justify-between">
            {frame?.enabled ? (
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useFrame}
                  onChange={(e) => setUseFrame(e.target.checked)}
                  className="h-5 w-5 accent-[var(--prada-on-deep)]"
                />
                Bingkai
              </label>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={capture}
              disabled={Boolean(error) || remaining <= 0}
              aria-label="Ambil foto"
              className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-on-deep disabled:opacity-40"
            >
              <span className="h-14 w-14 rounded-full bg-on-deep" />
            </button>
            <span className="w-16" />
          </div>
        ) : (
          <div className="space-y-3">
            <div role="radiogroup" aria-label="Filter foto" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              {PHOTO_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={f.id === filterId}
                  onClick={() => setFilterId(f.id)}
                  className={`min-h-11 shrink-0 rounded-sm px-3.5 text-sm font-semibold ${
                    f.id === filterId ? 'bg-on-deep text-deep' : 'border border-on-deep/30 text-on-deep hover:bg-white/10'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="sr-only">Keterangan foto</span>
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={140}
                placeholder="Tulis keterangan singkat (opsional)"
                className="h-11 w-full rounded-xs border border-on-deep/30 bg-deep-2 px-3.5 text-[15px] text-on-deep placeholder:text-on-deep-soft"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShot(null)}
                disabled={sending}
                className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-on-deep/30 px-4 text-sm font-semibold hover:bg-white/10"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Ulangi
              </button>
              <button
                type="button"
                onClick={send}
                disabled={sending}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-sm bg-on-deep px-4 text-sm font-semibold text-deep hover:bg-white disabled:opacity-60"
              >
                {sending && <Spinner className="h-4 w-4" />}
                {sending ? 'Mengirim...' : 'Kirim ke galeri tamu'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
