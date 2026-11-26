import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check } from 'lucide-react';
import { cmsApi, publicApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { buildFramePresets, FRAME_HEIGHT, FRAME_WIDTH, STORY_SAFE } from '@shared/photoFrames';
import { loadImage } from '../../../features/moments/film/render.js';
import { Panel } from '../CmsPage.js';
import { MediaField } from '../MediaField.js';
import { useToast } from '../Toast.js';
import { Button } from '../../ui/Button.js';
import { FramePreview } from './FramePreview.js';
import type { CollageLayout } from '../../../features/moments/film/collage.js';
import { Checkbox, Field, Input } from '../../ui/Field.js';
import type { PhotoFrameConfig, PhotoInset } from '@shared/types';

const DEFAULT_INSET: PhotoInset = { top: 8, right: 8, bottom: 24, left: 8 };
const INSET_SIDES: { key: keyof PhotoInset; label: string }[] = [
  { key: 'top', label: 'Atas' },
  { key: 'right', label: 'Kanan' },
  { key: 'bottom', label: 'Bawah' },
  { key: 'left', label: 'Kiri' },
];

/** The shape of a frame image: Story (9:16), the older 4:5, or something else. */
function describeRatio(w: number, h: number) {
  const r = w / h;
  if (Math.abs(r - 9 / 16) < 0.015) return { kind: 'story' as const, label: '9:16, ukuran Story Instagram' };
  if (Math.abs(r - 4 / 5) < 0.015) return { kind: 'portrait' as const, label: '4:5' };
  return { kind: 'other' as const, label: `${w} × ${h}` };
}

/** Reads the size of the frame currently set, so the panel can say whether it fits a Story. */
function useFrameShape(url: string) {
  const [shape, setShape] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    let live = true;
    setShape(null);
    if (!url) return;
    loadImage(url)
      .then((img) => live && setShape({ w: img.naturalWidth, h: img.naturalHeight }))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [url]);
  return shape;
}

/** Dashed lines over a 9:16 preview marking where Instagram draws its own interface. */
const SafeZones: React.FC = () => (
  <span aria-hidden="true" className="pointer-events-none absolute inset-0">
    <span className="absolute inset-x-0 top-0 border-b border-dashed border-white/80 bg-black/20" style={{ height: `${(STORY_SAFE.top / FRAME_HEIGHT) * 100}%` }} />
    <span className="absolute inset-x-0 bottom-0 border-t border-dashed border-white/80 bg-black/20" style={{ height: `${(STORY_SAFE.bottom / FRAME_HEIGHT) * 100}%` }} />
  </span>
);


/** A slider with its label, current value, and a plain-language hint. */
const Slider: React.FC<{ label: string; unit: string; value: number; min: number; max: number; onChange: (v: number) => void; hint?: string }> = ({
  label,
  unit,
  value,
  min,
  max,
  onChange,
  hint,
}) => (
  <Field label={label} aside={`${value}${unit}`} hint={hint}>
    {(p) => (
      <input {...p} type="range" min={min} max={max} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-11 w-full accent-[var(--primary)]" />
    )}
  </Field>
);

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Size and place of the photo, its border, and the gap between collage photos, with a live preview. */
const FramePhotoStyle: React.FC<{ form: PhotoFrameConfig; onChange: (next: PhotoFrameConfig) => void }> = ({ form, onChange }) => {
  const [shots, setShots] = useState<CollageLayout>(1);
  const inset = form.photoInset ?? DEFAULT_INSET;
  const manual = Boolean(form.photoInFront || form.photoManualArea);
  // The settings store margins; the sliders speak in size and place, which is how people think about it.
  const rect = { x: inset.left, y: inset.top, w: 100 - inset.left - inset.right, h: 100 - inset.top - inset.bottom };
  const setRect = (next: Partial<typeof rect>) => {
    const r = { ...rect, ...next };
    const w = clamp(r.w, 20, 100);
    const h = clamp(r.h, 20, 100);
    const x = clamp(r.x, 0, 100 - w);
    const y = clamp(r.y, 0, 100 - h);
    onChange({ ...form, photoInset: { left: x, top: y, right: 100 - x - w, bottom: 100 - y - h } });
  };
  const border = form.photoBorder ?? 0;
  const gap = form.photoGap ?? 38;
  const color = form.photoBorderColor || '#FFFFFF';

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="space-y-6">
        <section aria-labelledby="photo-size-title">
          <h3 id="photo-size-title" className="mb-2 text-sm font-semibold">
            Ukuran dan posisi foto
          </h3>
          {!form.photoInFront && (
            <Checkbox
              label="Atur ukuran dan posisi foto sendiri"
              description="Bila mati, foto memenuhi seluruh gambar di bawah bingkai, dan kolase otomatis memakai jendela bening bingkai."
              checked={Boolean(form.photoManualArea)}
              onChange={(e) => onChange({ ...form, photoManualArea: e.target.checked, photoInset: form.photoInset ?? DEFAULT_INSET })}
            />
          )}
          {manual ? (
            <div className="mt-2 grid gap-x-5 gap-y-2 sm:grid-cols-2">
              <Slider label="Lebar foto" unit="%" value={rect.w} min={20} max={100} onChange={(w) => setRect({ w })} hint="Dari lebar bingkai." />
              <Slider label="Tinggi foto" unit="%" value={rect.h} min={20} max={100} onChange={(h) => setRect({ h })} hint="Dari tinggi bingkai." />
              <Slider label="Posisi dari kiri" unit="%" value={rect.x} min={0} max={100 - rect.w} onChange={(x) => setRect({ x })} />
              <Slider label="Posisi dari atas" unit="%" value={rect.y} min={0} max={100 - rect.h} onChange={(y) => setRect({ y })} />
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button variant="secondary" size="sm" onClick={() => setRect({ x: Math.round((100 - rect.w) / 2) })}>
                  Tengahkan ke samping
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setRect({ y: Math.round((100 - rect.h) / 2) })}>
                  Tengahkan ke atas-bawah
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onChange({ ...form, photoInset: DEFAULT_INSET })}>
                  Kembalikan ukuran bawaan
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm text-ink-soft">Ukuran dan posisi diatur otomatis mengikuti bingkai.</p>
          )}
        </section>

        <section aria-labelledby="photo-border-title">
          <h3 id="photo-border-title" className="mb-2 text-sm font-semibold">
            Border dan jarak
          </h3>
          <div className="grid gap-x-5 gap-y-2 sm:grid-cols-2">
            <Slider
              label="Tebal border"
              unit=" px"
              value={border}
              min={0}
              max={64}
              onChange={(v) => onChange({ ...form, photoBorder: v })}
              hint={manual ? 'Garis di sekeliling setiap foto. 0 berarti tanpa border.' : 'Pada foto tunggal, border berlaku bila ukuran dan posisi diatur sendiri. Pada kolase selalu berlaku.'}
            />
            <Slider label="Jarak antar foto kolase" unit=" px" value={gap} min={0} max={120} onChange={(v) => onChange({ ...form, photoGap: v })} hint="Celah antara foto pada kolase 2 sampai 4 foto." />
            <Field label="Warna border" aside={color.toUpperCase()}>
              {(p) => <input {...p} type="color" value={color} onChange={(e) => onChange({ ...form, photoBorderColor: e.target.value.toUpperCase() })} className="h-11 w-24 cursor-pointer rounded-xs border border-field bg-card p-1" />}
            </Field>
          </div>
          <p className="mt-2 text-xs text-ink-soft">Ukuran dalam piksel pada gambar selebar 1080 px; di HP tamu otomatis menyesuaikan.</p>
        </section>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Pratinjau</p>
        <div role="group" aria-label="Contoh isi pratinjau" className="mb-3 flex flex-wrap gap-1.5">
          {([1, 2, 4] as CollageLayout[]).map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={shots === n}
              onClick={() => setShots(n)}
              className={`min-h-11 rounded-sm border px-3 text-sm font-semibold ${shots === n ? 'border-primary bg-paper-2' : 'border-field bg-card hover:bg-paper-2'}`}
            >
              {n === 1 ? '1 foto' : `Kolase ${n}`}
            </button>
          ))}
        </div>
        <FramePreview config={form} shots={shots} />
      </div>
    </div>
  );
};

/**
 * The couple's event frame for the guest camera. Frames are 9:16, the shape of an Instagram Story, so a guest's
 * photo can go straight to their Story. A photo taken with a frame takes the frame's own shape.
 */
export const FramePanel: React.FC = () => {
  const client = useQueryClient();
  const notify = useToast();
  const { data: invitation } = useQuery({ queryKey: queryKeys.invitation, queryFn: publicApi.invitation });
  const { data } = useQuery({ queryKey: queryKeys.cms.frame, queryFn: cmsApi.photoMoments.frame });
  const [form, setForm] = useState<PhotoFrameConfig | null>(null);
  const [zones, setZones] = useState(false);
  const presets = useMemo(
    () => buildFramePresets(invitation?.groomShortName || 'Mempelai', invitation?.brideShortName || 'Pengantin'),
    [invitation],
  );
  const shape = useFrameShape(form?.frameOverlayUrl || '');
  const ratio = shape ? describeRatio(shape.w, shape.h) : null;

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: cmsApi.photoMoments.saveFrame,
    onSuccess: (saved) => {
      client.setQueryData(queryKeys.cms.frame, saved);
      client.invalidateQueries({ queryKey: queryKeys.cameraConfig });
      notify('Bingkai foto tersimpan.');
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  if (!form) return null;
  const isCustom = Boolean(form.frameOverlayUrl) && !presets.some((p) => p.dataUrl === form.frameOverlayUrl);

  return (
    <Panel
      title="Bingkai acara"
      description="Bingkai khusus acara Anda di kamera tamu, di samping bingkai putih dan hitam bawaan. Ukurannya 9:16, jadi foto bisa langsung diunggah ke Story Instagram."
      actions={
        <Button onClick={() => save.mutate(form)} loading={save.isPending}>
          Simpan bingkai
        </Button>
      }
      className="mb-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6">
        <Checkbox label="Tawarkan bingkai acara" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
        <Checkbox label="Tampilkan area aman Story" description="Bagian atas dan bawah yang tertutup tampilan Instagram." checked={zones} onChange={(e) => setZones(e.target.checked)} />
      </div>

      {ratio && form.frameOverlayUrl && (
        <p
          role="status"
          className={`mt-2 flex items-start gap-1.5 rounded-sm px-3 py-2 text-sm ${ratio.kind === 'story' ? 'bg-ok-bg text-ok' : 'bg-maybe-bg text-maybe'}`}
        >
          {ratio.kind === 'story' ? <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
          <span>
            {ratio.kind === 'story'
              ? `Bingkai yang dipakai berukuran ${ratio.label}.`
              : `Bingkai yang dipakai berukuran ${ratio.label}. Foto dengan bingkai ini ikut berbentuk ${ratio.kind === 'portrait' ? '4:5' : 'serupa'} dan tidak pas untuk Story Instagram. Pilih salah satu bingkai di bawah, atau unggah bingkai ${FRAME_WIDTH} × ${FRAME_HEIGHT} px.`}
          </span>
        </p>
      )}

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-semibold">Susunan foto dan bingkai</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { front: false, title: 'Bingkai di atas foto', detail: 'Untuk PNG dengan latar transparan. Foto tamu terlihat di belakang bingkai.' },
            { front: true, title: 'Foto di depan bingkai', detail: 'Untuk bingkai berupa gambar utuh (tidak transparan). Foto tamu ditaruh di atas bingkai, di dalam area yang Anda atur.' },
          ].map((o) => {
            const active = Boolean(form.photoInFront) === o.front;
            return (
              <label key={o.title} className={`flex cursor-pointer gap-3 rounded-sm border p-3 ${active ? 'border-primary ring-2 ring-primary' : 'border-line hover:border-field'}`}>
                <input
                  type="radio"
                  name="frame-order"
                  className="mt-1 h-5 w-5 accent-[var(--primary)]"
                  checked={active}
                  onChange={() => setForm({ ...form, photoInFront: o.front, photoInset: form.photoInset ?? DEFAULT_INSET })}
                />
                <span>
                  <span className="block font-semibold">{o.title}</span>
                  <span className="block text-sm text-ink-soft">{o.detail}</span>
                </span>
              </label>
            );
          })}
        </div>

      </fieldset>

      <FramePhotoStyle form={form} onChange={setForm} />

      <div role="radiogroup" aria-label="Pilihan bingkai" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {presets.map((p) => {
          const active = form.frameOverlayUrl === p.dataUrl;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setForm({ ...form, frameOverlayUrl: p.dataUrl, frameName: p.name })}
              className={`rounded-sm border p-2 text-left ${active ? 'border-primary ring-2 ring-primary' : 'border-line hover:border-field'}`}
            >
              <span className="relative mx-auto block aspect-[9/16] w-full max-w-40 overflow-hidden rounded-xs bg-[linear-gradient(160deg,#6f6253,#c9b79d_55%,#8a7a68)]">
                <img src={p.dataUrl} alt="" className="absolute inset-0 h-full w-full" />
                {zones && <SafeZones />}
              </span>
              <span className="mt-2 block text-sm font-semibold">{p.name}</span>
              <span className="block text-xs text-ink-soft">{p.description}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <MediaField
          label="Atau unggah bingkai sendiri"
          category="general"
          aspect="story"
          checker
          crop={false}
          maxDimension={2000}
          maxMB={{ image: 10 }}
          value={isCustom ? form.frameOverlayUrl : ''}
          onChange={(url) => setForm({ ...form, frameOverlayUrl: url, frameName: 'Bingkai unggahan' })}
          hint={`PNG ${FRAME_WIDTH} × ${FRAME_HEIGHT} px (9:16): transparan untuk "Bingkai di atas foto", atau gambar utuh untuk "Foto di depan bingkai". Biarkan ${STORY_SAFE.top} px teratas dan ${STORY_SAFE.bottom} px terbawah bebas dari tulisan penting, karena Instagram menutupinya dengan nama akun dan kolom balas.`}
          noUrl
        />
      </div>
    </Panel>
  );
};
