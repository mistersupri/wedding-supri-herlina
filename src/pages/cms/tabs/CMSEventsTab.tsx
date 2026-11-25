import React, { useState } from 'react';
import { cmsApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { PageHeader } from '../../../components/cms/CmsPage.js';
import { useCollection } from '../../../components/cms/useCollection.js';
import { Button } from '../../../components/ui/Button.js';
import { Field, Input, Textarea } from '../../../components/ui/Field.js';
import { DateField, TimeRangeFields } from '../../../components/ui/fields.js';
import { checkMapsEmbed, checkMapsLink, extractEmbedSrc, isAfter, parseEventTime, parseIdDate } from '../../../lib/inputs.js';
import { required, useFormErrors } from '../../../components/cms/useFormErrors.js';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal.js';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/StateView.js';
import type { WeddingEvent } from '@shared/types';

const blank = (orderIndex: number): Partial<WeddingEvent> => ({
  title: '',
  date: '',
  startTime: '',
  endTime: '',
  venueName: '',
  address: '',
  mapsUrl: '',
  mapsEmbedUrl: '',
  dressCode: '',
  notes: '',
  orderIndex,
});

export const CMSEventsTab: React.FC = () => {
  const { query, items, save, remove } = useCollection(queryKeys.cms.events, cmsApi.events, 'Acara');
  const [draft, setDraft] = useState<Partial<WeddingEvent> | null>(null);
  const [toDelete, setToDelete] = useState<WeddingEvent | null>(null);
  const { errors, clear, validate, formRef } = useFormErrors<'title' | 'date' | 'startTime' | 'endTime' | 'venueName' | 'address' | 'mapsUrl' | 'mapsEmbedUrl'>();

  const set = (key: keyof WeddingEvent, value: string | number) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    clear(key as 'title');
  };
  const text = (key: keyof WeddingEvent) => (draft?.[key] as string) || '';

  return (
    <>
      <PageHeader
        title="Jadwal acara"
        description="Akad, resepsi, dan sesi lain. Alamat dan peta hanya tampil untuk tamu yang memakai kode undangan."
        actions={<Button onClick={() => setDraft(blank(items.length + 1))}>Tambah acara</Button>}
      />

      {query.isLoading ? (
        <LoadingState label="Memuat jadwal..." />
      ) : query.isError ? (
        <ErrorState title="Jadwal belum bisa dimuat." onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Belum ada acara"
          detail="Tambahkan akad atau resepsi pertama."
          action={<Button onClick={() => setDraft(blank(1))}>Tambah acara</Button>}
        />
      ) : (
        <ol className="divide-y divide-line rounded-md border border-line bg-card">
          {items.map((ev) => (
            <li key={ev.id} className="grid gap-3 p-5 sm:grid-cols-[3rem_1fr_auto] sm:items-start">
              <span className="display-numeral text-3xl leading-none text-prada-ink">{String(ev.orderIndex).padStart(2, '0')}</span>
              <div className="min-w-0">
                <p className="font-display text-xl">{ev.title}</p>
                <p className="mt-1 text-[15px]">
                  {ev.date} · {ev.startTime} sampai {ev.endTime}
                </p>
                <p className="text-sm text-ink-soft">
                  {ev.venueName}, {ev.address}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setDraft({ ...ev })}>
                  Ubah
                </Button>
                <Button variant="ghost" size="sm" className="text-no" onClick={() => setToDelete(ev)}>
                  Hapus
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Ubah acara' : 'Tambah acara'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Batal
            </Button>
            <Button type="submit" form="event-form" loading={save.isPending}>
              Simpan
            </Button>
          </>
        }
      >
        {draft && (
          <form
            id="event-form"
            ref={formRef}
            noValidate
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const start = parseEventTime(text('startTime'));
              const end = parseEventTime(text('endTime'));
              const ok = validate({
                title: required(text('title'), 'Nama acara'),
                date: !text('date').trim() ? 'Pilih tanggal acara.' : !parseIdDate(text('date')) ? 'Tanggal belum terbaca. Pilih dari kalender.' : null,
                startTime: !start.time ? 'Isi jam mulai.' : null,
                endTime: !end.time ? 'Isi jam selesai.' : !isAfter(end.time, start.time) ? 'Jam selesai harus setelah jam mulai.' : null,
                venueName: required(text('venueName'), 'Nama tempat'),
                address: required(text('address'), 'Alamat'),
                mapsUrl: !text('mapsUrl') ? 'Tempel tautan Google Maps.' : checkMapsLink(text('mapsUrl')),
                mapsEmbedUrl: checkMapsEmbed(text('mapsEmbedUrl')),
              });
              if (ok) save.mutate(draft, { onSuccess: () => setDraft(null) });
            }}
          >
            <Field label="Nama acara" error={errors.title} className="sm:col-span-2">
              {(p) => (
                <Input {...p} required maxLength={60} autoComplete="off" autoCapitalize="words" value={text('title')} onChange={(e) => set('title', e.target.value)} placeholder="Akad Nikah" />
              )}
            </Field>
            <DateField value={text('date')} onChange={(v) => set('date', v)} error={errors.date} className="sm:col-span-2" />
            <TimeRangeFields
              start={text('startTime')}
              end={text('endTime')}
              startError={errors.startTime}
              endError={errors.endTime}
              onChange={(s, e2) => {
                setDraft((d) => (d ? { ...d, startTime: s, endTime: e2 } : d));
                clear('startTime');
                clear('endTime');
              }}
            />
            <Field label="Nama tempat" error={errors.venueName} className="sm:col-span-2">
              {(p) => <Input {...p} required maxLength={100} autoComplete="off" autoCapitalize="words" value={text('venueName')} onChange={(e) => set('venueName', e.target.value)} />}
            </Field>
            <Field label="Alamat" error={errors.address} counter={{ value: text('address').length, max: 300 }} hint="Hanya tampil untuk tamu yang memakai kode undangan." className="sm:col-span-2">
              {(p) => <Textarea {...p} rows={2} required maxLength={300} value={text('address')} onChange={(e) => set('address', e.target.value)} />}
            </Field>
            <Field label="Tautan Google Maps" error={errors.mapsUrl} hint="Di Google Maps: Bagikan, Salin link." className="sm:col-span-2">
              {(p) => (
                <Input {...p} type="url" inputMode="url" required autoComplete="off" spellCheck={false} placeholder="https://maps.app.goo.gl/..." value={text('mapsUrl')} onChange={(e) => set('mapsUrl', e.target.value.trim())} />
              )}
            </Field>
            <Field
              label="URL embed peta"
              aside="opsional"
              error={errors.mapsEmbedUrl}
              hint="Di Google Maps: Bagikan, Sematkan peta, lalu tempel seluruh kodenya. Bagian src diambil otomatis."
              className="sm:col-span-2"
            >
              {(p) => (
                <Input
                  {...p}
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="https://www.google.com/maps/embed?..."
                  value={text('mapsEmbedUrl')}
                  onChange={(e) => set('mapsEmbedUrl', extractEmbedSrc(e.target.value))}
                />
              )}
            </Field>
            <Field label="Busana" aside="opsional" hint="Contoh: Nuansa sogan dan krem">
              {(p) => <Input {...p} maxLength={80} autoComplete="off" value={text('dressCode')} onChange={(e) => set('dressCode', e.target.value)} />}
            </Field>
            <Field label="Urutan" hint="1 tampil paling awal.">
              {(p) => (
                <Input {...p} type="number" inputMode="numeric" min={1} max={20} value={draft.orderIndex ?? 1} onChange={(e) => set('orderIndex', Number(e.target.value) || 1)} />
              )}
            </Field>
            <Field label="Catatan" aside="opsional" counter={{ value: text('notes').length, max: 300 }} className="sm:col-span-2">
              {(p) => <Textarea {...p} rows={2} maxLength={300} value={text('notes')} onChange={(e) => set('notes', e.target.value)} />}
            </Field>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus acara?"
        message={`"${toDelete?.title}" akan hilang dari undangan.`}
        confirmLabel="Hapus acara"
        busy={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  );
};
