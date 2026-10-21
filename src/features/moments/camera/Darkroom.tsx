import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Crop, Film, Frame, RotateCcw, RotateCw, Sliders, Sparkles, Sun, Wind, X } from 'lucide-react';
import { EDIT_FIELDS, LOOK_GROUPS, NO_EDITS, lookById, type Edits, type Look } from '../film/looks.js';
import {
  DUST_VARIANTS,
  LEAK_VARIANTS,
  downscale,
  placeCrop,
  renderPhoto,
  rotatedSize,
  type FrameStyle,
  type Recipe,
} from '../film/render.js';
import { FrameCounter } from './FrameCounter.js';

type Panel = 'film' | 'grain' | 'edit' | 'frame' | 'crop' | null;

const FRAMES: { id: FrameStyle; label: string }[] = [
  { id: 'none', label: 'Tanpa bingkai' },
  { id: 'white', label: 'Putih' },
  { id: 'black', label: 'Hitam' },
  { id: 'white-caption', label: 'Putih + teks' },
  { id: 'black-caption', label: 'Hitam + teks' },
  { id: 'event', label: 'Bingkai acara' },
];

interface DarkroomProps {
  source: HTMLCanvasElement | HTMLImageElement;
  recipe: Recipe;
  onChange: (update: (r: Recipe) => Recipe) => void;
  looks: Look[];
  eventFrame: HTMLImageElement | null;
  remaining: number;
  sending: boolean;
  onRetake: () => void;
  onSend: () => void;
  onClose: () => void;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * The darkroom: drag to reposition, pinch or scroll to zoom, then stack a film look, dust, light bleed,
 * grain, manual edits, a date stamp and a frame. The preview is rendered by the same code as the upload.
 */
export const Darkroom: React.FC<DarkroomProps> = ({
  source,
  recipe,
  onChange,
  looks,
  eventFrame,
  remaining,
  sending,
  onRetake,
  onSend,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<Panel>('film');
  const [editKey, setEditKey] = useState<keyof Edits>('brightness');
  const [dragging, setDragging] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const previewSrc = useMemo(() => downscale(source, 1400), [source]);
  const thumbSrc = useMemo(() => downscale(source, 220), [source]);

  // Render the preview once per frame, cheaply while a finger is dragging.
  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return;
    const id = requestAnimationFrame(() => {
      const width = Math.min(1080, box.clientWidth * Math.min(2, window.devicePixelRatio || 1));
      renderPhoto(previewSrc, recipe, { width, eventFrame, fast: dragging }, canvas);
    });
    return () => cancelAnimationFrame(id);
  }, [previewSrc, recipe, eventFrame, dragging]);

  // --- Gestures: one finger pans, two fingers zoom, a wheel zooms. ---
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || !boxRef.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length >= 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinch.current) {
        const k = dist / pinch.current;
        onChange((r) => ({ ...r, crop: { ...r.crop, zoom: clamp(r.crop.zoom * k, 1, 4) } }));
      }
      pinch.current = dist;
      return;
    }
    const box = boxRef.current.getBoundingClientRect();
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    onChange((r) => {
      const p = placeCrop(rotatedSize(previewSrc, r.crop.rotation), { w: box.width, h: box.height }, r.crop);
      return {
        ...r,
        crop: {
          ...r.crop,
          x: p.panX ? clamp(r.crop.x + dx / p.panX, -1, 1) : 0,
          y: p.panY ? clamp(r.crop.y + dy / p.panY, -1, 1) : 0,
        },
      };
    });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (!pointers.current.size) setDragging(false);
  };
  const onWheel = (e: React.WheelEvent) =>
    onChange((r) => ({ ...r, crop: { ...r.crop, zoom: clamp(r.crop.zoom * (e.deltaY < 0 ? 1.08 : 0.93), 1, 4) } }));

  const look = lookById(recipe.look);
  const edited = Object.values(recipe.edits).some(Boolean);
  const set = <K extends keyof Recipe>(key: K, value: Recipe[K]) => onChange((r) => ({ ...r, [key]: value }));
  const toggle = (id: Exclude<Panel, null>) => setPanel((p) => (p === id ? null : id));

  const tools: { id: string; label: string; icon: React.ReactNode; badge?: string; active: boolean; onClick: () => void }[] = [
    { id: 'retake', label: 'Ulang', icon: <RotateCcw />, active: false, onClick: onRetake },
    {
      id: 'film',
      label: 'Film',
      icon: <Film />,
      badge: look.id === 'none' ? undefined : look.code,
      active: panel === 'film',
      onClick: () => toggle('film'),
    },
    {
      id: 'dust',
      label: 'Debu',
      icon: <Wind />,
      badge: recipe.dust ? `${recipe.dust}/${DUST_VARIANTS}` : undefined,
      active: Boolean(recipe.dust),
      // Each tap scatters a different handful of dust; after the last one it turns off.
      onClick: () => set('dust', (recipe.dust + 1) % (DUST_VARIANTS + 1)),
    },
    {
      id: 'leak',
      label: 'Bleed',
      icon: <Sun />,
      badge: recipe.leak ? `${recipe.leak}/${LEAK_VARIANTS}` : undefined,
      active: Boolean(recipe.leak),
      onClick: () => set('leak', (recipe.leak + 1) % (LEAK_VARIANTS + 1)),
    },
    {
      id: 'grain',
      label: 'Grain',
      icon: <Sparkles />,
      badge: recipe.grain ? String(recipe.grain) : undefined,
      active: panel === 'grain',
      onClick: () => toggle('grain'),
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: <Sliders />,
      badge: edited ? '•' : undefined,
      active: panel === 'edit',
      onClick: () => toggle('edit'),
    },
    {
      id: 'stamp',
      label: 'Tanggal',
      icon: <CalendarDays />,
      badge: recipe.stamp ? 'on' : undefined,
      active: recipe.stamp,
      onClick: () => set('stamp', !recipe.stamp),
    },
    {
      id: 'frame',
      label: 'Bingkai',
      icon: <Frame />,
      badge: recipe.frame === 'none' ? undefined : '•',
      active: panel === 'frame',
      onClick: () => toggle('frame'),
    },
    { id: 'crop', label: 'Posisi', icon: <Crop />, active: panel === 'crop', onClick: () => toggle('crop') },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-2 py-2">
        <button type="button" className="cam-icon" onClick={onClose} aria-label="Tutup kamera">
          <X className="h-6 w-6" />
        </button>
        <p className="cam-hint min-w-0 flex-1 truncate">Geser untuk atur posisi, cubit untuk zoom</p>
        <FrameCounter remaining={remaining} />
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-3">
        <div
          ref={boxRef}
          className="cam-window cam-darkroom"
          style={{ width: 'min(100%, 30rem, calc((100dvh - 20rem) * 0.8))' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          <canvas ref={canvasRef} className="h-full w-full" role="img" aria-label="Pratinjau foto" />
          {dragging && <span className="cam-thirds" aria-hidden="true" />}
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl px-3 pt-3">
        {panel === 'film' && (
          <div className="cam-panel">
            <div className="cam-looks no-scrollbar" role="radiogroup" aria-label="Look film">
              {[{ id: 'asli', label: '' }, ...LOOK_GROUPS].map((group) => {
                const items = looks.filter((l) => l.group === group.id);
                if (!items.length) return null;
                return (
                  <React.Fragment key={group.id}>
                    {group.label && <span className="cam-look-group">{group.label}</span>}
                    {items.map((l) => (
                      <LookThumb
                        key={l.id}
                        look={l}
                        source={thumbSrc}
                        recipe={recipe}
                        active={recipe.look === l.id}
                        onPick={() => set('look', l.id)}
                      />
                    ))}
                  </React.Fragment>
                );
              })}
            </div>
            {recipe.look !== 'none' && (
              <label className="cam-slider">
                <span>Kekuatan</span>
                <input type="range" min={0} max={100} value={recipe.strength} onChange={(e) => set('strength', Number(e.target.value))} />
                <output>{recipe.strength}</output>
              </label>
            )}
          </div>
        )}
        {panel === 'grain' && (
          <div className="cam-panel">
            <label className="cam-slider">
              <span>Grain</span>
              <input type="range" min={0} max={100} value={recipe.grain} onChange={(e) => set('grain', Number(e.target.value))} />
              <output>{recipe.grain}</output>
            </label>
          </div>
        )}
        {panel === 'edit' && (
          <div className="cam-panel">
            <div className="cam-chips no-scrollbar" role="tablist" aria-label="Setelan">
              {EDIT_FIELDS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={editKey === f.key}
                  onClick={() => setEditKey(f.key)}
                  className="cam-chip"
                >
                  {f.label}
                  {recipe.edits[f.key] ? ' •' : ''}
                </button>
              ))}
            </div>
            <label className="cam-slider">
              <span>{EDIT_FIELDS.find((f) => f.key === editKey)?.label}</span>
              <input
                type="range"
                min={EDIT_FIELDS.find((f) => f.key === editKey)?.min ?? -100}
                max={100}
                value={recipe.edits[editKey]}
                onChange={(e) => onChange((r) => ({ ...r, edits: { ...r.edits, [editKey]: Number(e.target.value) } }))}
              />
              <output>{recipe.edits[editKey]}</output>
            </label>
            {edited && (
              <button type="button" className="cam-link" onClick={() => set('edits', { ...NO_EDITS })}>
                Kembalikan semua setelan
              </button>
            )}
          </div>
        )}
        {panel === 'frame' && (
          <div className="cam-panel">
            <div className="cam-chips no-scrollbar" role="radiogroup" aria-label="Bingkai">
              {FRAMES.filter((f) => f.id !== 'event' || eventFrame).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={recipe.frame === f.id}
                  onClick={() => set('frame', f.id)}
                  className="cam-chip"
                >
                  {f.label}
                </button>
              ))}
            </div>
            {recipe.frame.endsWith('caption') && <p className="cam-hint mt-2">Teks di bawah foto diambil dari keterangan.</p>}
          </div>
        )}
        {panel === 'crop' && (
          <div className="cam-panel">
            <div className="cam-chips">
              <button
                type="button"
                className="cam-chip"
                onClick={() =>
                  onChange((r) => ({
                    ...r,
                    crop: { ...r.crop, x: 0, y: 0, rotation: ((r.crop.rotation + 90) % 360) as Recipe['crop']['rotation'] },
                  }))
                }
              >
                <RotateCw className="mr-1 inline h-4 w-4" aria-hidden="true" />
                Putar 90°
              </button>
              <button
                type="button"
                className="cam-chip"
                onClick={() => set('crop', { zoom: 1, x: 0, y: 0, rotation: recipe.crop.rotation })}
              >
                Atur ulang posisi
              </button>
            </div>
            <label className="cam-slider">
              <span>Zoom</span>
              <input
                type="range"
                min={100}
                max={400}
                value={Math.round(recipe.crop.zoom * 100)}
                onChange={(e) => onChange((r) => ({ ...r, crop: { ...r.crop, zoom: Number(e.target.value) / 100 } }))}
              />
              <output>{recipe.crop.zoom.toFixed(1)}×</output>
            </label>
          </div>
        )}

        <div className="cam-tools no-scrollbar" role="toolbar" aria-label="Alat foto">
          {tools.map((t) => (
            <button
              key={t.id}
              type="button"
              className="cam-tool"
              aria-pressed={t.id === 'retake' ? undefined : t.active}
              onClick={t.onClick}
            >
              <span className="cam-tool-icon" aria-hidden="true">
                {t.icon}
                {t.badge && <b>{t.badge}</b>}
              </span>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Keterangan foto</span>
            <input
              value={recipe.caption}
              onChange={(e) => set('caption', e.target.value.slice(0, 140))}
              placeholder="Keterangan (opsional)"
              className="cam-input"
            />
          </label>
          <button type="button" className="cam-send" onClick={onSend} disabled={sending}>
            {sending ? 'Memproses...' : 'Kirim'}
          </button>
        </div>
      </div>
    </div>
  );
};

/** A look rendered on the guest's own photo, so the choice is concrete. */
const LookThumb: React.FC<{ look: Look; source: HTMLCanvasElement; recipe: Recipe; active: boolean; onPick: () => void }> = ({
  look,
  source,
  recipe,
  active,
  onPick,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const { crop } = recipe;
  useEffect(() => {
    if (!ref.current) return;
    renderPhoto(
      source,
      { ...recipe, look: look.id, strength: 85, dust: 0, leak: 0, grain: 0, stamp: false, frame: 'none', edits: { ...NO_EDITS } },
      { width: 120 },
      ref.current,
    );
    // Thumbnails only follow the crop; effects would make them noisy.
  }, [source, look.id, crop]);
  return (
    <button type="button" role="radio" aria-checked={active} className="cam-look" onClick={onPick}>
      <canvas ref={ref} aria-hidden="true" />
      <span className="cam-look-code">{look.code === '00' ? '' : look.code}</span>
      <span className="cam-look-name">{look.name}</span>
    </button>
  );
};
