import React, { useId, useRef, useState } from 'react';
import { uploadFile } from '../../lib/api.js';
import { resizeImageFile } from '../../lib/image.js';
import { Input } from '../ui/Field.js';
import { Spinner } from '../ui/StateView.js';
import type { UploadCategory } from '../../types.js';

interface MediaFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  category: UploadCategory;
  allowVideo?: boolean;
  hint?: string;
  /** Longest edge for images before upload. */
  maxDimension?: number;
  aspect?: 'portrait' | 'landscape' | 'square';
}

const ASPECT = { portrait: 'aspect-[3/4] w-32', landscape: 'aspect-video w-48', square: 'aspect-square w-32' };
const isVideoUrl = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.startsWith('data:video/');

/** Upload by click or drop, or paste a URL. Images are downscaled in the browser first. */
export const MediaField: React.FC<MediaFieldProps> = ({
  label,
  value,
  onChange,
  category,
  allowVideo,
  hint,
  maxDimension = 1600,
  aspect = 'landscape',
}) => {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const video = file.type.startsWith('video/');
    if (!file.type.startsWith('image/') && !(allowVideo && video)) {
      setError(allowVideo ? 'Pilih file gambar atau video.' : 'Pilih file gambar (JPG, PNG, WEBP).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadFile(video ? file : await resizeImageFile(file, maxDimension), category));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${id}-url`} className="text-sm font-semibold">
        {label}
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        className={`flex flex-col gap-3 rounded-sm border border-dashed p-3 sm:flex-row sm:items-center ${dragging ? 'border-primary bg-paper-2' : 'border-field'}`}
      >
        <div className={`${ASPECT[aspect]} shrink-0 overflow-hidden rounded-xs bg-paper-2`}>
          {value ? (
            allowVideo && isVideoUrl(value) ? (
              <video src={value} muted playsInline preload="metadata" className="h-full w-full object-cover" />
            ) : (
              <img src={value} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            )
          ) : (
            <span className="flex h-full items-center justify-center text-xs text-ink-soft">Belum ada</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-field bg-card px-4 text-sm font-semibold hover:bg-paper-2"
            >
              {busy && <Spinner className="h-4 w-4" />}
              {busy ? 'Mengunggah...' : value ? 'Ganti file' : 'Pilih file'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="min-h-11 rounded-sm px-3 text-sm font-semibold text-no hover:bg-no-bg"
              >
                Hapus
              </button>
            )}
          </div>
          <Input
            id={`${id}-url`}
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="atau tempel URL https://..."
            aria-describedby={`${id}-hint`}
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          hidden
          accept={allowVideo ? 'image/*,video/*' : 'image/*'}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      <p id={`${id}-hint`} className={`text-xs ${error ? 'font-medium text-no' : 'text-ink-soft'}`}>
        {error || hint || 'Tarik file ke kotak ini, pilih file, atau tempel URL.'}
      </p>
    </div>
  );
};
