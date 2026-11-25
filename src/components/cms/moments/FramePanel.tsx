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

        {form.photoInFront && (
          <div className="mt-4 grid gap-5 sm:grid-cols-[minmax(0,12rem)_1fr]">
            <div>
              <p className="mb-1.5 text-sm font-semibold">Pratinjau area foto</p>
              <span className="relative block aspect-[9/16] w-full max-w-48 overflow-hidden rounded-xs border border-line bg-paper-2">
                {form.frameOverlayUrl && <img src={form.frameOverlayUrl} alt="" className="absolute inset-0 h-full w-full" />}
                <span
                  className="absolute grid place-items-center bg-[linear-gradient(160deg,#6f6253,#c9b79d_55%,#8a7a68)] text-xs font-semibold text-white"
                  style={{
                    left: `${(form.photoInset ?? DEFAULT_INSET).left}%`,
                    right: `${(form.photoInset ?? DEFAULT_INSET).right}%`,
                    top: `${(form.photoInset ?? DEFAULT_INSET).top}%`,
                    bottom: `${(form.photoInset ?? DEFAULT_INSET).bottom}%`,
                  }}
                >
                  Foto tamu
                </span>
              </span>
            </div>
            <div>
              <p className="mb-2 text-sm text-ink-soft">Jarak area foto dari tepi bingkai, dalam persen. Kolase dan foto tunggal sama-sama mengisi area ini.</p>
              <div className="grid grid-cols-2 gap-3">
                {INSET_SIDES.map(({ key, label }) => (
                  <Field key={key} label={`${label} (%)`}>
                    {(p) => (
                      <Input
                        {...p}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={45}
                        value={(form.photoInset ?? DEFAULT_INSET)[key]}
                        onChange={(e) => setForm({ ...form, photoInset: { ...(form.photoInset ?? DEFAULT_INSET), [key]: Math.min(45, Math.max(0, Number(e.target.value) || 0)) } })}
                      />
                    )}
                  </Field>
                ))}
              </div>
            </div>
          </div>
        )}
      </fieldset>

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
