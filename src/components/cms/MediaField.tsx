import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, Film, Image as ImageIcon, Link2, Music, RefreshCw, Trash2, X } from 'lucide-react';
import { uploadFileWithProgress } from '../../lib/api.js';
import { resizeImageFile } from '../../lib/image.js';
import { checkFile, formatBytes, kindOf, kindOfUrl, type FileRules, type MediaKind } from '../../lib/files.js';
import { checkUrl } from '../../lib/inputs.js';
import { DropSurface, FileDropzone } from '../ui/FileDropzone.js';
import { Input } from '../ui/Field.js';
import type { UploadCategory } from '@shared/types';

type Aspect = 'portrait' | 'landscape' | 'square' | 'story';

interface MediaFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  category: UploadCategory;
  /** Kept for older call sites: true means photos and videos. */
  allowVideo?: boolean;
  kinds?: MediaKind[];
  hint?: string;
  /** Longest edge for images before upload. */
  maxDimension?: number;
  aspect?: Aspect;
  maxMB?: FileRules['maxMB'];
  /** Warn (without blocking) when a photo is narrower than this many pixels. */
  minWidth?: number;
  /** Show a checkerboard behind the preview, for transparent PNG overlays. */
  checker?: boolean;
  /** Hide the "paste a link" option. */
  noUrl?: boolean;
}

const THUMB: Record<Aspect, string> = {
  portrait: 'aspect-[3/4] w-28',
  landscape: 'aspect-video w-44',
  square: 'aspect-square w-28',
  story: 'aspect-[9/16] w-24',
};
const CHECKER =
  'bg-[length:16px_16px] bg-[linear-gradient(45deg,#d8d0c2_25%,transparent_25%,transparent_75%,#d8d0c2_75%),linear-gradient(45deg,#d8d0c2_25%,#f3eee4_25%,#f3eee4_75%,#d8d0c2_75%)] bg-[position:0_0,8px_8px]';

const PROMPT: Record<string, string> = {
  image: 'Tarik foto ke sini, atau pilih dari perangkat',
  video: 'Tarik video ke sini, atau pilih dari perangkat',
  audio: 'Tarik lagu ke sini, atau pilih dari perangkat',
  'image-video': 'Tarik foto atau video ke sini, atau pilih dari perangkat',
};

const fileNameOf = (url: string) => {
  if (url.startsWith('data:')) return 'berkas tersimpan';
  try {
    return decodeURIComponent(new URL(url, window.location.origin).pathname.split('/').pop() || url);
  } catch {
    return url;
  }
};

/**
 * Upload by drag-and-drop or the file dialog, with a progress bar, a real preview (photo, video or audio),
 * and plain-language errors. A link can still be pasted for files hosted elsewhere.
 * Photos are shrunk in the browser first.
 */
export const MediaField: React.FC<MediaFieldProps> = ({
  label,
  value,
  onChange,
  category,
  allowVideo,
  kinds,
  hint,
  maxDimension = 1600,
  aspect = 'landscape',
  maxMB,
  minWidth,
  checker,
  noUrl,
}) => {
  const id = useId();
  const rules: FileRules = { kinds: kinds ?? (allowVideo ? ['image', 'video'] : ['image']), maxMB };
  const promptKey = rules.kinds.length > 1 ? 'image-video' : rules.kinds[0];
  const [progress, setProgress] = useState<{ name: string; fraction: number; stage: 'prepare' | 'upload' } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const kind = value ? kindOfUrl(value) ?? (rules.kinds.includes('image') ? 'image' : rules.kinds[0]) : null;

  useEffect(() => setDims(null), [value]);
  useEffect(() => () => abort.current?.abort(), []);

  const upload = async (file: File) => {
    const problem = checkFile(file, rules);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    const controller = new AbortController();
    abort.current = controller;
    setProgress({ name: file.name, fraction: 0, stage: 'prepare' });
    try {
      const body = kindOf(file) === 'image' ? await resizeImageFile(file, maxDimension) : file;
      setProgress({ name: file.name, fraction: 0, stage: 'upload' });
      const url = await uploadFileWithProgress(body, file.name, category, (fraction) => setProgress({ name: file.name, fraction, stage: 'upload' }), controller.signal);
      onChange(url);
    } catch (err) {
      if (!(err as { aborted?: boolean }).aborted) setError((err as Error).message);
    } finally {
      abort.current = null;
      setProgress(null);
    }
  };

  const busy = progress !== null;
  const lowRes = Boolean(minWidth && dims && dims.w < minWidth);

  return (
    <div className="flex flex-col gap-1.5" role="group" aria-labelledby={`${id}-label`} aria-describedby={`${id}-hint`}>
      <span id={`${id}-label`} className="text-sm font-semibold">
        {label}
      </span>

      <FileDropzone rules={rules} disabled={busy} onFiles={(files) => upload(files[0])} onRejected={(m) => m.length && setError(m[0])} className="relative">
        {({ dragging, open }) =>
          busy ? (
            <div className="rounded-sm border border-field bg-card p-4" role="status">
              <p className="truncate text-sm font-semibold">{progress.name}</p>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress.stage === 'upload' ? Math.round(progress.fraction * 100) : undefined}
                aria-label="Kemajuan unggahan"
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-2"
              >
                <div
                  className={`h-full rounded-full bg-primary transition-[width] duration-200 ${progress.stage === 'prepare' ? 'w-1/4 animate-pulse' : ''}`}
                  style={progress.stage === 'upload' ? { width: `${Math.max(4, progress.fraction * 100)}%` } : undefined}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-ink-soft">
                <span>{progress.stage === 'prepare' ? 'Menyiapkan file...' : `Mengunggah ${Math.round(progress.fraction * 100)}%`}</span>
                <button type="button" onClick={() => abort.current?.abort()} className="inline-flex min-h-8 items-center gap-1 rounded-xs px-2 font-semibold text-ink hover:bg-paper-2">
                  <X className="h-3.5 w-3.5" aria-hidden="true" /> Batal
                </button>
              </div>
            </div>
          ) : value ? (
            <div className={`flex flex-col gap-3 rounded-sm border bg-card p-3 sm:flex-row sm:items-center ${dragging ? 'border-primary' : 'border-field'}`}>
              <div className={`${kind === 'audio' ? 'hidden' : `${THUMB[aspect]} shrink-0 overflow-hidden rounded-xs bg-paper-2 ${checker ? CHECKER : ''}`}`}>
                {kind === 'video' ? (
                  <video src={value} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                ) : (
                  <img
                    src={value}
                    alt=""
                    referrerPolicy="no-referrer"
                    onLoad={(e) => setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                    className={`h-full w-full ${checker ? 'object-contain' : 'object-cover'}`}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                  {kind === 'audio' ? <Music className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : kind === 'video' ? <Film className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : <ImageIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                  <span className="truncate">{fileNameOf(value)}</span>
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">{dims ? `${dims.w} × ${dims.h} px` : kind === 'video' ? 'Video' : kind === 'audio' ? 'Audio' : 'Foto'}</p>
                {kind === 'audio' && <audio src={value} controls preload="none" className="mt-2 h-10 w-full" aria-label={`Dengarkan ${label}`} />}
                {lowRes && (
                  <p role="status" className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-prada-ink">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    Lebarnya {dims!.w} px. Sebaiknya minimal {minWidth} px agar tidak pecah di layar besar.
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  <button type="button" onClick={open} className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-field bg-card px-3 text-sm font-semibold hover:bg-paper-2">
                    <RefreshCw className="h-4 w-4" aria-hidden="true" /> Ganti
                  </button>
                  <button type="button" onClick={() => { setError(null); onChange(''); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-sm px-3 text-sm font-semibold text-no hover:bg-no-bg">
                    <Trash2 className="h-4 w-4" aria-hidden="true" /> Hapus
                  </button>
                </div>
              </div>
              {dragging && (
                <div className="absolute inset-0 grid place-items-center rounded-sm border-2 border-dashed border-primary bg-card/92 text-sm font-semibold text-primary">
                  Lepaskan untuk mengganti
                </div>
              )}
            </div>
          ) : (
            <DropSurface title={PROMPT[promptKey]} rules={rules} dragging={dragging} onOpen={open} describedBy={`${id}-hint`} />
          )
        }
      </FileDropzone>

      {!noUrl && (
        <details className="group text-sm" open={Boolean(urlError)}>
          <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1.5 rounded-xs px-1 text-xs font-semibold text-ink-soft hover:text-ink">
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Pakai tautan dari situs lain
          </summary>
          <div className="mt-1.5">
            <Input
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              value={value.startsWith('/uploads/') ? '' : value}
              onChange={(e) => {
                onChange(e.target.value.trim());
                setUrlError(null);
              }}
              onBlur={(e) => setUrlError(checkUrl(e.target.value.trim()))}
              aria-label={`Tautan ${label}`}
              aria-invalid={urlError ? true : undefined}
              placeholder="https://..."
            />
            {urlError && (
              <p role="alert" className="mt-1 text-xs font-medium text-no">
                {urlError}
              </p>
            )}
          </div>
        </details>
      )}

      <p id={`${id}-hint`} role={error ? 'alert' : undefined} className={`text-xs ${error ? 'font-medium text-no' : 'text-ink-soft'}`}>
        {error || hint}
      </p>
    </div>
  );
};
