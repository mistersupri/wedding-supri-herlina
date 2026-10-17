import React, { useState } from 'react';
import { cmsApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { PageHeader } from '../../../components/cms/CmsPage.js';
import { useCollection } from '../../../components/cms/useCollection.js';
import { Button } from '../../../components/ui/Button.js';
import { Field, Input, Textarea } from '../../../components/ui/Field.js';
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

  const set = (key: keyof WeddingEvent, value: string | number) => setDraft((d) => (d ? { ...d, [key]: value } : d));
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
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(draft, { onSuccess: () => setDraft(null) });
            }}
          >
            <Field label="Nama acara" className="sm:col-span-2">
              {(p) => (
                <Input {...p} required value={text('title')} onChange={(e) => set('title', e.target.value)} placeholder="Akad Nikah" />
              )}
            </Field>
            <Field label="Tanggal" hint="Ditulis apa adanya, contoh: Jumat, 20 November 2026" className="sm:col-span-2">
              {(p) => <Input {...p} required value={text('date')} onChange={(e) => set('date', e.target.value)} />}
            </Field>
            <Field label="Mulai">
              {(p) => (
                <Input
                  {...p}
                  required
                  value={text('startTime')}
                  onChange={(e) => set('startTime', e.target.value)}
                  placeholder="08:00 WIB"
                />
              )}
            </Field>
            <Field label="Selesai">
              {(p) => (
                <Input {...p} required value={text('endTime')} onChange={(e) => set('endTime', e.target.value)} placeholder="10:00 WIB" />
              )}
            </Field>
            <Field label="Nama tempat" className="sm:col-span-2">
              {(p) => <Input {...p} required value={text('venueName')} onChange={(e) => set('venueName', e.target.value)} />}
            </Field>
            <Field label="Alamat" className="sm:col-span-2">
              {(p) => <Textarea {...p} rows={2} required value={text('address')} onChange={(e) => set('address', e.target.value)} />}
            </Field>
            <Field label="Tautan Google Maps" className="sm:col-span-2">
              {(p) => <Input {...p} type="url" required value={text('mapsUrl')} onChange={(e) => set('mapsUrl', e.target.value)} />}
            </Field>
            <Field
              label="URL embed peta"
              aside="opsional"
              hint="Dari Google Maps: Bagikan, Sematkan peta, salin isi src."
              className="sm:col-span-2"
            >
              {(p) => <Input {...p} type="url" value={text('mapsEmbedUrl')} onChange={(e) => set('mapsEmbedUrl', e.target.value)} />}
            </Field>
            <Field label="Busana" aside="opsional">
              {(p) => <Input {...p} value={text('dressCode')} onChange={(e) => set('dressCode', e.target.value)} />}
            </Field>
            <Field label="Urutan">
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  min={1}
                  value={draft.orderIndex ?? 1}
                  onChange={(e) => set('orderIndex', Number(e.target.value) || 1)}
                />
              )}
            </Field>
            <Field label="Catatan" aside="opsional" className="sm:col-span-2">
              {(p) => <Textarea {...p} rows={2} value={text('notes')} onChange={(e) => set('notes', e.target.value)} />}
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
