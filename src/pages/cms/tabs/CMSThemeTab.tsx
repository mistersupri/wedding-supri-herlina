import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cmsApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { THEME_OPTIONS } from '../../../lib/theme.js';
import { TEMPLATES } from '@shared/templates';
import { PageHeader, Panel } from '../../../components/cms/CmsPage.js';
import { useToast } from '../../../components/cms/Toast.js';
import { Button } from '../../../components/ui/Button.js';
import { Field, Input, Textarea } from '../../../components/ui/Field.js';
import { ErrorState, LoadingState } from '../../../components/ui/StateView.js';
import type { ThemeSettings } from '@shared/types';

/** ISO string <-> value for <input type="datetime-local"> in the admin's local time. */
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : '');

export const CMSThemeTab: React.FC = () => {
  const client = useQueryClient();
  const notify = useToast();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: queryKeys.cms.theme, queryFn: cmsApi.theme.get });
  const [form, setForm] = useState<ThemeSettings | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: cmsApi.theme.save,
    onSuccess: (saved) => {
      client.setQueryData(queryKeys.cms.theme, saved);
      client.invalidateQueries({ queryKey: queryKeys.invitation });
      notify('Pengaturan tersimpan.');
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  if (isLoading) return <LoadingState label="Memuat pengaturan..." />;
  if (isError || !form) return <ErrorState title="Pengaturan belum bisa dimuat." onRetry={() => refetch()} />;

  const set = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(form);
      }}
    >
      <PageHeader
        title="Template, musik & WhatsApp"
        description="Desain undangan, lagu latar, tanggal hitung mundur, dan nomor tujuan konfirmasi."
        actions={
          <Button type="submit" loading={save.isPending}>
            Simpan pengaturan
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Template undangan"
          description="Semua template memakai data yang sama: mempelai, acara, galeri, RSVP, kado, dan kartu tamu."
          className="lg:col-span-2"
        >
          <div role="radiogroup" aria-label="Template undangan" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TEMPLATES.map((t) => {
              const active = form.templateId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => set('templateId', t.id)}
                  className={`rounded-sm border p-4 text-left transition-colors ${active ? 'border-primary ring-2 ring-primary' : 'border-line hover:border-field'}`}
                >
                  <span className="flex h-16 overflow-hidden rounded-xs" aria-hidden="true">
                    <span className="flex-[3]" style={{ backgroundColor: t.swatches[0] }} />
                    <span className="flex-[2]" style={{ backgroundColor: t.swatches[1] }} />
                    <span className="flex-1" style={{ backgroundColor: t.swatches[2] }} />
                  </span>
                  <span className="mt-3 block font-semibold">{t.name}</span>
                  <span className="mt-0.5 block text-sm text-ink-soft">{t.description}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-ink-soft">
            Simpan, lalu buka Pratinjau untuk melihat hasilnya. Foto yang tampil selalu foto dari menu Mempelai dan Galeri.
          </p>
        </Panel>

        {form.templateId === 'nusantara' && (
          <Panel title="Warna Nusantara" description="Setiap pilihan dinamai dari pewarna batik." className="lg:col-span-2">
            <div role="radiogroup" aria-label="Warna undangan" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {THEME_OPTIONS.map((t) => {
                const active = form.themeColor === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => set('themeColor', t.id)}
                    className={`rounded-sm border p-4 text-left transition-colors ${active ? 'border-primary ring-2 ring-primary' : 'border-line hover:border-field'}`}
                  >
                    <span className="flex h-10 overflow-hidden rounded-xs" aria-hidden="true">
                      {t.swatches.map((c) => (
                        <span key={c} className="flex-1" style={{ backgroundColor: c }} />
                      ))}
                    </span>
                    <span className="mt-3 block font-semibold">{t.name}</span>
                    <span className="mt-0.5 block text-sm text-ink-soft">{t.description}</span>
                  </button>
                );
              })}
            </div>
          </Panel>
        )}

        <Panel title="Tanggal">
          <div className="space-y-4">
            <Field label="Tanggal & jam pernikahan" hint="Tampil di sampul dan dipakai untuk Google Calendar.">
              {(p) => (
                <Input
                  {...p}
                  type="datetime-local"
                  required
                  value={toLocalInput(form.weddingDate)}
                  onChange={(e) => set('weddingDate', fromLocalInput(e.target.value))}
                />
              )}
            </Field>
            <Field label="Hitung mundur menuju" hint="Biasanya sama dengan jam akad.">
              {(p) => (
                <Input
                  {...p}
                  type="datetime-local"
                  required
                  value={toLocalInput(form.countdownTarget)}
                  onChange={(e) => set('countdownTarget', fromLocalInput(e.target.value))}
                />
              )}
            </Field>
          </div>
        </Panel>

        <Panel title="Musik latar" description="Mulai diputar saat tamu membuka sampul.">
          <div className="space-y-4">
            <Field label="Judul lagu">
              {(p) => <Input {...p} value={form.musicTitle} onChange={(e) => set('musicTitle', e.target.value)} />}
            </Field>
            <Field label="URL file audio" hint="MP3 yang bisa diakses publik. Kosongkan untuk mematikan musik.">
              {(p) => <Input {...p} type="url" value={form.musicUrl} onChange={(e) => set('musicUrl', e.target.value)} />}
            </Field>
            {form.musicUrl && <audio src={form.musicUrl} controls preload="none" className="w-full" aria-label="Dengarkan musik latar" />}
          </div>
        </Panel>

        <Panel
          title="Konfirmasi lewat WhatsApp"
          description="Tamu yang sudah mengirim RSVP bisa mengabari Anda lewat tautan ini."
          className="lg:col-span-2"
        >
          <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
            <Field label="Nomor WhatsApp tujuan" hint="Format internasional tanpa +, contoh 6281234567890.">
              {(p) => (
                <Input
                  {...p}
                  inputMode="tel"
                  value={form.whatsappNumber}
                  onChange={(e) => set('whatsappNumber', e.target.value.replace(/[^0-9]/g, ''))}
                />
              )}
            </Field>
            <Field label="Isi pesan" hint="Kata yang diganti otomatis: {nama_tamu}, {status_kehadiran}, {jumlah_tamu}, {ucapan}.">
              {(p) => <Textarea {...p} rows={4} value={form.whatsappTemplate} onChange={(e) => set('whatsappTemplate', e.target.value)} />}
            </Field>
          </div>
        </Panel>
      </div>
    </form>
  );
};
