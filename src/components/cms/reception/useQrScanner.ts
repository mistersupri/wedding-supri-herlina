import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

/** Pull a 4-character code out of a QR payload: a bare code, or an invitation URL with ?c=. */
export function codeFromQr(text: string): string {
  const raw = text.trim();
  const fromUrl = raw.match(/[?&]c=([A-Za-z0-9]{4})/);
  return (fromUrl ? fromUrl[1] : raw).toUpperCase();
}

/**
 * Camera + jsQR loop. `onCode` always sees the latest props (held in a ref), and the same
 * code is ignored for 3 seconds so one QR held in front of the camera checks in once.
 */
export function useQrScanner(onCode: (code: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastRef = useRef<{ code: string; at: number } | null>(null);
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;

  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');

  const stop = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  const tick = useCallback(() => {
    const video = videoRef.current;
    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = (canvasRef.current ||= document.createElement('canvas'));
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });
        if (found?.data) {
          const code = codeFromQr(found.data);
          const last = lastRef.current;
          if (!last || last.code !== code || Date.now() - last.at > 3000) {
            lastRef.current = { code, at: Date.now() };
            onCodeRef.current(code);
          }
        }
      }
    }
    frameRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(
    async (mode: 'environment' | 'user' = facing) => {
      stop();
      setStarting(true);
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setFacing(mode);
        setActive(true);
        frameRef.current = requestAnimationFrame(tick);
      } catch {
        setError('Kamera tidak bisa dibuka. Izinkan akses kamera di peramban, atau cari tamu secara manual.');
      } finally {
        setStarting(false);
      }
    },
    [facing, stop, tick],
  );

  useEffect(() => stop, [stop]);

  return { videoRef, active, starting, error, facing, start, stop, flip: () => start(facing === 'environment' ? 'user' : 'environment') };
}
