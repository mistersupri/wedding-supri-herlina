import React, { useState } from 'react';
import { cmsApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { PageHeader } from '../../../components/cms/CmsPage.js';
import { MediaField } from '../../../components/cms/MediaField.js';
import { useCollection } from '../../../components/cms/useCollection.js';
import { Button } from '../../../components/ui/Button.js';
import { Field, Input, Textarea } from '../../../components/ui/Field.js';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal.js';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/StateView.js';
import type { LoveStoryItem } from '../../../types.js';

const BLANK: Partial<LoveStoryItem> = { year: '', title: '', description: '', photoUrl: '' };

export const CMSStoriesTab: React.FC = () => {
  const { query, items, save, remove } = useCollection(queryKeys.cms.stories, cmsApi.stories, 'Kisah');
  const [draft, setDraft] = useState<Partial<LoveStoryItem> | null>(null);
  const [toDelete, setToDelete] = useState<LoveStoryItem | null>(null);
  const set = (key: keyof LoveStoryItem, value: string) => setDraft((d) => (d ? { ...d, [key]: value } : d));

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
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(draft, { onSuccess: () => setDraft(null) });
            }}
          >
            <Field label="Tahun">
              {(p) => <Input {...p} required value={draft.year || ''} onChange={(e) => set('year', e.target.value)} placeholder="2023" />}
            </Field>
            <Field label="Judul">
              {(p) => <Input {...p} required value={draft.title || ''} onChange={(e) => set('title', e.target.value)} />}
            </Field>
            <Field label="Cerita">
              {(p) => (
                <Textarea {...p} rows={4} required value={draft.description || ''} onChange={(e) => set('description', e.target.value)} />
              )}
            </Field>
            <MediaField
              label="Foto (opsional)"
              aspect="portrait"
              category="gallery"
              value={draft.photoUrl || ''}
              onChange={(url) => set('photoUrl', url)}
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
