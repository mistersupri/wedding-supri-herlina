/** Canvas helpers for photo uploads: resize, filters, frame overlay. */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'));
    img.src = src;
  });
}

function fitWithin(width: number, height: number, max: number) {
  if (width <= max && height <= max) return { width, height };
  const scale = max / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function canvasOf(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Peramban tidak mendukung pengolahan gambar.');
  return { canvas, ctx };
}

/** Downscale an image file to `maxDimension` before upload. Falls back to the original on failure. */
export async function resizeImageFile(file: File, maxDimension = 1600, quality = 0.85): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, maxDimension);
    const { canvas, ctx } = canvasOf(width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    return blob && blob.size < file.size ? new File([blob], file.name, { type }) : file;
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface PhotoFilter {
  id: string;
  name: string;
  css: string;
}

export const PHOTO_FILTERS: PhotoFilter[] = [
  { id: 'normal', name: 'Asli', css: 'none' },
  { id: 'sogan', name: 'Sogan', css: 'sepia(35%) saturate(120%) contrast(105%)' },
  { id: 'hangat', name: 'Hangat', css: 'sepia(20%) saturate(140%) hue-rotate(-8deg) brightness(104%)' },
  { id: 'monokrom', name: 'Monokrom', css: 'grayscale(100%) contrast(112%)' },
  { id: 'lawas', name: 'Lawas', css: 'sepia(60%) contrast(95%) brightness(102%)' },
  { id: 'teduh', name: 'Teduh', css: 'saturate(85%) hue-rotate(12deg) contrast(104%)' },
];

/**
 * Bake a CSS filter and an optional frame overlay into one JPEG.
 * The frame is stretched over the photo's full canvas, as in the live preview.
 */
export async function composePhoto(dataUrl: string, filterCss: string, frameUrl?: string, maxDimension = 1080): Promise<Blob> {
  const photo = await loadImage(dataUrl);
  const { width, height } = fitWithin(photo.naturalWidth, photo.naturalHeight, maxDimension);
  const { canvas, ctx } = canvasOf(width, height);
  ctx.filter = filterCss || 'none';
  ctx.drawImage(photo, 0, 0, width, height);
  ctx.filter = 'none';
  if (frameUrl) {
    try {
      ctx.drawImage(await loadImage(frameUrl), 0, 0, width, height);
    } catch {
      // A broken frame image should not block the guest's photo.
    }
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
  if (!blob) throw new Error('Foto gagal diproses.');
  return blob;
}

/**
 * Grab the current video frame, centre-cropped to 4:5 so it matches the on-screen viewfinder and
 * the 800x1000 frame overlays. Mirrored for the front camera so it matches what the guest saw.
 */
export function captureVideoFrame(video: HTMLVideoElement, mirror: boolean, maxDimension = 1280): string {
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  const ratio = 4 / 5;
  const cropW = vw / vh > ratio ? Math.round(vh * ratio) : vw;
  const cropH = vw / vh > ratio ? vh : Math.round(vw / ratio);
  const sx = Math.round((vw - cropW) / 2);
  const sy = Math.round((vh - cropH) / 2);
  const { width, height } = fitWithin(cropW, cropH, maxDimension);
  const { canvas, ctx } = canvasOf(width, height);
  if (mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.9);
}
