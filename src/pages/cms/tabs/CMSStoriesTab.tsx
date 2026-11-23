import React, { useState } from 'react';
import { cmsApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { PageHeader } from '../../../components/cms/CmsPage.js';
import { MediaField } from '../../../components/cms/MediaField.js';
import { useCollection } from '../../../components/cms/useCollection.js';
import { Button } from '../../../components/ui/Button.js';
import { Field, Input, Textarea } from '../../../components/ui/Field.js';
import { required, useFormErrors } from '../../../components/cms/useFormErrors.js';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal.js';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/StateView.js';
import type { LoveStoryItem } from '@shared/types';

const BLANK: Partial<LoveStoryItem> = { year: '', title: '', description: '', photoUrl: '' };

export const CMSStoriesTab: React.FC = () => {
  const { query, items, save, remove } = useCollection(queryKeys.cms.stories, cmsApi.stories, 'Kisah');
  const [draft, setDraft] = useState<Partial<LoveStoryItem> | null>(null);
  const [toDelete, setToDelete] = useState<LoveStoryItem | null>(null);
  const { errors, clear, validate, formRef } = useFormErrors<'year' | 'title' | 'description'>();
  const set = (key: keyof LoveStoryItem, value: string) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    clear(key as 'year');
  };

  return (
    <>
      <PageHeader
        title="Kisah"
        description="Beberapa momen perjalanan berdua, tampil berurutan di undangan. Bagian ini tersembunyi bila kosong."
        actions={<Button onClick={() => setDraft({ ...BLANK })}>Tambah kisah</Button>}
      />

      {query.isLoading ? (
        <LoadingState label="Memuat kisah..." />
      ) : query.isError ? (
        <ErrorState title="Kisah belum bisa dimuat." onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="Belum ada kisah" detail="Bagian kisah tidak tampil di undangan sampai ada isinya." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <li key={s.id} className="flex flex-col overflow-hidden rounded-md border border-line bg-card">
              {s.photoUrl && <img src={s.photoUrl} alt="" referrerPolicy="no-referrer" className="aspect-[4/3] w-full object-cover" />}
              <div className="flex flex-1 flex-col p-4">
                <p className="display-numeral text-2xl text-prada-ink">{s.year}</p>
                <p className="mt-1 font-semibold">{s.title}</p>
                <p className="mt-1 line-clamp-3 flex-1 text-sm text-ink-soft">{s.description}</p>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setDraft({ ...s })}>
                    Ubah
                  </Button>
                  <Button variant="ghost" size="sm" className="text-no" onClick={() => setToDelete(s)}>
                    Hapus
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Ubah kisah' : 'Tambah kisah'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Batal
            </Button>
            <Button type="submit" form="story-form" loading={save.isPending}>
              Simpan
            </Button>
          </>
        }
      >
        {draft && (
          <form
            id="story-form"
            ref={formRef}
            noValidate
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const year = (draft.year || '').trim();
              const ok = validate({
                year: !year ? 'Isi tahun.' : !/^(19|20)\d{2}$/.test(year) ? 'Tulis tahun 4 angka, contoh: 2023.' : null,
                title: required(draft.title, 'Judul'),
                description: required(draft.description, 'Cerita'),
              });
              if (ok) save.mutate(draft, { onSuccess: () => setDraft(null) });
            }}
          >
            <Field label="Tahun" error={errors.year} hint="Empat angka. Kisah diurutkan menurut urutan daftar.">
              {(p) => (
                <Input
                  {...p}
                  required
                  inputMode="numeric"
                  pattern="(19|20)[0-9]{2}"
                  maxLength={4}
                  autoComplete="off"
                  className="w-32"
                  value={draft.year || ''}
                  onChange={(e) => set('year', e.target.value.replace(/\D/g, ''))}
                  placeholder="2023"
                />
              )}
            </Field>
            <Field label="Judul" error={errors.title} counter={{ value: (draft.title || '').length, max: 60 }}>
              {(p) => <Input {...p} required maxLength={60} autoComplete="off" value={draft.title || ''} onChange={(e) => set('title', e.target.value)} />}
            </Field>
            <Field label="Cerita" error={errors.description} counter={{ value: (draft.description || '').length, max: 400 }}>
              {(p) => (
                <Textarea {...p} rows={4} required maxLength={400} value={draft.description || ''} onChange={(e) => set('description', e.target.value)} />
              )}
            </Field>
            <MediaField
              label="Foto (opsional)"
              aspect="portrait"
              category="gallery"
              maxDimension={1400}
              minWidth={600}
              value={draft.photoUrl || ''}
              onChange={(url) => set('photoUrl', url)}
              hint="Potret tegak 4:5 paling pas dalam bingkai gunungan."
            />
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus kisah?"
        message={`"${toDelete?.title}" akan hilang dari undangan.`}
        confirmLabel="Hapus kisah"
        busy={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  );
};
