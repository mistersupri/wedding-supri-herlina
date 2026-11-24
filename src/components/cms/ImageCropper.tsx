import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCw, ZoomIn } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { Modal } from '../ui/Modal.js';

export interface CropRatio {
  id: string;
  label: string;
  /** Width over height. */
  value: number;
}

export const CROP_RATIOS: CropRatio[] = [
  { id: '1:1', label: '1:1', value: 1 },
  { id: '4:5', label: '4:5', value: 4 / 5 },
  { id: '3:4', label: '3:4', value: 3 / 4 },
  { id: '4:3', label: '4:3', value: 4 / 3 },
  { id: '16:9', label: '16:9', value: 16 / 9 },
  { id: '9:16', label: '9:16', value: 9 / 16 },
];

const MAX_SOURCE = 4096;

type Pan = { x: number; y: number };

/** Where the image sits in a window of W x H: covers it at zoom 1, pans within the overflow. Shared by the preview and the export. */
function placement(iw: number, ih: number, W: number, H: number, zoom: number, pan: Pan) {
  const scale = Math.max(W / iw, H / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const maxX = Math.max(0, (dw - W) / 2);
  const maxY = Math.max(0, (dh - H) / 2);
  return { dw, dh, maxX, maxY, x: (W - dw) / 2 + pan.x * maxX, y: (H - dh) / 2 + pan.y * maxY, scale };
}

function loadFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Gambar tidak dapat dibaca.'));
    };
    img.src = url;
  });
}

/** The image turned by `rotation`, drawn once so every redraw is a single drawImage. Large photos are brought down to MAX_SOURCE. */
function prepare(img: HTMLImageElement, rotation: number) {
  const k = Math.min(1, MAX_SOURCE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * k);
  const h = Math.round(img.naturalHeight * k);
  const turned = rotation % 180 !== 0;
  const c = document.createElement('canvas');
  c.width = turned ? h : w;
  c.height = turned ? w : h;
  const ctx = c.getContext('2d')!;
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  return c;
}

interface ImageCropperProps {
  file: File;
  /** Starting shape of the crop window. */
  ratio: number;
  /** Longest edge of the saved picture. */
  maxDimension: number;
  onConfirm: (cropped: File) => void;
  /** Use the picture as it is. */
  onSkip: () => void;
  onCancel: () => void;
}

/**
 * Crop a picture before it is uploaded: drag to move, slider or pinch to zoom, turn it, and pick a shape.
 * The saved picture is cut from the original pixels (not from the preview), then limited to `maxDimension`.
 */
export const ImageCropper: React.FC<ImageCropperProps> = ({ file, ratio, maxDimension, onConfirm, onSkip, onCancel }) => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState('');
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const natural = img ? img.naturalWidth / img.naturalHeight : 1;
  const ratios = useMemo(() => {
    const own: CropRatio = { id: 'asli', label: 'Asli', value: natural };
    const list = CROP_RATIOS.some((r) => Math.abs(r.value - ratio) < 0.01) ? CROP_RATIOS : [{ id: 'bawaan', label: 'Bawaan', value: ratio }, ...CROP_RATIOS];
    return [...list, own];
  }, [ratio, natural]);
  const [ratioId, setRatioId] = useState(() => (CROP_RATIOS.find((r) => Math.abs(r.value - ratio) < 0.01)?.id ?? 'bawaan'));
  const shape = ratios.find((r) => r.id === ratioId)?.value ?? ratio;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    loadFile(file)
      .then((i) => alive && setImg(i))
      .catch((e: Error) => alive && setLoadError(e.message));
    return () => {
      alive = false;
    };
  }, [file]);

  const turned = useMemo(() => (img ? prepare(img, rotation) : null), [img, rotation]);

  useEffect(() => {
    // A new shape or turn starts centred.
    setPan({ x: 0, y: 0 });
  }, [shape, rotation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage || !turned) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    const p = placement(turned.width, turned.height, canvas.width, canvas.height, zoom, pan);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(turned, p.x, p.y, p.dw, p.dh);
  }, [turned, zoom, pan, shape]);

  const clamp = (v: number) => Math.min(1, Math.max(-1, v));
  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    const stage = stageRef.current;
    if (!prev || !stage || !turned) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length >= 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinch.current) setZoom((z) => Math.min(4, Math.max(1, z * (dist / pinch.current!))));
      pinch.current = dist;
      return;
    }
    const p = placement(turned.width, turned.height, stage.clientWidth, stage.clientHeight, zoom, pan);
    setPan((cur) => ({
      x: p.maxX ? clamp(cur.x + (e.clientX - prev.x) / p.maxX) : 0,
      y: p.maxY ? clamp(cur.y + (e.clientY - prev.y) / p.maxY) : 0,
    }));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const confirm = async () => {
    if (!turned) return;
    setSaving(true);
    try {
      // Output size: the pixels the window really shows, limited to maxDimension on its longest edge.
      const stage = stageRef.current!;
      const p0 = placement(turned.width, turned.height, stage.clientWidth, stage.clientHeight, zoom, pan);
      const sourceW = stage.clientWidth / p0.scale;
      let outW = sourceW;
      let outH = sourceW / shape;
      const k = Math.min(1, maxDimension / Math.max(outW, outH));
      outW = Math.round(outW * k);
      outH = Math.round(outH * k);
      const out = document.createElement('canvas');
      out.width = outW;
      out.height = outH;
      const ctx = out.getContext('2d')!;
      ctx.imageSmoothingQuality = 'high';
      const p = placement(turned.width, turned.height, outW, outH, zoom, pan);
      ctx.drawImage(turned, p.x, p.y, p.dw, p.dh);
      // Transparent PNGs (frames) stay PNG; everything else is a JPEG.
      const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, type, 0.9));
      if (!blob) throw new Error('Gambar gagal diproses.');
      const base = file.name.replace(/\.[^.]+$/, '');
      onConfirm(new File([blob], `${base}.${type === 'image/png' ? 'png' : 'jpg'}`, { type }));
    } catch (err) {
      setLoadError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onCancel}
      title="Potong gambar"
      description="Geser untuk mengatur posisi, cubit atau pakai penggeser untuk zoom."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Batal
          </Button>
          <Button variant="secondary" onClick={onSkip}>
            Pakai tanpa potong
          </Button>
          <Button onClick={confirm} loading={saving} disabled={!turned}>
            Potong & unggah
          </Button>
        </>
      }
    >
      {loadError ? (
        <p role="alert" className="text-sm font-semibold text-no">
          {loadError}
        </p>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div
            ref={stageRef}
            className="relative touch-none overflow-hidden rounded-xs bg-[repeating-conic-gradient(#d8d0c2_0_25%,#f3eee4_0_50%)] bg-[length:16px_16px] select-none"
            style={{ width: `min(100%, calc(50dvh * ${shape}))`, aspectRatio: String(shape), cursor: 'grab' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={(e) => setZoom((z) => Math.min(4, Math.max(1, z * (e.deltaY < 0 ? 1.08 : 0.93))))}
          >
            <canvas ref={canvasRef} className="h-full w-full" role="img" aria-label="Pratinjau potongan" />
            <span className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-60" aria-hidden="true">
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className="border border-white/40" />
              ))}
            </span>
            {!img && <span className="absolute inset-0 grid place-items-center text-sm text-ink-soft">Memuat gambar...</span>}
          </div>

          <div role="radiogroup" aria-label="Bentuk potongan" className="no-scrollbar flex max-w-full gap-1.5 overflow-x-auto">
            {ratios.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={ratioId === r.id}
                onClick={() => setRatioId(r.id)}
                className={`min-h-11 shrink-0 rounded-sm border px-3.5 text-sm font-semibold ${
                  ratioId === r.id ? 'border-primary bg-primary text-on-primary' : 'border-field bg-card hover:bg-paper-2'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex w-full max-w-md items-center gap-3">
            <ZoomIn className="h-5 w-5 shrink-0 text-ink-soft" aria-hidden="true" />
            <input
              type="range"
              min={100}
              max={400}
              value={Math.round(zoom * 100)}
              onChange={(e) => setZoom(Number(e.target.value) / 100)}
              aria-label="Zoom"
              className="h-11 flex-1 accent-[var(--primary)]"
            />
            <span className="w-10 text-right text-sm text-ink-soft tabular-nums">{zoom.toFixed(1)}×</span>
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              aria-label="Putar 90 derajat"
              title="Putar 90°"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-field bg-card hover:bg-paper-2"
            >
              <RotateCw className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
