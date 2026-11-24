import React, { useEffect, useRef, useState } from 'react';
import { Film, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cmsApi, uploadFileWithProgress } from '../../../lib/api.js';
import { formatBytes, kindOf, type FileRules, type MediaKind } from '../../../lib/files.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { resizeImageFile } from '../../../lib/image.js';
import { PageHeader } from '../../../components/cms/CmsPage.js';
import { MediaField } from '../../../components/cms/MediaField.js';
import { useCollection } from '../../../components/cms/useCollection.js';
import { useToast } from '../../../components/cms/Toast.js';
import { Button } from '../../../components/ui/Button.js';
import { Field, Input, Select, Textarea } from '../../../components/ui/Field.js';
import { DropSurface, FileDropzone } from '../../../components/ui/FileDropzone.js';
import { required, useFormErrors } from '../../../components/cms/useFormErrors.js';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal.js';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/StateView.js';
import type { GalleryCategory, GalleryPhoto } from '@shared/types';

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

const MAX_FILES = 30;
const BATCH_RULES: FileRules = { kinds: ['image', 'video'], maxMB: { image: 25, video: 100 } };

type Row = { key: string; file: File; kind: MediaKind; preview?: string; status: 'waiting' | 'uploading' | 'done' | 'error'; fraction: number; url?: string; error?: string };

const newKey = (f: File) => `${f.name}-${f.size}-${f.lastModified}-${Math.random().toString(36).slice(2, 7)}`;

/** Drop or pick up to 30 photos and videos; each uploads with its own progress, then all are added under one category. */
const BatchUpload: React.FC<{ open: boolean; onClose: () => void; startIndex: number }> = ({ open, onClose, startIndex }) => {
  const client = useQueryClient();
  const notify = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [category, setCategory] = useState<GalleryCategory>('PREWEDDING');
  const [running, setRunning] = useState(false);
  const rowsRef = useRef<Row[]>([]);
  rowsRef.current = rows;

  // Previews are object URLs; give them back when rows go away or the dialog closes.
  useEffect(() => () => rowsRef.current.forEach((r) => r.preview && URL.revokeObjectURL(r.preview)), []);

  const patch = (key: string, change: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...change } : r)));

  const add = (files: File[]) => {
    const room = MAX_FILES - rows.length;
    const taken = files.slice(0, Math.max(0, room));
    if (files.length > taken.length) setRejected((m) => [...m, `Hanya ${MAX_FILES} file sekali unggah. ${files.length - taken.length} file tidak ditambahkan.`]);
    setRows((rs) => [
      ...rs,
      ...taken.map<Row>((file) => {
        const kind = kindOf(file)!;
        return { key: newKey(file), file, kind, preview: kind === 'image' ? URL.createObjectURL(file) : undefined, status: 'waiting', fraction: 0 };
      }),
    ]);
  };

  const remove = (key: string) =>
    setRows((rs) => {
      const gone = rs.find((r) => r.key === key);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return rs.filter((r) => r.key !== key);
    });

  const reset = () => {
    rowsRef.current.forEach((r) => r.preview && URL.revokeObjectURL(r.preview));
    setRows([]);
    setRejected([]);
  };

  const close = () => {
    if (running) return;
    reset();
    onClose();
  };

  /** Upload what is waiting (or failed before), three at a time, then create the gallery entries for everything that arrived. */
  const start = async () => {
    setRunning(true);
    const queue = rowsRef.current.filter((r) => r.status === 'waiting' || r.status === 'error');
    let next = 0;
    const worker = async () => {
      while (next < queue.length) {
        const row = queue[next++];
        patch(row.key, { status: 'uploading', fraction: 0, error: undefined });
        try {
          const body = row.kind === 'image' ? await resizeImageFile(row.file, 1600) : row.file;
          const url = await uploadFileWithProgress(body, row.file.name, 'gallery', (fraction) => patch(row.key, { fraction }));
          patch(row.key, { status: 'done', fraction: 1, url });
        } catch (err) {
          patch(row.key, { status: 'error', error: (err as Error).message });
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);

    const done = rowsRef.current.filter((r) => r.status === 'done' && r.url);
    const failed = rowsRef.current.filter((r) => r.status === 'error').length;
    try {
      if (done.length) {
        const created = await cmsApi.gallery.createMany(
          done.map((r, i) => ({ title: titleFromFile(r.file.name), url: r.url!, category, mediaType: r.kind === 'video' ? 'VIDEO' : 'IMAGE', orderIndex: startIndex + i + 1 })),
        );
        client.invalidateQueries({ queryKey: queryKeys.cms.gallery });
        client.invalidateQueries({ queryKey: queryKeys.invitation });
        notify(`${created.length} media ditambahkan ke galeri.${failed ? ` ${failed} file gagal diunggah.` : ''}`);
      }
      if (failed === 0) {
        reset();
        onClose();
      } else {
        // Keep only the failures on screen, so they can be retried without choosing the files again.
        setRows((rs) => rs.filter((r) => r.status === 'error'));
      }
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setRunning(false);
    }
  };

  const waiting = rows.filter((r) => r.status !== 'done').length;
  const totalBytes = rows.reduce((n, r) => n + r.file.size, 0);

  return (
    <Modal
      open={open}
      onClose={close}
      title="Unggah banyak media"
      description={`Hingga ${MAX_FILES} foto atau video sekaligus. Judul diambil dari nama file dan bisa diubah setelahnya.`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={running}>
            Batal
          </Button>
          <Button onClick={start} disabled={waiting === 0} loading={running}>
            {running ? 'Mengunggah...' : `Unggah ${waiting > 0 ? `${waiting} file` : ''}`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Kategori">
          {(p) => (
            <Select {...p} value={category} onChange={(e) => setCategory(e.target.value as GalleryCategory)} disabled={running}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <FileDropzone rules={BATCH_RULES} multiple disabled={running || rows.length >= MAX_FILES} onFiles={add} onRejected={setRejected}>
          {({ dragging, open: pick }) => (
            <DropSurface
              title={rows.length ? 'Tambah file lagi' : 'Tarik foto dan video ke sini, atau pilih dari perangkat'}
              rules={BATCH_RULES}
              dragging={dragging}
              onOpen={pick}
              disabled={running || rows.length >= MAX_FILES}
              compact={rows.length > 0}
              hint={`JPG, PNG, WEBP · MP4, WEBM · foto maks. 25 MB, video maks. 100 MB`}
            />
          )}
        </FileDropzone>

        {rejected.length > 0 && (
          <ul role="alert" className="space-y-0.5 rounded-sm bg-no-bg px-3 py-2 text-sm text-no">
            {rejected.slice(0, 4).map((m) => (
              <li key={m}>{m}</li>
            ))}
            {rejected.length > 4 && <li>dan {rejected.length - 4} file lain ditolak.</li>}
          </ul>
        )}

        {rows.length > 0 && (
          <>
            <p className="text-sm text-ink-soft" aria-live="polite">
              {rows.length} file · {formatBytes(totalBytes)}
            </p>
            <ul className="max-h-72 divide-y divide-line overflow-y-auto rounded-sm border border-line">
              {rows.map((r) => (
                <li key={r.key} className="flex items-center gap-3 px-3 py-2">
                  <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xs bg-paper-2 text-primary">
                    {r.preview ? <img src={r.preview} alt="" className="h-full w-full object-cover" /> : <Film className="h-5 w-5" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{r.file.name}</span>
                    {r.status === 'uploading' ? (
                      <span className="mt-1 flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r.fraction * 100)} aria-label={`Kemajuan ${r.file.name}`}>
                          <span className="block h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.max(4, r.fraction * 100)}%` }} />
                        </span>
                        <span className="text-xs tabular-nums text-ink-soft">{Math.round(r.fraction * 100)}%</span>
                      </span>
                    ) : (
                      <span className={`block text-xs ${r.status === 'error' ? 'font-medium text-no' : r.status === 'done' ? 'font-medium text-ok' : 'text-ink-soft'}`}>
                        {r.status === 'error' ? r.error : r.status === 'done' ? 'Terunggah' : `${r.kind === 'video' ? 'Video' : 'Foto'} · ${formatBytes(r.file.size)}`}
                      </span>
                    )}
                  </span>
                  {!running && r.status !== 'done' && (
                    <button type="button" onClick={() => remove(r.key)} aria-label={`Lepas ${r.file.name}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-sm text-ink-soft hover:bg-no-bg hover:text-no">
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
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
  const { errors, clear, validate, formRef } = useFormErrors<'url' | 'title'>();
  const set = <K extends keyof GalleryPhoto>(key: K, value: GalleryPhoto[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    clear(key as 'url');
  };

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

      <div role="group" aria-label="Saring kategori" className="no-scrollbar mb-5 flex gap-1 overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)] sm:[mask-image:none]">
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
            <Button type="submit" form="gallery-form" loading={save.isPending}>
              Simpan
            </Button>
          </>
        }
      >
        {draft && (
          <form
            id="gallery-form"
            ref={formRef}
            noValidate
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const ok = validate({ url: !draft.url ? 'Unggah foto atau video dulu.' : null, title: required(draft.title, 'Judul') });
              if (ok) save.mutate({ ...draft, mediaType: isVideo(draft.url || '') ? 'VIDEO' : 'IMAGE' }, { onSuccess: () => setDraft(null) });
            }}
          >
            <div>
              <MediaField
                label="File"
                category="gallery"
                allowVideo
                aspect="square"
                cropRatio={4 / 5}
                minWidth={800}
                value={draft.url || ''}
                onChange={(url) => set('url', url)}
                hint="Foto dikecilkan otomatis ke 1600 px sebelum diunggah."
              />
              {errors.url && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-no">
                  {errors.url}
                </p>
              )}
            </div>
            <Field label="Judul" error={errors.title} counter={{ value: (draft.title || '').length, max: 80 }}>
              {(p) => <Input {...p} required maxLength={80} autoComplete="off" value={draft.title || ''} onChange={(e) => set('title', e.target.value)} />}
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
            <Field label="Keterangan" aside="opsional" counter={{ value: (draft.caption || '').length, max: 160 }}>
              {(p) => <Textarea {...p} rows={2} maxLength={160} value={draft.caption || ''} onChange={(e) => set('caption', e.target.value)} />}
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
