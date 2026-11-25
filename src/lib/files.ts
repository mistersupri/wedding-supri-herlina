/** What kind of media a file is, and whether a field accepts it. Pure, so the rules can be tested. */

export type MediaKind = 'image' | 'video' | 'audio';

export interface FileRules {
  kinds: MediaKind[];
  /** Largest size per kind, in MB. Images are shrunk in the browser before upload, so theirs is generous. */
  maxMB?: Partial<Record<MediaKind, number>>;
}

export const DEFAULT_MAX_MB: Record<MediaKind, number> = { image: 25, video: 100, audio: 30 };

const EXT: Record<MediaKind, RegExp> = {
  image: /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i,
  video: /\.(mp4|webm|mov|m4v)$/i,
  audio: /\.(mp3|m4a|aac|ogg|oga|wav|weba)$/i,
};

export const KIND_LABEL: Record<MediaKind, string> = { image: 'foto', video: 'video', audio: 'audio' };

/** Kind by MIME type, falling back to the extension (some systems send an empty type for .mp3 or .heic). */
export function kindOf(file: { type: string; name: string }): MediaKind | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  for (const kind of Object.keys(EXT) as MediaKind[]) if (EXT[kind].test(file.name)) return kind;
  return null;
}

/** Kind of an already-uploaded URL, by its extension. */
export function kindOfUrl(url: string): MediaKind | null {
  const path = url.split(/[?#]/)[0];
  if (url.startsWith('data:')) return kindOf({ type: url.slice(5, url.indexOf(';')), name: '' });
  for (const kind of Object.keys(EXT) as MediaKind[]) if (EXT[kind].test(path)) return kind;
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0).replace('.', ',')} MB`;
}

const LIST = (kinds: MediaKind[]) => kinds.map((k) => KIND_LABEL[k]).join(' atau ');

/** An error message in plain Indonesian, or null when the file is acceptable. */
export function checkFile(file: { type: string; name: string; size: number }, rules: FileRules): string | null {
  const kind = kindOf(file);
  if (!kind || !rules.kinds.includes(kind)) return `"${file.name}" bukan ${LIST(rules.kinds)}. ${formatsHint(rules.kinds)}`;
  const max = rules.maxMB?.[kind] ?? DEFAULT_MAX_MB[kind];
  if (file.size > max * 1024 * 1024) return `"${file.name}" berukuran ${formatBytes(file.size)}. Batasnya ${max} MB.`;
  if (file.size === 0) return `"${file.name}" kosong.`;
  return null;
}

/** "JPG, PNG, WEBP" and so on, for the line under a dropzone. */
export function formatsHint(kinds: MediaKind[]): string {
  const names: Record<MediaKind, string> = { image: 'JPG, PNG, WEBP', video: 'MP4, WEBM', audio: 'MP3, M4A, OGG' };
  return kinds.map((k) => names[k]).join(' · ');
}

/** The `accept` attribute for a file input. */
export const acceptAttr = (kinds: MediaKind[]) => kinds.map((k) => `${k}/*`).join(',');

/** Split dropped or picked files into those a field accepts and the messages for the rest. */
export function partitionFiles<T extends { type: string; name: string; size: number }>(files: T[], rules: FileRules) {
  const accepted: T[] = [];
  const errors: string[] = [];
  for (const f of files) {
    const err = checkFile(f, rules);
    if (err) errors.push(err);
    else accepted.push(f);
  }
  return { accepted, errors };
}
