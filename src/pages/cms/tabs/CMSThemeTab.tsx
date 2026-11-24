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
import { PhoneField } from '../../../components/ui/fields.js';
import { MediaField } from '../../../components/cms/MediaField.js';
import { parsePhone } from '@shared/phone';
import { useFormErrors } from '../../../components/cms/useFormErrors.js';
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
  const { errors, clear, validate, formRef } = useFormErrors<'musicTitle' | 'whatsappNumber' | 'weddingDate' | 'countdownTarget'>();

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

  const set = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    clear(key as 'musicTitle');
  };

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const ok = validate({
          weddingDate: !form.weddingDate ? 'Isi tanggal dan jam pernikahan.' : null,
          countdownTarget: !form.countdownTarget ? 'Isi target hitung mundur.' : null,
          musicTitle: form.musicUrl && !form.musicTitle.trim() ? 'Isi judul lagu agar tamu tahu yang sedang diputar.' : null,
          whatsappNumber: form.whatsappNumber.trim() && !parsePhone(form.whatsappNumber) ? 'Nomor belum benar. Contoh: 0812-3456-7890.' : null,
        });
        if (ok) save.mutate(form);
      }}
    >
      <PageHeader
        title="Template, musik & WhatsApp"
        stickyActions
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
            <Field label="Tanggal & jam pernikahan" error={errors.weddingDate} hint="Tampil di sampul dan dipakai untuk Google Calendar.">
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
            <Field label="Hitung mundur menuju" error={errors.countdownTarget} hint="Biasanya sama dengan jam akad.">
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
            <MediaField
              label="File lagu"
              category="general"
              kinds={['audio']}
              maxMB={{ audio: 15 }}
              noUrl={false}
              value={form.musicUrl}
              onChange={(url) => set('musicUrl', url)}
              hint="MP3 atau M4A, maksimal 15 MB; sekitar 5 MB sudah cukup dan hemat kuota tamu. Hapus file untuk mematikan musik."
            />
            <Field label="Judul lagu" error={errors.musicTitle} hint="Tampil di pemutar musik. Cantumkan penyanyi bila perlu.">
              {(p) => <Input {...p} maxLength={80} autoComplete="off" autoCapitalize="words" value={form.musicTitle} onChange={(e) => set('musicTitle', e.target.value)} />}
            </Field>
          </div>
        </Panel>

        <Panel
          title="Konfirmasi lewat WhatsApp"
          description="Tamu yang sudah mengirim RSVP bisa mengabari Anda lewat tautan ini."
          className="lg:col-span-2"
        >
          <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
            <PhoneField label="Nomor WhatsApp tujuan" format="international" optional value={form.whatsappNumber} onChange={(v) => set('whatsappNumber', v)} error={errors.whatsappNumber} />
            <Field
              label="Isi pesan"
              counter={{ value: form.whatsappTemplate.length, max: 500 }}
              hint="Kata yang diganti otomatis: {nama_tamu}, {status_kehadiran}, {jumlah_tamu}, {ucapan}."
            >
              {(p) => <Textarea {...p} rows={4} maxLength={500} value={form.whatsappTemplate} onChange={(e) => set('whatsappTemplate', e.target.value)} />}
            </Field>
          </div>
        </Panel>
      </div>
    </form>
  );
};
