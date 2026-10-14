import React, { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cmsApi, uploadFiles } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { resizeImageFile } from '../../../lib/image.js';
import { PageHeader } from '../../../components/cms/CmsPage.js';
import { MediaField } from '../../../components/cms/MediaField.js';
import { useCollection } from '../../../components/cms/useCollection.js';
import { useToast } from '../../../components/cms/Toast.js';
import { Button } from '../../../components/ui/Button.js';
import { Field, Input, Select, Textarea } from '../../../components/ui/Field.js';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal.js';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/StateView.js';
import type { GalleryCategory, GalleryPhoto } from '../../../types.js';

const CATEGORIES: { value: GalleryCategory; label: string }[] = [
  { value: 'PREWEDDING', label: 'Pra-nikah' },
  { value: 'ENGAGEMENT', label: 'Lamaran' },
  { value: 'MOMENTS', label: 'Momen' },
  { value: 'CEREMONY', label: 'Akad & resepsi' },
];
const labelOf = (c: GalleryCategory) => CATEGORIES.find((x) => x.value === c)?.label || c;
const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);
const titleFromFile = (name: string) => {
  const base = name
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return base ? base[0].toUpperCase() + base.slice(1) : 'Media';
};

/** Pick many files, upload them in one request, then add them all under one category. */
const BatchUpload: React.FC<{ open: boolean; onClose: () => void; startIndex: number }> = ({ open, onClose, startIndex }) => {
  const client = useQueryClient();
  const notify = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<GalleryCategory>('PREWEDDING');

  const mutation = useMutation({
    mutationFn: async () => {
      const prepared = await Promise.all(files.map((f) => (f.type.startsWith('image/') ? resizeImageFile(f, 1600) : f)));
      const uploaded = await uploadFiles(prepared, 'gallery');
      return cmsApi.gallery.createMany(
        uploaded.map((u, i) => ({
          title: titleFromFile(files[i].name),
          url: u.url,
          category,
          mediaType: u.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE',
          orderIndex: startIndex + i + 1,
        })),
      );
    },
    onSuccess: (created) => {
      client.invalidateQueries({ queryKey: queryKeys.cms.gallery });
      client.invalidateQueries({ queryKey: queryKeys.invitation });
      notify(`${created.length} media ditambahkan ke galeri.`);
      setFiles([]);
      onClose();
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Unggah banyak media"
      description="Hingga 30 foto atau video sekaligus. Judul diambil dari nama file dan bisa diubah setelahnya."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={files.length === 0} loading={mutation.isPending}>
            Unggah {files.length > 0 ? `${files.length} file` : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Kategori">
          {(p) => (
            <Select {...p} value={category} onChange={(e) => setCategory(e.target.value as GalleryCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)].slice(0, 30));
          }}
          className="rounded-sm border border-dashed border-field p-6 text-center"
        >
          <p className="text-sm text-ink-soft">Tarik file ke sini, atau</p>
          <Button variant="secondary" className="mt-3" onClick={() => inputRef.current?.click()}>
            Pilih file
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept="image/*,video/*"
            onChange={(e) => {
              setFiles((prev) => [...prev, ...Array.from(e.target.files || [])].slice(0, 30));
              e.target.value = '';
            }}
          />
        </div>
        {files.length > 0 && (
          <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-sm border border-line text-sm">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 px-3 py-1.5">
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  className="min-h-11 shrink-0 px-2 text-no"
                >
                  Lepas
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
};

export const CMSGalleryTab: React.FC = () => {
  const { query, items, save, remove } = useCollection(queryKeys.cms.gallery, cmsApi.gallery, 'Media');
  const [filter, setFilter] = useState<GalleryCategory | 'ALL'>('ALL');
  const [draft, setDraft] = useState<Partial<GalleryPhoto> | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [toDelete, setToDelete] = useState<GalleryPhoto | null>(null);
  const shown = filter === 'ALL' ? items : items.filter((p) => p.category === filter);
  const set = <K extends keyof GalleryPhoto>(key: K, value: GalleryPhoto[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  return (
    <>
      <PageHeader
        title="Galeri"
        description="Foto dan video pra-nikah, lamaran, dan momen lain."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setDraft({ title: '', url: '', caption: '', category: 'PREWEDDING', orderIndex: items.length + 1 })}
            >
              Tambah satu
            </Button>
            <Button onClick={() => setBatchOpen(true)}>Unggah banyak</Button>
          </>
        }
      />

      <div role="group" aria-label="Saring kategori" className="no-scrollbar mb-5 flex gap-1 overflow-x-auto">
        {[{ value: 'ALL' as const, label: 'Semua' }, ...CATEGORIES].map((c) => (
          <button
            key={c.value}
            type="button"
            aria-pressed={filter === c.value}
            onClick={() => setFilter(c.value)}
            className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-semibold ${filter === c.value ? 'border-primary' : 'border-transparent text-ink-soft hover:text-ink'}`}
          >
            {c.label} ({c.value === 'ALL' ? items.length : items.filter((p) => p.category === c.value).length})
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <LoadingState label="Memuat galeri..." />
      ) : query.isError ? (
        <ErrorState title="Galeri belum bisa dimuat." onRetry={() => query.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyState title="Belum ada media di sini" detail="Galeri tidak tampil di undangan selama kosong." />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((p) => (
            <li key={p.id} className="overflow-hidden rounded-md border border-line bg-card">
              <div className="relative aspect-square bg-paper-2">
                {p.mediaType === 'VIDEO' ? (
                  <video src={p.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                ) : (
                  <img src={p.url} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                )}
                {p.mediaType === 'VIDEO' && (
                  <span className="absolute top-2 left-2 rounded-xs bg-deep/80 px-2 py-0.5 text-xs font-semibold text-on-deep">Video</span>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-semibold">{p.title}</p>
                <p className="text-xs text-ink-soft">{labelOf(p.category)}</p>
                <div className="mt-2 flex gap-1">
                  <Button variant="secondary" size="sm" onClick={() => setDraft({ ...p })}>
                    Ubah
                  </Button>
                  <Button variant="ghost" size="sm" className="text-no" onClick={() => setToDelete(p)}>
                    Hapus
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <BatchUpload open={batchOpen} onClose={() => setBatchOpen(false)} startIndex={items.length} />

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Ubah media' : 'Tambah media'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Batal
            </Button>
            <Button type="submit" form="gallery-form" loading={save.isPending} disabled={!draft?.url}>
              Simpan
            </Button>
          </>
        }
      >
        {draft && (
          <form
            id="gallery-form"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({ ...draft, mediaType: isVideo(draft.url || '') ? 'VIDEO' : 'IMAGE' }, { onSuccess: () => setDraft(null) });
            }}
          >
            <MediaField
              label="File"
              category="gallery"
              allowVideo
              aspect="square"
              value={draft.url || ''}
              onChange={(url) => set('url', url)}
            />
            <Field label="Judul">
              {(p) => <Input {...p} required value={draft.title || ''} onChange={(e) => set('title', e.target.value)} />}
            </Field>
            <Field label="Kategori">
              {(p) => (
                <Select {...p} value={draft.category} onChange={(e) => set('category', e.target.value as GalleryCategory)}>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Keterangan" aside="opsional">
              {(p) => <Textarea {...p} rows={2} value={draft.caption || ''} onChange={(e) => set('caption', e.target.value)} />}
            </Field>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus dari galeri?"
        message={`"${toDelete?.title}" akan hilang dari undangan.`}
        confirmLabel="Hapus"
        busy={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  );
};
