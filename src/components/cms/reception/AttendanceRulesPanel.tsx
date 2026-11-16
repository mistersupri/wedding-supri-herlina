import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, LocateFixed } from 'lucide-react';
import { cmsApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { parseCoordinates } from '@shared/geo';
import { Panel } from '../CmsPage.js';
import { useToast } from '../Toast.js';
import { Button } from '../../ui/Button.js';
import { Checkbox, Field, Input } from '../../ui/Field.js';
import type { AttendanceSettings } from '@shared/types';

const coordText = (s: Pick<AttendanceSettings, 'venueLat' | 'venueLng'>) =>
  s.venueLat !== null && s.venueLng !== null ? `${s.venueLat}, ${s.venueLng}` : '';

/**
 * Lets guests confirm their own attendance from their phone. With location verification on (the default)
 * they must be within the radius of the venue coordinates set here.
 */
export const AttendanceRulesPanel: React.FC = () => {
  const client = useQueryClient();
  const notify = useToast();
  const { data } = useQuery({ queryKey: queryKeys.cms.attendanceSettings, queryFn: cmsApi.attendance.get });
  const [form, setForm] = useState<AttendanceSettings | null>(null);
  const [coords, setCoords] = useState('');
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm(data);
    setCoords(coordText(data));
  }, [data]);

  const save = useMutation({
    mutationFn: cmsApi.attendance.save,
    onSuccess: (saved) => {
      client.setQueryData(queryKeys.cms.attendanceSettings, saved);
      client.invalidateQueries({ queryKey: queryKeys.invitation });
      notify('Aturan kehadiran tersimpan.');
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  if (!form) return null;

  const parsed = coords.trim() ? parseCoordinates(coords) : null;
  const coordsInvalid = coords.trim() !== '' && !parsed;
  const set = <K extends keyof AttendanceSettings>(key: K, value: AttendanceSettings[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const useMyLocation = () => {
    if (!navigator.geolocation) return notify('Peramban ini tidak mendukung lokasi.', 'error');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
        setLocating(false);
        notify(`Lokasi terisi (akurasi sekitar ${Math.round(pos.coords.accuracy)} m). Pastikan Anda sedang berada di lokasi acara.`);
      },
      () => {
        setLocating(false);
        notify('Lokasi tidak bisa dibaca. Izinkan akses lokasi, atau tempel koordinat dari Google Maps.', 'error');
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  const fromEventMap = async () => {
    try {
      const events = await cmsApi.events.list();
      const found = events.map((e) => parseCoordinates(`${e.mapsUrl} ${e.mapsEmbedUrl ?? ''}`)).find(Boolean);
      if (found) setCoords(`${found.lat}, ${found.lng}`);
      else notify('Tautan peta acara tidak memuat koordinat (tautan pendek tidak bisa dibaca). Tempel koordinat dari Google Maps.', 'error');
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  };

  const submit = () => {
    if (coordsInvalid) return notify('Koordinat tidak bisa dibaca. Contoh: -6.2088, 106.8456', 'error');
    save.mutate({ ...form, venueLat: parsed?.lat ?? null, venueLng: parsed?.lng ?? null });
  };

  return (
    <Panel
      title="Konfirmasi kehadiran oleh tamu"
      description="Tamu bisa mencatat kehadirannya sendiri dari HP, tanpa antre di meja penerima tamu. Kartu tamu dan QR tetap bisa dipakai."
      actions={
        <Button onClick={submit} loading={save.isPending}>
          Simpan aturan
        </Button>
      }
      className="mb-6"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <Checkbox
            label="Tamu boleh konfirmasi hadir sendiri"
            description="Tombolnya muncul di kartu tamu dan di halaman kamera tamu."
            checked={form.selfCheckIn}
            onChange={(e) => set('selfCheckIn', e.target.checked)}
          />
          <Checkbox
            label="Verifikasi lokasi"
            description="Konfirmasi hanya diterima bila HP tamu berada di sekitar lokasi acara. Aktif secara bawaan. Matikan bila sinyal lokasi di gedung buruk: cukup kode undangan yang valid."
            checked={form.verifyLocation}
            onChange={(e) => set('verifyLocation', e.target.checked)}
          />
          <p className="text-sm text-ink-soft">
            Lokasi dibaca dari peramban tamu, jadi ini mencegah konfirmasi dari rumah, bukan pengaman mutlak. Meja penerima tamu tetap menjadi acuan jumlah orang dan suvenir.
          </p>
        </div>

        <div className={`space-y-4 ${form.verifyLocation ? '' : 'opacity-50'}`}>
          <Field
            label="Koordinat lokasi acara"
            hint="Tempel dari Google Maps (klik kanan pada titik, salin angka paling atas), atau tautan peta yang memuat koordinat."
            error={coordsInvalid ? 'Koordinat belum bisa dibaca. Contoh: -6.2088, 106.8456' : undefined}
          >
            {(p) => (
              <Input {...p} value={coords} onChange={(e) => setCoords(e.target.value)} placeholder="-6.208800, 106.845600" inputMode="decimal" disabled={!form.verifyLocation} />
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={useMyLocation} loading={locating} disabled={!form.verifyLocation}>
              <LocateFixed className="h-4 w-4" aria-hidden="true" /> Pakai lokasi saya sekarang
            </Button>
            <Button variant="secondary" size="sm" onClick={fromEventMap} disabled={!form.verifyLocation}>
              Ambil dari tautan peta acara
            </Button>
            {parsed && (
              <a
                href={`https://www.google.com/maps?q=${parsed.lat},${parsed.lng}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 px-2 text-[13px] font-semibold text-primary underline underline-offset-4"
              >
                Periksa di peta <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
          <Field label="Radius (meter)" hint="Seberapa jauh dari titik itu tamu masih dianggap di lokasi. 100 sampai 300 m cocok untuk gedung; lebih luas untuk acara di kebun atau kampung.">
            {(p) => (
              <Input
                {...p}
                type="number"
                min={20}
                max={5000}
                step={10}
                value={form.radiusMeters}
                onChange={(e) => set('radiusMeters', Number(e.target.value))}
                className="w-32"
                disabled={!form.verifyLocation}
              />
            )}
          </Field>
        </div>
      </div>
    </Panel>
  );
};
