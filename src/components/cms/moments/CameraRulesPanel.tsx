import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cmsApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { LOOKS, LOOK_GROUPS, type Look } from '../../../features/moments/film/looks.js';
import { newRecipe, renderPhoto, sampleScene } from '../../../features/moments/film/render.js';
import { Panel } from '../CmsPage.js';
import { useToast } from '../Toast.js';
import { Button } from '../../ui/Button.js';
import { Checkbox, Field, Input, Segmented, Select } from '../../ui/Field.js';
import type { CameraSettings, MomentAccess, MomentDownload, MomentVisibility } from '@shared/types';

const ACCESS: { value: MomentAccess; label: string; hint: string }[] = [
  { value: 'CHECKED_IN', label: 'Sudah check-in', hint: 'Kamera terbuka setelah tamu dicatat hadir di meja penerima tamu.' },
  { value: 'INVITED', label: 'Semua undangan', hint: 'Tamu cukup punya kode undangan yang valid.' },
  { value: 'ANYONE', label: 'Siapa saja', hint: 'Cocok untuk QR di meja: tamu cukup menulis nama. Kode tetap bisa dipakai.' },
];

/** One look on a sample landscape, for the picker. */
const LookChip: React.FC<{ look: Look; on: boolean; isDefault: boolean; onToggle: () => void }> = ({ look, on, isDefault, onToggle }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const scene = useMemo(() => sampleScene(160), []);
  useEffect(() => {
    if (ref.current) renderPhoto(scene, { ...newRecipe(look.id), strength: 100 }, { width: 120 }, ref.current);
  }, [scene, look.id]);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onToggle}
      className={`w-20 shrink-0 rounded-sm border p-1.5 text-left transition-colors ${on ? 'border-primary ring-1 ring-primary' : 'border-line opacity-55 hover:opacity-100'}`}
    >
      <canvas ref={ref} className="block aspect-[4/5] w-full rounded-xs" aria-hidden="true" />
      <span className="mt-1 block text-[11px] font-bold text-prada-ink">{look.code}</span>
      <span className="block truncate text-xs">{look.name}</span>
      {isDefault && <span className="block text-[10px] font-semibold text-primary">awal</span>}
    </button>
  );
};

/** The couple's rules for the guest camera. Everything can change while the party is on. */
export const CameraRulesPanel: React.FC = () => {
  const client = useQueryClient();
  const notify = useToast();
  const { data } = useQuery({ queryKey: queryKeys.cms.cameraSettings, queryFn: cmsApi.photoMoments.settings });
  const [form, setForm] = useState<CameraSettings | null>(null);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: cmsApi.photoMoments.saveSettings,
    onSuccess: (saved) => {
      client.setQueryData(queryKeys.cms.cameraSettings, saved);
      client.invalidateQueries({ queryKey: queryKeys.invitation });
      client.invalidateQueries({ queryKey: queryKeys.cameraConfig });
      notify('Aturan kamera tersimpan.');
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  if (!form) return null;
  const set = <K extends keyof CameraSettings>(key: K, value: CameraSettings[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const film = LOOKS.filter((l) => l.id !== 'none');
  const enabled = form.enabledLooks.length ? form.enabledLooks : film.map((l) => l.id);
  const toggleLook = (id: string) => {
    const next = enabled.includes(id) ? enabled.filter((l) => l !== id) : [...enabled, id];
    // Every look on is stored as "all", so looks added later switch on by themselves.
    set('enabledLooks', next.length === film.length ? [] : next);
  };

  return (
    <Panel
      title="Aturan kamera tamu"
      description="Semua bisa diubah kapan saja, termasuk saat acara berlangsung."
      actions={
        <Button onClick={() => save.mutate(form)} loading={save.isPending}>
          Simpan aturan
        </Button>
      }
      className="mb-6"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label="Siapa yang bisa memotret" hint={ACCESS.find((a) => a.value === form.access)?.hint}>
            {() => <Segmented<MomentAccess> name="Akses kamera" value={form.access} options={ACCESS} onChange={(v) => set('access', v)} />}
          </Field>
          <Field label="Frame per tamu" hint="Jatah jepretan setiap tamu, seperti kamera sekali pakai (1 sampai 50).">
            {(p) => (
              <Input
                {...p}
                type="number"
                min={1}
                max={50}
                value={form.framesPerGuest}
                onChange={(e) => set('framesPerGuest', Number(e.target.value))}
                className="w-28"
              />
            )}
          </Field>
          <Checkbox
            label="Kamera terbuka"
            description="Matikan untuk menutup kamera. Foto yang sudah masuk tetap aman."
            checked={form.cameraOpen}
            onChange={(e) => set('cameraOpen', e.target.checked)}
          />
          <Checkbox
            label="Cek dulu sebelum tayang"
            description="Foto baru menunggu persetujuan Anda sebelum terlihat tamu lain dan di layar besar."
            checked={form.moderation}
            onChange={(e) => set('moderation', e.target.checked)}
          />
          <Checkbox
            label="Layar besar aktif"
            description="Halaman slideshow untuk proyektor di lokasi acara."
            checked={form.screenEnabled}
            onChange={(e) => set('screenEnabled', e.target.checked)}
          />
        </div>
        <div className="space-y-4">
          <Field label="Tamu bisa melihat">
            {() => (
              <Segmented<MomentVisibility>
                name="Siapa lihat apa"
                value={form.visibility}
                options={[
                  { value: 'ALL', label: 'Foto semua tamu' },
                  { value: 'OWN', label: 'Hanya foto sendiri' },
                ]}
                onChange={(v) => set('visibility', v)}
              />
            )}
          </Field>
          <Field label="Tamu boleh menyimpan" hint="Yang disimpan adalah ukuran asli.">
            {() => (
              <Segmented<MomentDownload>
                name="Boleh download apa"
                value={form.download}
                options={[
                  { value: 'NONE', label: 'Tidak ada' },
                  { value: 'OWN', label: 'Foto sendiri' },
                  { value: 'ALL', label: 'Semua foto' },
                ]}
                onChange={(v) => set('download', v)}
              />
            )}
          </Field>
          <Field label="Look saat kamera dibuka">
            {(p) => (
              <Select {...p} value={form.defaultLook} onChange={(e) => set('defaultLook', e.target.value)}>
                {LOOKS.filter((l) => l.id === 'none' || enabled.includes(l.id)).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.id === 'none' ? 'Asli (tanpa look)' : `${l.code} ${l.name}`}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold">
            Look film yang tersedia{' '}
            <span className="font-normal text-ink-soft">
              ({enabled.length} dari {film.length})
            </span>
          </p>
          <button
            type="button"
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            onClick={() => set('enabledLooks', [])}
          >
            Nyalakan semua
          </button>
        </div>
        {LOOK_GROUPS.map((g) => (
          <div key={g.id} className="mt-3">
            <p className="mb-1.5 text-xs font-semibold tracking-wider text-ink-soft uppercase">{g.label}</p>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {film
                .filter((l) => l.group === g.id)
                .map((l) => (
                  <LookChip
                    key={l.id}
                    look={l}
                    on={enabled.includes(l.id)}
                    isDefault={form.defaultLook === l.id}
                    onToggle={() => toggleLook(l.id)}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
};
